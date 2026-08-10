class Video {
    static name = 'video';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;
    static player;
    // Завершение может прийти дважды: по событию ended и по таймауту ошибки,
    // а второй destroy() ломает разметку плеера и запускает лишнюю ветку ротации.
    static #ended = false;

    #folder = Default.paths.path_video + '/';
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
        // Plyr пересоздает элемент <video> при установке source, поэтому id="player"
        // после первого показа в DOM отсутствует. Если положиться на элемент из
        // initContent, повторный new Plyr не найдет медиа, player.volume упадет и
        // оборвет show() вместе со всей ротацией - собираем элемент заново.
        $('#div_player').html(Video.#makeMedia());
        Video.#ended = false;

        player = new Plyr('#player', {
            loadSprite: false
        });

        player.on('ended', (event) => {
            Video.#endVideo(player)
        });

        player.source = {
            type: 'video',
            storage: { enabled: false },
            sources: [{
                src: this.#folder + Library.encodePath(this.#name),
                type: 'video/mp4',
            },],
        };

        player.volume = config.getByName('content_video_volume');
        $('#div_player').removeClass('d-none');

        let errorCancelTimeout = setTimeout(() => { Video.#endVideo(player) }, 5000);

        player.on('playing', (event) => {
            clearTimeout(errorCancelTimeout);
        });

        player.play();
    }

    static #endVideo(player) {
        if (Video.#ended) {
            return;
        }
        Video.#ended = true;
        player.destroy();
        $('#div_player').addClass('d-none');
        randomManage();
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