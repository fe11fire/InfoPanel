const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
    const reports = [], replies = [];
    const context = vm.createContext({
        console, moment: () => ({}), showScreensaver() {},
        CSS: { supports: (property, value) => value !== 'invalid-css' },
        PanelErrors: { report: (...args) => reports.push(args), setTtl() {}, enabled: true },
        Request: { getData: async () => replies.shift() }
    });
    const files = ['assets/js/library.js', 'assets/js/config/default.js', 'assets/js/config/rules.js', 'assets/js/config/config.js'];
    vm.runInContext(files.map(file => fs.readFileSync(file, 'utf8')).join('\n') +
        '\nglobalThis.api = { ConfigRules, Default, settings: new Config() };', context);
    return { ...context.api, reports, replies };
}
test('all default frontend settings have validation rules and pass them', () => {
    const x = setup();
    for (const name of Object.keys(x.Default.system)) assert.ok(x.ConfigRules.rules[name], name);
    for (const name of Object.keys(x.Default.css)) assert.ok(x.ConfigRules.cssProperties[name], name);
    x.ConfigRules.validate({ ...x.Default.system, ...x.Default.css });
    assert.equal(x.reports.length, 0);
});
test('invalid settings fall back individually; good values apply and original object is untouched', async () => {
    const x = setup();
    const input = { content_img_interval: -1000, content_video_volume: 50, with_video: 'true',
        content_birthdays_next_count: 1.5, header_text: 'Custom header', content_text_interval: 25000,
        content_extensions_ignore: { video: [] }, path_video: 'D:/Media', header_color: 'invalid-css' };
    x.replies.push(input); await x.settings.init();
    for (const name of ['content_img_interval', 'content_video_volume', 'with_video', 'content_birthdays_next_count', 'content_extensions_ignore']) {
        assert.equal(x.settings.getByName(name), x.Default.system[name]);
    }
    assert.equal(x.settings.getByName('path_video'), '../content/video');
    assert.equal(x.settings.getByName('header_color'), x.Default.css.header_color);
    assert.equal(x.settings.getByName('header_text'), 'Custom header');
    assert.equal(x.settings.getByName('content_text_interval'), 25000);
    assert.equal(x.reports.length, 7);
    assert.equal(input.content_img_interval, -1000);
    assert.match(x.reports[0][1], /content_img_interval.*-1000/);
});
test('missing and null values fall back silently; zero and false remain valid where allowed', async () => {
    const x = setup();
    x.replies.push({ content_img_interval: null, content_video_volume: 0, with_video: false, content_birthdays_next_count: 0 });
    await x.settings.init();
    assert.equal(x.settings.getByName('content_img_interval'), 10000);
    assert.equal(x.settings.getByName('content_video_volume'), 0);
    assert.equal(x.settings.getByName('with_video'), false);
    assert.equal(x.settings.getByName('content_birthdays_next_count'), 0);
    assert.equal(x.reports.length, 0);
});
test('persistent invalid setting reports on each refresh; corrected value applies immediately', async () => {
    const x = setup();
    x.replies.push({ error_ttl: -1 }, { error_ttl: -1 }, { error_ttl: 60000 });
    await x.settings.init(); assert.equal(x.settings.getByName('error_ttl'), 300000);
    await x.settings.init(); assert.equal(x.reports.length, 2);
    await x.settings.init(); assert.equal(x.settings.getByName('error_ttl'), 60000);
    assert.equal(x.reports.length, 2);
});
