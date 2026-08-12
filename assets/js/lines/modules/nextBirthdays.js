class NextBirthdays {
    static name = 'next_birthdays';
    static url = Default.backend_url + 'birthdays';
    static request_data = {};
    static prehash = 'next_birthdays';

    #name = '';
    #date = '';
    #age = null;
    constructor(name, date, age) {
        this.#name = name;
        this.#date = date;
        this.#age = age;
    }

    static async getData(testData) {
        let birthdays = await Request.getData(
            NextBirthdays.url,
            NextBirthdays.request_data,
            testData
        );
        if (!birthdays.result) {
            return {};
        }
        return { result: NextBirthdays.#nearest(birthdays.result) };
    }

    // Тот же расчет ближайшей даты, что и в Birthdays (верхний список), но
    // сегодняшние именинники (diff == 0) исключаются - их показывает Birthday.
    static #nearest(data) {
        let now = moment().subtract(1, 'day');
        data.forEach(d => {
            let occ = Library.nextBirthdayOccurrence(d.date);
            d.moment = occ.occurrence;
            d.diff = occ.occurrence.diff(now, 'days');
            d.age = Library.anniversaryAge(occ.year, occ.occurrence);
        });
        let upcoming = data.filter(d => d.diff > 0);
        upcoming.sort((a, b) => a.diff - b.diff);

        let count = config.getByName('line_next_birthdays_count');
        return upcoming.slice(0, count).map(d => [d.fio, d.moment.format('D MMMM'), d.age]);
    }

    static makeLine(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data[0] + data[1]),
            cl: new NextBirthdays(data[0], data[1], data[2]),
        }
        return job;
    }

    static initContent() {
        $('#div_row_info_line').append(
            $('<div></div>')
                .attr('id', 'div_next_birthday')
                .addClass('col h-100 w-100 d-none')
                .append(
                    $('<div></div>')
                        .addClass('row align-items-center h-100')
                        .append(
                            $('<div></div>')
                                .addClass('col')
                                .append(
                                    $('<p></p>')
                                        .addClass('text-center p-0 m-0')
                                ))
                )
        );
    }

    show() {
        $('#div_next_birthday').removeClass('d-none');
        let p = $('#div_next_birthday p')
            .empty()
            .append(document.createTextNode('Скоро день рождения:  '))
            .append($('<span></span>').addClass('span_next_birthday_name').append(Library.markup(this.#name)));

        p
            .append(document.createTextNode('  —  '))
            .append($('<span></span>').addClass('span_next_birthday_date').append(Library.markup(this.#date)));

        if (this.#age) {
            p.append($('<span></span>').addClass('span_next_birthday_name').append(document.createTextNode('  ( ' + this.#age + ' лет )')));
        }

        $('#div_row_info_line').addClass('is-show');
    }

    hide() {
        $('#div_next_birthday').addClass('d-none');
    }
}
