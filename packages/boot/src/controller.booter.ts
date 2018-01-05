// Copyright IBM Corp. 2013,2018. All Rights Reserved.
// Node module: @loopback/boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {CoreBindings, Application, Booter, BootOptions} from '@loopback/core';
import {inject} from '@loopback/context';
import * as glob from 'glob';

/**
 * ControllerBooter is a class that implements the Booter inferface. The purpose
 * of this booter is to allow for convention based booting of `Controller`
 * artifacts for LoopBack 4 Applications.
 *
 * It supports the following boot phases: config, discover, boot
 */
export class ControllerBooter implements Booter {
  options: ControllerOptions;
  projectRoot: string;

  /**
   *
   * @param app Application instance
   * @param bootConfig Config options for boot
   */
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) public app: Application,
    @inject(CoreBindings.BOOT_CONFIG) public bootConfig: BootOptions,
  ) {
    if (!bootConfig.controllers) bootConfig.controllers = {};
    this.options = bootConfig.controllers;
    this.projectRoot = bootConfig.projectRoot;
  }

  /**
   * This phase is responsible for configuring this Booter. It converts
   * options and assigns default values for missing values so ther phases
   * don't have to perform checks / conversions.
   */
  async config() {
    this.options = Object.assign({}, ControllerDefaults, this.options);
    if (typeof this.options.dirs === 'string') {
      this.options.dirs = [this.options.dirs];
    }
    if (typeof this.options.extensions === 'string') {
      this.options.extensions = [this.options.extensions];
    }
  }

  /**
   * This phase is responsible for discovering artifact files based on the
   * given parameters. Sets options.discovered to an array of discovered
   * artifact files.
   */
  async discover() {
    const dirs = <string[]>this.options.dirs;
    const exts = <string[]>this.options.extensions;

    // glob pattern
    let pattern = `/@(${dirs.join('|')})/`;
    pattern += this.options.nested ? '**/*' : '*';
    pattern += `@(${exts.join('|')})`;

    this.options.discovered = glob.sync(pattern, {root: this.projectRoot});
  }

  /**
   * This phase is responsible for reading the discovered files, checking the
   * Classes exported and binding them to the Application instance for use.
   *
   * It will skip any files it isn't able to load and throw an error containing
   * a list of skipped files. Other files that were read will still be bound
   * to the Application instance.
   */
  async boot() {
    const files: string[] = this.options.discovered;
    let errFiles: string[] = [];
    files.forEach(file => {
      try {
        const ctrl = require(file);
        const classes: string[] = Object.keys(ctrl);
        classes.forEach(cls => {
          this.app.controller(ctrl[cls]);
        });
      } catch (err) {
        errFiles.push(file.substring(this.projectRoot.length));
      }
    });

    // Only throw 1 error. Allows user to catch it and ignore if needed
    if (errFiles.length > 0) {
      throw new Error(
        `ControllerBooter failed to load the following files: ${JSON.stringify(
          errFiles,
        )}`,
      );
    }
  }
}

/**
 * Type definition for ControllerOptions. These are the options supported by
 * this Booter.
 *
 * @param dirs String / String Array of directories to check for artifacts.
 * Paths must be relative. Defaults to ['controllers']
 * @param extensions String / String Array of file extensions to match artifact
 * files in dirs. Defaults to ['.controller.js']
 * @param nested Boolean to control if artifact discovery should check nested
 * folders or not. Default to true
 * @param discovered  An array of discovered files. This is set by the
 * discover phase.
 */
export type ControllerOptions = {
  dirs: string | string[];
  extensions: string | string[];
  discovered: string[];
  nested: boolean;
};

/**
 * Default values for ControllerOptions described above is no value is provided.
 */
export const ControllerDefaults: ControllerOptions = {
  dirs: ['controllers'],
  extensions: ['.controller.js'],
  nested: true,
  discovered: [],
};
