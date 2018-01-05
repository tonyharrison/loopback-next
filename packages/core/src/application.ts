// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/core
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Context, Binding, BindingScope, Constructor} from '@loopback/context';
import {Server} from './server';
import {Component, mountComponent} from './component';
import {CoreBindings} from './keys';
import {resolve} from 'path';

/**
 * Application is the container for various types of artifacts, such as
 * components, servers, controllers, repositories, datasources, connectors,
 * and models.
 */
export class Application extends Context {
  constructor(public options?: ApplicationConfig) {
    super();
    if (!options) options = {};

    // Bind to self to allow injection of application context in other
    // modules.
    this.bind(CoreBindings.APPLICATION_INSTANCE).to(this);
    // Make options available to other modules as well.
    this.bind(CoreBindings.APPLICATION_CONFIG).to(options);

    if (options.components) {
      for (const component of options.components) {
        this.component(component);
      }
    }

    if (options.servers) {
      for (const name in options.servers) {
        this.server(options.servers[name], name);
      }
    }

    if (options.controllers) {
      for (const ctor of options.controllers) {
        this.controller(ctor);
      }
    }
  }

  /**
   * Register a controller class with this application.
   *
   * @param controllerCtor {Function} The controller class
   * (constructor function).
   * @param {string=} name Optional controller name, default to the class name
   * @return {Binding} The newly created binding, you can use the reference to
   * further modify the binding, e.g. lock the value to prevent further
   * modifications.
   *
   * ```ts
   * class MyController {
   * }
   * app.controller(MyController).lock();
   * ```
   */
  controller(controllerCtor: ControllerClass, name?: string): Binding {
    name = name || controllerCtor.name;
    return this.bind(`${CoreBindings.CONTROLLERS}.${name}`)
      .toClass(controllerCtor)
      .tag(CoreBindings.CONTROLLERS_TAG);
  }

  /**
   * Register a booter class with this application.
   *
   * @param booterCls {Function} The booter class (constructor function).
   * @param {string=} name Optional booter name, defaults to the class name.
   * @return {Binding} The newly created binding, you can use the reference to
   * further modify the binding, e.g. lock the value to prevent further
   * modifications.
   *
   * ```ts
   * class MyBooter implements Booter {}
   * app.booter(MyBooter);
   * ```
   */
  booter<T extends Booter>(booterCls: Constructor<T>, name?: string): Binding {
    name = name || booterCls.name;
    return this.bind(`${CoreBindings.BOOTERS}.${name}`)
      .toClass(booterCls)
      .tag(CoreBindings.BOOTERS_TAG)
      .inScope(BindingScope.SINGLETON);
  }

  /**
   * Register an array of booter classes with this application.
   * Each Booter added in this way will automatically be named based on the
   * class constructor name with the "booters." prefix.
   *
   * If you wish to control the binding keys for particular booter instances,
   * use the app.booter function instead.
   *
   * @param {Constructor<Booter>[]} booterArr {Function} An array of Booter
   * constructors.
   * @return {Binding[]} An array of bindings for the registered Booter classes.
   *
   * ```ts
   * app.booters([ControllerBooter, RepositoryBooter]);
   * ```
   */
  booters<T extends Booter>(booterArr: Constructor<T>[]): Binding[] {
    return booterArr.map(booterCls => this.booter(booterCls));
  }

  /**
   * Function is responsible for calling all registered Booter classes that
   * are bound to the Application instance. Each phase of an instance must
   * complete before the next phase is started.
   * @param {BootOptions} bootOptions Options for boot. Bound for Booters to
   * receive via Dependency Injection.
   */
  async boot(bootOptions?: BootOptions) {
    // Taranveer: Getting a might be undefined error here even though
    // this.options is guaranteed to exist via Constructor. Adding this
    // line to overcome error by tricking the Compiler.
    if (!this.options) this.options = {};
    if (bootOptions) this.options.boot = bootOptions;

    // Make sure boot.projectRoot is set by user!
    if (!this.options.boot || !this.options.boot.projectRoot) {
      throw new Error(
        `No projectRoot provided for boot. Please set options.boot.projectRoot.`,
      );
    }

    // Resolve path to projectRoot
    this.options.boot.projectRoot = resolve(this.options.boot.projectRoot);

    // Bind Boot Config for Booters
    this.bind(CoreBindings.BOOT_CONFIG).to(this.options.boot);

    // Find Bindings and get instance
    const bindings = this.findByTag(CoreBindings.BOOTERS_TAG);
    let booterInsts = bindings.map(binding => this.getSync(binding.key));

    // Run phases of booters
    for (const phase of BOOT_PHASES) {
      for (const inst of booterInsts) {
        if (inst[phase]) {
          await inst[phase]();
          console.log(`${inst.constructor.name} phase: ${phase} complete.`);
        } else {
          console.log(`${inst.constructor.name} phase: ${phase} missing.`);
        }
      }
    }
  }

  /**
   * Bind a Server constructor to the Application's master context.
   * Each server constructor added in this way must provide a unique prefix
   * to prevent binding overlap.
   *
   * ```ts
   * app.server(RestServer);
   * // This server constructor will be bound under "servers.RestServer".
   * app.server(RestServer, "v1API");
   * // This server instance will be bound under "servers.v1API".
   * ```
   *
   * @param {Constructor<Server>} server The server constructor.
   * @param {string=} name Optional override for key name.
   * @returns {Binding} Binding for the server class
   * @memberof Application
   */
  public server<T extends Server>(
    ctor: Constructor<T>,
    name?: string,
  ): Binding {
    const suffix = name || ctor.name;
    const key = `${CoreBindings.SERVERS}.${suffix}`;
    return this.bind(key)
      .toClass(ctor)
      .tag('server')
      .inScope(BindingScope.SINGLETON);
  }

  /**
   * Bind an array of Server constructors to the Application's master
   * context.
   * Each server added in this way will automatically be named based on the
   * class constructor name with the "servers." prefix.
   *
   * If you wish to control the binding keys for particular server instances,
   * use the app.server function instead.
   * ```ts
   * app.servers([
   *  RestServer,
   *  GRPCServer,
   * ]);
   * // Creates a binding for "servers.RestServer" and a binding for
   * // "servers.GRPCServer";
   * ```
   *
   * @param {Constructor<Server>[]} ctors An array of Server constructors.
   * @returns {Binding[]} An array of bindings for the registered server classes
   * @memberof Application
   */
  public servers<T extends Server>(ctors: Constructor<T>[]): Binding[] {
    return ctors.map(ctor => this.server(ctor));
  }

  /**
   * Retrieve the singleton instance for a bound constructor.
   *
   * @template T
   * @param {Constructor<T>=} ctor The constructor that was used to make the
   * binding.
   * @returns {Promise<T>}
   * @memberof Application
   */
  public async getServer<T extends Server>(
    target: Constructor<T> | String,
  ): Promise<T> {
    let key: string;
    // instanceof check not reliable for string.
    if (typeof target === 'string') {
      key = `${CoreBindings.SERVERS}.${target}`;
    } else {
      const ctor = target as Constructor<T>;
      key = `servers.${ctor.name}`;
    }
    return (await this.get(key)) as T;
  }

  /**
   * Start the application, and all of its registered servers.
   *
   * @returns {Promise}
   * @memberof Application
   */
  public async start(): Promise<void> {
    await this._forEachServer(s => s.start());
  }

  /**
   * Stop the application instance and all of its registered servers.
   * @returns {Promise}
   * @memberof Application
   */
  public async stop(): Promise<void> {
    await this._forEachServer(s => s.stop());
  }

  /**
   * Helper function for iterating across all registered server components.
   * @protected
   * @template T
   * @param {(s: Server) => Promise<T>} fn The function to run against all
   * registered servers
   * @memberof Application
   */
  protected async _forEachServer<T>(fn: (s: Server) => Promise<T>) {
    const bindings = this.find(`${CoreBindings.SERVERS}.*`);
    await Promise.all(
      bindings.map(async binding => {
        const server = (await this.get(binding.key)) as Server;
        return await fn(server);
      }),
    );
  }

  /**
   * Add a component to this application and register extensions such as
   * controllers, providers, and servers from the component.
   *
   * @param componentCtor The component class to add.
   * @param {string=} name Optional component name, default to the class name
   *
   * ```ts
   *
   * export class ProductComponent {
   *   controllers = [ProductController];
   *   repositories = [ProductRepo, UserRepo];
   *   providers = {
   *     [AUTHENTICATION_STRATEGY]: AuthStrategy,
   *     [AUTHORIZATION_ROLE]: Role,
   *   };
   * };
   *
   * app.component(ProductComponent);
   * ```
   */
  public component(componentCtor: Constructor<Component>, name?: string) {
    name = name || componentCtor.name;
    const componentKey = `components.${name}`;
    this.bind(componentKey)
      .toClass(componentCtor)
      .inScope(BindingScope.SINGLETON)
      .tag('component');
    // Assuming components can be synchronously instantiated
    const instance = this.getSync(componentKey);
    mountComponent(this, instance);
  }
}

/**
 * Configuration for application
 */
export interface ApplicationConfig {
  /**
   * An array of component classes
   */
  components?: Array<Constructor<Component>>;
  /**
   * An array of controller classes
   */
  controllers?: Array<ControllerClass>;
  /**
   * A map of server name/class pairs
   */
  servers?: {
    [name: string]: Constructor<Server>;
  };
  /**
   * Other properties
   */
  // tslint:disable-next-line:no-any
  [prop: string]: any;
}

// tslint:disable-next-line:no-any
export type ControllerClass = Constructor<any>;

/**
 * A Booter class interface
 */
export interface Booter {
  config?(): void;
  discover?(): void;
  boot?(): void;
}

// An Array of Boot Phases available
export const BOOT_PHASES = ['config', 'discover', 'boot'];

// Boot Options Type. Must provide a projectRoot!
export type BootOptions = {
  projectRoot: string;
  // tslint:disable-next-line:no-any
  [prop: string]: any;
};
