class Config {
    #data;
    #m; //Матрица
    #exp; //Параметр для отладки. Время начала работы скрипта.
    #t_side_changing;
    #i_side_changing;
    #t_update_interval;

    constructor() {
        this.#exp = moment();
    }

    async init() {
        let data;
        try {
            data = await Request.getData(
                'http://localhost:8084/config',
            );
        } catch (exceptionVar) {
            data = {};
            console.log('empty config');
        }
        this.#data = data;
        // console.log(this.#data);
    }

    getByName(name) {
        if (this.isset(this.#data[name])) {
            return this.#data[name]
        }
        if (this.isset(Default.system[name])) {
            return Default.system[name]
        }
        if (this.isset(Default.css[name])) {
            return Default.css[name]
        }
        console.log('Config ' + name + ' not found');
        return null;
    }

    getMatrix() {
        return this.#m;
    }

    async updateConfig() {
        console.log(moment().diff(this.#exp, 'seconds') + ' - updateConfig');
        await this.init();

        if (this.getByName('matrix_enable')) {
            if (!this.#m) {
                this.#m = new Matrix(this);
                this.#m.prestart();
            }
        } else {
            if (this.#m) {
                this.#m.hide();
            }
        }

        if ((this.getByName('side_changing')) && (this.#i_side_changing != this.getByName('side_changing_interval'))) {
            this.#t_side_changing = this.clearTimer(this.#t_side_changing);
            this.#i_side_changing = this.getByName('side_changing_interval');
            if (this.getByName('matrix_enable')) {
                this.#t_side_changing = setInterval(() => { this.#m.screenSaveFunc(Config.changeSide, 0) }, this.getByName('side_changing_interval'));
            } else {
                this.#t_side_changing = setInterval(() => { Config.changeSide(); }, this.getByName('side_changing_interval'));
            }
        }

        this.#t_update_interval = this.clearTimer(this.#t_update_interval);
        this.#t_update_interval = setInterval(() => { this.updateConfig() }, this.getByName('config_update_interval'));

        Object.keys(Default.css).forEach(e => {
            document.documentElement.style.setProperty("--" + e, this.getByName(e));
        });

        $('#div_header p').html(this.getByName('header_text'));

        Config.updateElementsSize(this);

    }

    static updateElementsSize(config) {
        $('body').css('height', $(window).height() + 'px');
        let h = $('body .container-fluid').height();

        let h_info = 0;
        if (LineRouter.lines.length > 0) {
            h_info = config.getByName('info_line_height');
        }
        document.documentElement.style.setProperty("--info_line_height", h_info);
        h_info = $('#div_info_line').height();
        $('#div_col_content').css('height', (h - h_info) + 'px');
        $('#div_col_info').css('height', (h - h_info) + 'px');
        $('#div_content_area').css('height', (h - h_info - $('#div_header').height()) + 'px');
    }

    clearTimer(t) {
        clearInterval(t);
        return null;
    }

    static changeSide() {
        if ($('#div_col_info').hasClass('order-1')) {
            $('#div_col_info').removeClass('order-1');
            $('#div_col_content').removeClass('order-2');
        } else {
            $('#div_col_info').addClass('order-1');
            $('#div_col_content').addClass('order-2');
        }
    }

    isset(accessor) {
        try {
            return accessor !== undefined && accessor !== null
        } catch (e) {
            return false
        }
    }
}