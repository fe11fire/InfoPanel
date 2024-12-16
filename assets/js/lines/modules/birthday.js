class Birthday {
    static url = Default.backend_url + 'birthday';
    static request_data = { "day": moment().format('D').toString(), "month": moment().format('M').toString() };
    static prehash = 'birthday';

    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static async getData(testData) {
        return await Request.getData(
            Birthday.url,
            Birthday.request_data,
            testData
        );
    }

    static makeLine(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data),
            cl: new Birthday(data),
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
        $('#div_birthday p').html('<span class="span_birthday_name">' + this.#name + '</span>&nbsp;&nbsp;&nbsp;поздравляем с днем рождения  !');
        $('#div_birthday').css('background-position', Library.randomIntFromInterval(1, 100) + 'px ' + Library.randomIntFromInterval(1, 100) + 'px')
        $('#div_row_info_line').addClass('is-show');
    }

    hide() {
        $('#div_birthday').addClass('d-none');
    }
}