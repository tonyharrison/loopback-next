// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/cli
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const _ = require('lodash');
const yeoman = require('yeoman-environment');
const path = require('path');
const fs = require('fs');
const util = require('util');
const RunContext = require('yeoman-test/lib/run-context');

exports.testSetUpGen = function(genName, arg) {
  arg = arg || {};
  const env = yeoman.createEnv();
  const name = genName.substring(genName.lastIndexOf(path.sep) + 1);
  env.register(genName, 'loopback4:' + name);
  return env.create('loopback4:' + name, arg);
};

/**
 * Setup the target directory with the required package.json and folder
 * structure.
 * @param {string} tmpDir Path to the temporary directory to setup
 */
exports.givenAnApplicationDir = function(tmpDir) {
  const srcDir = path.join(tmpDir, 'src');
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({
      keywords: ['loopback'],
    })
  );
  fs.mkdirSync(srcDir);
  fs.mkdirSync(path.join(srcDir, 'models'));
  fs.mkdirSync(path.join(srcDir, 'repositories'));
  fs.mkdirSync(path.join(srcDir, 'controllers'));
};

/**
 * Return the default path for the specified repository and temp directory.
 * @param {string=} tmpDir The temporary directory path. If omitted, the
 * returned path will be relative (prefixed with either "/" or "\",
 * @param {string} fileName The repository name.
 */
exports.givenARepositoryPath = function(tmpDir, fileName) {
  return exports.givenAnArtifactPath(tmpDir, 'repositories', fileName);
};

/**
 * Return the default path for the specified model and temp directory.
 * @param {string=} tmpDir The temporary directory path. If omitted, the
 * returned path will be relative (prefixed with either "/" or "\",
 * depending on OS).
 * @param {string} fileName The model name.
 */
exports.givenAModelPath = function(tmpDir, fileName) {
  return exports.givenAnArtifactPath(tmpDir, 'models', fileName);
};

/**
 * Return the default path for the specified controller and temp directory.
 * @param {string=} tmpDir The temporary directory path. If omitted, the
 * returned path will be relative (prefixed with either "/" or "\",
 * depending on OS).
 * @param {string} fileName The controller name.
 */
exports.givenAControllerPath = function(tmpDir, fileName) {
  return exports.givenAnArtifactPath(tmpDir, 'controllers', fileName);
};

/**
 * @param {string=} tmpDir The temporary directory path. If omitted, the
 * returned path will be relative (prefixed with either "/" or "\",
 * depending on OS).
 * @param {string} artifactDir The artifact directory name.
 * @param {string} fileName The artifact fileName.
 */
exports.givenAnArtifactPath = function(tmpDir, artifactDir, fileName) {
  if (!tmpDir) tmpDir = path.sep; // To allow use for relative pathing.
  return path.join(tmpDir, 'src', artifactDir, fileName);
};
