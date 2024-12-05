class Router {
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
        Router.#sources.forEach(source => {
            source.initContent();
        });
        Router.updateJobs(true);
    }

    static async updateJobs(init = false) {
        let newJobs = [];
        let currentJobs = [];
        let jobs = [];

        for (let i = 0; i < Router.#sources.length; i++) {
            jobs = jobs.concat(await Router.#addJobs(Router.#sources[i]));
        }
        // jobs = jobs.concat(await Router.#addJobs(Text, ['1.txt', '2.txt']));

        jobs.forEach(job => {
            let index = Router.jobs.findIndex(function (e) {
                return e.h == job.h
            });

            if (index == -1) {
                newJobs.push(job);
            } else {
                currentJobs[index] = Router.jobs[index];
            }
        });

        Router.jobs = newJobs.concat(currentJobs);
        Router.jobs = Object.values(Router.jobs);
        if (init) {
            Router.#shuffleJobs();
            $('body').css('height', $(window).height() + 'px');
        }
        console.log(Router.jobs);
    }

    static async nextJob() {
        await this.updateJobs();
        if (Router.jobs.length > 0) {
            Router.jobs[0].cl.show();
            Router.jobs.push(Router.jobs.shift());
            Router.round++;
        } else {
            setTimeout(() => { Router.nextJob() }, config.getByName('jobs_restart_timeOut'));
        }
    }

    static #shuffleJobs() {
        for (let i = Router.jobs.length - 1; i >= 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let temp = Router.jobs[i];
            Router.jobs[i] = Router.jobs[j];
            Router.jobs[j] = temp;
        }
    }
}