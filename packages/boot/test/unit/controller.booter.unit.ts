// Copyright IBM Corp. 2013,2018. All Rights Reserved.
// Node module: @loopback/boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {Application, BootOptions, CoreBindings} from '@loopback/core';
import {ControllerBooter, ControllerDefaults} from '../../index';
import {resolve} from 'path';
// @ts-ignore
import {getCompilationTarget} from '@loopback/build/bin/utils';

describe('controller booter unit tests', () => {
  let app: Application;
  let projectRoot: string;

  beforeEach(getApp);
  beforeEach(getProjectRoot);

  describe('ControllerBooter.config()', () => {
    it('uses default values for controllerOptions when not present', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
      };

      const booter = new ControllerBooter(app, bootOptions);
      await booter.config();
      validateConfig(
        booter,
        <string[]>ControllerDefaults.dirs,
        <string[]>ControllerDefaults.extensions,
        ControllerDefaults.nested,
      );
    });

    it('converts string options in controllerOptions to Array and overrides defaults', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: {
          dirs: 'ctrl',
          extensions: '.ctrl.js',
          nested: false,
        },
      };

      const booter = new ControllerBooter(app, bootOptions);
      await booter.config();
      validateConfig(
        booter,
        [bootOptions.controllers.dirs],
        [bootOptions.controllers.extensions],
        bootOptions.controllers.nested,
      );
    });

    it('overrides controllerOptions with those provided', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: {
          dirs: ['ctrl1', 'ctrl2'],
          extensions: ['.ctrl.js', '.controller.js'],
        },
      };

      const booter = new ControllerBooter(app, bootOptions);
      await booter.config();
      validateConfig(
        booter,
        bootOptions.controllers.dirs,
        bootOptions.controllers.extensions,
        ControllerDefaults.nested,
      );
    });

    function validateConfig(
      booter: ControllerBooter,
      dirs: string[],
      exts: string[],
      nested: boolean,
    ) {
      expect(booter.options.dirs).to.have.eql(dirs);
      expect(booter.options.extensions).to.eql(exts);
      if (nested) {
        expect(booter.options.nested).to.be.True();
      } else {
        expect(booter.options.nested).to.be.False();
      }
      expect(booter.projectRoot).to.equal(projectRoot);
    }
  });

  describe('ControllerBooter.discover()', () => {
    it('discovers files based on ControllerDefaults', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: ControllerDefaults,
      };
      const expected = [
        `${resolve(projectRoot, 'controllers/empty.controller.js')}`,
        `${resolve(projectRoot, 'controllers/hello.controller.js')}`,
        `${resolve(projectRoot, 'controllers/two.controller.js')}`,
        `${resolve(projectRoot, 'controllers/nested/nested.controller.js')}`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers files without going into nested folders', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          nested: false,
        }),
      };
      const expected = [
        `${resolve(projectRoot, 'controllers/empty.controller.js')}`,
        `${resolve(projectRoot, 'controllers/hello.controller.js')}`,
        `${resolve(projectRoot, 'controllers/two.controller.js')}`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers files of specified extensions', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          extensions: ['.ctrl.js'],
        }),
      };
      const expected = [
        `${resolve(projectRoot, 'controllers/another.ext.ctrl.js')}`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers files in specified directory', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          dirs: ['ctrl'],
        }),
      };
      const expected = [
        `${resolve(projectRoot, 'ctrl/multiple.folder.controller.js')}`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers files of multiple extensions', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          extensions: ['.ctrl.js', '.controller.js'],
        }),
      };
      const expected = [
        `${resolve(projectRoot, 'controllers/empty.controller.js')}`,
        `${resolve(projectRoot, 'controllers/hello.controller.js')}`,
        `${resolve(projectRoot, 'controllers/two.controller.js')}`,
        `${resolve(projectRoot, 'controllers/another.ext.ctrl.js')}`,
        `${resolve(projectRoot, 'controllers/nested/nested.controller.js')}`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers files in multiple directories', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          dirs: ['ctrl', 'controllers'],
        }),
      };
      const expected = [
        `${resolve(projectRoot, 'controllers/empty.controller.js')}`,
        `${resolve(projectRoot, 'controllers/hello.controller.js')}`,
        `${resolve(projectRoot, 'controllers/two.controller.js')}`,
        `${resolve(projectRoot, 'controllers/nested/nested.controller.js')}`,
        `${resolve(projectRoot, 'ctrl/multiple.folder.controller.js')}`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers no files in an empty directory', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          dirs: ['empty'],
        }),
      };
      const expected: string[] = [];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers no files of an invalid extension', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          extensions: ['.fake'],
        }),
      };
      const expected: string[] = [];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });

    it('discovers no files in a non-existent directory', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          dirs: ['fake'],
        }),
      };
      const expected: string[] = [];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.discover();
      expect(booter.options.discovered).to.be.an.Array();
      expect(booter.options.discovered.sort()).to.eql(expected.sort());
    });
  });

  describe('ControllerBooter.boot()', () => {
    it('binds a controller from discovered file', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          discovered: [
            `${resolve(projectRoot, 'controllers/hello.controller.js')}`,
          ],
        }),
      };
      const expected = [`${CoreBindings.CONTROLLERS}.HelloController`];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.boot();
      const boundControllers = app
        .findByTag(CoreBindings.CONTROLLERS_TAG)
        .map(b => b.key);
      expect(boundControllers.sort()).to.eql(expected.sort());
    });

    it('binds controllers from multiple files', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          discovered: [
            `${resolve(projectRoot, 'controllers/hello.controller.js')}`,
            `${resolve(projectRoot, 'controllers/another.ext.ctrl.js')}`,
            `${resolve(
              projectRoot,
              'controllers/nested/nested.controller.js',
            )}`,
          ],
        }),
      };
      const expected = [
        `${CoreBindings.CONTROLLERS}.HelloController`,
        `${CoreBindings.CONTROLLERS}.AnotherController`,
        `${CoreBindings.CONTROLLERS}.NestedController`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.boot();
      const boundControllers = app
        .findByTag(CoreBindings.CONTROLLERS_TAG)
        .map(b => b.key);
      expect(boundControllers.sort()).to.eql(expected.sort());
    });

    it('binds multiple controllers from a file', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          discovered: [
            `${resolve(projectRoot, 'controllers/two.controller.js')}`,
          ],
        }),
      };
      const expected = [
        `${CoreBindings.CONTROLLERS}.ControllerOne`,
        `${CoreBindings.CONTROLLERS}.ControllerTwo`,
      ];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.boot();
      const boundControllers = app
        .findByTag(CoreBindings.CONTROLLERS_TAG)
        .map(b => b.key);
      expect(boundControllers.sort()).to.eql(expected.sort());
    });

    it('does not throw on an empty file', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          discovered: [
            `${resolve(projectRoot, 'controllers/empty.controller.js')}`,
          ],
        }),
      };
      const expected: string[] = [];

      const booter = new ControllerBooter(app, bootOptions);
      await booter.boot();
      const boundControllers = app
        .findByTag(CoreBindings.CONTROLLERS_TAG)
        .map(b => b.key);
      expect(boundControllers.sort()).to.eql(expected.sort());
    });

    it('throws an error on a non-existent file', async () => {
      const bootOptions: BootOptions = {
        projectRoot: projectRoot,
        controllers: Object.assign({}, ControllerDefaults, {
          discovered: [
            `${resolve(projectRoot, 'controllers/fake.controller.js')}`,
          ],
        }),
      };

      const booter = new ControllerBooter(app, bootOptions);
      await expect(booter.boot()).to.be.rejectedWith(
        'ControllerBooter failed to load the following files: ["/controllers/fake.controller.js"]',
      );
    });
  });

  it('mounts other files even if one is non-existent', async () => {
    const bootOptions: BootOptions = {
      projectRoot: projectRoot,
      controllers: Object.assign({}, ControllerDefaults, {
        discovered: [
          `${resolve(projectRoot, 'controllers/hello.controller.js')}`,
          `${resolve(projectRoot, 'controllers/fake.controller.js')}`,
          `${resolve(projectRoot, 'controllers/two.controller.js')}`,
        ],
      }),
    };
    const expected = [
      `${CoreBindings.CONTROLLERS}.ControllerOne`,
      `${CoreBindings.CONTROLLERS}.ControllerTwo`,
      `${CoreBindings.CONTROLLERS}.HelloController`,
    ];

    const booter = new ControllerBooter(app, bootOptions);

    await expect(booter.boot()).to.be.rejectedWith(
      'ControllerBooter failed to load the following files: ["/controllers/fake.controller.js"]',
    );

    const boundControllers = app
      .findByTag(CoreBindings.CONTROLLERS_TAG)
      .map(b => b.key);
    expect(boundControllers.sort()).to.eql(expected.sort());
  });

  function getApp() {
    app = new Application();
  }

  function getProjectRoot() {
    let dist = 'dist';
    if (getCompilationTarget() === 'es2015') dist = 'dist6';
    projectRoot =
      process.cwd().indexOf('packages') > -1
        ? `${dist}/test/fixtures/booterApp`
        : `packages/boot/${dist}/test/fixtures/booterApp`;
    projectRoot = resolve(projectRoot);
  }
});
