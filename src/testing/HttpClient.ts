/**
 * @module @dunai/http-client/testing
 */

import { Request, Response } from '../Http';
import { HttpClient } from '../HttpClient';

interface IRequestItem {
    request: Request;
    // next: (req: Request) => Promise<Response>;
    answer: (res: Response) => void;
    viewed: boolean;
}

export class HttpClientMock {
    public requests: IRequestItem[] = [];

    constructor() {
        this.middleware = this.middleware.bind(this);
    }

    public middleware(request: Request, _: Response, makeQuery: (req: Request) => void, giveAnswer: (res: Response) => void) {
        this.requests.push({
            request,
            // next: makeQuery,
            answer: giveAnswer,
            viewed: false,
        });
    }

    public flush() {
        this.requests = [];
    }

    public expectOne(url: string | RegExp): IRequestItem;
    public expectOne(methods: string | string[], url: string | RegExp): IRequestItem;
    public expectOne(methods: string | string[] | RegExp, url?: string | RegExp): IRequestItem {
        if (url === void 0)
            return this.expectRequests([], methods as string | RegExp, 1, 1)[0];
        else
            return this.expectRequests(typeof methods === 'string' ? [methods] : methods as string[], url, 1, 1)[0];
    }

    public expectNone(url?: string | RegExp): void;
    public expectNone(methods: string | string[], url: string | RegExp): void;
    public expectNone(methods: string | string[] | RegExp, url?: string | RegExp): void {
        if (url === void 0)
            this.expectRequests([], methods as string | RegExp, 0, 0);
        else
            this.expectRequests(typeof methods === 'string' ? [methods] : methods as string[], url, 0, 0);
    }

    public expectNoRequests(): void {
        if (this.requests.length)
            throw new Error('More items than it should be');
    }

    public expectRequests(methods: string[], url: string | RegExp, min = 0, max = Infinity): IRequestItem[] {
        const items: IRequestItem[] = this.requests
            .filter(item => {
                if (methods.length && methods.indexOf(item.request.method.toLowerCase()) === -1)
                    return false;

                if (typeof item.request.url === 'string')
                    if (!item.request.url.match(url))
                        return false;

                return true;
            });

        if (items.length < min)
            throw new Error('Elements less than it should be');
        if (items.length > max)
            throw new Error('More items than it should be');

        items.forEach(item => item.viewed = true);

        return items;
    }
}

export const Http = new HttpClient();
export const HttpMock = new HttpClientMock();
Http.rootMiddleware.after.push(HttpMock.middleware);

// function isViewed(item: IRequestItem): boolean {
//     return item.viewed;
// }
