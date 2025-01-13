class Birthdays {
    static url = Default.backend_url + 'birthdays';
    static request_data = {};
    static prehash = 'birthdays';

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
                                    .html(e.date)
                                    .addClass('text-end pe-3 content_birthdays_date')
                            )
                    )
                    .append(
                        $('<div></div>')
                            .addClass('col-9')
                            .append(
                                $('<p></p>')
                                    .html(e.name)
                                    .addClass('ps-3 content_birthdays_name')
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
            let date = data[i].moment.format('D MMMM');
            let name = data[i].fio;
            if (data[i].diff == 0) {
                date = '<span class="today">' + date + '</span>';
                name = '<span class="today">' + name + '</span>';
            }
            out.push({ date: date, name: name });
            i++;
        }

        i = 0;
        while (
            (i < config.getByName('content_birthdays_prev_count')) &&
            (i < data.length)
        ) {
            out.unshift({ date: '<span class="prev">' + data[data.length - i - 1].moment.format('D MMMM') + '</span>', name: data[data.length - i - 1].fio });
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