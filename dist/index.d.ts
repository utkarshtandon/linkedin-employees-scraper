import puppeteer from 'puppeteer';
interface ScraperUserDefinedOptions {
    sessionCookieValue: string;
    keepAlive?: boolean;
    userAgent?: string;
    timeout?: number;
    headless?: boolean;
}
interface ScraperOptions {
    sessionCookieValue: string;
    keepAlive: boolean;
    userAgent: string;
    timeout: number;
    headless: boolean;
}
export declare class LinkedInEmployeesScraper {
    readonly options: ScraperOptions;
    private browser;
    constructor(userDefinedOptions: ScraperUserDefinedOptions);
    setup: () => Promise<void>;
    private createPage;
    private getBlockedHosts;
    close: (page?: puppeteer.Page | undefined) => Promise<void>;
    checkIfLoggedIn: () => Promise<void>;
    run: (companyUrl: string) => Promise<any>;
}
export {};
