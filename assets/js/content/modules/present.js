class Present {
    static name = 'present';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;

    #folder = Default.paths.path_present + '/';
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
        $('#div_present').removeClass('d-none');
        $('#div_present_title').addClass('d-none');
        let imgs = await Present.#findImages(this.#name);
        let title = await Present.#findTitle(this.#name);

        $('#swiper').append(
            $('<div></div>')
                .addClass('swiper-wrapper')
        );

        let swiper_config = {
            autoplay: {
                delay: config.getByName('content_present_interval'),
            },
            on: {
                reachBeginning: Present.#endPresent,
            },
        }

        switch (Library.randomIntFromInterval(1, 3)) {
            case 1:
                swiper_config['effect'] = 'flip';
                break;
            case 2:
                swiper_config['effect'] = 'cube';
                swiper_config['cubeEffect'] = {
                    'shadow': false
                };
                break;
            case 3:
                swiper_config['effect'] = 'fade';
                break;
            // case 4:
            //     swiper_config['effect'] = 'cards';
            //     swiper_config['cardsEffect'] = {
            //         shadow: false,
            //         slideShadows: false,
            //     };
            //     break;
            default:
                break;
        }

        swiper = new Swiper('#swiper', swiper_config);
        swiper.autoplay.stop();

        let index = 1;
        imgs.forEach(i => {
            swiper.addSlide(index, '<div class="swiper-slide" style="background-image: url(\'' + this.#folder + this.#name + '/' + i + '\')"></div>')
            index++;
        });

        if (
            (title.length > 0) &&
            (title[0] != '')
        ) {
            $('#div_present_title p').html(title.join('<br>'));
            $('#div_present_title').removeClass('d-none');
        }

        swiper.update();
        swiper.autoplay.start();
        if (imgs.length == 1) {
            setTimeout(Present.#endPresent, config.getByName('content_present_interval'));
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

    static #endPresent() {
        swiper.destroy(false, true);
        $('.swiper-wrapper').remove();
        $('#div_present').addClass('d-none');
        ContentRouter.nextJob();
    }
}