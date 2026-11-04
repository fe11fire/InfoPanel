const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function deferred() { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; }
function router() {
    const reports = [], waits = [];
    const ctx = vm.createContext({ console: { log() {} },
        Present: {}, Img: {}, Text: {}, Birthdays: {}, Video: {},
        PanelErrors: { report: (...args) => reports.push(args) },
        Library: { delay: () => { const wait = deferred(); waits.push(wait); return wait.promise; } },
        config: { getByName: () => 10000 }, checkScreensaver() {}
    });
    vm.runInContext(fs.readFileSync('assets/js/content/contentRouter.js', 'utf8') + '\nglobalThis.router = ContentRouter;', ctx);
    return { router: ctx.router, reports, waits };
}
test('router waits for module cleanup, keeps circular order and catches module errors', async () => {
    const x = router(), gate = deferred();
    const order = [], flags = [];
    x.router.updateJobs = async initial => flags.push(initial);
    x.router.jobs = [
        { h: 1, cl: { async show() { order.push('first'); await gate.promise; order.push('cleaned'); } } },
        { h: 2, cl: { async show() { order.push('second'); throw new Error('cleanup failed'); } } }
    ];
    let done = false;
    const first = x.router.nextJob().then(() => done = true);
    await new Promise(setImmediate);
    assert.equal(done, false); assert.deepEqual(order, ['first']);
    gate.resolve(); await first;
    await x.router.nextJob();
    assert.deepEqual(order, ['first', 'cleaned', 'second']);
    assert.equal(x.reports.length, 1);
    assert.deepEqual(Array.from(x.router.jobs, j => j.h), [1, 2]);
    assert.deepEqual(flags, [true, false]);
});
test('repeated start does not create parallel queues; empty queue waits before retry', async () => {
    const x = router(); let updates = 0;
    x.router.updateJobs = async () => updates++;
    x.router.start(); await x.router.start();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(updates, 1); assert.equal(x.waits.length, 1);
    x.waits[0].resolve();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    assert.equal(updates, 2); assert.equal(x.waits.length, 2);
});
function presentation({ slides = 2, throwInit = false, throwDestroy = false } = {}) {
    let now = 0, id = 0;
    const timers = new Map(), players = [];
    const element = { addClass() { return this; }, removeClass() { return this; }, append() { return this; },
        css() { return this; }, empty() { return this; } };
    class FakeSwiper {
        constructor(selector, options) { this.options = options; this.destroyed = 0; players.push(this); }
        init() { if (throwInit) throw new Error('init failed'); }
        destroy() { this.destroyed++; if (throwDestroy) throw new Error('destroy failed'); }
    }
    const ctx = vm.createContext({
        Default: { backend_url: '/' }, Swiper: FakeSwiper, $: () => element,
        config: { getByName: key => key === 'content_present_interval' ? 1000 : '../content/present' },
        Library: { randomIntFromInterval: () => 0, contentPath: () => './content/present/', encodePath: encodeURIComponent },
        Request: { getData: async (_url, data) => ({ result: data.title ? [] : Array.from({ length: slides }, (_, i) => i + '.jpg') }) },
        setTimeout: (fn, ms) => { const key = ++id; timers.set(key, { fn, at: now + ms }); return key; },
        clearTimeout: key => timers.delete(key)
    });
    vm.runInContext(fs.readFileSync('assets/js/content/modules/present.js', 'utf8') + '\nglobalThis.module = new Present("test");', ctx);
    const tick = ms => {
        const target = now + ms;
        while (true) {
            const next = [...timers].filter(([, t]) => t.at <= target).sort((a,b) => a[1].at - b[1].at)[0];
            if (!next) break;
            now = next[1].at; timers.delete(next[0]); next[1].fn();
        }
        now = target;
    };
    return { module: ctx.module, players, timers, tick };
}
async function prepared(x) { const pending = x.module.show(); await new Promise(setImmediate); return { pending }; }
test('presentation holds last slide for interval, cleans up and ignores late events', async () => {
    const x = presentation(); const { pending } = await prepared(x);
    const p = x.players[0]; p.options.on.reachEnd(); p.options.on.reachEnd();
    x.tick(1000); await pending;
    assert.equal(p.destroyed, 1); assert.equal(x.timers.size, 0);
    p.options.on.reachEnd(); assert.equal(x.timers.size, 0);
});
test('single slide completes, empty presentation skips and stuck presentation rejects', async () => {
    let x = presentation({ slides: 1 }); let ready = await prepared(x);
    x.tick(1000); await ready.pending; assert.equal(x.timers.size, 0);
    x = presentation({ slides: 0 }); await x.module.show(); assert.equal(x.players.length, 0);
    x = presentation(); ready = await prepared(x);
    x.tick(7600); await assert.rejects(ready.pending, /превышено время/);
    assert.equal(x.players[0].destroyed, 1); assert.equal(x.timers.size, 0);
});
test('presentation initialization and destruction errors reject after clearing timers', async () => {
    let x = presentation({ throwInit: true }); await assert.rejects(x.module.show(), /init failed/);
    assert.equal(x.timers.size, 0);
    x = presentation({ slides: 1, throwDestroy: true }); const { pending } = await prepared(x);
    x.tick(1000); await assert.rejects(pending, /destroy failed/); assert.equal(x.timers.size, 0);
});
