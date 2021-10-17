import { Page } from 'puppeteer';
export declare const statusLog: (section: string, message: string, scraperSessionId?: string | number | undefined) => void;
export declare const autoScroll: (page: Page) => Promise<void>;
export declare const getHostname: (url: string) => string;
