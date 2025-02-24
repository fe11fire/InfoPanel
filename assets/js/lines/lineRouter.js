class LineRouter {
    static lines = [];
    static last_line;
    static round = 1;
    static #sources = [Birthday];
    // static #sources = [Birthday, Holiday];

    static initContent() {
        LineRouter.#sources.forEach(source => {
            source.initContent();
        });
        LineRouter.updateLines();
    }

    static async #addLines(myClass, testData = undefined) {
        let lines = [];
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

        for (let i = 0; i < LineRouter.#sources.length; i++) {
            lines = lines.concat(await LineRouter.#addLines(LineRouter.#sources[i]));
        }

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

        console.log(LineRouter.lines);
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

        if (LineRouter.lines.length > 0) {
            if ((LineRouter.lines.length > 1) || (LineRouter.last_line != LineRouter.lines[0])) {
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