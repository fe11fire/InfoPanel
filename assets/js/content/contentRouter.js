class ContentRouter {
    static jobs = [];
    static round = 1;
    // static #sources = [Birthdays];
    // static #sources = [Present];
    // static #sources = [Text];
    // static #sources = [Video];
    static #sources = [Present, Img, Text, Birthdays, Video];


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
                    if (this.#filterExtension(myClass, e)) {
                        jobs.push(myClass.makeJob(e));
                    }
                });
            }
        } catch (error) {
            PanelErrors.report('content:' + myClass.name, error.message);
            return [];
        }
        return jobs;
    }

    static initContent() {
        ContentRouter.#sources.forEach(source => {
            source.initContent();
        });
        ContentRouter.updateJobs(true);
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

    static async nextJob() {
        await this.updateJobs();
        if (ContentRouter.jobs.length > 0) {
            ContentRouter.jobs[0].cl.show();
            ContentRouter.jobs.push(ContentRouter.jobs.shift());
            ContentRouter.round++;
        } else {
            checkScreensaver();
            setTimeout(() => { ContentRouter.nextJob() }, config.getByName('jobs_restart_timeOut'));
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

    static #filterExtension(myClass, fileName) {
        if (Array.isArray(fileName)){
            return true;
        }
        if (typeof fileName !== 'string'){
            return false;
        }
        let ignore = config.getByName('content_extensions_ignore');
        let ext = fileName.split('.');
        ext = (ext.length == 1) ? '' : ext[ext.length - 1];
        return (
            (!ignore['common'].includes(ext)) &&
            (
                (!ignore[myClass.name]) ||
                (!ignore[myClass.name].includes(ext))
            )
        );
    }
}