"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHostname = exports.autoScroll = exports.statusLog = void 0;
const tslib_1 = require("tslib");
exports.statusLog = (section, message, scraperSessionId) => {
    const sessionPart = (scraperSessionId) ? ` (${scraperSessionId})` : '';
    const messagePart = (message) ? `: ${message}` : null;
    return console.log(`Scraper (${section})${sessionPart}${messagePart}`);
};
exports.autoScroll = (page) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    yield page.evaluate(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 500;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    }));
});
exports.getHostname = (url) => {
    return new URL(url).hostname;
};
//# sourceMappingURL=index.js.map