import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('defects pages', () => {
  const agent = request.agent(app);
  it('redirects to login when not authed', async () => {
    const res = await agent.get('/defects');
    expect([302, 303]).toContain(res.status);
  });
});


