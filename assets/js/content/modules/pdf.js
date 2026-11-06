class Pdf {
    static name = 'pdf';
    static url = Default.backend_url + this.name;
    static #engine;
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
            .addClass('w-100 h-100 d-flex align-items-center justify-content-center d-none'));
    }

    static makeJob(name) {
        return { h: JSON.stringify([this.name, name]), cl: new Pdf(name) };
    }

    static #loadEngine() {
        if (globalThis.InfoPanelPdf) return Promise.resolve(globalThis.InfoPanelPdf);
        if (!this.#engine) {
            this.#engine = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'assets/pdfjs/pdf-engine.js';
                script.onload = () => {
                    if (globalThis.InfoPanelPdf) resolve(globalThis.InfoPanelPdf);
                    else reject(new Error('Браузер не смог запустить PDF.js'));
                };
                script.onerror = () => reject(new Error('Не удалось загрузить ' + script.src));
                document.head.append(script);
            }).catch(error => {
                this.#engine = undefined;
                throw error;
            });
        }
        return this.#engine;
    }

    async show() {
        const container = document.getElementById('div_pdf');
        let task;
        let pageNumber = 0;
        try {
            const engine = await Pdf.#loadEngine();
            const url = Pdf.url + '?' + new URLSearchParams({ name: this.#name });
            const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
            if (!response.ok) throw new Error('Сервер вернул HTTP ' + response.status + ' для ' + url);
            if (!response.headers.get('Content-Type')?.startsWith('application/pdf')) {
                throw new Error('Сервер не вернул PDF. Проверьте версию backend.exe');
            }
            task = engine.open(new Uint8Array(await response.arrayBuffer()));
            const pdf = await Pdf.#wait(task.promise, 'открытие документа');
            const interval = config.getByName('content_pdf_interval');
            for (pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                const page = await Pdf.#wait(pdf.getPage(pageNumber), 'чтение страницы');
                const canvas = document.createElement('canvas');
                const viewport = page.getViewport({ scale: 1 });
                const area = container.parentElement;
                const ratio = Math.min(window.devicePixelRatio || 1, 2);
                const scale = Math.min(
                    Math.max(area.clientWidth, 1) * ratio / viewport.width,
                    Math.max(area.clientHeight, 1) * ratio / viewport.height,
                    3840 / Math.max(viewport.width, viewport.height)
                );
                const fitted = page.getViewport({ scale });
                canvas.width = Math.max(1, Math.ceil(fitted.width));
                canvas.height = Math.max(1, Math.ceil(fitted.height));
                canvas.className = 'w-100 h-100';
                canvas.style.objectFit = 'contain';
                const render = page.render({ canvas, viewport: fitted, background: 'white' });
                try {
                    await Pdf.#wait(render.promise, 'отрисовка страницы');
                } catch (error) {
                    render.cancel();
                    throw error;
                } finally {
                    page.cleanup();
                }
                container.replaceChildren(canvas);
                container.classList.remove('d-none');
                await Library.delay(interval);
            }
        } catch (error) {
            await Library.delay(500);
            const page = pageNumber ? ', страница №' + pageNumber : '';
            throw new Error('PDF «' + this.#name + '»' + page + ': ' + error.message +
                '. Проверьте файл, доступность backend и настройку path_pdf.');
        } finally {
            container.classList.add('d-none');
            container.replaceChildren();
            await task?.destroy();
        }
    }

    static async #wait(promise, operation) {
        let timer;
        try {
            return await Promise.race([promise, new Promise((resolve, reject) => {
                timer = setTimeout(() => reject(new Error(operation + ' заняло больше 30 секунд')), 30000);
            })]);
        } finally {
            clearTimeout(timer);
        }
    }
}
