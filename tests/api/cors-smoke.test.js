const express = require('express');
const cors = require('cors');
const request = require('supertest');

const { createCorsOptions } = require('../../src/middleware/cors-config');

describe('CORS smoke tests', () => {
  const allowedOrigin = 'https://allowed.example.com';
  const deniedOrigin = 'https://denied.example.com';

  function createTestApp() {
    const app = express();
    app.use(cors(createCorsOptions({ allowedOrigins: [allowedOrigin] })));
    app.get('/api/health', (req, res) => {
      res.json({ ok: true });
    });

    return app;
  }

  test('returns CORS headers for allowlisted origin', async () => {
    const app = createTestApp();

    const response = await request(app)
      .get('/api/health')
      .set('Origin', allowedOrigin);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers.vary).toMatch(/Origin/);
  });

  test('omits CORS headers for denied origin', async () => {
    const app = createTestApp();

    const response = await request(app)
      .get('/api/health')
      .set('Origin', deniedOrigin);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  test('handles preflight for allowlisted origin', async () => {
    const app = createTestApp();

    const response = await request(app)
      .options('/api/health')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
