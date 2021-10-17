import puppeteer, {Browser, Page} from 'puppeteer'
import treeKill from 'tree-kill';

import blockedHostsList from './blocked-hosts';

import {getHostname, statusLog} from './utils'

import {SessionExpired} from './errors';


//const activitiesProp = ["all", "posts", "documents", "articles"];

interface ScraperUserDefinedOptions {
    /**
     * The LinkedIn `li_at` session cookie value. Get this value by logging in to LinkedIn with the account you want to use for scraping.
     * Open your browser's Dev Tools and find the cookie with the name `li_at`. Use that value here.
     *
     * This script uses a known session cookie of a successful login into LinkedIn, instead of an e-mail and password to set you logged in.
     * I did this because LinkedIn has security measures by blocking login requests from unknown locations or requiring you to fill in Captcha's upon login.
     * So, if you run this from a server and try to login with an e-mail address and password, your login could be blocked.
     * By using a known session, we prevent this from happening and allows you to use this scraper on any server on any location.
     *
     * You probably need to get a new session cookie value when the scraper logs show it's not logged in anymore.
     */
    sessionCookieValue: string;
    /**
     * Set to true if you want to keep the scraper session alive. This results in faster recurring scrapes.
     * But keeps your memory usage high.
     *
     * Default: `false`
     */
    keepAlive ? : boolean;
    /**
     * Set a custom user agent if you like.
     *
     * Default: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36`
     */
    userAgent ? : string;
    /**
     * Use a custom timeout to set the maximum time you want to wait for the scraper
     * to do his job.
     *
     * Default: `10000` (10 seconds)
     */
    timeout ? : number;
    /**
     * Start the scraper in headless mode, or not.
     *
     * Default: `true`
     */
    headless ? : boolean;
}

interface ScraperOptions {
    sessionCookieValue: string;
    keepAlive: boolean;
    userAgent: string;
    timeout: number;
    headless: boolean;
}

/*
async function autoScroll(page: Page) {
    await page.evaluate(() => {
        return new Promise((resolve, reject) => {
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
    });
}*/


export class LinkedInEmployeesScraper {
    readonly options: ScraperOptions = {
        sessionCookieValue: '',
        keepAlive: false,
        timeout: 10000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
        headless: true
    }

    private browser: Browser | null = null;

    constructor(userDefinedOptions: ScraperUserDefinedOptions) {
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

        statusLog(logSection, `Using options: ${JSON.stringify(this.options)}`);
    }

    /**
    * Method to load Puppeteer in memory so we can re-use the browser instance.
    */
    public setup = async() => {
        const logSection = 'setup'

        try {
            statusLog(logSection, `Launching puppeteer in the ${this.options.headless ? 'background' : 'foreground'}...`)

            this.browser = await puppeteer.launch({
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
            })

            statusLog(logSection, 'Puppeteer launched!')

            await this.checkIfLoggedIn();

            statusLog(logSection, 'Done!')
        } catch (err) {
            // Kill Puppeteer
            await this.close();

            statusLog(logSection, 'An error occurred during setup.')

            throw err
        }
    };

    /**
    * Create a Puppeteer page with some extra settings to speed up the crawling process.
    */
    private createPage = async(): Promise < Page > => {
        const logSection = 'setup page'

        if (!this.browser) {
            throw new Error('Browser not set.');
        }

        // Important: Do not block "stylesheet", makes the crawler not work for LinkedIn
        const blockedResources = ['image', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'];

        try {
            const page = await this.browser.newPage()

            // Use already open page
            // This makes sure we don't have an extra open tab consuming memory
            const firstPage = (await this.browser.pages())[0];
            await firstPage.close();

            // Method to create a faster Page
            // From: https://github.com/shirshak55/scrapper-tools/blob/master/src/fastPage/index.ts#L113
            const session = await page.target().createCDPSession()
            await page.setBypassCSP(true)
            await session.send('Page.enable');
            await session.send('Page.setWebLifecycleState', {
                state: 'active',
            });

            statusLog(logSection, `Blocking the following resources: ${blockedResources.join(', ')}`)

            // A list of hostnames that are trackers
            // By blocking those requests we can speed up the crawling
            // This is kinda what a normal adblocker does, but really simple
            const blockedHosts = this.getBlockedHosts();
            const blockedResourcesByHost = ['script', 'xhr', 'fetch', 'document']

            statusLog(logSection, `Should block scripts from ${Object.keys(blockedHosts).length} unwanted hosts to speed up the crawling.`);

            // Block loading of resources, like images and css, we dont need that
            await page.setRequestInterception(true);

            page.on('request', (req) => {
                if (blockedResources.includes(req.resourceType())) {
                    return req.abort()
                }

                const hostname = getHostname(req.url());

                // Block all script requests from certain host names
                if (blockedResourcesByHost.includes(req.resourceType()) && hostname && blockedHosts[hostname] === true) {
                    statusLog('blocked script', `${req.resourceType()}: ${hostname}: ${req.url()}`);
                    return req.abort();
                }

                return req.continue()
            })

            await page.setUserAgent(this.options.userAgent)

            await page.setViewport({
                width: 1200,
                height: 720
            })

            statusLog(logSection, `Setting session cookie using cookie: ${process.env.LINKEDIN_SESSION_COOKIE_VALUE}`)

            await page.setCookie({
                'name': 'li_at',
                'value': this.options.sessionCookieValue,
                'domain': '.www.linkedin.com'
            })

            statusLog(logSection, 'Session cookie set!')

            statusLog(logSection, 'Done!')

            return page;
        } catch (err) {
            // Kill Puppeteer
            await this.close();

            statusLog(logSection, 'An error occurred during page setup.')
            statusLog(logSection, err.message)

            throw err
        }
    };

    /**
    * Method to block know hosts that have some kind of tracking.
    * By blocking those hosts we speed up the crawling.
    *
    * More info: http://winhelp2002.mvps.org/hosts.htm
    */
    private getBlockedHosts = (): object => {
        const blockedHostsArray = blockedHostsList.split('\n');

        let blockedHostsObject = blockedHostsArray.reduce((prev, curr) => {
            const frags = curr.split(' ');

            if (frags.length > 1 && frags[0] === '0.0.0.0') {
                prev[frags[1].trim()] = true;
            }

            return prev;
        }, {});

        blockedHostsObject = {
            ...blockedHostsObject,
            'static.chartbeat.com': true,
            'scdn.cxense.com': true,
            'api.cxense.com': true,
            'www.googletagmanager.com': true,
            'connect.facebook.net': true,
            'platform.twitter.com': true,
            'tags.tiqcdn.com': true,
            'dev.visualwebsiteoptimizer.com': true,
            'smartlock.google.com': true,
            'cdn.embedly.com': true
        }

        return blockedHostsObject;
    }

    /**
    * Method to complete kill any Puppeteer process still active.
    * Freeing up memory.
    */
    public close = (page ? : Page): Promise < void > => {
        return new Promise(async(resolve, reject) => {
            const loggerPrefix = 'close';

            if (page) {
                try {
                    statusLog(loggerPrefix, 'Closing page...');
                    await page.close();
                    statusLog(loggerPrefix, 'Closed page!');
                } catch (err) {
                    reject(err)
                }
            }

            if (this.browser) {
                try {
                    statusLog(loggerPrefix, 'Closing browser...');
                    await this.browser.close();
                    statusLog(loggerPrefix, 'Closed browser!');

                    const browserProcessPid = this.browser.process().pid;

                    // Completely kill the browser process to prevent zombie processes
                    // https://docs.browserless.io/blog/2019/03/13/more-observations.html#tip-2-when-you-re-done-kill-it-with-fire
                    if (browserProcessPid) {
                        statusLog(loggerPrefix, `Killing browser process pid: ${browserProcessPid}...`);

                        treeKill(browserProcessPid, 'SIGKILL', (err) => {
                            if (err) {
                                return reject(`Failed to kill browser process pid: ${browserProcessPid}`);
                            }

                            statusLog(loggerPrefix, `Killed browser pid: ${browserProcessPid} Closed browser.`);
                            resolve()
                        });
                    }
                } catch (err) {
                    reject(err);
                }
            }

            return resolve()
        })

    }

    /**
     * Simple method to check if the session is still active.
     */
    public checkIfLoggedIn = async() => {
        const logSection = 'checkIfLoggedIn';

        const page = await this.createPage();

        statusLog(logSection, 'Checking if we are still logged in...')

        // Go to the login page of LinkedIn
        // If we do not get redirected and stay on /login, we are logged out
        // If we get redirect to /feed, we are logged in
        await page.goto('https://www.linkedin.com/login', {
            waitUntil: 'networkidle2',
            timeout: this.options.timeout
        })

        const url = page.url()

        const isLoggedIn = !url.endsWith('/login')

        await page.close();

        if (isLoggedIn) {
            statusLog(logSection, 'All good. We are still logged in.')
        } else {
            const errorMessage = 'Bad news, we are not logged in! Your session seems to be expired. Use your browser to login again with your LinkedIn credentials and extract the "li_at" cookie value for the "sessionCookieValue" option.';
            statusLog(logSection, errorMessage)
            throw new SessionExpired(errorMessage)
        }
    };

    /**
     * Method to scrape a user profile.
     */
    public run = async(companyUrl: string) => {
        const logSection = 'run'

        const scraperSessionId = new Date().getTime();

        if (!this.browser) {
            throw new Error('Browser is not set. Please run the setup method first.')
        }

        if (!companyUrl) {
            throw new Error('No companyURL given.')
        }

        if (!companyUrl.includes('linkedin.com/')) {
            throw new Error('The given URL to scrape is not a linkedin.com url.')
        }

        if (companyUrl.charAt(companyUrl.length - 1) !== "/")
            companyUrl = companyUrl.concat("/");

        try {
            // Eeach run has it's own page
            const page = await this.createPage();

            statusLog(logSection, `Navigating to LinkedIn company page: ${companyUrl}`, scraperSessionId)

            await page.goto(`${companyUrl}`, {
                // Use "networkidl2" here and not "domcontentloaded".
                // As with "domcontentloaded" some elements might not be loaded correctly, resulting in missing data.
                waitUntil: 'networkidle2',
                timeout: this.options.timeout
            });
   

            const connectionContainer = '.org-top-card-secondary-content__connections';


            const data_url = await page.$$eval(connectionContainer, (nodes) => {
                const data = [] as any;
       
                for (const node of nodes) {
                    const url_anchor = node.querySelector('a.org-top-card-secondary-content__see-all-link');

                    const url = url_anchor?.getAttribute("href");
                    const spanNode = url_anchor?.querySelector('span');
                    const employees = spanNode?.innerHTML;

                    data.push(url);
                    data.push(employees);

                }
                

                return data;
            });


            statusLog(logSection, 'Parsing data...', scraperSessionId)



            const employee_string = data_url[1]
            const first = employee_string.trim().split(" ")[0];
            const num_employees = parseInt(first);


            const all_pages_data = [] as any;
            for (let i = 1; i < Math.ceil(num_employees / 10) + 1; i++){

                await page.goto(`https://www.linkedin.com${data_url[0]}&page=${i}`, {
                    // Use "networkidl2" here and not "domcontentloaded".
                    // As with "domcontentloaded" some elements might not be loaded correctly, resulting in missing data.
                    waitUntil: 'networkidle2',
                    timeout: this.options.timeout
                });

                const searchContainer = '.reusable-search__entity-results-list';


                const page_data = await page.$$eval(searchContainer, (nodes) => {

                    const data = [] as any;
                    
                    for (const node of nodes) {
                        //console.log(node);
                        const containers = node.querySelectorAll('span.entity-result__title-text');
                        containers.forEach(function (element) {
                            const link_elem = element.querySelector('a');
                            const link_string = link_elem?.getAttribute("href");
                            const cut_link = link_string?.split("?")[0];
                            const name_text = link_elem?.querySelector('span')?.querySelector('span')?.innerHTML;
                            data.push({cut_link,name_text}); 
                        });
                         
                    }

                    return data;

                });

                all_pages_data.push({page_data})

            }

     

            if (!this.options.keepAlive) {
                statusLog(logSection, 'Not keeping the session alive.')

                await this.close(page)

                statusLog(logSection, 'Done. Puppeteer is closed.')
            } else {
                statusLog(logSection, 'Done. Puppeteer is being kept alive in memory.')
                // Only close the current page, we do not need it anymore
                await page.close()
            }

            return all_pages_data;
        } catch (err) {
            // Kill Puppeteer
            await this.close()

            statusLog(logSection, 'An error occurred during a run.')

            // Throw the error up, allowing the user to handle this error himself.
            throw err;
        }
    }
}
