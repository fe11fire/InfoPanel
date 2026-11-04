const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const moment = require('../node_modules/moment/moment.js');
function setup(day, policy = 'less') {
    moment.now = () => new Date(day + 'T12:30:00').valueOf();
    const settings = { birthday_leap_day: policy, content_birthdays_prev_count: 1,
        content_birthdays_next_count: 1, line_next_birthdays_count: 5 };
    const context = vm.createContext({ moment, Default: { backend_url: '/' },
        config: { getByName: name => settings[name] },
        Request: { getData: async (_url, _params, rows) => ({ result: rows }) },
        PanelErrors: { report() {} }
    });
    const files = ['assets/js/library.js', 'assets/js/content/modules/birthdays.js',
        'assets/js/lines/modules/birthday.js', 'assets/js/lines/modules/nextBirthdays.js', 'assets/js/config/rules.js'];
    vm.runInContext(files.map(file => fs.readFileSync(file, 'utf8')).join('\n') +
        '\nglobalThis.api = { Library, Birthdays, Birthday, NextBirthdays, ConfigRules };', context);
    return { ...context.api, settings };
}
test('past birthday age uses past occurrence year, without mutating source records', () => {
    const x = setup('2026-11-04');
    const rows = [{ date: '01.11.1977', fio: 'Person' }];
    const out = new x.Birthdays(rows).getBirthdays(rows);
    assert.equal(out[0].date_class, 'prev');
    assert.equal(out[0].name, 'Person'); // Прошло 49 лет, а не будущие 50.
    assert.match(out[1].name, /50 лет/);
    assert.deepEqual(rows, [{ date: '01.11.1977', fio: 'Person' }]);
});
test('actual past anniversary remains visible; December dates use last year in January', () => {
    let x = setup('2027-11-04');
    let rows = [{ date: '01.11.1977', fio: 'Person' }];
    assert.match(new x.Birthdays(rows).getBirthdays(rows)[0].name, /50 лет/);
    x = setup('2026-01-02');
    const dates = x.Library.birthdayOccurrences('31.12.1980');
    assert.equal(dates.previous.format('YYYY-MM-DD'), '2025-12-31');
    assert.equal(dates.next.format('YYYY-MM-DD'), '2026-12-31');
    assert.equal(x.Library.anniversaryAge(dates.year, dates.previous), 45);
});
test('past rows sorted by actual previous dates independently of upcoming rows', () => {
    const x = setup('2026-11-04');
    x.settings.content_birthdays_prev_count = 2;
    const rows = [{ date: '05.11', fio: 'Tomorrow' }, { date: '01.11', fio: 'Recent' }, { date: '03.11', fio: 'Yesterday' }];
    const out = new x.Birthdays(rows).getBirthdays(rows);
    assert.deepEqual(Array.from(out, row => row.name), ['Recent', 'Yesterday', 'Tomorrow']);
});
test('both leap-day policies produce valid previous and next occurrences', () => {
    for (const [policy, expected] of [['less', '2026-02-28'], ['more', '2026-03-01']]) {
        const x = setup('2026-01-01', policy);
        assert.equal(x.Library.nextBirthdayOccurrence('29.02.1980').occurrence.format('YYYY-MM-DD'), expected);
    }
    const x = setup('2028-01-01', 'more');
    assert.equal(x.Library.nextBirthdayOccurrence('29.02').occurrence.format('YYYY-MM-DD'), '2028-02-29');
    moment.now = () => new Date('2027-03-02T12:30:00').valueOf();
    const dates = x.Library.birthdayOccurrences('29.02');
    assert.equal(dates.previous.format('YYYY-MM-DD'), '2027-03-01');
    assert.equal(dates.next.format('YYYY-MM-DD'), '2028-02-29');
});
test('today greeting and upcoming line agree on leap policy and exclude today from upcoming', async () => {
    for (const [policy, day] of [['less', '2025-02-28'], ['more', '2025-03-01']]) {
        const x = setup(day, policy);
        const rows = [{ date: '29.02.1980', fio: 'Leap' }];
        const today = await x.Birthday.getData(rows);
        assert.equal(today.result.length, 1);
        assert.equal(today.result[0][1], 45);
        assert.equal((await x.NextBirthdays.getData(rows)).result.length, 0);
        const display = new x.Birthdays(rows).getBirthdays(rows);
        assert.equal(display[1].date_class, 'today');
    }
});
test('policy can change without reload; enum validation falls back for invalid values', () => {
    const x = setup('2026-02-28', 'less');
    assert.equal(x.Library.nextBirthdayOccurrence('29.02').occurrence.format('YYYY-MM-DD'), '2026-02-28');
    x.settings.birthday_leap_day = 'more';
    assert.equal(x.Library.nextBirthdayOccurrence('29.02').occurrence.format('YYYY-MM-DD'), '2026-03-01');
    assert.equal(x.ConfigRules.validate({ birthday_leap_day: 'invalid' }).birthday_leap_day, undefined);
    assert.equal(x.ConfigRules.validate({ birthday_leap_day: 'more' }).birthday_leap_day, 'more');
});
