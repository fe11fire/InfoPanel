class ConfigRules {
    static positiveNumber = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
    static nonNegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
    static boolean = value => typeof value === 'boolean';
    static string = value => typeof value === 'string';
    static path = value => { Library.contentPath(value); return true; };

    // Стандартные значения хранятся только в Default. Здесь — ограничения.
    static rules = {
        request_timeout: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        error_ttl: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        video_stall_timeout: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        matrix_duration: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        start_timeOut: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        side_changing_interval: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        config_update_interval: {
            check: value => typeof value === 'number' && Number.isFinite(value) && value >= 10000,
            expected: 'число не меньше 10000 мс (10 секунд)'
        },
        jobs_restart_timeOut: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        content_present_interval: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        content_present_sort: {
            check: value => ['default', 'asc', 'desc'].includes(value),
            expected: '"default", "asc" или "desc"'
        },
        content_pdf_interval: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        content_img_interval: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        content_text_interval: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        content_birthdays_interval: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        info_line_changing_interval: { check: this.positiveNumber, expected: 'число больше 0, мс' },
        content_video_volume: {
            check: value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1,
            expected: 'число от 0 до 1'
        },
        birthday_leap_day: { check: value => ['less', 'more'].includes(value), expected: '"less" или "more"' },
        content_birthdays_next_count: { check: this.nonNegativeInteger, expected: 'целое число от 0' },
        content_birthdays_prev_count: { check: this.nonNegativeInteger, expected: 'целое число от 0' },
        line_next_birthdays_count: { check: this.nonNegativeInteger, expected: 'целое число от 0' },
        content_birthdays_max_font_size: { check: this.positiveNumber, expected: 'число больше 0, пиксели' },
        show_errors: { check: this.boolean, expected: 'true или false' },
        matrix_enable: { check: this.boolean, expected: 'true или false' },
        side_changing: { check: this.boolean, expected: 'true или false' },
        with_present: { check: this.boolean, expected: 'true или false' },
        with_pdf: { check: this.boolean, expected: 'true или false' },
        with_imgs: { check: this.boolean, expected: 'true или false' },
        with_text: { check: this.boolean, expected: 'true или false' },
        with_birthdays: { check: this.boolean, expected: 'true или false' },
        with_video: { check: this.boolean, expected: 'true или false' },
        with_birthday: { check: this.boolean, expected: 'true или false' },
        with_next_birthdays: { check: this.boolean, expected: 'true или false' },
        header_text: { check: this.string, expected: 'строка' },
        path_video: { check: this.path, expected: 'относительный путь внутри сайта от каталога backend' },
        path_images: { check: this.path, expected: 'относительный путь внутри сайта от каталога backend' },
        path_pdf: { check: this.path, expected: 'относительный путь внутри сайта от каталога backend' },
        path_present: { check: this.path, expected: 'относительный путь внутри сайта от каталога backend' },
        content_extensions_ignore: {
            check: value => value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.common)
                && Object.values(value).every(list => Array.isArray(list) && list.every(ext => typeof ext === 'string')),
            expected: 'объект массивов расширений с обязательным массивом common'
        }
    };

    // CSS проверяет браузер: сохраняется весь поддерживаемый набор цветов,
    // единиц измерения и курсоров, без собственного неполного списка значений.
    static cssProperties = {
        cursor: 'cursor', background_color: 'background',
        padding_top: 'padding-top', padding_bottom: 'padding-bottom',
        padding_left: 'padding-left', padding_right: 'padding-right',
        header_height: 'height', header_font_size: 'font-size', header_color: 'color',
        info_line_background_color: 'background', info_line_height: 'height',
        logo_width: 'width', calendar_color: 'color', calendar_day_font_size: 'font-size',
        calendar_text_font_size: 'font-size', clock_color: 'color', clock_size: 'font-size',
        birthday_name_font_size: 'font-size', birthday_text_font_size: 'font-size', birthday_color: 'color'
    };

    static validate(data) {
        const settings = { ...data };
        const rules = { ...this.rules };
        for (const [name, property] of Object.entries(this.cssProperties)) {
            rules[name] = {
                check: value => typeof value === 'string' && CSS.supports(property, value),
                expected: 'допустимое CSS-значение для ' + property
            };
        }
        for (const [name, rule] of Object.entries(rules)) {
            const value = settings[name];
            if (value === undefined || value === null) continue;
            let valid = false;
            try { valid = rule.check(value); } catch (_) { /* Некорректный путь. */ }
            if (!valid) {
                delete settings[name];
                PanelErrors.report('config:' + name,
                    'Настройка ' + name + ': получено ' + JSON.stringify(value) +
                    '. Ожидается ' + rule.expected + '. Исправьте ключ «' + name +
                    '» в backend/config.json. Пока используется значение по умолчанию.');
            }
        }
        return settings;
    }
}
