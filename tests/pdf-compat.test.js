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

test('PDF font buffers retain only used bytes when transferToFixedLength is unavailable', () => {
    for (const [buffer, length] of [['q', 'x'], ['l', 'h']]) {
        const pattern = new RegExp('\\(typeof ' + buffer + '\\.transferToFixedLength===[\\\\]?"function[\\\\]?"\\?' + buffer + '\\.transferToFixedLength\\(' + length + '\\):' + buffer + '\\.slice\\(0,' + length + '\\)\\)');
        const match = source.match(pattern);
        assert.ok(match, 'font buffer fallback must exist for ' + buffer);
        const expression = match[0].replace(/\\"/g, '"');
        const context = vm.createContext({});
        vm.runInContext(`ArrayBuffer.prototype.transferToFixedLength = undefined; var ${buffer} = new Uint8Array([11,22,33,44]).buffer; var ${length} = 3;`, context);
        const result = vm.runInContext(expression, context);
        assert.equal(result.byteLength, 3);
        assert.deepEqual(Array.from(new Uint8Array(result)), [11, 22, 33]);
        vm.runInContext(`${buffer}.transferToFixedLength = n => ({ native: true, length: n })`, context);
        const native = vm.runInContext(expression, context);
        assert.equal(native.native, true);
        assert.equal(native.length, 3);
    }
});

const missingApis = [
    'Promise.withResolvers', 'Promise.try', 'Math.sumPrecise', 'URL.parse', 'URL.canParse',
    'Object.hasOwn', 'Array.prototype.at', 'Array.prototype.findLast', 'Array.prototype.toSpliced',
    'Map.prototype.getOrInsertComputed', 'WeakMap.prototype.getOrInsertComputed',
    'Uint8Array.fromBase64', 'Uint8Array.prototype.toBase64', 'Uint8Array.prototype.toHex',
    'Uint8Array.prototype.setFromBase64', 'Uint8Array.prototype.setFromHex',
    'Set.prototype.intersection', 'Set.prototype.difference', 'Set.prototype.union',
];
function auditContext() {
    const context = vm.createContext({
        URL: class extends URL {}, Response: class extends Response {}, Request, Headers,
        TextEncoder, TextDecoder, ReadableStream, TransformStream, DOMException, Blob, URLSearchParams, AbortController, AbortSignal, structuredClone,
        setTimeout, clearTimeout, console,
    });
    vm.runInContext(missingApis.map(api => `${api}=undefined;`).join('') + 'Response.prototype.bytes=undefined;', context);
    return context;
}

test('full PDF engine restores missing modern APIs in the page and worker', () => {
    const main = auditContext();
    vm.runInContext(source, main);
    // The bundled worker is a quoted JavaScript string, not the page bundle.
    const literal = source.match(/var bi=('(?:\\.|[^'\\])*')/s);
    assert.ok(literal, 'bundled PDF worker must be available for the compatibility audit');
    const workerSource = vm.runInNewContext(literal[1]);
    const worker = auditContext();
    vm.runInContext('globalThis.self=globalThis;', worker);
    vm.runInContext(compatibility + workerSource, worker);
    for (const context of [main, worker]) {
        for (const api of [...missingApis.filter(api => api !== 'URL.canParse'), 'Response.prototype.bytes']) {
            assert.equal(vm.runInContext('typeof ' + api, context), 'function', api);
        }
        assert.equal(vm.runInContext('Math.sumPrecise([1e20,1,-1e20])', context), 1);
        assert.equal(vm.runInContext('URL.parse("not a URL")', context), null);
        assert.equal(vm.runInContext('Uint8Array.fromBase64("SGk=").toHex()', context), '4869');
        assert.equal(vm.runInContext('new Map().getOrInsertComputed("key",()=>42)', context), 42);
        assert.equal(vm.runInContext('[1,2,3].toSpliced(1,1,9).join() ', context), '1,9,3');
        assert.equal(vm.runInContext('[1,2,3].at(-1)', context), 3);
        assert.equal(vm.runInContext('[1,2,3].findLast(x=>x<3)', context), 2);
    }
});
