class Video {
    static url = 'http://localhost:8084/video';
    static request_data = {};
    static prehash = 'video';
    static player;

    #folder = 'content/video/';
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

        // $('#div_img').addClass('d-none');
        player = new Plyr('#player', {
            loadSprite: false
        });

        player.on('ended', (event) => {
            player.destroy();
            $('#div_player').addClass('d-none');
            randomManage();
        });

        player.source = {
            type: 'video',
            storage: { enabled: false },
            sources: [{
                src: this.#folder + this.#name,
                type: 'video/mp4',
            },
            ],
        };
        $('#div_player').removeClass('d-none');
        player.play();
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
                        .attr('data-plyr-config', '{ "blankVideo": "assets/plyr/blank.mp4" }')
                        .append(
                            $('<source>').attr('type', 'video/mp4')
                        )
                )
        );
    }
}