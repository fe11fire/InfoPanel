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
        let onVisibilityChange;
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
            // При первом показе родитель еще может быть скрыт заставкой.
            // Swiper нельзя инициализировать с нулевыми размерами.
            await Library.waitForSize(document.querySelector('#swiper'));
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
                let lastIndex = 0;
                let lastProgress = Date.now();
                onVisibilityChange = () => { lastProgress = Date.now(); };
                document.addEventListener('visibilitychange', onVisibilityChange);
                const observeProgress = () => {
                    if (finished || !slider) return;
                    const index = slider.activeIndex;
                    if (index !== lastIndex) {
                        lastIndex = index;
                        lastProgress = Date.now();
                    }
                    if (index === imgs.length - 1) lastSlide();
                };
                const checkProgress = () => {
                    if (finished) return;
                    try {
                        if (document.hidden) {
                            lastProgress = Date.now();
                            watchdog = setTimeout(checkProgress, 1000);
                            return;
                        }
                        observeProgress();
                        // Финальный слайд уже завершится своим таймером.
                        if (endTimer !== undefined) return;
                        const stalled = Date.now() - lastProgress;
                        if (stalled >= interval + 300 + 5000) {
                            finish(new Error('нет перехода со слайда №' + (lastIndex + 1) +
                                ' («' + imgs[lastIndex] + '») за ' + stalled + ' мс'));
                            return;
                        }
                        watchdog = setTimeout(checkProgress, 1000);
                    } catch (error) { finish(error); }
                };
                const effects = ['flip', 'cube', 'fade'];
                slider = new Swiper('#swiper', {
                    init: false,
                    speed: 300,
                    effect: effects[Library.randomIntFromInterval(0, 2)],
                    cubeEffect: { shadow: false },
                    // Эффекты cube/flip/fade могут не прислать transitionend обертки.
                    // Следующий слайд запускается по интервалу, без ожидания этого события.
                    autoplay: { delay: interval, waitForTransition: false, stopOnLastSlide: true, disableOnInteraction: false },
                    on: { slideChange: observeProgress }
                });
                slider.init();
                observeProgress();
                watchdog = setTimeout(checkProgress, 1000);
            });
        } catch (error) {
            throw new Error('Презентация «' + this.#name + '»: ' + (error.message || String(error)) +
                '. Проверьте папку из path_present в backend/config.json и ошибки Swiper в консоли.', { cause: error });
        } finally {
            finished = true;
            if (onVisibilityChange) document.removeEventListener('visibilitychange', onVisibilityChange);
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
        const sort = config.getByName('content_present_sort');
        if (sort === 'asc' || sort === 'desc') {
            const collator = new Intl.Collator('ru', { numeric: true });
            const direction = sort === 'asc' ? 1 : -1;
            imgs.sort((first, second) => direction * (collator.compare(first, second)
                || (first < second ? -1 : Number(first > second))));
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
