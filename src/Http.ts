/**
 * @module @dunai/http-client
 */

import { IObject } from '@dunai/core';
import request from 'request';
import { Url } from 'url';

export interface Request extends request.CoreOptions, IObject {
    url?: string | Url;
}

export class Response implements IObject {
    public static createFromRequestCallback(err, res, body?): Response {
        const response = new Response();
        response.raw   = res;
        if (err) {
            console.log(err);
        } else {
            response.statusCode    = res.statusCode;
            response.statusMessage = res.statusMessage;
            response.body          = body;
            response.headers       = res.headers;

            if (
                res.headers['content-type'] === 'application/json' &&
                typeof body === 'string'
            ) {
                try {
                    response.body = JSON.parse(body);
                } catch (_) {
                    throw new InvalidJSONResponseError(res.url);
                }
            }
        }
        return response;
    }

    public static createOk(body: object): Response {
        const response         = new Response();
        response.statusCode    = 200;
        response.statusMessage = 'OK';
        response.jsonContent   = true;
        response.body          = body;
        return response;
    }

    public statusCode: number       = 0;
    public statusMessage: string    = '';
    public body: any                = '';
    public jsonContent: boolean     = true;
    public raw: any                 = null;
    public headers: request.Headers = {};

    get isSuccess(): boolean {
        return this.statusCode >= 200 && this.statusCode < 400;
    }

    get status(): string {
        if (this.statusCode) return `${this.statusCode}: ${this.statusMessage}`;
        else return this.statusMessage;
    }
}

export class NotFoundError extends Error {}

export class InvalidJSONResponseError extends Error {
    constructor(public response: request.Response) {
        super(`Can not parse response from ${response.url}: Invalid JSON`);
    }
}
