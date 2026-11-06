class Request {
    static responseHints = {
        config: 'Проверьте backend/config.json: файл должен существовать, содержать корректный JSON и читаться сервером.',
        imgs: 'Проверьте ответ API и каталог из path_images в backend/config.json.',
        img: 'Проверьте ответ API и каталог из path_images в backend/config.json.',
        video: 'Проверьте ответ API и каталог из path_video в backend/config.json.',
        pdf: 'Проверьте, что запущен новый backend и папка из path_pdf в backend/config.json доступна.',
        present: 'Проверьте ответ API и каталог из path_present в backend/config.json.',
        text: 'Проверьте ответ API и каталог из path_text в backend/config.json.',
        birthdays: 'Проверьте ответ API и файл из path_birthday и file_birthday в backend/config.json.',
        birthday: 'Проверьте ответ API и файл из path_birthday и file_birthday в backend/config.json.',
        holiday: 'Проверьте ответ API и файл из path_holiday и file_holiday в backend/config.json.'
    };

    static async getData(url, data = {}, testData = undefined) {
        const route = url.replace(/\/$/, '').split('/').pop();
        const key = url + '?' + new URLSearchParams(data).toString();
        const item = data.name ? ' Файл «' + data.name + '».' :
            data.path ? ' Презентация «' + data.path + '»' + (data.title ? ', файл title.txt.' : ', список слайдов.') : '';
        const responseHint = this.responseHints[route] || 'Проверьте ответ сервера в журнале запросов браузера.';
        const connectionHint = 'Проверьте, что backend запущен и доступен по этому адресу. ' +
            'Сверьте server_ip и server_port в assets/js/config/client.js и backend/config.json.';
        const fail = (reason, hint) => {
            const effect = route === 'config' ? 'Панель переключается на часы.' : 'Данные этого запроса пропущены.';
            PanelErrors.report(key, 'POST ' + url + '.' + item + ' ' + reason + ' ' + effect + ' ' + hint);
            return route === 'config' ? [] : { result: [], failed: true };
        };
        const accept = payload => {
            try {
                Request.validate(route, payload);
                let out = payload;
                if (route === 'birthdays') {
                    out = {
                        ...payload,
                        result: payload.result.filter((item, index) => {
                            let reason;
                            if (!item || typeof item.fio !== 'string' || typeof item.date !== 'string') {
                                reason = 'ожидались строковые поля fio и date';
                            } else if (!/^\d{1,2}\.\d{1,2}(\.\d{4})?$/.test(item.date) || !Request.validBirthday(item.date)) {
                                reason = 'некорректная дата';
                            }
                            if (!reason) return true;
                            const position = index + 1;
                            PanelErrors.report(key + '#record-' + position,
                                'Пропущена запись №' + position + ' в ответе /birthdays (' + reason + '). ' +
                                'Проверьте файл из path_birthday и file_birthday в backend/config.json. ' +
                                'Номер записи относится к ответу API. Формат даты: ДД.ММ или ДД.ММ.ГГГГ.');
                            return false;
                        })
                    };
                }
                if (['video', 'imgs', 'img', 'text', 'present', 'pdf'].includes(route) && !data.name && !data.title) {
                    const ignore = config.getByName('content_extensions_ignore');
                    const module = route === 'img' ? 'imgs' : route;
                    const excluded = new Set([
                        ...(ignore?.common ?? []),
                        ...(ignore?.[module] ?? [])
                    ].map(ext => ext.toLowerCase()));
                    out = { result: payload.result.filter(name => {
                        const dot = name.lastIndexOf('.');
                        const extension = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
                        return !excluded.has(extension);
                    }) };
                }
                return out;
            } catch (error) {
                return fail('Некорректные данные: ' + error.message + '.', responseHint);
            }
        };
        if (testData !== undefined) return accept({ result: testData });
        const configured = Number(config.getByName('request_timeout'));
        const timeout = Number.isFinite(configured) && configured > 0 ? configured : 5000;
        return new Promise(resolve => {
            try {
                $.ajax({
                    url, method: 'post', dataType: 'json', data, timeout,
                    success: payload => resolve(accept(payload)),
                    error: (xhr, status) => {
                        if (status === 'timeout') {
                            resolve(fail('Нет ответа за ' + timeout + ' мс.', connectionHint));
                        } else if (status === 'parsererror') {
                            resolve(fail('Сервер вернул некорректный JSON.', responseHint));
                        } else if (!xhr.status) {
                            resolve(fail('Браузер не получил HTTP-ответ (' + status + ').',
                                connectionHint + ' Проверьте вкладки Network и Console на блокировки браузера.'));
                        } else {
                            resolve(fail('Сервер ответил HTTP ' + xhr.status + '.',
                                'Проверьте журнал backend и поддержку этого маршрута.'));
                        }
                    }
                });
            } catch (error) {
                resolve(fail('Не удалось отправить запрос: ' + error.message + '.',
                    'Проверьте адрес запроса и загрузку jQuery.'));
            }
        });
    }
    static validate(route, payload) {
        if (route === 'config') {
            if (!payload || Array.isArray(payload) || typeof payload !== 'object' || !Object.keys(payload).length)
                throw new Error('ожидался непустой объект настроек');
            return;
        }
        if (!payload || !Array.isArray(payload.result)) throw new Error('ожидался массив result');
        if (route !== 'birthdays') {
            const invalid = payload.result.findIndex(item => typeof item !== 'string');
            if (invalid !== -1) throw new Error('в записи №' + (invalid + 1) + ' массива result ожидалась строка');
        }
    }
    static validBirthday(value) {
        const [day, month, year] = value.split('.').map(Number);
        const date = new Date(Date.UTC(year || 2000, month - 1, day));
        return date.getUTCDate() === day && date.getUTCMonth() === month - 1;
    }
}
