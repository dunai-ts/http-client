/**
 * @module @dunai/http-client/testing
 */

import { Request, Response } from '../Http';
import { HttpClient } from '../HttpClient';

interface IRequestItem {
    request: Request;
    // next: (req: Request) => Promise<Response>;
    answer: (res: Response) => void;
}

export class HttpClientMock {
    public requests: IRequestItem[] = [];

    constructor() {
        this.middleware = this.middleware.bind(this);
    }

    public flush() {
        this.requests = [];
    }

    public expectOne(url: string | RegExp): IRequestItem;
    public expectOne(methods: string | string[], url: string | RegExp): IRequestItem;
    public expectOne(methods: string | string[] | RegExp, url?: string | RegExp): IRequestItem {
        if (url)
            return this._expectOne(typeof methods === 'string' ? [methods] : methods, url);
        else
            return this._expectOne([], methods as string | RegExp);
    }

    public expectNone(url: string | RegExp): IRequestItem;
    public expectNone(methods: string | string[], url: string | RegExp): IRequestItem;
    public expectNone(methods: string | string[] | RegExp, url?: string | RegExp): IRequestItem {
        if (url)
            return this._expectNone(typeof methods === 'string' ? [methods] : methods, url);
        else
            return this._expectNone([], methods as string | RegExp);
    }

    public middleware(request: Request, _: Response, makeQuery: (req: Request) => void, giveAnswer: (res: Response) => void) {
        this.requests.push({
            request,
            // next: makeQuery,
            answer: giveAnswer,
        });
    }

    private _expectOne(methods: string[] | RegExp, url: string | RegExp): IRequestItem {
        return this.requests[0];
    }

    private _expectNone(methods: string[] | RegExp, url: string | RegExp): IRequestItem {
        return null;
    }
}

export const Http = new HttpClient();
export const HttpMock = new HttpClientMock();
Http.rootMiddleware.after.push(HttpMock.middleware);
