"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInEmployeesScraper = void 0;
const tslib_1 = require("tslib");
const puppeteer_1 = tslib_1.__importDefault(require("puppeteer"));
const tree_kill_1 = tslib_1.__importDefault(require("tree-kill"));
const blocked_hosts_1 = tslib_1.__importDefault(require("./blocked-hosts"));
const utils_1 = require("./utils");
const errors_1 = require("./errors");
class LinkedInEmployeesScraper {
    constructor(userDefinedOptions) {
        this.options = {
            sessionCookieValue: '',
            keepAlive: false,
            timeout: 10000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
            headless: true
        };
        this.browser = null;
        this.setup = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const logSection = 'setup';
            try {
                utils_1.statusLog(logSection, `Launching puppeteer in the ${this.options.headless ? 'background' : 'foreground'}...`);
                this.browser = yield puppeteer_1.default.launch({
                    headless: this.options.headless,
                    args: [
                        ...(this.options.headless ? '---single-process' : '---start-maximized'),
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        "--proxy-server='direct://",
                        '--proxy-bypass-list=*',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--disable-gpu',
                        '--disable-features=site-per-process',
                        '--enable-features=NetworkService',
                        '--allow-running-insecure-content',
                        '--enable-automation',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-web-security',
                        '--autoplay-policy=user-gesture-required',
                        '--disable-background-networking',
                        '--disable-breakpad',
                        '--disable-client-side-phishing-detection',
                        '--disable-component-update',
                        '--disable-default-apps',
                        '--disable-domain-reliability',
                        '--disable-extensions',
                        '--disable-features=AudioServiceOutOfProcess',
                        '--disable-hang-monitor',
                        '--disable-ipc-flooding-protection',
                        '--disable-notifications',
                        '--disable-offer-store-unmasked-wallet-cards',
                        '--disable-popup-blocking',
                        '--disable-print-preview',
                        '--disable-prompt-on-repost',
                        '--disable-speech-api',
                        '--disable-sync',
                        '--disk-cache-size=33554432',
                        '--hide-scrollbars',
                        '--ignore-gpu-blacklist',
                        '--metrics-recording-only',
                        '--mute-audio',
                        '--no-default-browser-check',
                        '--no-first-run',
                        '--no-pings',
                        '--no-zygote',
                        '--password-store=basic',
                        '--use-gl=swiftshader',
                        '--use-mock-keychain'
                    ],
                    timeout: this.options.timeout
                });
                utils_1.statusLog(logSection, 'Puppeteer launched!');
                yield this.checkIfLoggedIn();
                utils_1.statusLog(logSection, 'Done!');
            }
            catch (err) {
                yield this.close();
                utils_1.statusLog(logSection, 'An error occurred during setup.');
                throw err;
            }
        });
        this.createPage = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const logSection = 'setup page';
            if (!this.browser) {
                throw new Error('Browser not set.');
            }
            const blockedResources = ['image', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'];
            try {
                const page = yield this.browser.newPage();
                const firstPage = (yield this.browser.pages())[0];
                yield firstPage.close();
                const session = yield page.target().createCDPSession();
                yield page.setBypassCSP(true);
                yield session.send('Page.enable');
                yield session.send('Page.setWebLifecycleState', {
                    state: 'active',
                });
                utils_1.statusLog(logSection, `Blocking the following resources: ${blockedResources.join(', ')}`);
                const blockedHosts = this.getBlockedHosts();
                const blockedResourcesByHost = ['script', 'xhr', 'fetch', 'document'];
                utils_1.statusLog(logSection, `Should block scripts from ${Object.keys(blockedHosts).length} unwanted hosts to speed up the crawling.`);
                yield page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (blockedResources.includes(req.resourceType())) {
                        return req.abort();
                    }
                    const hostname = utils_1.getHostname(req.url());
                    if (blockedResourcesByHost.includes(req.resourceType()) && hostname && blockedHosts[hostname] === true) {
                        utils_1.statusLog('blocked script', `${req.resourceType()}: ${hostname}: ${req.url()}`);
                        return req.abort();
                    }
                    return req.continue();
                });
                yield page.setUserAgent(this.options.userAgent);
                yield page.setViewport({
                    width: 1200,
                    height: 720
                });
                utils_1.statusLog(logSection, `Setting session cookie using cookie: ${process.env.LINKEDIN_SESSION_COOKIE_VALUE}`);
                yield page.setCookie({
                    'name': 'li_at',
                    'value': this.options.sessionCookieValue,
                    'domain': '.www.linkedin.com'
                });
                utils_1.statusLog(logSection, 'Session cookie set!');
                utils_1.statusLog(logSection, 'Done!');
                return page;
            }
            catch (err) {
                yield this.close();
                utils_1.statusLog(logSection, 'An error occurred during page setup.');
                utils_1.statusLog(logSection, err.message);
                throw err;
            }
        });
        this.getBlockedHosts = () => {
            const blockedHostsArray = blocked_hosts_1.default.split('\n');
            let blockedHostsObject = blockedHostsArray.reduce((prev, curr) => {
                const frags = curr.split(' ');
                if (frags.length > 1 && frags[0] === '0.0.0.0') {
                    prev[frags[1].trim()] = true;
                }
                return prev;
            }, {});
            blockedHostsObject = Object.assign(Object.assign({}, blockedHostsObject), { 'static.chartbeat.com': true, 'scdn.cxense.com': true, 'api.cxense.com': true, 'www.googletagmanager.com': true, 'connect.facebook.net': true, 'platform.twitter.com': true, 'tags.tiqcdn.com': true, 'dev.visualwebsiteoptimizer.com': true, 'smartlock.google.com': true, 'cdn.embedly.com': true });
            return blockedHostsObject;
        };
        this.close = (page) => {
            return new Promise((resolve, reject) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const loggerPrefix = 'close';
                if (page) {
                    try {
                        utils_1.statusLog(loggerPrefix, 'Closing page...');
                        yield page.close();
                        utils_1.statusLog(loggerPrefix, 'Closed page!');
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                if (this.browser) {
                    try {
                        utils_1.statusLog(loggerPrefix, 'Closing browser...');
                        yield this.browser.close();
                        utils_1.statusLog(loggerPrefix, 'Closed browser!');
                        const browserProcessPid = this.browser.process().pid;
                        if (browserProcessPid) {
                            utils_1.statusLog(loggerPrefix, `Killing browser process pid: ${browserProcessPid}...`);
                            tree_kill_1.default(browserProcessPid, 'SIGKILL', (err) => {
                                if (err) {
                                    return reject(`Failed to kill browser process pid: ${browserProcessPid}`);
                                }
                                utils_1.statusLog(loggerPrefix, `Killed browser pid: ${browserProcessPid} Closed browser.`);
                                resolve();
                            });
                        }
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                return resolve();
            }));
        };
        this.checkIfLoggedIn = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const logSection = 'checkIfLoggedIn';
            const page = yield this.createPage();
            utils_1.statusLog(logSection, 'Checking if we are still logged in...');
            yield page.goto('https://www.linkedin.com/login', {
                waitUntil: 'networkidle2',
                timeout: this.options.timeout
            });
            const url = page.url();
            const isLoggedIn = !url.endsWith('/login');
            yield page.close();
            if (isLoggedIn) {
                utils_1.statusLog(logSection, 'All good. We are still logged in.');
            }
            else {
                const errorMessage = 'Bad news, we are not logged in! Your session seems to be expired. Use your browser to login again with your LinkedIn credentials and extract the "li_at" cookie value for the "sessionCookieValue" option.';
                utils_1.statusLog(logSection, errorMessage);
                throw new errors_1.SessionExpired(errorMessage);
            }
        });
        this.run = (companyUrl) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const logSection = 'run';
            const scraperSessionId = new Date().getTime();
            if (!this.browser) {
                throw new Error('Browser is not set. Please run the setup method first.');
            }
            if (!companyUrl) {
                throw new Error('No companyURL given.');
            }
            if (!companyUrl.includes('linkedin.com/')) {
                throw new Error('The given URL to scrape is not a linkedin.com url.');
            }
            if (companyUrl.charAt(companyUrl.length - 1) !== "/")
                companyUrl = companyUrl.concat("/");
            try {
                const page = yield this.createPage();
                utils_1.statusLog(logSection, `Navigating to LinkedIn company page: ${companyUrl}`, scraperSessionId);
                yield page.goto(`${companyUrl}`, {
                    waitUntil: 'networkidle2',
                    timeout: this.options.timeout
                });
                const connectionContainer = '.org-top-card-secondary-content__connections';
                const data_url = yield page.$$eval(connectionContainer, (nodes) => {
                    const data = [];
                    for (const node of nodes) {
                        const url_anchor = node.querySelector('a.org-top-card-secondary-content__see-all-link');
                        const url = url_anchor === null || url_anchor === void 0 ? void 0 : url_anchor.getAttribute("href");
                        const spanNode = url_anchor === null || url_anchor === void 0 ? void 0 : url_anchor.querySelector('span');
                        const employees = spanNode === null || spanNode === void 0 ? void 0 : spanNode.innerHTML;
                        data.push(url);
                        data.push(employees);
                    }
                    return data;
                });
                utils_1.statusLog(logSection, 'Parsing data...', scraperSessionId);
                const employee_string = data_url[1];
                const first = employee_string.trim().split(" ")[0];
                const num_employees = parseInt(first);
                const all_pages_data = [];
                for (let i = 1; i < Math.ceil(num_employees / 10) + 1; i++) {
                    yield page.goto(`https://www.linkedin.com${data_url[0]}&page=${i}`, {
                        waitUntil: 'networkidle2',
                        timeout: this.options.timeout
                    });
                    const searchContainer = '.reusable-search__entity-results-list';
                    const page_data = yield page.$$eval(searchContainer, (nodes) => {
                        const data = [];
                        for (const node of nodes) {
                            const containers = node.querySelectorAll('span.entity-result__title-text');
                            containers.forEach(function (element) {
                                var _a, _b;
                                const link_elem = element.querySelector('a');
                                const link_string = link_elem === null || link_elem === void 0 ? void 0 : link_elem.getAttribute("href");
                                const cut_link = link_string === null || link_string === void 0 ? void 0 : link_string.split("?")[0];
                                const name_text = (_b = (_a = link_elem === null || link_elem === void 0 ? void 0 : link_elem.querySelector('span')) === null || _a === void 0 ? void 0 : _a.querySelector('span')) === null || _b === void 0 ? void 0 : _b.innerHTML;
                                data.push({ cut_link, name_text });
                            });
                        }
                        return data;
                    });
                    all_pages_data.push({ page_data });
                }
                if (!this.options.keepAlive) {
                    utils_1.statusLog(logSection, 'Not keeping the session alive.');
                    yield this.close(page);
                    utils_1.statusLog(logSection, 'Done. Puppeteer is closed.');
                }
                else {
                    utils_1.statusLog(logSection, 'Done. Puppeteer is being kept alive in memory.');
                    yield page.close();
                }
                return all_pages_data;
            }
            catch (err) {
                yield this.close();
                utils_1.statusLog(logSection, 'An error occurred during a run.');
                throw err;
            }
        });
        const logSection = 'constructing';
        const errorPrefix = 'Error during setup.';
        if (!userDefinedOptions.sessionCookieValue) {
            throw new Error(`${errorPrefix} Option "sessionCookieValue" is required.`);
        }
        if (userDefinedOptions.sessionCookieValue && typeof userDefinedOptions.sessionCookieValue !== 'string') {
            throw new Error(`${errorPrefix} Option "sessionCookieValue" needs to be a string.`);
        }
        if (userDefinedOptions.userAgent && typeof userDefinedOptions.userAgent !== 'string') {
            throw new Error(`${errorPrefix} Option "userAgent" needs to be a string.`);
        }
        if (userDefinedOptions.keepAlive !== undefined && typeof userDefinedOptions.keepAlive !== 'boolean') {
            throw new Error(`${errorPrefix} Option "keepAlive" needs to be a boolean.`);
        }
        if (userDefinedOptions.timeout !== undefined && typeof userDefinedOptions.timeout !== 'number') {
            throw new Error(`${errorPrefix} Option "timeout" needs to be a number.`);
        }
        if (userDefinedOptions.headless !== undefined && typeof userDefinedOptions.headless !== 'boolean') {
            throw new Error(`${errorPrefix} Option "headless" needs to be a boolean.`);
        }
        this.options = Object.assign(this.options, userDefinedOptions);
        utils_1.statusLog(logSection, `Using options: ${JSON.stringify(this.options)}`);
    }
}
exports.LinkedInEmployeesScraper = LinkedInEmployeesScraper;
//# sourceMappingURL=index.js.map