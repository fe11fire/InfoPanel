class Img {
    static url = 'http://localhost:8084/imgs';
    static request_data = {};
    static prehash = 'imgs';

    #folder = 'content/imgs/';
    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static async getData(testData) {
        return await Request.getData(
            Img.url,
            Img.request_data,
            testData
        );
    }

    static initContent() {
        $('#div_content_area').append(
            $('<div></div>')
                .attr('id', 'div_img')
                .addClass('w-100 h-100 d-none')
        );
    }

    async show() {
        $('#div_img').css('background-image', 'url(\'' + this.#folder + this.#name + '\')');
        $('#div_img').removeClass('d-none');

        setTimeout(() => { $('#div_img').addClass('d-none'); ContentRouter.nextJob() }, config.getByName('content_img_interval'));
    }


    static makeJob(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data),
            cl: new Img(data),
        }
        return job;
    }
}