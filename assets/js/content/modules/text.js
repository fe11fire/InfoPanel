class Text {
    static name = 'text';
    static url = Default.backend_url + this.name;
    static request_data = {};
    static prehash = this.name;

    #name = '';
    constructor(name) {
        this.#name = name;
    }

    static async getData(testData) {
        return await Request.getData(
            Text.url,
            Text.request_data,
            testData
        );
    }

    static initContent() {
        $('#div_content_area').append(
            $('<div></div>')
                .attr('id', 'div_text')
                .addClass('w-100 h-100 d-none p-3')
                .append(
                    // Строки выводятся во вложенный блок, чтобы центрирование по
                    // высоте (flex на #div_text) не досталось напрямую текстовым
                    // узлам и <br> - внутри flex-контейнера <br> ведет себя не как
                    // перенос строки, а как отдельный flex-элемент.
                    $('<div></div>')
                        .attr('id', 'div_text_lines')
                        .addClass('w-100 text-center')
                )
        );
        // Нужен весь срок показа, а не только сразу после show(): доступное место
        // может измениться позже (смена сторон, resize окна, периодический
        // пересчет высоты), и подбор должен уметь пересчитать то, что уже выведено,
        // независимо от того, что вызвало пересчет.
        let div = document.querySelector('#div_text');
        Library.observeFit(div, () => Text.#fit(div));
        Library.keepFit(div, () => Text.#shrinkIfNeeded(div));
    }

    static #fit(div) {
        let size = 120;
        do {
            div.style.fontSize = size + 'px';
            size--;
        } while (Library.overflows(div) && size > 12);
    }

    // Шаг секундного сторожа: только уменьшить, если действительно переполнено,
    // без сброса к максимальному размеру - иначе на каждой проверке был бы виден
    // скачок обратно к большому кеглю перед новым уменьшением.
    static #shrinkIfNeeded(div) {
        if (!Library.overflows(div)) {
            return;
        }
        let size = parseInt(div.style.fontSize, 10);
        if (!size || size <= 12) {
            return;
        }
        div.style.fontSize = (size - 1) + 'px';
    }

    async show() {
        $('#div_text').removeClass('d-none');

        let message = await Text.#findMessage(this.#name);

        if (message.length === 0) {
            $('#div_text_lines').empty();
            $('#div_text').addClass('d-none');
            ContentRouter.nextJob();
            return;
        }
        Library.setLines('#div_text_lines', message);
        let div = document.querySelectorAll("#div_text")[0];
        // Пока элемент не измерим, подбор откладывается, а размер шрифта от
        // предыдущего сообщения остается на новом контенте - если тот был короче,
        // текст рискует выйти за пределы блока раньше, чем сработает подбор.
        div.style.fontSize = '12px';
        Library.whenMeasurable(div, () => Text.#fit(div));

        setTimeout(() => { $('#div_text').addClass('d-none'); ContentRouter.nextJob() }, config.getByName('content_text_interval'));
    }

    static async #findMessage(name, testData = undefined) {
        let message = [];
        let data = await Request.getData(
            Text.url,
            { name: name },
            testData);
        if (data.result) {
            data.result.forEach(e => {
                message.push(e);
            });
        }
        return message;
    }

    static makeJob(data) {
        let job = {
            h: Library.stringToHash(this.prehash + data),
            cl: new Text(data),
        }
        return job;
    }
}