import { describe, it } from 'mocha';
import should from 'should';
import { Response } from '../Http';
import { HttpClient } from '../HttpClient';
import { HttpMock } from './HttpClient';

let Http: HttpClient;

describe('HTTP mock tests', () => {
    beforeEach(() => {
        HttpMock.flush();
    });

    describe('expectRequests, expect*', () => {
        beforeEach(() => {
            Http = new HttpClient();
            Http.rootMiddleware.after.push(HttpMock.middleware);
            HttpMock.flush();

            Http.get('https://google.com/search?q=sdfsdf');
            Http.post('https://google.com', {});
            Http.put('https://ya.ru', {});
        });

        describe('url', () => {
            it('all', () => {
                const reqs = HttpMock.expectRequests([], /.*/);
                should(reqs).length(3);
            });

            it('url as string 1', () => {
                const reqs = HttpMock.expectRequests([], 'yahoo');
                should(reqs).length(0);
            });

            it('url as string 2', () => {
                const reqs = HttpMock.expectRequests([], 'sdfsdf');
                should(reqs).length(1);
            });

            it('url as RegExp 2', () => {
                const reqs = HttpMock.expectRequests([], /e\.com/);
                should(reqs).length(2);
            });

            it('url as RegExp 1', () => {
                const reqs = HttpMock.expectRequests([], /e\.com$/);
                should(reqs).length(1);
            });
        });

        describe('method', () => {
            it('all', () => {
                const reqs = HttpMock.expectRequests([], /.*/);
                should(reqs).length(3);
            });

            it('get', () => {
                const reqs = HttpMock.expectRequests(['get'], /.*/);
                should(reqs).length(1);
            });

            it('post', () => {
                const reqs = HttpMock.expectRequests(['post'], /.*/);
                should(reqs).length(1);
            });

            it('put', () => {
                const reqs = HttpMock.expectRequests(['put'], /.*/);
                should(reqs).length(1);
            });

            it('options', () => {
                const reqs = HttpMock.expectRequests(['options'], /.*/);
                should(reqs).length(0);
            });
        });

        describe('count (total 3)', () => {
            it('1..5', () => {
                const reqs = HttpMock.expectRequests([], /.*/, 1, 5);
                should(reqs).length(3);
            });

            it('= 3', () => {
                const reqs = HttpMock.expectRequests([], /.*/, 3, 3);
                should(reqs).length(3);
            });

            it('1..2', () => {
                should(() => HttpMock.expectRequests([], /.*/, 1, 2))
                    .throwError('More items than it should be');
            });

            it('5..7', () => {
                should(() => HttpMock.expectRequests([], /.*/, 5, 7))
                    .throwError('Elements less than it should be');
            });
        });

        describe('expect*', () => {
            it('expectOne (== 1)', () => {
                const req = HttpMock.expectOne([], 'ya.ru');
                should(req).ok();
            });

            it('expectOne (more 1)', () => {
                should(() => HttpMock.expectOne([], 'google.com'))
                    .throw('More items than it should be');
            });

            it('expectNoRequests', () => {
                should(() => HttpMock.expectNoRequests())
                    .throw('More items than it should be');
            });

            it('expectNoRequests (negative)', () => {
                HttpMock.requests.length = 0;

                should(() => HttpMock.expectNoRequests())
                    .not.throwError('Elements less than it should be');
            });

            it('expectNone', () => {
                should(() => HttpMock.expectNone([], 'yahoo'))
                    .not.throw();
            });

            it('expectNone (negative)', () => {
                should(() => HttpMock.expectNone([], 'sdf'))
                    .throw('More items than it should be');
            });

            it('expectNone at all', () => {
                HttpMock.flush();
                should(() => HttpMock.expectNone())
                    .not.throw();
            });

            it('expectNone at all (negative)', () => {
                should(() => HttpMock.expectNone())
                    .throw('More items than it should be');
            });
        });
    });
    describe('requests and viewed status', () => {
        it('List of requests and viewed status', async () => {
            const q = Http.get('https://google.com');

            should(HttpMock.requests).have.length(1);
            should(HttpMock.requests[0]).have.property('viewed', false);

            const req = HttpMock.expectOne('https://google.com');
            req.answer(Response.createOk({ok: 'OK'}));

            should(HttpMock.requests).have.length(1);
            should(HttpMock.requests[0]).have.property('viewed', true);

            const res = await q;

            should(res.body).eql({ok: 'OK'});
        });
    });

    describe('other', () => {
        it('Mock get remote request', async () => {
            const q = Http.get('http://example.com');

            const req = HttpMock.expectOne('get', 'http://example.com');
            req.answer(Response.createOk({
                ok: true,
            }));

            const result = await q;

            should(result.statusCode).be.equal(200);
            should(result.statusMessage).be.equal('OK');
            should(result.status).be.equal('200: OK');
            should(result.body).have.property('ok', true);
        });

        it('Mock post remote request', async () => {
            const q = Http.post('http://example.com', {data: 'value'});

            const req = HttpMock.expectOne('post', 'http://example.com');
            req.answer(Response.createOk({
                ok  : true,
                data: req.request.body['data'],
            }));
            const result = await q;
            should(result.statusCode).be.equal(200);
            should(result.statusMessage).be.equal('OK');
            should(result.status).be.equal('200: OK');
            should(result.body).have.property('ok', true);
            should(result.body).have.property('data', 'value');
        });
    });
});
