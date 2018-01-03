// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/cli
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const expect = require('@loopback/testlab').expect;
const debug = require('../lib/debug')('controller-test');
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const fs = require('fs');
const util = require('util');
const testUtils = require('./test-utils');

const ControllerGenerator = require('../generators/controller');
const generator = path.join(__dirname, '../generators/controller');
const tests = require('./artifact')(generator);
const baseTests = require('./base-generator')(generator);

const templateName = testUtils.givenAControllerPath(
  null,
  'controller-template.ts'
);
const withInputProps = {
  name: 'fooBar',
};
const withInputName = testUtils.givenAControllerPath(
  null,
  'foo-bar.controller.ts'
);

describe('controller-generator extending BaseGenerator', baseTests);
describe('generator-loopback4:controller', tests);

describe('lb4 controller', () => {
  it('does not run without package.json', () => {
    return runGenerator({usePrompts: true, useTempDir: true}).then(() => {
      assert.noFile(withInputName);
    });
  });
  it('does not run without the loopback keyword', () => {
    return runGenerator({usePrompts: true, useTempDir: true}).then(() => {
      assert.noFile(withInputName);
    });
  });

  describe('basic', () => {
    describe('with input', () => {
      let tmpDir;
      before(() => {
        return runGenerator({usePrompts: true})
          .inTmpDir(dir => {
            tmpDir = dir;
            testUtils.givenAnApplicationDir(dir);
          })
          .toPromise();
      });
      it('writes correct file name', () => {
        assert.file(tmpDir + withInputName);
        assert.noFile(tmpDir + templateName);
      });
      it('scaffolds correct files', () => {
        checkBasicContents(tmpDir);
      });
    });
    describe('with arg', () => {
      let tmpDir;
      before(() => {
        return runGenerator()
          .inTmpDir(dir => {
            tmpDir = dir;
            testUtils.givenAnApplicationDir(dir);
          })
          .withArguments('fooBar');
      });
      it('writes correct file name', () => {
        assert.file(tmpDir + withInputName);
        assert.noFile(tmpDir + templateName);
      });
      it('scaffolds correct files', () => {
        checkBasicContents(tmpDir);
      });
    });
  });
  describe('CRUD', () => {
    // CRUD Template tests
    const baseInput = {
      name: 'fooBar',
      controllerType: ControllerGenerator.CRUD,
    };
    it('creates CRUD template with valid input', () => {
      let tmpDir;
      return helpers
        .run(generator)
        .inTmpDir(dir => {
          tmpDir = dir;
          testUtils.givenAnApplicationDir(tmpDir);
          fs.writeFileSync(
            testUtils.givenAModelPath(tmpDir, 'foo.model.ts'),
            '--DUMMY VALUE--'
          );
          fs.writeFileSync(
            testUtils.givenARepositoryPath(tmpDir, 'bar.repository.ts'),
            '--DUMMY VALUE--'
          );
        })
        .withPrompts(
          Object.assign(
            {
              modelName: 'Foo',
              repositoryName: 'BarRepository',
              id: 'number',
            },
            baseInput
          )
        )
        .then(() => {
          return checkCrudContents(tmpDir);
        });
    });

    it('fails when no model is given', () => {
      let tmpDir;
      return helpers
        .run(generator)
        .inTmpDir(dir => {
          tmpDir = dir;
          testUtils.givenAnApplicationDir(dir);
          fs.writeFileSync(
            testUtils.givenARepositoryPath(dir, 'bar.repository.ts'),
            '--DUMMY VALUE--'
          );
        })
        .withPrompts(
          Object.assign(
            {
              repositoryName: 'BarRepository',
              id: 'number',
            },
            baseInput
          )
        )
        .catch(err => {
          expect(err.message).to.match(/No models found in /);
        });
    });
    it('fails when no repository is given', () => {
      let tmpDir;
      return helpers
        .run(generator)
        .inTmpDir(dir => {
          tmpDir = dir;
          testUtils.givenAnApplicationDir(dir);
          fs.writeFileSync(
            testUtils.givenAModelPath(tmpDir, 'foo.model.ts'),
            '--DUMMY VALUE--'
          );
        })
        .withPrompts(
          Object.assign(
            {
              repositoryName: 'BarRepository',
              id: 'number',
            },
            baseInput
          )
        )
        .catch(err => {
          expect(err.message).to.match(/No repositories found in /);
        });
    });
  });

  function checkBasicContents(tmpDir) {
    assert.fileContent(tmpDir + withInputName, /class FooBarController/);
    assert.fileContent(tmpDir + withInputName, /constructor\(\) {}/);
  }

  /**
   *
   * @param {object} options
   * @property {boolean} useTempDir Whether or not to autogenerate a temp
   * directory
   * @property {boolean} usePrompts Whether or not to use the default inputs
   * for the generator run.
   */
  function runGenerator(options) {
    options = options || {};
    let result = helpers.run(generator);
    if (options.useTempDir) {
      result = result.inTmpDir(testUtils.givenAnApplicationDir);
    }
    if (options.usePrompts) {
      result = result.withPrompts(withInputProps);
    }
    return result;
  }

  function checkCrudContents(tmpDir) {
    assert.fileContent(tmpDir + withInputName, /class FooBarController/);

    // Repository and injection
    assert.fileContent(
      tmpDir + withInputName,
      /\@inject\('repositories.foo'\)/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /barRepository \: BarRepository/
    );
    // Check function signatures
    assert.fileContent(
      tmpDir + withInputName,
      /async create\(obj\: Foo\) \: Promise\<Foo\>/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /async count\(where\: Where\) \: Promise\<number\>/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /async find\(filter\: Filter\) \: Promise\<Foo\[\]\>/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /async updateAll\(where\: Where, obj\: Foo\) \: Promise\<number\>/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /async deleteAll\(where\: Where\) \: Promise\<number\>/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /async findById\(id\: number\) \: Promise\<Foo\>/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /async updateById\(id\: number, obj\: Foo\) \: Promise\<boolean\>/
    );
    assert.fileContent(
      tmpDir + withInputName,
      /async deleteById\(id\: number\) \: Promise\<boolean\>/,
      ''
    );
  }
});
