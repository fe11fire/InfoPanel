class Config {
    static empty = true;
    #data = {};
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
                Default.backend_url + 'config',
            );
            if (data.length == 0) {
                Config.empty = true;
                showScreensaver();
            } else {
                Config.empty = false;
            }
        } catch (exceptionVar) {
            data = [];
            Config.empty = true;
            showScreensaver();
            console.log('empty config');
        }
        const showErrors = this.#data.show_errors;
        const errorTtl = this.#data.error_ttl;
        this.#data = Config.empty ? {} : ConfigRules.validate(data);
        if (Config.empty && showErrors !== undefined) this.#data.show_errors = showErrors;
        if (Config.empty && errorTtl !== undefined) this.#data.error_ttl = errorTtl;
        PanelErrors.enabled = this.getByName('show_errors');
        PanelErrors.setTtl(this.getByName('error_ttl'));
    }

    getByName(name) {
        if (this.isset(this.#data[name])) {
            return this.#data[name]
        }
        if (this.isset(Default.system[name])) {
            return Default.system[name]
        }
        if (this.isset(Default.css[name])) {
            if (typeof Themes !== 'undefined' && this.isset(Themes.values[name])) return Themes.values[name];
            return Default.css[name]
        }
        if (['path_video', 'path_images', 'path_present', 'path_pdf'].includes(name)) {
            return '../' + Default.paths[name];
        }
        console.log('Config ' + name + ' not found');
        return null;
    }

    getMatrix() {
        return this.#m;
    }

    async updateConfig() {
        // console.log(moment().diff(this.#exp, 'seconds') + ' - updateConfig');
        await this.init();
        await Themes.apply(this.getByName('theme'));

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

        if (!this.getByName('side_changing')) {
            this.#t_side_changing = this.clearTimer(this.#t_side_changing);
            this.#i_side_changing = null;
        } else if (this.#i_side_changing != this.getByName('side_changing_interval')) {
            this.#t_side_changing = this.clearTimer(this.#t_side_changing);
            this.#i_side_changing = this.getByName('side_changing_interval');
            // Матрица проверяется в момент срабатывания, а не при создании таймера,
            // иначе включение matrix_enable на лету не учитывается до перезагрузки.
            this.#t_side_changing = setInterval(() => {
                if ((this.getByName('matrix_enable')) && (this.#m)) {
                    this.#m.screenSaveFunc(Config.changeSide, 0);
                } else {
                    Config.changeSide();
                }
            }, this.#i_side_changing);
        }

        this.#t_update_interval = this.clearTimer(this.#t_update_interval);
        this.#t_update_interval = setInterval(() => { this.updateConfig() }, this.getByName('config_update_interval'));

        Object.keys(Default.css).forEach(e => {
            document.documentElement.style.setProperty("--" + e, this.getByName(e));
        });

        $('#div_header p').empty().append(Library.markup(this.getByName('header_text')));

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

    // Модуль включен, пока настройка with_<name> явно не выключена: отсутствующая
    // или испорченная настройка не должна гасить блок на работающей панели.
    static isEnabled(myClass) {
        let value = config.getByName('with_' + myClass.name);
        return (value !== false) && (value !== 'false') && (value !== 0);
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
