class Video {
    static name = 'video';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;

    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static async getData(testData) {
        return await Request.getData(
            Video.url,
            Video.request_data,
            testData
        );
    }

    async show() {
        // Состояние и таймеры принадлежат одному показу. Поздние события старого
        // плеера не могут завершить следующий ролик или запустить вторую очередь.
        let mediaPlayer;
        let finished = false;
        let started = false;
        let startTimer;
        let progressTimer;
        let lastPosition = 0;
        let lastProgress = Date.now();
        const fail = reason => finish(reason);
        const finish = reason => {
            if (finished) return;
            finished = true;
            clearTimeout(startTimer);
            clearTimeout(progressTimer);
            if (reason) PanelErrors.report('video:' + this.#name, 'Видео «' + this.#name + '»: ' + reason);
            try {
                if (mediaPlayer) mediaPlayer.destroy();
            } catch (error) {
                PanelErrors.report('video:' + this.#name, 'Видео «' + this.#name + '»: ошибка закрытия плеера: ' + error.message);
            } finally {
                $('#div_player').addClass('d-none');
                randomManage();
            }
        };
        const checkProgress = () => {
            if (finished) return;
            const now = Date.now();
            const position = Number(mediaPlayer.currentTime);
            if (Number.isFinite(position) && position > lastPosition) {
                lastPosition = position;
                lastProgress = now;
            }
            const configured = Number(config.getByName('video_stall_timeout'));
            const timeout = Number.isFinite(configured) && configured > 0 ? configured : 15000;
            if (started && now - lastProgress >= timeout) {
                fail('нет прогресса воспроизведения ' + timeout + ' мс');
                return;
            }
            progressTimer = setTimeout(checkProgress, Math.min(1000, timeout));
        };
        try {
            $('#div_player').html(Video.#makeMedia());
            mediaPlayer = new Plyr('#player', { loadSprite: false });
            player = mediaPlayer;
            mediaPlayer.on('ended', () => finish());
            mediaPlayer.on('error', () => {
                const code = mediaPlayer.media?.error?.code;
                fail('ошибка плеера' + (code ? ' (код ' + code + ')' : ''));
            });
            mediaPlayer.on('playing', () => {
                if (finished || started) return;
                started = true;
                clearTimeout(startTimer);
                lastPosition = Number(mediaPlayer.currentTime) || 0;
                lastProgress = Date.now();
                progressTimer = setTimeout(checkProgress, 0);
            });
            startTimer = setTimeout(() => fail('воспроизведение не началось за 5000 мс'), 5000);
            mediaPlayer.source = {
                type: 'video',
                storage: { enabled: false },
                sources: [{ src: Library.contentPath(config.getByName('path_video')) + Library.encodePath(this.#name), type: 'video/mp4' }]
            };
            if (finished) return;
            mediaPlayer.volume = config.getByName('content_video_volume');
            $('#div_player').removeClass('d-none');
            const playing = mediaPlayer.play();
            if (playing && typeof playing.catch === 'function') {
                playing.catch(error => fail('не удалось начать воспроизведение: ' + (error?.message || 'неизвестная ошибка')));
            }
        } catch (error) {
            fail('ошибка запуска: ' + error.message);
        }
    }

    static makeJob(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data),
            cl: new Video(data),
        }
        return job;
    }

    static #makeMedia() {
        return $('<video></video>')
            .attr('id', 'player')
            .addClass('h-100 w-100')
            .attr('data-plyr-config', '{ "blankVideo": "assets/plyr/blank.mp4"}')
            .append(
                $('<source>').attr('type', 'video/mp4')
            );
    }

    static initContent() {
        $('#div_content_area').append(
            $('<div></div>')
                .attr('id', 'div_player')
                .addClass('w-100 h-100 d-none align-items-center')
                .append(Video.#makeMedia())
        );
    }
}