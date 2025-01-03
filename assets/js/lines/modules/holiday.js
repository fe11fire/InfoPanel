class Holiday {
    static url = Default.backend_url + 'holiday';
    static prehash = 'holiday';

    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static request_data() {
        return { "day": moment().format('D').toString(), "month": moment().format('M').toString() };
    }

    static async getData(testData) {
        return await Request.getData(
            Holiday.url,
            Holiday.request_data(),
            testData
        );
    }

    static makeLine(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data),
            cl: new Holiday(data),
        }
        return job;
    }

    static initContent() {
        $('#div_row_info_line').append(
            $('<div></div>')
                .attr('id', 'div_holiday')
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
        $('#div_holiday').removeClass('d-none');
        $('#div_holiday p').html('Сегодня отмечается&nbsp;&nbsp;<span class="span_holiday_name">' + this.#name + '</span>&nbsp;&nbsp;!');
        $('#div_holiday').css('background-position', Library.randomIntFromInterval(1, 100) + 'px ' + Library.randomIntFromInterval(1, 100) + 'px')
        $('#div_row_info_line').addClass('is-show');
    }

    hide() {
        $('#div_holiday').addClass('d-none');
    }
}