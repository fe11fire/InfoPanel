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
        function hideLine(cl) {
            $('#div_row_info_line').removeClass('is-show');
            setTimeout(() => {
                cl.hide();
            }, 2000);

        }

        await this.updateLines();

        Config.updateElementsSize(config);

        let interval = config.getByName('info_line_changing_interval');

        // Показанная строка больше не первая в очереди: либо ее источник выключили
        // или у него кончились данные, либо она уступила место другой строке не
        // через обычную ротацию. Прячем ее сразу - иначе, если для нее не было
        // запланировано отложенное скрытие (единственная строка, ротация ни разу
        // не запускалась), она виснет на экране рядом с новой строкой навсегда.
        if (LineRouter.last_line && (LineRouter.lines[0] !== LineRouter.last_line)) {
            hideLine(LineRouter.last_line.cl);
            LineRouter.last_line = null;
        }

        if (LineRouter.lines.length == 0) {
            checkScreensaver();
        }

        if (LineRouter.lines.length > 0) {
            if (LineRouter.last_line != LineRouter.lines[0]) {
                LineRouter.lines[0].cl.show();
                LineRouter.last_line = LineRouter.lines[0];
                if (LineRouter.lines.length > 1) {
                    setTimeout(hideLine, interval - 2000, LineRouter.lines[0].cl);
                    LineRouter.lines.push(LineRouter.lines.shift());
                }
            }
        }
        setTimeout(nextLine, interval);
    }


}