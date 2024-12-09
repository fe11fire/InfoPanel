class ContentRouter {
    static jobs = [];
    static round = 1;
    // static #sources = [Birthdays];
    // static #sources = [Present];
    // static #sources = [Text];
    static #sources = [Present, Video, Img, Text, Birthdays];

    static async #addJobs(myClass, testData = undefined) {
        let jobs = [];
        let data = await myClass.getData(testData);
        if (data.result) {
            data.result.forEach(e => {
                jobs.push(myClass.makeJob(e));
            });
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

        for (let i = 0; i < ContentRouter.#sources.length; i++) {
            jobs = jobs.concat(await ContentRouter.#addJobs(ContentRouter.#sources[i]));
        }
        // jobs = jobs.concat(await Router.#addJobs(Text, ['1.txt', '2.txt']));

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
}