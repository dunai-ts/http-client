/**
 * @module @dunai/http-client
 */

import { Service } from '@dunai/core';
import parseUrl from 'parse-url';
import querystring from 'querystring';
import request from 'request';
import { Url } from 'url';
import { Request, Response } from './Http';

export type Body = object | string; // Buffer | Buffer[] | string | string[] | stream.Readable

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
export type IHttpMiddleware = (
    request: Request,
    response: Response,
    makeQuery: (req: Request) => void,
    giveAnswer: (res: Response) => void
) => void;

export interface IHttpConfig extends request.CoreOptions {
    url?: string | Url;
    middleware?: IHttpMiddleware[];
    useProxy?: string;
}

const presets: { [name: string]: IHttpConfig } = {
    default: {
        headers: {}
    },
    json   : {
        headers: {},
        json   : true
    }
};

/**
 * Позволяет выполнять запросы к удаленному сервеку
 */
@Service()
export class HttpClient {
    get config(): IHttpConfig {
        return presets[this.preset];
    }

    private static preparePreset(config: IHttpConfig): IHttpConfig {
        // prepare agent if useProxy
        if ('useProxy' in config) {
            if ('agentClass' in config)
                throw new Error('Can not specify useProxy and agentClass both');
            if (typeof config.useProxy !== 'string')
                throw new Error('useProxy must be a string');

            const proxyUrl = parseUrl(config.useProxy);

            proxyUrl.password = '';
            if (proxyUrl.user && proxyUrl.user.indexOf(':') > -1) {
                const pos         = proxyUrl.user.indexOf(':');
                proxyUrl.password = proxyUrl.user.substr(pos + 1);
                proxyUrl.user     = proxyUrl.user.substr(0, pos);
            }

            switch (proxyUrl.protocol) {
                case 'http': {
                    const agentOptions: any = {
                        socksHost: proxyUrl.resource, // Defaults to 'localhost'.
                        socksPort: proxyUrl.port || 80 // Defaults to 1080.

                        // Optional credentials
                    };
                    if (proxyUrl.user) agentOptions.socksUsername = proxyUrl.user;
                    if (proxyUrl.password) agentOptions.socksPassword = proxyUrl.password;
                    config = {
                        ...config,
                        agentClass: require('socks5-http-client/lib/Agent'),
                        agentOptions
                    };
                    break;
                }
                case 'socks5': {
                    const agentOptions: any = {
                        socksHost: proxyUrl.resource, // Defaults to 'localhost'.
                        socksPort: proxyUrl.port || 443 // Defaults to 1080.
                    };
                    if (proxyUrl.user) agentOptions.socksUsername = proxyUrl.user;
                    if (proxyUrl.password) agentOptions.socksPassword = proxyUrl.password;

                    if (['http', 'https'].indexOf(proxyUrl.protocols[1]) === -1)
                        throw new Error('You must specify socks5+http or socks5+https');

                    const agentClass = proxyUrl.protocols[1] === 'http'
                        ? require('socks5-http-client/lib/Agent')
                        : require('socks5-https-client/lib/Agent');

                    config = {
                        ...config,
                        agentClass,
                        agentOptions
                    };
                    console.log(agentOptions);
                    console.log(config.agentOptions);
                    delete config.useProxy;
                    break;
                }
                default:
                    throw new Error(`Unknown proxy: "${config.useProxy}"`);
            }
        }

        console.log(config);

        return config;
    }

    public readonly preset: string = 'default';

    /**
     * Root middleware, apply for all requests with all presets
     * @protected
     */
    public rootMiddleware: {
        before: IHttpMiddleware[];
        after: IHttpMiddleware[];
    } = { before: [], after: [] };

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
        presets[preset] = HttpClient.preparePreset(config);
    }

    /**
     * Return new HttpClient with pre configured preset
     * @param name
     */
    public withPreset(preset: string): HttpClient {
        if (!(preset in presets)) presets[preset] = {};
        return new HttpClient(preset);
    }

    /**
     * Add new middle
     *
     * @param middleware
     * @param preset
     */
    public applyMiddleware(
        middleware: IHttpMiddleware,
        preset = 'default'
    ): void {
        if (!presets[preset]) presets[preset] = {};
        const config = presets[preset];
        if (!Array.isArray(config.middleware)) config.middleware = [];
        config.middleware.push(middleware);
    }

    public get(url: string, options?: IHttpConfig): Promise<Response>;
    public get(
        url: string,
        preset: string,
        options?: IHttpConfig
    ): Promise<Response>;
    public get(
        url: string,
        options?: IHttpConfig | string,
        additional: IHttpConfig = {}
    ): Promise<Response> {
        return this.exec('get', url, null, options, additional);
    }

    public post(
        url: string,
        body: Body,
        options?: IHttpConfig
    ): Promise<Response>;
    public post(
        url: string,
        body: Body,
        preset: string,
        options?: IHttpConfig
    ): Promise<Response>;
    public post(
        url: string,
        body: Body,
        options?: IHttpConfig | string,
        additional: IHttpConfig = {}
    ): Promise<Response> {
        return this.exec('post', url, body, options, additional);
    }

    public put(
        url: string,
        body: Body,
        options?: IHttpConfig
    ): Promise<Response>;
    public put(
        url: string,
        body: Body,
        preset: string,
        options?: IHttpConfig
    ): Promise<Response>;
    public put(
        url: string,
        body: Body,
        options?: IHttpConfig | string,
        additional: IHttpConfig = {}
    ): Promise<Response> {
        return this.exec('put', url, body, options, additional);
    }

    public patch(
        url: string,
        body: Body,
        options?: IHttpConfig
    ): Promise<Response>;
    public patch(
        url: string,
        body: Body,
        preset: string,
        additional?: IHttpConfig
    ): Promise<Response>;
    public patch(
        url: string,
        body: Body,
        options?: IHttpConfig | string,
        additional: IHttpConfig = {}
    ): Promise<Response> {
        return this.exec('patch', url, body, options, additional);
    }

    public delete(url: string, options?: IHttpConfig): Promise<Response>;
    public delete(
        url: string,
        preset?: string,
        options?: IHttpConfig
    ): Promise<Response>;
    public delete(
        url: string,
        options?: IHttpConfig | string,
        additional: IHttpConfig = {}
    ): Promise<Response> {
        return this.exec('delete', url, null, options, additional);
    }

    public options(url: string, options?: IHttpConfig): Promise<Response>;
    public options(
        url: string,
        preset?: string,
        options?: IHttpConfig
    ): Promise<Response>;
    public options(
        url: string,
        options?: IHttpConfig | string,
        additional: IHttpConfig = {}
    ): Promise<Response> {
        return this.exec('options', url, null, options, additional);
    }

    public exec(
        method: string,
        url: string,
        body?: Body,
        options?: IHttpConfig | string,
        additional: IHttpConfig = {}
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const opts: IHttpConfig & request.UrlOptions = {
                ...presets[typeof options === 'string' ? options : this.preset],
                ...(typeof options === 'object' ? options : {}),
                ...additional,
                headers: {
                    ...presets[
                        typeof options === 'string' ? options : this.preset
                        ].headers,
                    ...(typeof options === 'object' &&
                    typeof options.headers === 'object'
                        ? options.headers
                        : {}),
                    ...(typeof additional === 'object' &&
                    typeof additional.headers === 'object'
                        ? additional.headers
                        : {})
                },
                method,
                url
            };

            if (body) opts.body = body;

            const middleware = [
                ...this.rootMiddleware.before,
                ...(Array.isArray(opts.middleware) ? opts.middleware : []),
                ...this.rootMiddleware.after
            ];

            const runs: Array<{
                up: (req) => void;
                index: number;
                down: (req) => (res) => void;
            }> = middleware.map((mw, ind) => {
                const context = {};

                const index = ind + 1;
                const down  = req => res => {
                    mw.call(
                        context,
                        req,
                        res,
                        runs[index + 1].up,
                        runs[index - 1].down(req)
                    );
                };
                const up    = req => {
                    mw.call(
                        context,
                        req,
                        null,
                        runs[index + 1].up,
                        runs[index - 1].down(req)
                    );
                };
                return {
                    index,
                    up,
                    down
                };
            });

            {
                runs.unshift({
                    index: 0,
                    up   : req => {
                        runs[1].up(req);
                    },
                    down : () => resolve
                });
            }

            {
                const index = runs.length;
                const up    = req => {
                    if (req.body && typeof req.body === 'object' && !req.json)
                        req.body = querystring.stringify(req.body);

                    request(req, (err, res, content) => {
                        runs[index - 1].down(req)(
                            Response.createFromRequestCallback(
                                err,
                                res,
                                content
                            )
                        );
                    });
                };
                runs.push({
                    index,
                    up,
                    down: null
                });
            }

            runs[0].up(opts);
        });
    }
}

export const Http = new HttpClient();
