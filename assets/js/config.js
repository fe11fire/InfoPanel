class Config {
    #data;
    #m; //Матрица
    #exp; //Параметр для отладки. Время начала работы скрипта.
    #t_side_changing;
    #i_side_changing;
    #t_update_interval;

    //Все таймеры в милисекундах 3600000 - час, 72000000 - полдня
    #default = {
        matrix_enable: false, // Включение заставки Матрицы при смене экрана
        matrix_duration: 2000, // Длительность заставки Матрицы при переходе
        start_timeOut: 3000, //пауза перед показом контента, лучше чтобы была, так как идет асинхронная подгрузка очереди в процедурном стиле кода
        side_changing: false,
        side_changing_interval: 15000, // интервал смены сторон
        config_update_interval: 20000,
        jobs_restart_timeOut: 10000,
        header_text: 'Название<br>организации',
        content_present_interval: 10000,
        content_img_interval: 10000,
        content_text_interval: 10000,
        content_birthdays_interval: 10000,
        content_birthdays_next_count: 5,
        content_birthdays_prev_count: 2,
        content_birthdays_max_font_size: 24, // пиксели
        info_line_height: '40px',
        info_line_changing_interval: 15000,
    };
    #default_css = {
        cursor: 'default',
        background_color: '#08184f',
        padding_top: '20px',
        padding_bottom: '20px',
        padding_left: '50px',
        padding_right: '50px',
        header_height: '80px',
        header_font_size: '26px',
        header_color: '#fff',
        info_line_background_color: 'linear-gradient(#08184f, #9198e5)',
        logo_width: '100px',
        calendar_color: '#fff',
        calendar_day_font_size: '75px',
        calendar_text_font_size: '20px',
        clock_color: '#fff',
        clock_size: '50px',
        clock_colon_width: '15px',
        birthday_name_font_size: "30px",
        birthday_text_font_size: "24px",
        birthday_color: "#fff",
    }

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
        if (this.isset(this.#default[name])) {
            return this.#default[name]
        }
        if (this.isset(this.#default_css[name])) {
            return this.#default_css[name]
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

        Object.keys(this.#default_css).forEach(e => {
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