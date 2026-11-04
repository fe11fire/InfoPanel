class Present {
    static name = 'present';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;

    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static async getData(testData) {
        return await Request.getData(
            Present.url,
            Present.request_data,
            testData
        );
    }

    static initContent() {
        $('#div_content_area').append(
            $('<div></div>')
                .attr('id', 'div_present')
                .addClass('w-100 h-100 d-none position-relative')
                .append(
                    $('<div></div>')
                        .attr('id', 'swiper')
                        .addClass('w-100 h-100 align-items-center')
                )
                .append(
                    $('<div></div>')
                        .attr('id', 'div_present_title')
                        .addClass('w-100 position-absolute d-none')
                        .append(
                            $('<div></div>')
                                .addClass('w-75 mx-auto')
                                .append(
                                    $('<p></p>')
                                        .addClass('text-center pb-0 pt-3 pb-1 m-0'))

                        )
                )
        );
    }

    async show() {
        let slider;
        let endTimer;
        let watchdog;
        let finished = false;
        try {
            $('#div_present_title').addClass('d-none');
            const [imgs, title] = await Promise.all([
                Present.#findImages(this.#name), Present.#findTitle(this.#name)
            ]);
            if (!imgs.length || title === null) return;
            const interval = config.getByName('content_present_interval');
            const folder = Library.contentPath(config.getByName('path_present')) + Library.encodePath(this.#name) + '/';
            const wrapper = $('<div></div>').addClass('swiper-wrapper');
            imgs.forEach(name => wrapper.append($('<div></div>').addClass('swiper-slide')
                .css('background-image', 'url("' + folder + Library.encodePath(name) + '")')));
            $('#swiper').empty().append(wrapper);
            if (title.length && title[0] !== '') {
                Library.setLines('#div_present_title p', title);
                $('#div_present_title').removeClass('d-none');
            }
            $('#div_present').removeClass('d-none');
            await new Promise((resolve, reject) => {
                const finish = error => {
                    if (finished) return;
                    finished = true;
                    clearTimeout(endTimer);
                    clearTimeout(watchdog);
                    if (error) reject(error);
                    else resolve();
                };
                const lastSlide = () => {
                    if (finished || endTimer !== undefined) return;
                    endTimer = setTimeout(() => finish(), interval);
                };
                // Суммарное время показа плюс переходы и запас. При потере
                // событий Swiper модуль отклоняет Promise и освобождает экран.
                watchdog = setTimeout(() => finish(new Error('Презентация «' + this.#name + '»: превышено время показа')),
                    imgs.length * (interval + 300) + 5000);
                const effects = ['flip', 'cube', 'fade'];
                slider = new Swiper('#swiper', {
                    init: false,
                    speed: 300,
                    effect: effects[Library.randomIntFromInterval(0, 2)],
                    cubeEffect: { shadow: false },
                    autoplay: { delay: interval, stopOnLastSlide: true, disableOnInteraction: false },
                    on: { reachEnd: lastSlide }
                });
                slider.init();
                if (imgs.length === 1) lastSlide();
            });
        } finally {
            finished = true;
            clearTimeout(endTimer);
            clearTimeout(watchdog);
            try {
                if (slider) slider.destroy(true, true);
            } finally {
                $('#swiper').empty();
                $('#div_present_title').addClass('d-none');
                $('#div_present').addClass('d-none');
            }
        }
    }

    static async #findImages(folder, testData = undefined) {
        let imgs = [];
        let data = await Request.getData(
            Present.url,
            { path: folder },
            testData);
        if (data.result) {
            data.result.forEach(e => {
                imgs.push(e);
            });
        }
        return imgs;
    }

    static async #findTitle(folder, testData = undefined) {
        let title = [];
        let data = await Request.getData(
            Present.url,
            {
                path: folder,
                title: 'true'
            },
            testData);
        if (data.failed) return null;
        if (data.result) {
            data.result.forEach(e => {
                title.push(e);
            });
        }
        return title;
    }

    static makeJob(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data),
            cl: new Present(data),
        }
        return job;
    }

}
