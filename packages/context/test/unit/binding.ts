// Copyright IBM Corp. 2013,2017. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  Binding,
  BindingScope,
  BindingType,
  Context,
  inject,
  Provider,
} from '../..';

const key = 'foo';

describe('Binding', () => {
  let ctx: Context;
  let binding: Binding;
  beforeEach(givenBinding);

  describe('constructor', () => {
    it('sets the given key', () => {
      const result = binding.key;
      expect(result).to.equal(key);
    });

    it('sets the binding lock state to unlocked by default', () => {
      expect(binding.isLocked).to.be.false();
    });
  });

  describe('lock', () => {
    it('locks the binding', () => {
      binding.lock();
      expect(binding.isLocked).to.be.true();
    });
  });

  describe('tag', () => {
    it('tags the binding', () => {
      binding.tag('t1');
      expect(binding.tags.has('t1')).to.be.true();
      binding.tag('t2');
      expect(binding.tags.has('t1')).to.be.true();
      expect(binding.tags.has('t2')).to.be.true();
    });

    it('tags the binding with an array', () => {
      binding.tag(['t1', 't2']);
      expect(binding.tags.has('t1')).to.be.true();
      expect(binding.tags.has('t2')).to.be.true();
    });
  });

  describe('key', () => {
    it('build key with path', () => {
      expect(Binding.buildKeyWithPath('foo', 'bar')).to.equal('foo#bar');
    });
    it('parse key without path', () => {
      expect(Binding.parseKeyWithPath('foo')).to.eql({
        key: 'foo',
        path: undefined,
      });
    });
    it('parse key with path', () => {
      expect(Binding.parseKeyWithPath('foo#bar')).to.eql({
        key: 'foo',
        path: 'bar',
      });
    });
  });

  describe('withOptions', () => {
    it('sets options for the binding', () => {
      binding.withOptions({x: 1});
      expect(binding.options).to.eql({x: 1});
    });

    it('clones options', () => {
      const options = {x: 1};
      binding.withOptions(options);
      expect(binding.options).to.not.exactly(options);
    });

    it('merges options for the binding if called more than once', () => {
      binding.withOptions({x: 1});
      binding.withOptions({y: 2});
      expect(binding.options).to.eql({x: 1, y: 2});
    });

    it('accepts a promise of options', async () => {
      binding.withOptions(Promise.resolve({x: 1}));
      const val = await binding.options;
      expect(val).to.eql({x: 1});
    });

    it('merges an object and a promise of options', async () => {
      binding.withOptions(Promise.resolve({x: 1}));
      binding.withOptions({y: 'a'});
      const val = await binding.options;
      expect(val).to.eql({x: 1, y: 'a'});
    });

    it('merges a promise and an object of options', async () => {
      binding.withOptions({y: 'a'});
      binding.withOptions(Promise.resolve({x: 1}));
      const val = await binding.options;
      expect(val).to.eql({x: 1, y: 'a'});
    });

    it('merges a promise and another promise of options', async () => {
      binding.withOptions(Promise.resolve({y: 'a'}));
      binding.withOptions(Promise.resolve({x: 1}));
      const val = await binding.options;
      expect(val).to.eql({x: 1, y: 'a'});
    });
  });

  describe('inScope', () => {
    it('defaults the transient binding scope', () => {
      expect(binding.scope).to.equal(BindingScope.TRANSIENT);
    });

    it('sets the singleton binding scope', () => {
      binding.inScope(BindingScope.SINGLETON);
      expect(binding.scope).to.equal(BindingScope.SINGLETON);
    });

    it('sets the context binding scope', () => {
      binding.inScope(BindingScope.CONTEXT);
      expect(binding.scope).to.equal(BindingScope.CONTEXT);
    });

    it('sets the transient binding scope', () => {
      binding.inScope(BindingScope.TRANSIENT);
      expect(binding.scope).to.equal(BindingScope.TRANSIENT);
    });
  });

  describe('to(value)', () => {
    it('returns the value synchronously', () => {
      binding.to('value');
      expect(binding.getValue(ctx)).to.equal('value');
    });

    it('sets the type to CONSTANT', () => {
      binding.to('value');
      expect(binding.type).to.equal(BindingType.CONSTANT);
    });
  });

  describe('toDynamicValue(dynamicValueFn)', () => {
    it('support a factory', async () => {
      const b = ctx.bind('msg').toDynamicValue(() => Promise.resolve('hello'));
      const value: string = await ctx.get('msg');
      expect(value).to.equal('hello');
      expect(b.type).to.equal(BindingType.DYNAMIC_VALUE);
    });
  });

  describe('toClass(cls)', () => {
    it('support a class', async () => {
      ctx.bind('msg').toDynamicValue(() => Promise.resolve('world'));
      const b = ctx.bind('myService').toClass(MyService);
      expect(b.type).to.equal(BindingType.CLASS);
      const myService: MyService = await ctx.get('myService');
      expect(myService.getMessage()).to.equal('hello world');
    });
  });

  describe('toProvider(provider)', () => {
    it('binding returns the expected value', async () => {
      ctx.bind('msg').to('hello');
      ctx.bind('provider_key').toProvider(MyProvider);
      const value: string = await ctx.get('provider_key');
      expect(value).to.equal('hello world');
    });

    it('can resolve provided value synchronously', () => {
      ctx.bind('msg').to('hello');
      ctx.bind('provider_key').toProvider(MyProvider);
      const value: string = ctx.getSync('provider_key');
      expect(value).to.equal('hello world');
    });

    it('support asynchronous dependencies of provider class', async () => {
      ctx.bind('msg').toDynamicValue(() => Promise.resolve('hello'));
      ctx.bind('provider_key').toProvider(MyProvider);
      const value: string = await ctx.get('provider_key');
      expect(value).to.equal('hello world');
    });

    it('sets the type to PROVIDER', () => {
      ctx.bind('msg').to('hello');
      const b = ctx.bind('provider_key').toProvider(MyProvider);
      expect(b.type).to.equal(BindingType.PROVIDER);
    });
  });

  describe('toJSON()', () => {
    it('converts a keyed binding to plain JSON object', () => {
      const json = binding.toJSON();
      expect(json).to.eql({
        key: key,
        scope: BindingScope.TRANSIENT,
        tags: [],
        isLocked: false,
      });
    });

    it('converts a binding with more attributes to plain JSON object', () => {
      const myBinding = new Binding(key, true)
        .inScope(BindingScope.CONTEXT)
        .tag('model')
        .to('a');
      const json = myBinding.toJSON();
      expect(json).to.eql({
        key: key,
        scope: BindingScope.CONTEXT,
        tags: ['model'],
        isLocked: true,
        type: BindingType.CONSTANT,
      });
    });
  });

  function givenBinding() {
    ctx = new Context();
    binding = new Binding(key);
  }

  class MyProvider implements Provider<string> {
    constructor(@inject('msg') private _msg: string) {}
    value(): string {
      return this._msg + ' world';
    }
  }

  class MyService {
    constructor(@inject('msg') private _msg: string) {}

    getMessage(): string {
      return 'hello ' + this._msg;
    }
  }
});
