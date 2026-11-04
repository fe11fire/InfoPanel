class PanelErrors {
    static active = new Map();
    static enabled = true;
    static ttl = 300000;
    static timer;

    static report(key, message) {
        const previous = this.active.get(key);
        const now = Date.now();
        const shouldLog = !previous || previous.message !== message || now - previous.logged >= 60000;
        if (shouldLog) console.log('[InfoPanel ERROR]', new Date().toISOString(), key, message);
        // Каждый повтор продлевает TTL, даже если сообщение в консоли подавлено.
        this.active.set(key, { message, logged: shouldLog ? now : previous.logged, lastSeen: now });
        this.refresh();
    }

    static setTtl(value) {
        this.ttl = Number.isFinite(value) && value > 0 ? value : 300000;
        this.refresh();
    }

    static refresh() {
        clearTimeout(this.timer);
        const now = Date.now();
        let next = Infinity;
        for (const [key, error] of this.active) {
            const remaining = error.lastSeen + this.ttl - now;
            if (remaining <= 0) this.active.delete(key);
            else next = Math.min(next, remaining);
        }
        this.render();
        // Отдельный таймер убирает значок, даже когда запросов больше нет.
        if (next !== Infinity) this.timer = setTimeout(() => this.refresh(), Math.min(next, 2147483647));
    }

    static render() {
        const icon = document.getElementById('panel_error');
        if (icon) icon.hidden = !this.enabled || this.active.size === 0;
    }
}
