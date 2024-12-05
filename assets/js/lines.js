class Lines {
    static lines = [];
    static last_line;
    static round = 1;
    static #sources = [Birthday];

    static initContent() {
        Lines.#sources.forEach(source => {
            source.initContent();
        });
        Lines.updateLines();
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

        for (let i = 0; i < Lines.#sources.length; i++) {
            lines = lines.concat(await Lines.#addLines(Lines.#sources[i]));
        }

        lines.forEach(line => {
            let index = Lines.lines.findIndex(function (e) {
                return e.h == line.h
            });

            if (index == -1) {
                newLines.push(line);
            } else {
                currentLines[index] = Lines.lines[index];
            }
        });

        Lines.lines = newLines.concat(currentLines);
        Lines.lines = Object.values(Lines.lines);

        console.log(Lines.lines);
    }

    static async nextLine() {
        function hideLine() {
            $('#div_row_info_line').removeClass('is-show');
        }

        await this.updateLines();

        Config.updateElementsSize(config);

        let interval = config.getByName('info_line_changing_interval');
        if (Lines.lines.length > 0) {
            if ((Lines.lines.length > 1) || (Lines.last_line != Lines.lines[0])) {
                Lines.lines[0].cl.show();
                Lines.last_line = Lines.lines[0];

                if (Lines.lines.length > 1) {
                    Lines.lines.push(Lines.lines.shift());
                    setTimeout(hideLine, interval - 2000);
                    setTimeout(() => {
                        Lines.lines[0].cl.hide()
                    }, interval);
                }
            }
        }
        setTimeout(nextLine, interval);
    }


}