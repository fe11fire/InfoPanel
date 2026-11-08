class Library {
    static delay(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    static async waitForSize(element, timeout = 10000) {
        const started = Date.now();
        while (element.clientWidth <= 0 || element.clientHeight <= 0) {
            if (Date.now() - started >= timeout) throw new Error('Область показа остается скрытой или не имеет размера');
            await Library.delay(50);
        }
    }

    static stringToHash(string) {
        return string.split('').reduce((hash, char) => {
            return char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash;
        }, 0);
    }

    static randomIntFromInterval(min, max) { // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // Теги оформления, разрешенные в контенте. Остальные отбрасываются, но их
    // содержимое сохраняется, чтобы текст не пропадал из-за лишней разметки.
    static #allowedTags = {
        B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, SPAN: 1, BR: 1,
        SUB: 1, SUP: 1, SMALL: 1, BIG: 1, FONT: 1,
        P: 1, DIV: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
        UL: 1, OL: 1, LI: 1, DL: 1, DT: 1, DD: 1, BLOCKQUOTE: 1,
        PRE: 1, CODE: 1, HR: 1, MARK: 1, ABBR: 1, Q: 1,
        TABLE: 1, CAPTION: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TH: 1, TD: 1
    };

    // Теги, которые отбрасываются вместе с содержимым.
    static #droppedTags = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1 };

    // Свойства style и допустимые значения. Значение проверяется целиком, поэтому
    // ни url(), ни закрывающая кавычка, ни лишнее свойство пройти не могут.
    static #allowedStyle = {
        'color': /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i,
        'background-color': /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i,
        'font-weight': /^(normal|bold|bolder|lighter|[1-9]00)$/i,
        'font-style': /^(normal|italic|oblique)$/i,
        'text-decoration': /^(none|underline|overline|line-through)$/i,
        'font-size': /^\d+(\.\d+)?(px|pt|em|rem|%)$/i,
        'text-transform': /^(none|uppercase|lowercase|capitalize)$/i,
        'letter-spacing': /^-?\d+(\.\d+)?(px|pt|em|rem)$/i,
        'text-align': /^(left|right|center|justify|start|end)$/i,
        'text-indent': /^-?(0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'vertical-align': /^(baseline|top|middle|bottom|sub|super|text-top|text-bottom)$/i,
        'line-height': /^(normal|\d+(\.\d+)?(px|pt|em|rem|%)?)$/i,
        'margin': /^(auto|0|\d+(\.\d+)?(px|pt|em|rem|%))(\s+(auto|0|\d+(\.\d+)?(px|pt|em|rem|%))){0,3}$/i,
        'padding': /^(0|\d+(\.\d+)?(px|pt|em|rem|%))(\s+(0|\d+(\.\d+)?(px|pt|em|rem|%))){0,3}$/i,
        'margin-top': /^(auto|0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'margin-right': /^(auto|0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'margin-bottom': /^(auto|0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'margin-left': /^(auto|0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'padding-top': /^(0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'padding-right': /^(0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'padding-bottom': /^(0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'padding-left': /^(0|\d+(\.\d+)?(px|pt|em|rem|%))$/i,
        'list-style-type': /^(none|disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman)$/i,
        'border-collapse': /^(collapse|separate)$/i
    };

    // Содержимое content и config никогда не попадает в .html(): jQuery исполняет
    // переданную разметку. Строка разбирается в изолированном документе, где
    // скрипты не выполняются и картинки не загружаются, и пересобирается по
    // белому списку - оформление остается, исполняемое отбрасывается.
    static markup(value) {
        let doc = new DOMParser().parseFromString(String(value), 'text/html');
        return Library.#rebuild(doc.body);
    }

    static #rebuild(source) {
        let out = document.createDocumentFragment();
        source.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                out.appendChild(document.createTextNode(node.nodeValue));
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }
            if (Library.#droppedTags[node.tagName]) {
                return;
            }
            if (!Library.#allowedTags[node.tagName]) {
                out.appendChild(Library.#rebuild(node));
                return;
            }
            let el = document.createElement(node.tagName.toLowerCase());
            let cssClass = node.getAttribute('class');
            if (cssClass) {
                el.setAttribute('class', cssClass);
            }
            const align = node.getAttribute('align');
            if (align && /^(left|right|center|justify)$/i.test(align)) {
                el.style.textAlign = align.toLowerCase();
            }
            for (const attr of ['colspan', 'rowspan']) {
                const value = node.getAttribute(attr);
                if (['TD', 'TH'].includes(node.tagName) && value && /^[1-9]\d{0,2}$/.test(value)) {
                    el.setAttribute(attr, value);
                }
            }
            if (node.tagName === 'OL' && /^-?\d{1,6}$/.test(node.getAttribute('start') || '')) {
                el.setAttribute('start', node.getAttribute('start'));
            }
            if (node.tagName === 'FONT') {
                const color = node.getAttribute('color');
                if (color && Library.#allowedStyle.color.test(color)) el.setAttribute('color', color);
                const size = node.getAttribute('size');
                if (size && /^[+-]?[1-7]$/.test(size)) el.setAttribute('size', size);
                const face = node.getAttribute('face');
                if (face && /^[\w\s,'-]+$/.test(face)) el.setAttribute('face', face);
            }
            let style = Library.#cleanStyle(node.getAttribute('style'));
            if (style) {
                el.style.cssText += '; ' + style;
            }
            el.appendChild(Library.#rebuild(node));
            out.appendChild(el);
        });
        return out;
    }

    static #cleanStyle(value) {
        if (!value) {
            return '';
        }
        let out = [];
        value.split(';').forEach(part => {
            let i = part.indexOf(':');
            if (i == -1) {
                return;
            }
            let name = part.slice(0, i).trim().toLowerCase();
            let val = part.slice(i + 1).trim();
            if (Library.#allowedStyle[name] && Library.#allowedStyle[name].test(val)) {
                out.push(name + ': ' + val);
            }
        });
        return out.join('; ');
    }

    static setLines(target, lines) {
        let el = $(target).empty();
        // Блочная HTML-разметка разбирается целиком: теги могут открываться
        // и закрываться на разных строках. У обычного текста сохраняем переносы.
        const blockMarkup = lines.some(line => /<\/?(?:p|div|h[1-6]|ul|ol|li|dl|dt|dd|blockquote|pre|table|caption|thead|tbody|tfoot|tr|th|td|hr)\b/i.test(line));
        el.append(Library.markup(lines.join(blockMarkup ? '\n' : '<br>')));
        return el;
    }

    static text(value, cssClass) {
        if (!cssClass) {
            return Library.markup(value);
        }
        return $('<span></span>').addClass(cssClass).append(Library.markup(value));
    }

    // Сам блок с текстом почти всегда overflow:visible - обрезает содержимое его
    // предок (в разметке приложения это #div_col_content). Ищем ближайшего предка,
    // у которого overflow действительно не visible, то есть настоящую границу.
    static #clipAncestor(el) {
        let node = el.parentElement;
        while (node) {
            let cs = getComputedStyle(node);
            if (cs.overflow !== 'visible' || cs.overflowY !== 'visible' || cs.overflowX !== 'visible') {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }

    // clientHeight/scrollHeight элемента с padding для проверки переполнения не
    // годятся сразу по двум причинам: во-первых, браузеры не включают нижний
    // padding в scrollHeight, когда контент переполняет блок (задокументированная
    // особенность), из-за чего реальный вылет текста систематически занижается;
    // во-вторых, сам div почти всегда overflow:visible, поэтому его собственные
    // размеры вообще не совпадают с точкой, где текст в итоге обрезается - это
    // делает предок. Сравниваем фактические границы отрисованного текста (через
    // Range, а не через clientHeight/scrollHeight) с границей того предка, который
    // содержимое действительно обрезает.
    // Проверяется и верхняя граница: у текста с вертикальным центрированием
    // переполнение растет в обе стороны от середины, а не только вниз.
    static overflows(el, gap = 0) {
        let clip = Library.#clipAncestor(el) || el;
        let clipRect = clip.getBoundingClientRect();
        let range = document.createRange();
        range.selectNodeContents(el);
        let rect = range.getBoundingClientRect();
        return (rect.bottom > clipRect.bottom - gap + 0.5)
            || (rect.right > clipRect.right + 0.5)
            || (rect.top < clipRect.top + gap - 0.5);
    }

    // Подбор при показе учитывает размер блока и метрики шрифта только на тот
    // момент. После этого доступное место может поменяться - смена сторон
    // (side_changing), изменение окна, периодический пересчет высоты по
    // config_update_interval - а на самом первом использовании шрифта в сессии
    // сам подбор изредка чуть оптимистичнее того, что видно кадром позже. Ни
    // ResizeObserver (реагирует только на смену РАЗМЕРА блока, но не ловит,
    // например, эффекты первого использования шрифта), ни разовая проверка сразу
    // после подбора не покрывают все причины расхождения. Сторож проверяет
    // реальное переполнение раз в секунду, пока блок виден, и просит fit
    // пересчитать заново - так задержка до исправления ограничена ~секундой
    // независимо от того, что именно её вызвало.
    // ensure получает только команду "пора проверить" - решение, что именно
    // сделать (например, уменьшить размер на шаг, без сброса к максимальному
    // значению), остается за вызывающим кодом, чтобы секундная проверка не
    // вызывала видимого моргания размера.
    static keepFit(el, ensure) {
        if (el.__fitWatchdog) {
            return;
        }
        el.__fitWatchdog = setInterval(() => {
            if (!el.classList.contains('d-none')) {
                ensure();
            }
        }, 1000);
    }

    // Дополняет keepFit немедленной реакцией на изменение размера самого блока -
    // не нужно ждать до секунды сторожа, если причина в реальном resize.
    static observeFit(el, fit) {
        if (el.__fitObserver) {
            return;
        }
        el.__fitObserver = new ResizeObserver(() => {
            if (!el.classList.contains('d-none')) {
                fit();
            }
        });
        el.__fitObserver.observe(el);
    }

    // Подбор размера шрифта возможен только у элемента с измеримыми размерами.
    // Пока скрыт он сам или любой его родитель, clientHeight и scrollHeight равны
    // нулю, условие переполнения ложно и подбор заканчивается на стартовом кегле -
    // текст остается огромным и обрезается, как только панель станет видимой.
    // Такой блок ждет момента, когда его можно измерить.
    static whenMeasurable(el, fit) {
        clearTimeout(el.__measureTimer);
        if (el.clientHeight > 0) {
            fit();
            return;
        }
        // Блок успел отыграть, пока оставался скрытым - подбирать уже нечего.
        if (el.classList.contains('d-none')) {
            return;
        }
        el.__measureTimer = setTimeout(() => {
            Library.whenMeasurable(el, fit);
        }, 200);
    }

    // Каждый год рассчитывается отдельно: перенос 29 февраля не должен
    // превращаться в постоянное 28 февраля после прибавления года к moment.
    static birthdayInYear(dateStr, year) {
        const [day, month] = String(dateStr).split('.').map(Number);
        if (day === 29 && month === 2 && !moment([year]).isLeapYear()) {
            return config.getByName('birthday_leap_day') === 'more'
                ? moment([year, 2, 1]) : moment([year, 1, 28]);
        }
        return moment([year, month - 1, day]);
    }

    static birthdayOccurrences(dateStr, today = moment().startOf('day')) {
        const year = String(dateStr).split('.')[2];
        const birthYear = year ? Number(year) : null;
        const current = Library.birthdayInYear(dateStr, today.year());
        const next = current.isBefore(today, 'day')
            ? Library.birthdayInYear(dateStr, today.year() + 1) : current;
        const previous = current.isBefore(today, 'day')
            ? current.clone() : Library.birthdayInYear(dateStr, today.year() - 1);
        return { next, previous, year: birthYear };
    }

    static nextBirthdayOccurrence(dateStr, today = moment().startOf('day')) {
        const dates = Library.birthdayOccurrences(dateStr, today);
        return { occurrence: dates.next, year: dates.year };
    }

    // Юбилей - возраст, кратный 5. Если год рождения неизвестен или дата не
    // круглая, отметки не будет.
    static anniversaryAge(year, occurrence) {
        if (!year) {
            return null;
        }
        let age = occurrence.year() - year;
        return (age > 0 && age % 5 === 0) ? age : null;
    }

    // Имя файла попадает в URL, в css url() и в атрибут style, поэтому кодируются
    // и те символы, которые encodeURIComponent оставляет как есть.
    // Пути backend/config.json отсчитываются от каталога backend.
    static contentPath(value) {
        if (typeof value !== 'string' || !value.trim() || /^(?:[a-z]+:|[\\/])/i.test(value)) {
            throw new Error('ожидался относительный путь внутри сайта');
        }
        const parts = ['backend'];
        for (const part of value.replace(/\\/g, '/').split('/')) {
            if (!part || part === '.') continue;
            if (part === '..') {
                if (!parts.length) throw new Error('каталог находится за пределами сайта');
                parts.pop();
            } else parts.push(part);
        }
        return './' + parts.map(part => Library.encodePath(part)).join('/') + (parts.length ? '/' : '');
    }

    static encodePath(name) {
        return encodeURIComponent(name).replace(/['()!*]/g, function (c) {
            return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }
}