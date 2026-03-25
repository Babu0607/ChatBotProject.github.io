const request = require('supertest');
const app = require('../server');

describe('chatbot Rotes', () => {

    test('GET / have to return status 200', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
    });

    test('GET / have to return HTML', async () => {
        const response = await request(app).get('/');
        expect(response.headers['content-type']).toMatch(/html/);
    });

    test('GET /inexistente-route have to return 404', async () => {
        const response = await request(app).get('/path-that-does-not-exist');
        expect(response.status).toBe(404);
    });

});