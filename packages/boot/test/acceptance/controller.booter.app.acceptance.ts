// Copyright IBM Corp. 2013,2018. All Rights Reserved.
// Node module: @loopback/boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Client, createClientForHandler} from '@loopback/testlab';
import {ControllerBooterApp} from '../fixtures/booterApp/application';
import {ApplicationConfig} from '@loopback/core';
import {RestServer} from '@loopback/rest';
import {ControllerBooter} from '../../index';
// @ts-ignore
import {getCompilationTarget} from '@loopback/build/bin/utils';

describe('controller booter acceptance tests', () => {
  let app: ControllerBooterApp;
  let appConfig: ApplicationConfig;
  let projectRoot: string;

  beforeEach(getProjectRoot);
  beforeEach(getAppConfig);
  beforeEach(getApp);

  afterEach(stopApp);

  it('binds controllers using ControllerDefaults and REST endpoints work', async () => {
    app.booter(ControllerBooter);
    await app.boot();
    await app.start();

    const server: RestServer = await app.getServer(RestServer);
    const client: Client = createClientForHandler(server.handleHttp);

    // Default Controllers = /controllers with .controller.js ending (nested = true);
    await client.get('/nested').expect(200, 'NesterController.nester()');
    await client.get('/').expect(200, 'HelloController.hello()');
    await client.get('/one').expect(200, 'ControllerOne.one()');
    await client.get('/two').expect(200, 'ControllerOne.two()');
  });

  function getProjectRoot() {
    let dist = 'dist';
    if (getCompilationTarget() === 'es2015') dist = 'dist6';
    projectRoot =
      process.cwd().indexOf('packages') > -1
        ? `${dist}/test/fixtures/booterApp`
        : `packages/boot/${dist}/test/fixtures/booterApp`;
  }

  function getAppConfig() {
    appConfig = {
      boot: {
        projectRoot: projectRoot,
      },
    };
  }

  function getApp() {
    app = new ControllerBooterApp(appConfig);
  }

  async function stopApp() {
    try {
      await app.stop();
    } catch (err) {
      console.log(`Stopping the app threw an error: ${err}`);
    }
  }
});
