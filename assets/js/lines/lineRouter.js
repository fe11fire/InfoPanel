class LineRouter {
    static lines = [];
    static last_line;
    static round = 1;
    static #sources = [Birthday, NextBirthdays];
    // static #sources = [Birthday, Holiday];

    static initContent() {
        LineRouter.#sources.forEach(source => {
            source.initContent();
        });
        LineRouter.updateLines();
    }

    static async #addLines(myClass, testData = undefined) {
        let lines = [];
        if (!Config.isEnabled(myClass)) {
            return lines;
        }
        let data = await myClass.getData(
            testData
        );

        if (data.result) {
            data.result.forEach(e => {
                lines.push(myClass.makeLine(e));
            });
        }
        return lines;
    }

    static async updateLines() {
        let newLines = [];
        let currentLines = [];
        let lines = [];

        let sourceLines = await Promise.all(
            LineRouter.#sources.map(source => LineRouter.#addLines(source))
        );
        sourceLines.forEach(sourceLine => {
            lines = lines.concat(sourceLine);
        });

        // lines = lines.concat(await LineRouter.#addLines(Holiday, ['New year', 'Halloween']));

        lines.forEach(line => {
            let index = LineRouter.lines.findIndex(function (e) {
                return e.h == line.h
            });

            if (index == -1) {
                newLines.push(line);
            } else {
                currentLines[index] = LineRouter.lines[index];
            }
        });

        LineRouter.lines = newLines.concat(currentLines);
        LineRouter.lines = Object.values(LineRouter.lines);

        // console.log(LineRouter.lines);
    }

    static async nextLine() {
        await this.updateLines();

        Config.updateElementsSize(config);

        let interval = config.getByName('info_line_changing_interval');

        if (LineRouter.lines.length == 0) {
            checkScreensaver();
        }

        let next = (LineRouter.lines.length > 0) ? LineRouter.lines[0] : null;

        // Показанная строка больше не совпадает с той, что теперь должна быть
        // первой: сработала обычная ротация, источник отключился, или у него
        // кончились данные. Прячем текущую и через паузу на анимацию слайда
        // показываем следующую одной последовательной цепочкой. Раньше это были
        // два независимых таймера с одинаковым временем срабатывания (отложенное
        // скрытие текущей строки и следующий тик nextLine) - порядок их
        // выполнения не гарантирован, и если тик успевал показать следующую
        // строку первым, устаревшее скрытие гасило ее сразу после появления (оба
        // используют один div на модуль).
        if (next !== LineRouter.last_line) {
            let outgoing = LineRouter.last_line;
            LineRouter.last_line = next;
            if (outgoing) {
                $('#div_row_info_line').removeClass('is-show');
                setTimeout(() => {
                    outgoing.cl.hide();
                    if (next) {
                        next.cl.show();
                    }
                }, 2000);
            } else if (next) {
                next.cl.show();
            }
        }

        if (LineRouter.lines.length > 1) {
            LineRouter.lines.push(LineRouter.lines.shift());
        }

        setTimeout(nextLine, interval);
    }


}