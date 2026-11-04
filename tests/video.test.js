const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup({ rejectPlay = false, throwDestroy = false } = {}) {
    let now = 0, id = 0, advances = 0;
    const timers = new Map(), players = [], errors = [];
    const settings = { video_stall_timeout: 15000, content_video_volume: 0.5, path_video: '../content/video' };
    const element = { attr() { return this; }, addClass() { return this; }, removeClass() { return this; }, append() { return this; }, html() { return this; } };
    class ClockDate extends Date { static now() { return now; } }
    class FakePlayer {
        constructor() { this.events = {}; this.currentTime = 0; this.destroyed = 0; players.push(this); }
        on(name, handler) { this.events[name] = handler; }
        emit(name) { this.events[name]?.(); }
        play() { return rejectPlay ? Promise.reject(new Error('autoplay blocked')) : Promise.resolve(); }
        destroy() { this.destroyed++; if (throwDestroy) throw new Error('destroy failed'); }
    }
    const context = vm.createContext({
        Date: ClockDate, Plyr: FakePlayer, player: undefined,
        Default: { backend_url: '/', paths: { path_video: 'content/video' } },
        config: { getByName: name => settings[name] },
        PanelErrors: { report: (...args) => errors.push(args) },
        $: () => element, randomManage: () => advances++,
        setTimeout: (fn, ms) => { const key = ++id; timers.set(key, { fn, at: now + ms }); return key; },
        clearTimeout: key => timers.delete(key)
    });
    vm.runInContext(fs.readFileSync('assets/js/library.js', 'utf8') + '\n' + fs.readFileSync('assets/js/content/modules/video.js', 'utf8') + '\nglobalThis.VideoClass = Video;', context);
    const tick = async ms => {
        const target = now + ms;
        while (true) {
            const next = [...timers].filter(([, t]) => t.at <= target).sort((a,b) => a[1].at - b[1].at)[0];
            if (!next) break;
            now = next[1].at; timers.delete(next[0]); next[1].fn();
        }
        now = target;
        await Promise.resolve();
        await Promise.resolve();
    };
    return { show: async name => {
        new context.VideoClass(name).show().then(() => advances++, error => { errors.push(['video', error.message]); advances++; });
        await Promise.resolve();
        await Promise.resolve();
    }, players, errors, timers, tick, settings, advances: () => advances };
}
test('video that never starts is skipped after five seconds', async () => {
    const x = setup(); await x.show('broken.mp4');
    await x.tick(4999); assert.equal(x.advances(), 0);
    await x.tick(1); assert.equal(x.advances(), 1);
    assert.match(x.errors[0][1], /broken.mp4.*5000/);
    assert.equal(x.timers.size, 0);
});
test('stalled video is skipped after 15 seconds; repeated playing does not reset progress', async () => {
    const x = setup(); await x.show('stalled.mp4');
    const p = x.players[0]; p.emit('playing');
    await x.tick(14000); p.emit('playing');
    assert.equal(x.advances(), 0);
    await x.tick(1000); assert.equal(x.advances(), 1);
    assert.match(x.errors[0][1], /нет прогресса/);
    assert.equal(p.destroyed, 1); assert.equal(x.timers.size, 0);
});
test('long video keeps playing with progress and finishes without errors', async () => {
    const x = setup(); await x.show('long.mp4');
    const p = x.players[0]; p.emit('playing');
    for (let second = 1; second <= 120; second++) { p.currentTime = second; await x.tick(1000); }
    assert.equal(x.advances(), 0);
    p.emit('ended'); p.emit('error'); await x.tick(20000);
    assert.equal(x.advances(), 1); assert.equal(x.errors.length, 0);
    assert.equal(x.timers.size, 0);
});
test('player error skips once; late old events cannot end a later video', async () => {
    const x = setup(); await x.show('first.mp4');
    const first = x.players[0]; first.emit('error'); first.emit('ended');
    await x.show('second.mp4');
    const second = x.players[1]; second.emit('playing');
    first.emit('playing'); first.emit('error'); first.emit('ended');
    await x.tick(0);
    assert.equal(x.advances(), 1); assert.equal(second.destroyed, 0);
    second.emit('ended'); await x.tick(20000);
    assert.equal(x.advances(), 2); assert.equal(x.errors.length, 1);
    assert.equal(x.timers.size, 0);
});
test('rejected play promise and destroy errors do not stop the queue', async () => {
    const x = setup({ rejectPlay: true, throwDestroy: true });
    await x.show('blocked.mp4'); await Promise.resolve();
    assert.equal(x.advances(), 1); assert.equal(x.timers.size, 0);
    assert.match(x.errors[0][1], /autoplay blocked/);
});
test('stall setting changes apply during playback', async () => {
    const x = setup(); await x.show('test.mp4'); x.players[0].emit('playing');
    await x.tick(3000); x.settings.video_stall_timeout = 4000;
    await x.tick(1000); assert.equal(x.advances(), 1);
});

test('video reads updated folder on next show', async () => {
    const x = setup(); await x.show('clip.mp4');
    assert.equal(x.players[0].source.sources[0].src, './content/video/clip.mp4');
    x.players[0].emit('ended');
    await x.tick(0);
    x.settings.path_video = '../content/clips';
    await x.show('clip.mp4');
    assert.equal(x.players[1].source.sources[0].src, './content/clips/clip.mp4');
    x.players[1].emit('ended');
});
