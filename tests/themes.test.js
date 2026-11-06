const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
    const links = [], reports = [], timers = new Map(), inline = new Map();
    const root = { dataset: {}, style: { removeProperty: key => inline.delete(key) } };
    const context = vm.createContext({
        Default: { css: { background_color: '#08184f', info_line_height: '40px' } },
        PanelErrors: { report: (...args) => reports.push(args) },
        setTimeout: callback => { const id = Symbol(); timers.set(id, callback); return id; },
        clearTimeout: id => timers.delete(id),
        getComputedStyle: () => ({ getPropertyValue: key => inline.get(key) ||
            (key === '--background_color' ? (root.dataset.theme === 'minimal' ? '#fff' : '#08184f') : '76px') }),
        document: {
            documentElement: root,
            createElement: () => ({ media: '', remove() { this.removed = true; } }),
            head: { append: link => links.push(link) }
        }
    });
    vm.runInContext(fs.readFileSync('assets/js/config/themes.js', 'utf8') + '\nglobalThis.themes = Themes;', context);
    return { themes: context.themes, links, reports, timers, root, inline };
}

test('theme switches after CSS loads and snapshots values without old JSON overrides', async () => {
    const x = setup();
    let ready = x.themes.apply('classic'); x.links[0].onload(); await ready;
    x.inline.set('--background_color', '#f00');
    ready = x.themes.apply('minimal');
    assert.equal(x.themes.active, 'classic'); assert.equal(x.links[1].media, 'not all');
    x.links[1].onload(); await ready;
    assert.equal(x.themes.active, 'minimal'); assert.equal(x.themes.values.background_color, '#fff');
    assert.equal(x.links[0].removed, true); assert.equal(x.timers.size, 0);
});

test('missing CSS and timeout fall back to classic and permit later recovery', async () => {
    const x = setup();
    let ready = x.themes.apply('missing'); x.links[0].onerror(); await ready;
    assert.equal(x.themes.active, 'classic'); assert.equal(x.reports.length, 1);
    ready = x.themes.apply('missing'); x.links[1].onload(); await ready;
    assert.equal(x.themes.active, 'missing');
    ready = x.themes.apply('slow'); [...x.timers.values()][0](); await ready;
    assert.equal(x.themes.active, 'classic'); assert.equal(x.links[2].removed, true);
    assert.equal(x.timers.size, 0);
});

test('late load cannot replace a newer choice; same pending choice shares its request', async () => {
    const x = setup();
    const old = x.themes.apply('minimal');
    assert.equal(x.themes.apply('minimal'), old);
    const next = x.themes.apply('hi-tech');
    x.links[1].onload(); await next;
    x.links[0].onload(); await old;
    assert.equal(x.themes.active, 'hi-tech'); assert.equal(x.links[0].removed, true);
    assert.equal(x.links.filter(link => !link.removed).length, 1);
});

test('theme names cannot escape their folder', async () => {
    const x = setup();
    await x.themes.apply('../outside');
    assert.equal(x.links.length, 0); assert.equal(x.themes.active, 'classic');
    assert.equal(x.reports.length, 1);
});
