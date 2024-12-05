class Matrix {
    w;
    h;
    c;
    content = "abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789";
    ctx;
    contentLength;
    position = [];
    timer;
    #config;

    constructor(config) {
        this.#config = config;
        this.c = document.querySelector("#canvas");
        this.c.classList.remove('d-none');
        this.c.width = this.w = $(window).width();
        this.c.height = this.h = $(window).height() + 100;
        this.ctx = this.c.getContext("2d");
        this.ctx.fillColor = "#000";
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.contentLength = this.content.length;
        this.ctx.font = "10px Arial";

        for (let i = 0; i < this.contentLength; i++) {
            this.position[i] = 0;
        }
    }

    start() {
        $('canvas').addClass('is-show');
        return setInterval(this.step, 1, this);
    }

    prestart() {
        for (let index = 0; index < 100000; index++) {
            this.step(this);
        }
    }

    static stop(timer) {
        $('canvas').removeClass('is-show');
        clearInterval(timer);
        timer = null;
    }

    hide() {
        this.c.classList.add('d-none');
    }

    screenSaveFunc(func, delay) {
        this.#startScreenSave(delay).then((t) => {
            let d = this.#config.getByName('matrix_duration');
            setTimeout(Matrix.stop, d + delay, t);
            setTimeout(func, d / 1.2 + delay);
        });

    }

    #startScreenSave(delay) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                let t = this.start();
                resolve(t);
            }, delay);
        });
    }

    step(a) {
        a.ctx.fillStyle = "#0f0";
        var rndPos = Math.floor(Math.random() * a.contentLength);
        var posX = rndPos * 10;
        var posY = a.position[rndPos];
        a.position[rndPos] += 10;
        if (a.position[rndPos] > a.h) {
            a.position[rndPos] = 0;
            a.ctx.fillStyle = "#0008";
            a.ctx.fillRect(posX, 0, 10, a.h);
        }
        rndPos = Math.floor(Math.random() * a.contentLength);
        a.ctx.fillText(a.content[rndPos], posX, posY);
    }
}
