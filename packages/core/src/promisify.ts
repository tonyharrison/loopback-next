// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/core
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

// TODO(bajtos) Move this file to a standalone module, or find an existing
// npm module that we could use instead. Just make sure the existing
// module is using native utils.promisify() when available.

// tslint:disable:no-any

import * as util from 'util';
// The @types/util.promisify conflicts with @types/node due to rescoping
// issues, so falling back to legacy import.
const promisifyPolyfill = require('util.promisify/implementation');

const nativePromisify = (util as any).promisify;

export function promisify<T>(
  func: (callback: (err: any, result: T) => void) => void,
): () => Promise<T>;
export function promisify<T, A1>(
  func: (arg1: A1, callback: (err: any, result: T) => void) => void,
): (arg1: A1) => Promise<T>;
export function promisify<T, A1, A2>(
  func: (arg1: A1, arg2: A2, callback: (err: any, result: T) => void) => void,
): (arg1: A1, arg2: A2) => Promise<T>;

/**
 * Polyfill promisify and use `util.promisify` if available
 * @param func A callback-style function
 */
export function promisify<T>(
  func: (...args: any[]) => void,
): (...args: any[]) => Promise<T> {
  if (nativePromisify) return nativePromisify(func);

  // TODO(kjdelisle): Once Node 6 has been dropped, we can remove this
  // compatibility support.
  return promisifyPolyfill(func);
}
