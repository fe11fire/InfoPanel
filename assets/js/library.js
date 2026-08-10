class Library {
    static stringToHash(string) {
        return string.split('').reduce((hash, char) => {
            return char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash;
        }, 0);
    }

    static randomIntFromInterval(min, max) { // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // Содержимое content и config выводится только текстовыми узлами: jQuery .html()
    // исполняет разметку из файлов, которые приложение не контролирует.
    static setLines(target, lines) {
        let el = $(target).empty();
        lines.forEach((line, i) => {
            if (i > 0) {
                el.append($('<br>'));
            }
            el.append(document.createTextNode(line));
        });
        return el;
    }

    static text(value, cssClass) {
        if (!cssClass) {
            return document.createTextNode(value);
        }
        return $('<span></span>').addClass(cssClass).text(value);
    }

    // Имя файла попадает в URL, в css url() и в атрибут style, поэтому кодируются
    // и те символы, которые encodeURIComponent оставляет как есть.
    static encodePath(name) {
        return encodeURIComponent(name).replace(/['()!*]/g, function (c) {
            return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }
}