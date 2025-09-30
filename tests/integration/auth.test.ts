import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('auth flow', () => {
  let agent = request.agent(app);

  it('GET /auth/login returns 200', async () => {
    const res = await agent.get('/auth/login');
    expect(res.status).toBe(200);
  });
});


