import { describe, it } from 'mocha';
import * as should from 'should';
import { Response } from '../Http';
import { Http, HttpMock } from './HttpClient';

console.log(HttpMock);

describe('HTTP proxy tests', () => {
    it('List of requests', async () => {
        HttpMock.flush();
        const result = Http.get('https://google.com');

        const req = HttpMock.expectOne('https://google.com');
        req.answer(Response.createOk({}));

        console.log(result);
        console.log(await result);

        // await Http.post('https://google.com', {q: 'asdasd'});
        console.log(HttpMock.requests);
        // should(HttpMock.requests).have.length(2);
    });

    //     it('Mock get remote request', async () => {
    //         HttpMock.reset();
    //         HttpMock.setMiddleware((method, url, body) => {
    //             return new Promise((resolve, reject) => {
    //                 should(method).be.equal('get');
    //                 should(url).be.equal('http://example.com');
    //                 setTimeout(() => {
    //                     let response = Response.createOk({
    //                         ok: true
    //                     });
    //                     resolve(response);
    //                 }, 200);
    //             });
    //         });
    //         const result = await Http.get('http://example.com');
    //         should(result.statusCode).be.equal(200);
    //         should(result.statusMessage).be.equal('Ok');
    //         should(result.status).be.equal('200: Ok');
    //         should(result.body).have.property('ok')
    //             .be.equal(true);
    //     });
    //
    //     it('Mock post remote request', async () => {
    //         HttpMock.reset();
    //         HttpMock.setMiddleware((method, url, body) => {
    //             return new Promise((resolve, reject) => {
    //                 should(method).be.equal('post');
    //                 should(url).be.equal('http://example.com');
    //                 setTimeout(() => {
    //                     let response = Response.createOk({
    //                         ok  : true,
    //                         data: body['data']
    //                     });
    //                     resolve(response);
    //                 }, 200);
    //             });
    //         });
    //         const result = await Http.post('http://example.com', { data: 'value' });
    //         should(result.statusCode).be.equal(200);
    //         should(result.statusMessage).be.equal('Ok');
    //         should(result.status).be.equal('200: Ok');
    //         should(result.body).have.property('ok')
    //             .be.equal(true);
    //         should(result.body).have.property('data')
    //             .be.equal('value');
    //     });
    //
    //     it('Remove middleware', async () => {
    //         HttpMock.reset();
    //         HttpMock.setMiddleware((method, url, body) => {
    //             return new Promise((resolve, reject) => {
    //                 throw new Error('Can not be run');
    //             });
    //         });
    //         HttpMock.removeMiddleware();
    //         let result = await Http.get('http://example.com');
    // //        should(result.statusCode).be.equal(200);
    // //        should(result.statusText).be.equal('Ok');
    // //        should(result.status).be.equal('200: Ok');
    // //        should(result.body).have.property('ok')
    // //                           .be.equal(true);
    //     });
});
