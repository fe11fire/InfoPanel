const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
    const icon = { hidden: true };
    const logs = [];
    const options = [];
    let now = 1000000;
    let timerId = 0;
    const timers = new Map();
    class ClockDate extends Date { static now() { return now; } }
    const tick = ms => {
        const target = now + ms;
        while (true) {
            const next = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            now = next[1].at;
            timers.delete(next[0]);
            next[1].fn();
        }
        now = target;
    };
    const context = vm.createContext({
        Date: ClockDate,
        setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; },
        clearTimeout: id => timers.delete(id),
        URLSearchParams, console: { log: (...args) => logs.push(args) },
        document: { getElementById: () => icon },
        config: { getByName: key => ({
            request_timeout: 25,
            content_extensions_ignore: { common: ['bak', 'db'], imgs: ['txt'], present: ['txt'] }
        })[key] },
        $: { ajax: o => options.push(o) }
    });
    vm.runInContext(fs.readFileSync('assets/js/errors.js', 'utf8') + '\n' + fs.readFileSync('assets/js/request.js', 'utf8') +
        '\nglobalThis.api = { Request, PanelErrors };', context);
    return { ...context.api, icon, logs, options, tick, timers };
}
test('malformed payload completes; successful retry retains icon until TTL', async () => {
    const x = setup();
    const pending = x.Request.getData('/video');
    x.options[0].success({ result: {} });
    const failed = await pending;
    assert.equal(failed.result.length, 0);
    assert.equal(failed.failed, true);
    assert.equal(x.icon.hidden, false);
    const retry = x.Request.getData('/video');
    x.options[1].success({ result: ['clip.mp4'] });
    assert.equal((await retry).result[0], 'clip.mp4');
    assert.equal(x.icon.hidden, false);
    x.tick(300000);
    assert.equal(x.icon.hidden, true);
    assert.equal(x.logs.length, 1);
});
test('timeout, HTTP and parser errors complete with empty data', async () => {
    for (const status of ['timeout', 'error', 'parsererror']) {
        const x = setup();
        const pending = x.Request.getData('/text');
        assert.equal(x.options[0].timeout, 25);
        x.options[0].error({ status: 500 }, status);
        assert.equal((await pending).failed, true);
        assert.equal(x.icon.hidden, false);
    }
});
test('request diagnostics distinguish connection errors from invalid content responses', async () => {
    const x = setup();
    const settings = x.Request.getData('http://panel:8084/config');
    x.options[0].error({ status: 0 }, 'timeout');
    await settings;
    assert.match(x.logs[0][3], /POST http:\/\/panel:8084\/config.*25 мс.*переключается на часы.*client\.js/);

    const slides = x.Request.getData('/present', { path: 'Новости', title: 'true' });
    x.options[1].success({ result: [42] });
    await slides;
    assert.match(x.logs[1][3], /Новости.*title\.txt.*№1.*path_present.*backend\/config\.json/);
});
test('empty lists are valid; invalid video items are rejected', async () => {
    const x = setup();
    assert.equal((await x.Request.getData('/video', {}, [])).result.length, 0);
    assert.equal(x.icon.hidden, true);
    assert.equal((await x.Request.getData('/video', {}, [42])).failed, true);
});
test('invalid birthday records are reported without dropping valid records', async () => {
    const x = setup();
    const valid = { date: '29.02', fio: 'Test' };
    const invalid = { date: '31.02', fio: 'Test' };
    const response = await x.Request.getData('/birthdays', {}, [valid, invalid, null]);
    assert.equal(response.failed, undefined);
    assert.equal(response.result.length, 1);
    assert.equal(response.result[0], valid);
    assert.match(x.logs[0][3], /№2.*некорректная дата/);
    assert.match(x.logs[1][3], /№3.*поля fio и date/);
    assert.equal(x.icon.hidden, false);
    await x.Request.getData('/birthdays', {}, [valid, invalid, null]);
    assert.equal(x.logs.length, 2);
    x.tick(300000);
    assert.equal(x.icon.hidden, true);
});
test('one failing source does not prevent another source completing', async () => {
    const x = setup();
    const both = Promise.all([x.Request.getData('/video'), x.Request.getData('/imgs')]);
    x.options[0].success(null);
    x.options[1].success({ result: ['photo.jpg'] });
    const results = await both;
    assert.equal(results[0].failed, true);
    assert.equal(results[1].result[0], 'photo.jpg');
    assert.equal(x.icon.hidden, false);
});
test('visibility setting only hides icon; errors continue to log', async () => {
    const x = setup();
    x.PanelErrors.enabled = false;
    await x.Request.getData('/video', {}, [null]);
    assert.equal(x.icon.hidden, true);
    assert.equal(x.logs.length, 1);
    x.PanelErrors.enabled = true;
    x.PanelErrors.render();
    assert.equal(x.icon.hidden, false);
    await x.Request.getData('/video', {}, [null]);
    assert.equal(x.logs.length, 1);
});
test('filters file names but preserves message text; config format is checked', async () => {
    const x = setup();
    assert.equal((await x.Request.getData('/text', {}, ['note.bak'])).result.length, 0);
    assert.equal((await x.Request.getData('/text', { name: 'message.txt' }, ['note.bak'])).result[0], 'note.bak');
    const pending = x.Request.getData('/config');
    x.options[0].success({});
    assert.equal((await pending).length, 0);
    const retry = x.Request.getData('/config');
    x.options[1].success({ show_errors: false, request_timeout: 5000 });
    assert.equal((await retry).show_errors, false);
});

test('file lists apply common and module exclusions regardless of extension case', async () => {
    const x = setup();
    const files = ['Thumbs.DB', 'notes.TXT', 'photo.JPG'];
    for (const [route, data] of [['/imgs', {}], ['/img', {}], ['/present', { path: 'Slides' }]]) {
        const { result } = await x.Request.getData(route, data, files);
        assert.deepEqual(Array.from(result), ['photo.JPG']);
    }
    assert.equal((await x.Request.getData('/text', {}, ['notes.TXT'])).result.length, 1);
    assert.equal((await x.Request.getData('/present', { path: 'Slides', title: 'true' }, ['notes.TXT'])).result.length, 1);
});

test('routers remove failed sources, keep healthy sources and restore on recovery', async () => {
    const x = setup();
    let failing = false;
    const context = vm.createContext({
        console: { log() {} }, PanelErrors: x.PanelErrors,
        Config: { isEnabled: source => source.name !== 'pdf' },
        config: { getByName: () => ({ common: [] }) }
    });
    for (const name of ['Present', 'Img', 'Text', 'Birthdays', 'Video', 'Pdf', 'Birthday', 'NextBirthdays']) {
        context[name] = {
            name: name.toLowerCase(),
            async getData() {
                if (failing && ['Video', 'Birthday'].includes(name)) throw new Error('broken source');
                return { result: [name] };
            },
            makeJob: item => ({ h: item, cl: {} }), makeLine: item => ({ h: item, cl: {} })
        };
    }
    vm.runInContext(fs.readFileSync('assets/js/content/contentRouter.js', 'utf8') + '\n'
        + fs.readFileSync('assets/js/lines/lineRouter.js', 'utf8')
        + '\nglobalThis.routers = { ContentRouter, LineRouter };', context);
    const { ContentRouter, LineRouter } = context.routers;
    await ContentRouter.updateJobs(); await LineRouter.updateLines();
    assert.equal(ContentRouter.jobs.length, 5); assert.equal(LineRouter.lines.length, 2);
    failing = true;
    await ContentRouter.updateJobs(); await LineRouter.updateLines();
    assert.equal(ContentRouter.jobs.length, 4); assert.equal(LineRouter.lines.length, 1);
    assert.equal(x.icon.hidden, false);
    failing = false;
    await ContentRouter.updateJobs(); await LineRouter.updateLines();
    assert.equal(ContentRouter.jobs.length, 5); assert.equal(LineRouter.lines.length, 2);
    assert.equal(x.icon.hidden, false);
    x.tick(300000);
    assert.equal(x.icon.hidden, true);
});
test('config retains last visibility preference during failure and applies recovery', async () => {
    const x = setup();
    const replies = [{ show_errors: false }, [], { show_errors: true }];
    const context = vm.createContext({
        PanelErrors: x.PanelErrors, moment: () => ({}),
        Default: { system: { show_errors: true }, css: {}, backend_url: '/' },
        Request: { getData: async () => replies.shift() }, showScreensaver() {}
    });
    vm.runInContext(fs.readFileSync('assets/js/config/rules.js', 'utf8') + '\n' + fs.readFileSync('assets/js/config/config.js', 'utf8') + '\nglobalThis.settings = new Config();', context);
    x.PanelErrors.report('/video', 'timeout');
    await context.settings.init(); assert.equal(x.icon.hidden, true);
    await context.settings.init(); assert.equal(x.icon.hidden, true);
    await context.settings.init(); assert.equal(x.icon.hidden, false);
});

test('repeated errors extend TTL even when log throttling suppresses duplicates', () => {
    const x = setup();
    x.PanelErrors.setTtl(10000);
    x.PanelErrors.report('video', 'broken');
    x.tick(9000);
    x.PanelErrors.report('video', 'broken');
    assert.equal(x.logs.length, 1);
    assert.equal(x.timers.size, 1);
    x.tick(1000);
    assert.equal(x.icon.hidden, false);
    x.tick(8999);
    assert.equal(x.icon.hidden, false);
    x.tick(1);
    assert.equal(x.icon.hidden, true);
    assert.equal(x.PanelErrors.active.size, 0);
    assert.equal(x.timers.size, 0);
});
test('TTL changes apply to existing errors; independent errors expire separately', () => {
    const x = setup();
    x.PanelErrors.report('video', 'broken');
    x.tick(1000);
    x.PanelErrors.report('image', 'broken');
    x.PanelErrors.setTtl(2000);
    x.tick(1000);
    assert.equal(x.PanelErrors.active.has('video'), false);
    assert.equal(x.icon.hidden, false);
    x.tick(1000);
    assert.equal(x.icon.hidden, true);
    x.PanelErrors.report('text', 'broken');
    x.tick(1000);
    x.PanelErrors.setTtl(500);
    assert.equal(x.icon.hidden, true);
});
test('request layer leaves individual settings validation to ConfigRules', () => {
    const x = setup();
    for (const error_ttl of [0, -1, '300000', null, Infinity]) {
        assert.doesNotThrow(() => x.Request.validate('config', { error_ttl }));
    }
    assert.doesNotThrow(() => x.Request.validate('config', { error_ttl: 300000 }));
});
