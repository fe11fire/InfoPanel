const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
    let path = '../content/imgs';
    let background;
    const element = { css: (name, value) => { background = value; return element; }, removeClass: () => element };
    const context = vm.createContext({
        Default: { backend_url: '/' }, config: { getByName: () => path },
        $: () => element, setTimeout() {}
    });
    vm.runInContext(fs.readFileSync('assets/js/library.js', 'utf8') + '\n' + fs.readFileSync('assets/js/content/modules/img.js', 'utf8')
        + '\nglobalThis.api = { Library, Img };', context);
    return { ...context.api, setPath: value => path = value, background: () => background };
}
test('backend-relative paths support both separators, nesting and encoded names', () => {
    const { Library } = setup();
    assert.equal(Library.contentPath('..\\content\\clips'), './content/clips/');
    assert.equal(Library.contentPath('../content/old/../clips/'), './content/clips/');
    assert.equal(Library.contentPath('media'), './backend/media/');
    assert.equal(Library.contentPath('../content/My #1'), './content/My%20%231/');
    assert.equal(Library.contentPath('..'), './');
});
test('absolute paths and paths outside website are rejected', () => {
    const { Library } = setup();
    for (const value of ['D:\\Media', '/media', '\\\\server\\media', '../../media', 'https://host/media', '', null]) {
        assert.throws(() => Library.contentPath(value));
    }
});
test('same queued image reads updated path at each show', async () => {
    const x = setup(); const image = new x.Img('photo #1.jpg');
    await image.show(); assert.match(x.background(), /content\/imgs\/photo%20%231.jpg/);
    x.setPath('../content/new pictures');
    await image.show(); assert.match(x.background(), /content\/new%20pictures\/photo%20%231.jpg/);
});
