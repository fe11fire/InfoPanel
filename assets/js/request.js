class Request {
    static async getData(url, data = {}, testData = undefined) {
        const route = url.replace(/\/$/, '').split('/').pop();
        const key = url + '?' + new URLSearchParams(data).toString();
        const fail = reason => {
            PanelErrors.report(key, route + ': ' + reason);
            return route === 'config' ? [] : { result: [], failed: true };
        };
        const accept = payload => {
            try {
                Request.validate(route, payload);
                let out = payload;
                if (['video', 'imgs', 'img', 'text', 'present'].includes(route) && !data.name && !data.title) {
                    const ignore = config.getByName('content_extensions_ignore');
                    const common = Array.isArray(ignore?.common) ? ignore.common : [];
                    out = { result: payload.result.filter(name => !common.includes(name.split('.').pop())) };
                }
                return out;
            } catch (error) {
                return fail('Некорректные данные: ' + error.message);
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
                    error: (xhr, status) => resolve(fail(status === 'timeout'
                        ? 'Нет ответа за ' + timeout + ' мс'
                        : status === 'parsererror' ? 'Ответ не является корректным JSON'
                        : 'Ошибка запроса (HTTP ' + (xhr.status || 0) + ', ' + status + ')'))
                });
            } catch (error) { resolve(fail(error.message)); }
        });
    }
    static validate(route, payload) {
        if (route === 'config') {
            if (!payload || Array.isArray(payload) || typeof payload !== 'object' || !Object.keys(payload).length)
                throw new Error('ожидался непустой объект настроек');
            return;
        }
        if (!payload || !Array.isArray(payload.result)) throw new Error('ожидался массив result');
        const valid = route === 'birthdays'
            ? payload.result.every(item => item && typeof item.fio === 'string' && typeof item.date === 'string'
                && /^\d{1,2}\.\d{1,2}(\.\d{4})?$/.test(item.date) && Request.validBirthday(item.date))
            : payload.result.every(item => typeof item === 'string');
        if (!valid) throw new Error('неверный формат элементов result');
    }
    static validBirthday(value) {
        const [day, month, year] = value.split('.').map(Number);
        const date = new Date(Date.UTC(year || 2000, month - 1, day));
        return date.getUTCDate() === day && date.getUTCMonth() === month - 1;
    }
}
