import { describe, it } from 'mocha';
import should from 'should';
import { Request, Response } from './Http';
import { HttpClient } from './HttpClient';

let Http: HttpClient;

describe('HttpClient', () => {
    describe('Middleware', () => {
        beforeEach(() => {
            Http = new HttpClient();
            Http.setPreset('default', {});
        });

        describe('base check', () => {

            it('without middleware', async () => {
                const result = await Http.get('http://google.com');

                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');
            });

            it('with 1 return middleware', async () => {
                const middleware = (req, res, query, answer) => {
                    answer(Response.createOk({my: 'OK'}));
                };
                Http.applyMiddleware(middleware);

                should(Http.config).eql({
                    middleware: [
                        middleware,
                    ],
                });

                const result = await Http.get('http://google.com');

                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');
                should(result.body).eql({my: 'OK'});
            });

            it('with 1 transparent middleware', async () => {
                const path: string[] = [];

                const middleware = (req, res, query, answer) => {
                    const text = res ? 'answer 1' : 'query 1';
                    path.push(text);

                    if (res)
                        answer(res);
                    else
                        query(req);
                };

                Http.applyMiddleware(middleware);

                should(Http.config).eql({
                    middleware: [
                        middleware,
                    ],
                });

                console.log(Http.config);

                const result = await Http.get('http://google.com');

                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');

                should(path).eql([
                    'query 1',
                    'answer 1',
                ]);
            });

            it('with 2 transparent middleware', async () => {
                const path: string[] = [];

                Http.applyMiddleware((req, res, query, answer) => {
                    const text = res ? 'answer 1' : 'query 1';
                    path.push(text);

                    if (res)
                        answer(res);
                    else
                        query(req);
                });
                Http.applyMiddleware((req, res, query, answer) => {
                    const text = res ? 'answer 2' : 'query 2';
                    path.push(text);

                    if (res)
                        answer(res);
                    else
                        query(req);
                });

                const result = await Http.get('http://google.com');

                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');

                should(path).eql([
                    'query 1',
                    'query 2',
                    'answer 2',
                    'answer 1',
                ]);
            });
        });

        describe('root middleware', () => {
            it('before middleware', async () => {
                let run = false;
                Http.rootMiddleware.before.push((req, res, query, answer) => {
                    run = true;
                    answer(Response.createOk({my: 'OK'}));
                });

                const result = await Http.get('http://google.com');

                should(run).ok();
                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');
                should(result.body).eql({my: 'OK'});
            });

            it('after middleware', async () => {
                let run = false;
                Http.rootMiddleware.after.push((req, res, query, answer) => {
                    run = true;
                    answer(Response.createOk({my: 'OK'}));
                });

                const result = await Http.get('http://google.com');

                should(run).ok();
                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');
                should(result.body).eql({my: 'OK'});
            });

            it('user case: make uuid for every request and, finally, ' +
                'add that as a header. Check header', async () => {
                const path: string[] = [];

                Http.rootMiddleware.before.push((req, res, query, answer) => {
                    const text = res ? 'answer before' : 'query before';
                    path.push(text);

                    if (res)
                        answer(res);
                    else {
                        req.uuid = 'f0fa-random-uuid-f0fa';
                        query(req);
                    }
                });

                Http.rootMiddleware.after.push(function (req: Request, res: Response, query, answer) {
                    const text = res ? 'answer after' : 'query after';
                    path.push(text);

                    if (res) {
                        res['uuid'] = this.uuid;
                        answer(res);
                    } else {
                        this.uuid = req.uuid;
                        if (!req.headers)
                            req.headers = [];
                        req.headers['X-uuid'] = req.uuid;
                        query(req);
                    }
                });
                Http.applyMiddleware((req, res, query, answer) => {
                    const text = res ? 'answer 1' : 'query 1';
                    path.push(text);

                    if (res)
                        answer(res);
                    else
                        query(req);
                });

                const result = await Http.get('https://httpbin.org/headers');

                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');
                should(result['uuid']).eql('f0fa-random-uuid-f0fa');
                should(result.body).eql({
                    'headers': {
                        // 'Connection': 'close',
                        'Host'  : 'httpbin.org',
                        'X-Uuid': 'f0fa-random-uuid-f0fa',
                    },
                });

                should(path).eql([
                    'query before',
                    'query 1',
                    'query after',
                    'answer after',
                    'answer 1',
                    'answer before',
                ]);
            });
        });

        describe('save context', () => {
            it('with 2 transparent middleware', async function () {
                const path: string[] = [];

                const uuids: { [key: string]: number } = {};

                let randSalt = 0;

                function random() {
                    randSalt++;
                    return 'uuid-' + randSalt;
                }

                Http.applyMiddleware(function (req, res, query, answer) {
                    const text = res ? 'answer 1' : 'query 1';
                    path.push(text);

                    this.uuid = this.uuid || random();

                    if (res) {
                        answer(res);
                        uuids[this.uuid] = 0;
                    } else {
                        uuids[this.uuid] = 1;
                        query(req);
                    }
                });
                Http.applyMiddleware((req, res, query, answer) => {
                    const text = res ? 'answer 2' : 'query 2';
                    path.push(text);

                    if (res)
                        answer(res);
                    else
                        query(req);
                });

                const result = await Http.get('http://google.com');

                should(result.statusCode).eql(200);
                should(result.statusMessage).eql('OK');

                should(path).eql([
                    'query 1',
                    'query 2',
                    'answer 2',
                    'answer 1',
                ]);

                should(uuids).eql({
                    'uuid-1': 0,
                });

                should(this.uuid).undefined();
            });
        });
    });

    describe('presets', () => {
        beforeEach(() => {
            Http = new HttpClient();
            Http.setPreset('default', {});
            Http.setPreset('other', {});
            Http.setPreset('other2', {});
            // Http.rootMiddleware.after = [
            //     (req, res, query, answer) => {
            //         console.log(req);
            //         answer(Response.createOk(req));
            //     },
            // ];
        });

        it('default', async () => {
            Http.setPreset('default', {
                baseUrl: 'https://google.com/',
            });

            const result = await Http.get('/');

            console.log(result.headers);

            should(result).have.property('body').ok();
        });

        it('default URL encode post data', async () => {
            Http.setPreset('default', {
                baseUrl: 'https://httpbin.org/delay/',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const result = await Http.post('0', {
                foo: 'ok',
                bar: 'success',
            });

            should(result)
                .have.property('body')
                .have.property('form')
                .eql({
                    foo: 'ok',
                    bar: 'success',
                });
        });

        it('default json post data', async () => {
            const result = await Http.post('https://httpbin.org/delay/0', {
                foo: 'ok',
                bar: 'success',
            }, 'json');

            const data = result.body.data;
            should(JSON.parse(data))
                .eql({
                    foo: 'ok',
                    bar: 'success',
                });
        });

        it('other', async () => {
            Http.setPreset('default', {
                baseUrl: 'https://google.com/',
            });
            Http.setPreset('other', {
                baseUrl: 'https://httpbin.org/headers',
            });

            const result = await Http.get('/');

            should(result.raw.request.uri.hostname).eql('www.google.com');
        });

        it('json (default preset)', async () => {
            const result = await Http.get('https://httpbin.org/headers', 'json');

            should(result.raw.request.uri.hostname).eql('httpbin.org');
            should(result.body).eql({
                headers: {
                    Host  : 'httpbin.org',
                    Accept: 'application/json',
                },
            });
        });

        it('withPreset', async () => {
            Http.setPreset('other', {
                baseUrl: 'https://google.com/',
            });
            Http.setPreset('default', {
                baseUrl: 'https://httpbin.org/headers',
            });

            const http = Http.withPreset('other');
            should(http.preset).eql('other');

            const result = await http.get('/');

            should(result.raw.request.uri.hostname).eql('www.google.com');
        });

        it('withPreset + directly set preset', async () => {
            Http.setPreset('other', {
                baseUrl: 'https://google.com/',
            });
            Http.setPreset('other2', {
                baseUrl: 'https://npmjs.com/',
            });
            Http.setPreset('default', {
                baseUrl: 'https://httpbin.org/headers',
            });

            const http = Http.withPreset('other');
            should(http.preset).eql('other');

            const result = await http.get('/', 'other2');

            should(result.raw.request.uri.hostname).eql('www.npmjs.com');
        });
    });
});
