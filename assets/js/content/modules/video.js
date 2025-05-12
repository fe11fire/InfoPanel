class Video {
    static name = 'video';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;
    static player;

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
                src: this.#folder + this.#name,
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

    static initContent() {
        $('#div_content_area').append(
            $('<div></div>')
                .attr('id', 'div_player')
                .addClass('w-100 h-100 d-none align-items-center')
                .append(
                    $('<video></video>')
                        .attr('id', 'player')
                        .addClass('h-100 w-100')
                        .attr('data-plyr-config', '{ "blankVideo": "assets/plyr/blank.mp4"}')
                        .append(
                            $('<source>').attr('type', 'video/mp4')
                        )
                )
        );
    }
}