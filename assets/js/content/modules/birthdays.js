class Birthdays {
    static name = 'birthdays';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;

    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static async getData(testData) {
        let birthdays = await Request.getData(
            Birthdays.url,
            Birthdays.request_data,
            testData
        );
        if (!birthdays.result) {
            return {};
        }
        let data = { result: [[]] };

        if (birthdays.result) {
            birthdays.result.forEach(e => {
                data.result[0].push(e);
            });
        }
        return data;
    }

    static #fit(div) {
        let size = config.getByName('content_birthdays_max_font_size');
        div.style.lineHeight = '1.2';
        do {
            div.style.fontSize = size + 'px';
            size--;
        } while (Library.overflows(div) && size > 10);
        let lH = 120;
        do {
            div.style.lineHeight = lH + 'px';
            lH--;
        } while (Library.overflows(div) && lH > 12);
    }

    async show() {
        $('#div_birthdays').removeClass('d-none');
        let data = this.getBirthdays(this.#name);
        // $('#div_birthdays').append(
        //     $('<div></div>')
        //         .addClass('row')
        //         .append(
        //             $('<p></p>')
        //                 .html('Nearest birthdays')
        //                 .addClass('text-center')
        //         )
        // );
        data.forEach(e => {
            $('#div_birthdays').append(
                $('<div></div>')
                    .addClass('row')
                    .append(
                        $('<div></div>')
                            .addClass('col-3')
                            .append(
                                $('<p></p>')
                                    .addClass('text-end pe-3 content_birthdays_date')
                                    .append(Library.text(e.date, e.date_class))
                            )
                    )
                    .append(
                        $('<div></div>')
                            .addClass('col-9')
                            .append(
                                $('<p></p>')
                                    .addClass('ps-3 content_birthdays_name')
                                    .append(Library.text(e.name, e.name_class))
                            )
                    )
            )
        });

        let div = document.querySelectorAll("#div_birthdays")[0];
        div.style.fontSize = '10px';
        div.style.lineHeight = '12px';
        Library.whenMeasurable(div, () => Birthdays.#fit(div));

        setTimeout(() => { $('#div_birthdays').html(''); $('#div_birthdays').addClass('d-none'); ContentRouter.nextJob() }, config.getByName('content_birthdays_interval'));
    }

    getBirthdays(data) {
        let now = moment().subtract(1, 'day');
        let out = [];
        data.forEach(d => {
            let date_split = d.date.split('.');
            let date_moment = moment([moment().year(), date_split[1] - 1, date_split[0]]);
            if (date_moment.isBefore(now)) {
                date_moment.add(1, 'y');
            }
            d.diff = date_moment.diff(now, 'days');
            d.moment = date_moment;
        });
        data.sort((a, b) => a.diff - b.diff);

        let i = 0;
        while (
            (i < config.getByName('content_birthdays_next_count')) &&
            (i < data.length)
        ) {
            let cls = (data[i].diff == 0) ? 'today' : '';
            out.push({
                date: data[i].moment.format('D MMMM'),
                name: data[i].fio,
                date_class: cls,
                name_class: cls
            });
            i++;
        }

        i = 0;
        while (
            (i < config.getByName('content_birthdays_prev_count')) &&
            (i < data.length)
        ) {
            out.unshift({
                date: data[data.length - i - 1].moment.format('D MMMM'),
                name: data[data.length - i - 1].fio,
                date_class: 'prev',
                name_class: ''
            });
            i++;
        }

        return out;
    }

    static makeJob(data) {
        let job = {
            h: Library.stringToHash(this.prehash + JSON.stringify(data)),
            cl: new Birthdays(data),
        }
        return job;
    }

    static initContent() {
        $('#div_content_area').append(
            $('<div></div>')
                .attr('id', 'div_birthdays')
                .addClass('w-100 h-100 d-none align-items-center py-4')
        );
        let div = document.querySelector('#div_birthdays');
        Library.observeFit(div, () => Birthdays.#fit(div));
        Library.keepFit(div, () => Birthdays.#shrinkIfNeeded(div));
    }

    // Шаг секундного сторожа: уменьшаем сначала межстрочный интервал (более
    // тонкая настройка), и только когда он уже на минимуме - размер шрифта.
    // Без сброса к максимуму, иначе на каждой проверке был бы виден скачок.
    static #shrinkIfNeeded(div) {
        if (!Library.overflows(div)) {
            return;
        }
        let lH = parseInt(div.style.lineHeight, 10);
        if (lH && lH > 12) {
            div.style.lineHeight = (lH - 1) + 'px';
            return;
        }
        let size = parseInt(div.style.fontSize, 10);
        if (size && size > 10) {
            div.style.fontSize = (size - 1) + 'px';
        }
    }
}