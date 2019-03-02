/**
 * @module @dunai/http-client
 */

import { Service } from '@dunai/core';
import request from 'request';
import { Url } from 'url';
import { Request, Response } from './Http';

export type Body = object | string;// Buffer | Buffer[] | string | string[] | stream.Readable

/**
 * Middleware
 *
 * When making request middleware run with response = null
 * When giving response - response will be set
 *
 * When you make changes in request you must run makeQuery with changed requests
 * When you check response, you must run giveAnswer with origin or changed response
 *
 * You may use this in middleware. Library create new context for every request,
 * and you can save any data in this
 *
 * @param request
 * @param response
 * @param makeQuery
 * @param giveAnswer
 */
export type IHttpMiddleware = (request: Request,
                               response: Response,
                               makeQuery: (req: Request) => void,
                               giveAnswer: (res: Response) => void) => void;

export interface IHttpConfig extends request.CoreOptions {
    url?: string | Url;
    middleware?: IHttpMiddleware[];
}

const presets: { [name: string]: IHttpConfig } = {
    default: {},
    json   : {
        json: true,
    },
};

/**
 * Позволяет выполнять запросы к удаленному сервеку
 */
@Service()
export class HttpClient {
    get config(): IHttpConfig {
        return presets[this.preset];
    }

    public readonly preset: string = 'default';

    /**
     * Root middleware, apply for all requests with all presets
     * @protected
     */
    public rootMiddleware: {
        before: IHttpMiddleware[];
        after: IHttpMiddleware[];
    } = {before: [], after: []};

    constructor(preset: string = 'default') {
        this.preset = preset;
    }

    /**
     * Get global preset configuration
     * @param preset
     */
    public getPreset(preset: string): IHttpConfig {
        return presets[preset] || null;
    }

    /**
     * Set global preset configuration
     * @param preset
     * @param config
     */
    public setPreset(preset: string, config: IHttpConfig): void {
        presets[preset] = config;
    }

    /**
     * Return new HttpClient with pre configured preset
     * @param name
     */
    public withPreset(preset: string): HttpClient {
        if (!(preset in presets))
            presets[preset] = {};
        return new HttpClient(preset);
    }

    /**
     * Add new middle
     *
     * @param middleware
     * @param preset
     */
    public applyMiddleware(middleware: IHttpMiddleware, preset = 'default'): void {
        if (!presets[preset])
            presets[preset] = {};
        const config = presets[preset];
        if (!Array.isArray(config.middleware))
            config.middleware = [];
        config.middleware.push(middleware);
    }

    public get(url: string, options?: IHttpConfig): Promise<Response> ;
    public get(url: string, preset: string, options?: IHttpConfig): Promise<Response> ;
    public get(url: string, options?: IHttpConfig | string, additional: IHttpConfig = {}): Promise<Response> {
        return this.exec('get', url, null, options, additional);
    }

    public post(url: string, body: Body, options?: IHttpConfig): Promise<Response>;
    public post(url: string, body: Body, preset: string, options?: IHttpConfig): Promise<Response>;
    public post(url: string, body: Body, options?: IHttpConfig | string, additional: IHttpConfig = {}): Promise<Response> {
        return this.exec('post', url, body, options, additional);
    }

    public put(url: string, body: Body, options?: IHttpConfig): Promise<Response>;
    public put(url: string, body: Body, preset: string, options?: IHttpConfig): Promise<Response>;
    public put(url: string, body: Body, options?: IHttpConfig | string, additional: IHttpConfig = {}): Promise<Response> {
        return this.exec('put', url, body, options, additional);
    }

    public patch(url: string, body: Body, options?: IHttpConfig): Promise<Response>;
    public patch(url: string, body: Body, preset: string, additional?: IHttpConfig): Promise<Response>;
    public patch(url: string, body: Body, options?: IHttpConfig | string, additional: IHttpConfig = {}): Promise<Response> {
        return this.exec('patch', url, body, options, additional);
    }

    public delete(url: string, options?: IHttpConfig): Promise<Response>;
    public delete(url: string, preset?: string, options?: IHttpConfig): Promise<Response>;
    public delete(url: string, options?: IHttpConfig | string, additional: IHttpConfig = {}): Promise<Response> {
        return this.exec('delete', url, null, options, additional);
    }

    public options(url: string, options?: IHttpConfig): Promise<Response>;
    public options(url: string, preset?: string, options?: IHttpConfig): Promise<Response>;
    public options(url: string, options?: IHttpConfig | string, additional: IHttpConfig = {}): Promise<Response> {
        return this.exec('options', url, null, options, additional);
    }

    public exec(method: string, url: string, body?: Body, options?: IHttpConfig | string, additional: IHttpConfig = {}): Promise<Response> {
        return new Promise((resolve, reject) => {
            const opts: IHttpConfig & request.UrlOptions = {
                ...presets[typeof options === 'string' ? options : this.preset],
                ...typeof options === 'object' ? options : {},
                ...additional,
                method,
                url,
            };

            if (body)
                opts.body = body;

            const middleware = [
                ...this.rootMiddleware.before,
                ...Array.isArray(opts.middleware) ? opts.middleware : [],
                ...this.rootMiddleware.after,
            ];

            const runs: Array<{
                up: (req) => void;
                index: number;
                down: (req) => (res) => void;
            }> = middleware.map((mw, ind) => {
                const context = {};

                const index = ind + 1;
                const down = (req) => (res) => {
                    mw.call(context, req, res, runs[index + 1].up, runs[index - 1].down(req));
                };
                const up = (req) => {
                    mw.call(context, req, null, runs[index + 1].up, runs[index - 1].down(req));
                };
                return {
                    index,
                    up,
                    down,
                };
            });

            {
                runs.unshift({
                    index: 0,
                    up   : (req) => {
                        runs[1].up(req);
                    },
                    down : () => resolve,
                });
            }

            {
                const index = runs.length;
                const up = (req) => {
                    request(req, (err, res, content) => {
                        runs[index - 1].down(req)(Response.createFromRequestCallback(err, res, content));
                    });
                };
                runs.push({
                    index,
                    up,
                    down: null,
                });
            }

            runs[0].up(opts);
        });
    }
}

export const Http = new HttpClient();

