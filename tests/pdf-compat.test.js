const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/pdfjs/pdf-engine.js'), 'utf8');
const compatibility = source.slice(0, source.indexOf('// Prebuilt PDF.js'));

test('PDF compatibility resolves, rejects and supports Promise subclasses without native withResolvers', async () => {
    const context = vm.createContext({});
    vm.runInContext('Promise.withResolvers = undefined', context);
    vm.runInContext(compatibility, context);
    const resolved = vm.runInContext('Promise.withResolvers()', context);
    resolved.resolve(42);
    assert.equal(await resolved.promise, 42);
    const rejected = vm.runInContext('Promise.withResolvers()', context);
    rejected.reject(new Error('failure'));
    await assert.rejects(rejected.promise, /failure/);
    assert.equal(vm.runInContext('class Child extends Promise {}; Child.withResolvers().promise instanceof Child', context), true);
    assert.equal(vm.runInContext('Object.keys(Promise).includes("withResolvers")', context), false);
});

test('PDF compatibility preserves an existing implementation', () => {
    const context = vm.createContext({});
    vm.runInContext('const original = Promise.withResolvers = function nativeImplementation() {}', context);
    vm.runInContext(compatibility, context);
    assert.equal(vm.runInContext('Promise.withResolvers === original', context), true);
});

test('PDF worker receives compatibility before its bundled code', async () => {
    // Evaluate the actual Blob parts expression used when starting the PDF worker.
    const expression = source.match(/new Blob\((\["\(" \+ infoPanelPdfPromiseCompat\.toString\(\)[\s\S]*?,bi\]),\{type:"text\/javascript"\}\)/);
    assert.ok(expression, 'worker Blob must include the compatibility initializer');
    const context = vm.createContext({ bi: 'globalThis.workerResult = Promise.withResolvers();' });
    vm.runInContext(compatibility, context);
    const parts = vm.runInContext(expression[1], context);
    const worker = vm.createContext({});
    vm.runInContext('Promise.withResolvers = undefined', worker);
    vm.runInContext(parts.join(''), worker);
    worker.workerResult.resolve('worker ready');
    assert.equal(await worker.workerResult.promise, 'worker ready');
});
