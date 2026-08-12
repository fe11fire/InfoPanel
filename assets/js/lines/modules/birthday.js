class Birthday {
    static name = 'birthday';
    // Эндпоинт birthday (в единственном числе) отдает только имена без дат, из
    // него не получить год рождения для юбилея. Поэтому берем полный список
    // birthdays, как и Birthdays/NextBirthdays, и отбираем сегодняшних сами.
    static url = Default.backend_url + 'birthdays';
    static request_data = {};

    static prehash = 'birthday';

    #name = '';
    #age = null;
    constructor(name, age) {
        this.#name = name;
        this.#age = age;
    }

    static async getData(testData) {
        let birthdays = await Request.getData(
            Birthday.url,
            Birthday.request_data,
            testData
        );
        if (!birthdays.result) {
            return {};
        }
        let now = moment().subtract(1, 'day');
        let todays = [];
        birthdays.result.forEach(d => {
            let occ = Library.nextBirthdayOccurrence(d.date);
            if (occ.occurrence.diff(now, 'days') == 0) {
                todays.push([d.fio, Library.anniversaryAge(occ.year, occ.occurrence)]);
            }
        });
        return { result: todays };
    }

    static makeLine(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data[0]),
            cl: new Birthday(data[0], data[1]),
        }
        return job;
    }

    static initContent() {
        $('#div_row_info_line').append(
            $('<div></div>')
                .attr('id', 'div_birthday')
                .css('background-image', 'url("assets/imgs/celebration.png")')
                .css('background-repeat', 'repeat')
                .css('background-size', 'auto')
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
        $('#div_birthday').removeClass('d-none');
        let p = $('#div_birthday p')
            .empty()
            .append($('<span></span>').addClass('span_birthday_name').append(Library.markup(this.#name)));
        p.append(document.createTextNode('   поздравляем с днем рождения  !'));
        if (this.#age) {
            p.append($('<span></span>').addClass('span_birthday_name').append(document.createTextNode('  ( ' + this.#age + ' лет )')));
        }
        $('#div_birthday').css('background-position', Library.randomIntFromInterval(1, 100) + 'px ' + Library.randomIntFromInterval(1, 100) + 'px')
        $('#div_row_info_line').addClass('is-show');
    }

    hide() {
        $('#div_birthday').addClass('d-none');
    }
}