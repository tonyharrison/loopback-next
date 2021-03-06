// Copyright IBM Corp. 2013,2017. All Rights Reserved.
// Node module: @loopback/authentication
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Application} from '@loopback/core';
import {
  RestBindings,
  ServerResponse,
  ParsedRequest,
  ParseParams,
  FindRoute,
  InvokeMethod,
  Send,
  Reject,
  SequenceHandler,
  RestServer,
  RestComponent,
} from '@loopback/rest';
import {api, get} from '@loopback/openapi-v2';
import {Client, createClientForHandler} from '@loopback/testlab';
import {anOpenApiSpec} from '@loopback/openapi-spec-builder';
import {inject, Provider, ValueOrPromise} from '@loopback/context';
import {
  authenticate,
  UserProfile,
  AuthenticationBindings,
  AuthenticateFn,
  AuthenticationMetadata,
  AuthenticationComponent,
} from '../..';
import {Strategy} from 'passport';
import {BasicStrategy} from 'passport-http';

const SequenceActions = RestBindings.SequenceActions;

describe('Basic Authentication', () => {
  let app: Application;
  let server: RestServer;
  let users: UserRepository;
  beforeEach(givenAServer);
  beforeEach(givenUserRepository);
  beforeEach(givenControllerInApp);
  beforeEach(givenAuthenticatedSequence);
  beforeEach(givenProviders);

  it('authenticates successfully for correct credentials', async () => {
    const client = whenIMakeRequestTo(server);
    const credential =
      users.list.joe.profile.id + ':' + users.list.joe.password;
    const hash = new Buffer(credential).toString('base64');
    await client
      .get('/whoAmI')
      .set('Authorization', 'Basic ' + hash)
      .expect(users.list.joe.profile.id);
  });

  it('returns error for invalid credentials', async () => {
    const client = whenIMakeRequestTo(server);
    const credential = users.list.Simpson.profile.id + ':' + 'invalid';
    const hash = new Buffer(credential).toString('base64');
    await client
      .get('/whoAmI')
      .set('Authorization', 'Basic ' + hash)
      .expect(401);
  });

  it('allows anonymous requests to methods with no decorator', async () => {
    class InfoController {
      @get('/status')
      status() {
        return {running: true};
      }
    }

    app.controller(InfoController);
    await whenIMakeRequestTo(server)
      .get('/status')
      .expect(200, {running: true});
  });

  function givenUserRepository() {
    users = new UserRepository({
      joe: {profile: {id: 'joe'}, password: '12345'},
      Simpson: {profile: {id: 'sim123'}, password: 'alpha'},
      Flinstone: {profile: {id: 'Flint'}, password: 'beta'},
      George: {profile: {id: 'Curious'}, password: 'gamma'},
    });
  }

  async function givenAServer() {
    app = new Application({
      components: [AuthenticationComponent, RestComponent],
    });
    server = await app.getServer(RestServer);
  }

  function givenControllerInApp() {
    const apispec = anOpenApiSpec()
      .withOperation('get', '/whoAmI', {
        'x-operation-name': 'whoAmI',
        responses: {
          '200': {
            description: '',
            schema: {
              type: 'string',
            },
          },
        },
      })
      .build();

    @api(apispec)
    class MyController {
      constructor(
        @inject(AuthenticationBindings.CURRENT_USER) private user: UserProfile,
      ) {}

      @authenticate('BasicStrategy')
      async whoAmI(): Promise<string> {
        return this.user.id;
      }
    }
    app.controller(MyController);
  }

  function givenAuthenticatedSequence() {
    class MySequence implements SequenceHandler {
      constructor(
        @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
        @inject(SequenceActions.PARSE_PARAMS)
        protected parseParams: ParseParams,
        @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
        @inject(SequenceActions.SEND) protected send: Send,
        @inject(SequenceActions.REJECT) protected reject: Reject,
        @inject(AuthenticationBindings.AUTH_ACTION)
        protected authenticateRequest: AuthenticateFn,
      ) {}

      async handle(req: ParsedRequest, res: ServerResponse) {
        try {
          const route = this.findRoute(req);

          // Authenticate
          await this.authenticateRequest(req);

          // Authentication successful, proceed to invoke controller
          const args = await this.parseParams(req, route);
          const result = await this.invoke(route, args);
          this.send(res, result);
        } catch (err) {
          this.reject(res, req, err);
          return;
        }
      }
    }
    // bind user defined sequence
    server.sequence(MySequence);
  }

  function givenProviders() {
    class MyPassportStrategyProvider implements Provider<Strategy | undefined> {
      constructor(
        @inject(AuthenticationBindings.METADATA)
        private metadata: AuthenticationMetadata,
      ) {}
      value(): ValueOrPromise<Strategy | undefined> {
        if (!this.metadata) {
          return undefined;
        }
        const name = this.metadata.strategy;
        if (name === 'BasicStrategy') {
          return new BasicStrategy(this.verify);
        } else {
          return Promise.reject(`The strategy ${name} is not available.`);
        }
      }
      // callback method for BasicStrategy
      verify(username: string, password: string, cb: Function) {
        process.nextTick(() => {
          users.find(username, password, cb);
        });
      }
    }
    server
      .bind(AuthenticationBindings.STRATEGY)
      .toProvider(MyPassportStrategyProvider);
  }

  function whenIMakeRequestTo(restServer: RestServer): Client {
    return createClientForHandler(restServer.handleHttp);
  }
});

class UserRepository {
  constructor(
    readonly list: {[key: string]: {profile: UserProfile; password: string}},
  ) {}
  find(username: string, password: string, cb: Function): void {
    const userList = this.list;
    function search(key: string) {
      return userList[key].profile.id === username;
    }
    const found = Object.keys(userList).find(search);
    if (!found) return cb(null, false);
    if (userList[found].password !== password) return cb(null, false);
    cb(null, userList[found].profile);
  }
}
