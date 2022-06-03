import request from 'supertest';
import app from '../../app';

describe('GET /home', () => {
  test('Should responde with status 200', async () => {
    const response = await request(app).get('/').send();
    expect(response.status).toBe(200);
  });

  test('Deberia responder un objeto con error: "", body: "Hello World"', async () => {
    const response = await request(app).get('/').send();
    expect(response.body).toEqual({ error: '', body: 'Hello World' });
  })
})