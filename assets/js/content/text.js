class Text {
    static url = 'http://localhost:8084/text';
    static request_data = {};
    static prehash = 'text';

    #folder = 'content/text/';
    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static async getData(testData) {
        return await Request.getData(
            Text.url,
            Text.request_data,
            testData
        );
    }

    static initContent() {
        $('#div_content_area').append(
            $('<div></div>')
                .attr('id', 'div_text')
                .addClass('w-100 h-100 d-none text-center p-3')
        );
    }

    async show() {
        $('#div_text').removeClass('d-none');

        let message = await Text.#findMessage(this.#name);

        $('#div_text').html(message.join('<br>'));
        let size = 120;
        let div = document.querySelectorAll("#div_text")[0];
        do {
            div.style.fontSize = size + 'px';
            size--;
        } while ((div.clientWidth < div.scrollWidth || div.clientHeight < div.scrollHeight) && size > 15);




        setTimeout(() => { $('#div_text').addClass('d-none'); Router.nextJob() }, config.getByName('text_interval'));
    }

    static async #findMessage(name, testData = undefined) {
        let message = [];
        let data = await Request.getData(
            Text.url,
            { name: name },
            testData);
        if (data.result) {
            data.result.forEach(e => {
                message.push(e);
            });
        }
        return message;
    }

    static makeJob(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data),
            cl: new Text(data),
        }
        return job;
    }
}