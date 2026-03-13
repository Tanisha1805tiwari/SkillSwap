/**
 * SkillSwap Backend Tests
 */

import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: `test+${Date.now()}@skillswap.io`,
    password: 'TestPass@123',
  };

  let accessToken: string;

  it('POST /api/auth/register — creates user with 5 credits', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.credits).toBe(5);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('POST /api/auth/register — rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);
  });

  it('POST /api/auth/register — validates required fields', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email' })
      .expect(422);
  });

  it('POST /api/auth/login — returns token with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/login — rejects invalid password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' })
      .expect(401);
  });

  it('GET /api/auth/me — returns authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/auth/me — rejects unauthenticated', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: '+' } } });
  });
});

// ─── Skills Tests ─────────────────────────────────────────────────────────────

describe('Skills API', () => {
  it('GET /api/skills — returns skill list', async () => {
    const res = await request(app).get('/api/skills').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.skills)).toBe(true);
  });

  it('GET /api/skills — supports search query', async () => {
    const res = await request(app).get('/api/skills?q=programming').expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────

describe('Health', () => {
  it('GET /health — returns healthy status', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('healthy');
  });
});
