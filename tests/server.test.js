const request = require('supertest');
const app = require('../server'); // Caminho para o seu server.js

describe('chatbot Rotes', () => {
    
    test('GET / should return status 200', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
    });

    test('GET / should return HTML', async () => {
        const response = await request(app).get('/');
        expect(response.headers['content-type']).toMatch(/html/);
    });

    test('GET /inexistente-route should return 404', async () => {
        const response = await request(app).get('/path-that-does-not-exist');
        expect(response.status).toBe(404);
    });
});