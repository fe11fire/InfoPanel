class Pdf {
    static name = 'pdf';
    static url = Default.backend_url + this.name;
    #name;

    constructor(name) {
        this.#name = name;
    }

    static getData(testData) {
        return Request.getData(this.url, {}, testData);
    }

    static initContent() {
        $('#div_content_area').append($('<div></div>')
            .attr('id', 'div_pdf')
            .addClass('w-100 h-100 d-none'));
    }

    static makeJob(name) {
        return { h: JSON.stringify([this.name, name]), cl: new Pdf(name) };
    }

    async show() {
        const container = $('#div_pdf');
        try {
            const data = await Request.getData(Pdf.url, { name: this.#name });
            if (data.failed) return;
            if (data.pending || data.error) {
                // Плеер вернётся к PDF в следующем круге. Пауза нужна,
                // чтобы очередь из одних PDF не опрашивала сервер без задержки.
                await Library.delay(500);
                if (data.error) throw new Error(data.error);
                return;
            }
            const folder = Library.contentPath(config.getByName('path_pdf'));
            const interval = config.getByName('content_pdf_interval');
            for (const [index, path] of data.result.entries()) {
                if (!/^\.infopanel-pdf-cache\/[a-f0-9]{64}\/page-\d{4}\.png$/.test(path)) {
                    throw new Error('Сервер вернул неверный путь к странице №' + (index + 1));
                }
                const image = await Pdf.#loadPage(folder + path, index + 1);
                container.empty().append(image).removeClass('d-none');
                await Library.delay(interval);
            }
        } catch (error) {
            throw new Error('PDF «' + this.#name + '»: ' + error.message +
                '. Проверьте файл, path_pdf в backend/config.json и доступ к папке кэша.');
        } finally {
            container.addClass('d-none').empty();
        }
    }

    static #loadPage(url, page) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.alt = 'Страница ' + page;
            image.className = 'w-100 h-100 d-block';
            image.style.objectFit = 'contain';
            const finish = error => {
                clearTimeout(timer);
                image.onload = image.onerror = null;
                if (error) reject(new Error('Страница №' + page + ' (' + url + '): ' + error));
                else resolve(image);
            };
            const timer = setTimeout(() => finish('изображение не загрузилось за 5 секунд'), 5000);
            image.onload = () => finish();
            image.onerror = () => finish('не удалось загрузить изображение');
            image.src = url;
        });
    }
}
