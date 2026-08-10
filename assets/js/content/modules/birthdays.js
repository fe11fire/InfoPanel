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

        let size = config.getByName('content_birthdays_max_font_size');
        let div = document.querySelectorAll("#div_birthdays")[0];
        div.style.lineHeight = '1.2';
        do {
            div.style.fontSize = size + 'px';
            size--;
            // debugger;
        } while ((div.clientHeight < div.scrollHeight) && size > 10);
        let lH = 120;
        do {
            div.style.lineHeight = lH + 'px';
            lH--;
            // debugger;
        } while ((div.clientHeight < div.scrollHeight) && lH > 12);

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
    }
}