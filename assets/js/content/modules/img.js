class Img {
    static name = 'imgs';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;

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
        $('#div_img').css('background-image', 'url(\'' + Library.contentPath(config.getByName('path_images')) + Library.encodePath(this.#name) + '\')');
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