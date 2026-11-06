class Themes {
    static values = {};
    static active;
    static #link;
    static #revision = 0;
    static #pending;

    static apply(name) {
        if (this.#pending?.name === name) return this.#pending.promise;
        const revision = ++this.#revision;
        if (name === this.active) {
            this.#pending = undefined;
            return Promise.resolve();
        }
        const promise = this.#switch(name, revision).finally(() => {
            if (this.#pending?.promise === promise) this.#pending = undefined;
        });
        this.#pending = { name, promise };
        return promise;
    }

    static async #switch(name, revision) {
        let link;
        try {
            if (!/^[a-z][a-z0-9_-]{0,47}$/.test(name)) throw new Error('недопустимое имя папки');
            link = await this.#load(name);
        } catch (error) {
            if (revision !== this.#revision) return;
            PanelErrors.report('theme:' + name,
                'Не удалось загрузить тему «' + name + '»: ' + error.message +
                '. Применена classic. Проверьте assets/themes/' + name + '/theme.css.');
            name = 'classic';
        }
        if (revision !== this.#revision) {
            link?.remove();
            return;
        }
        // Новый CSS загружается неактивным. Старый остается до завершения загрузки.
        if (link) link.media = 'all';
        this.#link?.remove();
        this.#link = link;
        const root = document.documentElement;
        root.dataset.theme = name;
        // Убираем прежние JSON-поправки до чтения чистых значений темы.
        Object.keys(Default.css).forEach(key => root.style.removeProperty('--' + key));
        const computed = getComputedStyle(root);
        this.values = Object.fromEntries(Object.keys(Default.css).map(key =>
            [key, computed.getPropertyValue('--' + key).trim() || Default.css[key]]));
        this.active = name;
    }

    static #load(name) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.media = 'not all';
            link.href = 'assets/themes/' + name + '/theme.css';
            let timer;
            const finish = error => {
                clearTimeout(timer);
                link.onload = link.onerror = null;
                if (error) { link.remove(); reject(error); }
                else resolve(link);
            };
            link.onload = () => finish();
            link.onerror = () => finish(new Error('файл недоступен'));
            timer = setTimeout(() => finish(new Error('нет ответа за 5 секунд')), 5000);
            document.head.append(link);
        });
    }
}
