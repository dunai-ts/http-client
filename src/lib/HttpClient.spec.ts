import { describe, it } from 'mocha';
import should from 'should';
import { Request, Response } from './Http';
import { HttpClient } from './HttpClient';

let Http: HttpClient;

describe('Middleware', () => {
    beforeEach(() => {
        Http = new HttpClient();
    });

    describe('base check', () => {

        it('without middleware', async () => {
            const result = await Http.get('http://google.com');

            should(result.statusCode).eql(200);
            should(result.statusMessage).eql('OK');
        });

        it('with 1 return middleware', async () => {
            Http.applyMiddleware((req, res, query, answer) => {
                answer(Response.createOk({my: 'OK'}));
            });

            const result = await Http.get('http://google.com');

            should(result.statusCode).eql(200);
            should(result.statusMessage).eql('OK');
            should(result.body).eql({my: 'OK'});
        });

        it('with 1 transparent middleware', async () => {
            const path: string[] = [];

            Http.applyMiddleware((req, res, query, answer) => {
                const text = res ? 'answer 1' : 'query 1';
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
                    'Connection': 'close',
                    'Host'      : 'httpbin.org',
                    'X-Uuid'    : 'f0fa-random-uuid-f0fa',
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
            Http.applyMiddleware(function (req, res, query, answer) {
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
