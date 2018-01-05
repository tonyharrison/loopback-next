// Copyright IBM Corp. 2013,2018. All Rights Reserved.
// Node module: @loopback/boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {RestApplication, RestServer} from '@loopback/rest';
import {ApplicationConfig} from '@loopback/core';
import {ControllerBooter} from '../../../src';

export class ControllerBooterApp extends RestApplication {
  constructor(options?: ApplicationConfig) {
    super(options);
    this.booter(ControllerBooter);
  }

  async start() {
    const server = await this.getServer(RestServer);
    const port = await server.get('rest.port');
    console.log(`Server is running at http://127.0.0.1:${port}`);
    console.log(`Try http://127.0.0.1:${port}/ping`);
    return await super.start();
  }
}
