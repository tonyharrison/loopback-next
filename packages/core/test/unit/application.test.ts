// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/core
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  Application,
  Server,
  Component,
  Booter,
  CoreBindings,
} from '../../index';
import {Context, Constructor} from '@loopback/context';

describe('Application', () => {
  describe('controller binding', () => {
    let app: Application;
    class MyController {}

    beforeEach(givenApp);

    it('binds a controller', () => {
      const binding = app.controller(MyController);
      expect(Array.from(binding.tags)).to.containEql('controller');
      expect(binding.key).to.equal('controllers.MyController');
      expect(findKeysByTag(app, 'controller')).to.containEql(binding.key);
    });

    it('binds a controller with custom name', () => {
      const binding = app.controller(MyController, 'my-controller');
      expect(Array.from(binding.tags)).to.containEql('controller');
      expect(binding.key).to.equal('controllers.my-controller');
      expect(findKeysByTag(app, 'controller')).to.containEql(binding.key);
    });

    function givenApp() {
      app = new Application();
    }
  });

  describe('booter binding(s)', () => {
    let app: Application;
    let rootDir: string = process.cwd(); // Not used
    class MyBooter implements Booter {}
    class MyOtherBooter implements Booter {}

    beforeEach(givenApp);

    it('binds a booter', () => {
      const binding = app.booter(MyBooter);
      expect(Array.from(binding.tags)).to.containEql(CoreBindings.BOOTERS_TAG);
      expect(binding.key).to.equal(`${CoreBindings.BOOTERS}.MyBooter`);
      expect(findKeysByTag(app, CoreBindings.BOOTERS_TAG)).to.containEql(
        binding.key,
      );
    });

    it('binds a botter with a custom name', () => {
      const binding = app.booter(MyBooter, 'my-booter');
      expect(Array.from(binding.tags)).to.containEql(CoreBindings.BOOTERS_TAG);
      expect(binding.key).to.equal(`${CoreBindings.BOOTERS}.my-booter`);
      expect(findKeysByTag(app, CoreBindings.BOOTERS_TAG)).to.containEql(
        binding.key,
      );
    });

    it('binds an array of booters', () => {
      const bindings = app.booters([MyBooter, MyOtherBooter]);
      bindings.forEach(binding => {
        expect(Array.from(binding.tags)).to.containEql(
          CoreBindings.BOOTERS_TAG,
        );
        expect(findKeysByTag(app, CoreBindings.BOOTERS_TAG)).to.containEql(
          binding.key,
        );
      });
      expect(bindings[0].key).to.equal(`${CoreBindings.BOOTERS}.MyBooter`);
      expect(bindings[1].key).to.equal(`${CoreBindings.BOOTERS}.MyOtherBooter`);
    });

    it('throws an error if rootDir is not set', async () => {
      app.booter(TestBooter);
      await expect(app.boot()).to.be.rejectedWith(
        'No projectRoot provided for boot. Please set options.boot.projectRoot.',
      );
    });

    describe('rootDir set via .boot(options)', () => {
      beforeEach(givenApp);

      it('runs the boot phases of a Booter', async () => {
        app.booter(TestBooter);
        const booterInst = await app.get(`${CoreBindings.BOOTERS}.TestBooter`);

        verifyTestBooterBefore(booterInst);
        await app.boot({projectRoot: rootDir});
        verifyTestBooterAfter(booterInst);
      });

      it('runs the boot phases of a Booter and ignores other / missing function', async () => {
        app.booter(TestBooter2);
        const booterInst = await app.get(`${CoreBindings.BOOTERS}.TestBooter2`);

        verifyTestBooter2Before(booterInst);
        await app.boot({projectRoot: rootDir});
        verifyTestBooter2After(booterInst);
      });
    });

    describe('rootDir set via ApplicationConfig', () => {
      let appWithRootDir: Application;
      beforeEach(givenRootDirApp);

      it('runs the boot phases of a Booter', async () => {
        appWithRootDir.booter(TestBooter);
        const booterInst = await appWithRootDir.get(
          `${CoreBindings.BOOTERS}.TestBooter`,
        );

        verifyTestBooterBefore(booterInst);
        await appWithRootDir.boot();
        verifyTestBooterAfter(booterInst);
      });

      it('runs the boot phases of a Booter and ignores other / missing function', async () => {
        appWithRootDir.booter(TestBooter2);
        const booterInst = await appWithRootDir.get(
          `${CoreBindings.BOOTERS}.TestBooter2`,
        );

        verifyTestBooter2Before(booterInst);
        await appWithRootDir.boot();
        verifyTestBooter2After(booterInst);
      });

      function givenRootDirApp() {
        appWithRootDir = new Application({boot: {projectRoot: rootDir}});
      }
    });

    function givenApp() {
      app = new Application();
    }

    function verifyTestBooterBefore(inst: TestBooter) {
      expect(inst.configRun).to.be.False();
      expect(inst.discoverRun).to.be.False();
      expect(inst.bootRun).to.be.False();
    }

    function verifyTestBooterAfter(inst: TestBooter) {
      expect(inst.configRun).to.be.True();
      expect(inst.discoverRun).to.be.True();
      expect(inst.bootRun).to.be.True();
    }

    function verifyTestBooter2Before(inst: TestBooter2) {
      expect(inst.configRun).to.be.False();
      expect(inst.randomRun).to.be.False();
    }

    function verifyTestBooter2After(inst: TestBooter2) {
      expect(inst.configRun).to.be.True();
      expect(inst.randomRun).to.be.False();
    }
  });

  describe('component binding', () => {
    let app: Application;
    class MyController {}
    class MyComponent implements Component {
      controllers = [MyController];
    }

    beforeEach(givenApp);

    it('binds a component', () => {
      app.component(MyComponent);
      expect(findKeysByTag(app, 'component')).to.containEql(
        'components.MyComponent',
      );
    });

    it('binds a component', () => {
      app.component(MyComponent, 'my-component');
      expect(findKeysByTag(app, 'component')).to.containEql(
        'components.my-component',
      );
    });

    function givenApp() {
      app = new Application();
    }
  });

  describe('server binding', () => {
    it('defaults to constructor name', async () => {
      const app = new Application();
      const binding = app.server(FakeServer);
      expect(Array.from(binding.tags)).to.containEql('server');
      const result = await app.getServer(FakeServer.name);
      expect(result.constructor.name).to.equal(FakeServer.name);
    });

    it('allows custom name', async () => {
      const app = new Application();
      const name = 'customName';
      app.server(FakeServer, name);
      const result = await app.getServer(name);
      expect(result.constructor.name).to.equal(FakeServer.name);
    });
  });

  describe('configuration', () => {
    it('allows servers to be provided via config', async () => {
      const name = 'abc123';
      const app = new Application({
        servers: {
          abc123: FakeServer,
        },
      });
      const result = await app.getServer(name);
      expect(result.constructor.name).to.equal(FakeServer.name);
    });

    describe('start', () => {
      it('starts all injected servers', async () => {
        const app = new Application({
          components: [FakeComponent],
        });

        await app.start();
        const server = await app.getServer(FakeServer);
        expect(server).to.not.be.null();
        expect(server.running).to.equal(true);
        await app.stop();
      });

      it('does not attempt to start poorly named bindings', async () => {
        const app = new Application({
          components: [FakeComponent],
        });

        // The app.start should not attempt to start this binding.
        app.bind('controllers.servers').to({});
        await app.start();
        await app.stop();
      });
    });
  });

  function findKeysByTag(ctx: Context, tag: string | RegExp) {
    return ctx.findByTag(tag).map(binding => binding.key);
  }
});

class FakeComponent implements Component {
  servers: {
    [name: string]: Constructor<Server>;
  };
  constructor() {
    this.servers = {
      FakeServer,
      FakeServer2: FakeServer,
    };
  }
}

class FakeServer extends Context implements Server {
  running: boolean = false;
  constructor() {
    super();
  }
  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }
}

class TestBooter implements Booter {
  configRun = false;
  discoverRun = false;
  bootRun = false;

  async config() {
    this.configRun = true;
  }

  async discover() {
    this.discoverRun = true;
  }

  async boot() {
    this.bootRun = true;
  }
}

class TestBooter2 implements Booter {
  configRun = false;
  randomRun = false;

  async config() {
    this.configRun = true;
  }

  async random() {
    this.randomRun = true;
  }
}
