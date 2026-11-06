class ContentRouter {
    static jobs = [];
    static round = 1;
    static #running = false;
    static #firstUpdate = true;
    // static #sources = [Birthdays];
    // static #sources = [Present];
    // static #sources = [Text];
    // static #sources = [Video];
    static #sources = [Present, Img, Text, Birthdays, Video, Pdf];


    static async #addJobs(myClass, testData = undefined) {
        let jobs = [];
        // Выключенный модуль не опрашивается. Пустой список задач для источника
        // означает, что при слиянии его задачи уходят из очереди сами.
        if (!Config.isEnabled(myClass)) {
            return jobs;
        }
        try {
            let data = await myClass.getData(testData);
            if (data.result) {
                data.result.forEach(e => {
                    if (typeof e === 'string' || Array.isArray(e)) {
                        jobs.push(myClass.makeJob(e));
                    }
                });
            }
        } catch (error) {
            PanelErrors.report('content:' + myClass.name,
                'Модуль «' + myClass.name + '»: не удалось подготовить элементы для очереди. ' +
                'Элементы этого модуля пропущены. Причина: ' + (error.message || String(error)));
            return [];
        }
        return jobs;
    }

    static initContent() {
        ContentRouter.#sources.forEach(source => {
            source.initContent();
        });
    }

    static async updateJobs(init = false) {
        let newJobs = [];
        let currentJobs = [];
        let jobs = [];

        // Источники независимы, поэтому опрашиваются одновременно: последовательное
        // ожидание складывало задержки всех запросов перед каждым переключением.
        // Promise.all сохраняет порядок источников, порядок задач не меняется.
        let sourceJobs = await Promise.all(
            ContentRouter.#sources.map(source => ContentRouter.#addJobs(source))
        );
        sourceJobs.forEach(sourceJob => {
            jobs = jobs.concat(sourceJob);
        });

        jobs.forEach(job => {
            let index = ContentRouter.jobs.findIndex(function (e) {
                return e.h == job.h
            });

            if (index == -1) {
                newJobs.push(job);
            } else {
                currentJobs[index] = ContentRouter.jobs[index];
            }
        });

        ContentRouter.jobs = newJobs.concat(currentJobs);
        ContentRouter.jobs = Object.values(ContentRouter.jobs);
        if (init) {
            ContentRouter.#shuffleJobs();
            $('body').css('height', $(window).height() + 'px');
        }

        console.log(ContentRouter.jobs);
    }

    static async start() {
        if (this.#running) return;
        this.#running = true;
        while (this.#running) {
            try {
                await this.nextJob();
            } catch (error) {
                PanelErrors.report('content:queue', 'Ошибка обновления очереди: ' + error.message);
                await Library.delay(config.getByName('jobs_restart_timeOut'));
            }
        }
    }

    static async nextJob() {
        await this.updateJobs(this.#firstUpdate);
        this.#firstUpdate = false;
        if (ContentRouter.jobs.length === 0) {
            checkScreensaver();
            await Library.delay(config.getByName('jobs_restart_timeOut'));
            return;
        }
        const job = ContentRouter.jobs[0];
        ContentRouter.jobs.push(ContentRouter.jobs.shift());
        ContentRouter.round++;
        try {
            hideScreensaver();
            // show завершается только после полного показа и очистки модуля.
            await job.cl.show();
        } catch (error) {
            PanelErrors.report('content:show:' + job.h,
                'Не удалось показать элемент. Очередь продолжится. Причина: ' + (error.message || String(error)));
        }
    }

    static #shuffleJobs() {
        for (let i = ContentRouter.jobs.length - 1; i >= 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let temp = ContentRouter.jobs[i];
            ContentRouter.jobs[i] = ContentRouter.jobs[j];
            ContentRouter.jobs[j] = temp;
        }
    }

}
