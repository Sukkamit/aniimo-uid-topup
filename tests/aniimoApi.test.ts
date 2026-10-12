import request from 'supertest';
import { createApp } from '../src/app';
import { characterCache } from '../src/services/characterCache';
import { rateLimiter } from '../src/services/rateLimiter';

describe('Aniimo UID Top-Up API Test Suite', () => {
  let app: any;

  beforeEach(() => {
    characterCache.clear();
    rateLimiter.reset();
    app = createApp();
  });

  describe('Health and System Status', () => {
    it('GET /health should return 200 and system details', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.region).toBe('Taiwan (TW)');
      expect(res.body.currency).toBe('TWD');
      expect(res.body.payment_gateway).toBe('MyCard');
    });
  });

  describe('Servers & Packages (Region Taiwan / TWD)', () => {
    it('GET /api/v1/aniimo/servers should return list of servers including Server 4', async () => {
      const res = await request(app).get('/api/v1/aniimo/servers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const server4 = res.body.data.find((s: any) => s.serverId === '4');
      expect(server4).toBeDefined();
      expect(server4.serverName).toContain('Server 4');
    });

    it('GET /api/v1/aniimo/packages should return packages locked to TWD', async () => {
      const res = await request(app).get('/api/v1/aniimo/packages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currency).toBe('TWD');
      expect(res.body.region).toBe('Taiwan (TW)');

      const packages = res.body.data;
      expect(packages.length).toBeGreaterThanOrEqual(4);

      // Verify specific packages matching PDF
      const pkg300 = packages.find((p: any) => p.packageId === 'PKG-300');
      expect(pkg300).toBeDefined();
      expect(pkg300.priceTwd).toBe(138);
      expect(pkg300.originalPriceTwd).toBe(150);

      const pkg60 = packages.find((p: any) => p.packageId === 'PKG-60');
      expect(pkg60).toBeDefined();
      expect(pkg60.priceTwd).toBe(28);

      const pkg980 = packages.find((p: any) => p.packageId === 'PKG-980');
      expect(pkg980).toBeDefined();
      expect(pkg980.priceTwd).toBe(451);
    });
  });

  describe('Character Verification (Core Scope)', () => {
    it('POST /api/v1/aniimo/verify should return Sweettoast Lv. 80 for test UID 412000126173 on Server 4', async () => {
      const res = await request(app)
        .post('/api/v1/aniimo/verify')
        .send({
          uid: '412000126173',
          server: '4',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role_name).toBe('Sweettoast');
      expect(res.body.data.uid).toBe('412000126173');
      expect(res.body.data.server_id).toBe('4');
      expect(res.body.data.level).toBe(80);
      expect(res.body.data.region).toBe('Taiwan');
    });

    it('POST /api/v1/aniimo/verify should use cache on repeat lookups', async () => {
      // First call (populates cache)
      const res1 = await request(app)
        .post('/api/v1/aniimo/verify')
        .send({ uid: '412000126173', server: '4' });
      expect(res1.status).toBe(200);

      // Cache should contain this entry
      expect(characterCache.size()).toBe(1);

      // Second call (hits cache)
      const res2 = await request(app)
        .post('/api/v1/aniimo/verify')
        .send({ uid: '412000126173', server: '4' });
      expect(res2.status).toBe(200);
      expect(res2.body.data.role_name).toBe('Sweettoast');
    });

    it('POST /api/v1/aniimo/verify should reject invalid non-numeric or short UID', async () => {
      const res = await request(app)
        .post('/api/v1/aniimo/verify')
        .send({ uid: 'abc-invalid', server: '4' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('UID must be 8-16 numeric digits');
    });

    it('POST /api/v1/aniimo/verify should reject invalid server ID', async () => {
      const res = await request(app)
        .post('/api/v1/aniimo/verify')
        .send({ uid: '412000126173', server: '999' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid server ID');
    });

    it('POST /api/v1/aniimo/verify should return 400 when character not found', async () => {
      const res = await request(app)
        .post('/api/v1/aniimo/verify')
        .send({ uid: '88888888000', server: '4' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('CHARACTER_NOT_FOUND');
    });
  });

  describe('Order Creation & MyCard Payment Flow', () => {
    it('POST /api/v1/aniimo/order/create should create order and return MyCard payment URL', async () => {
      const res = await request(app)
        .post('/api/v1/aniimo/order/create')
        .send({
          uid: '412000126173',
          server: '4',
          packageId: 'PKG-300',
          paymentChannel: 'MyCard Points',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toMatch(/^ORD-ANIIMO-\d+-\d+$/);
      expect(res.body.data.characterName).toBe('Sweettoast');
      expect(res.body.data.finalAmountTwd).toBe(138);
      expect(res.body.data.discountTwd).toBe(12);
      expect(res.body.data.paymentChannel).toBe('MyCard Points');
      expect(res.body.data.paymentUrl).toContain('mycard520.com.tw');
      expect(res.body.data.status).toBe('PENDING_PAYMENT');
    });

    it('GET /api/v1/aniimo/order/:orderId should retrieve created order details', async () => {
      const createRes = await request(app)
        .post('/api/v1/aniimo/order/create')
        .send({
          uid: '412000126173',
          server: '4',
          packageId: 'PKG-60',
        });

      const orderId = createRes.body.data.orderId;

      const getRes = await request(app).get(`/api/v1/aniimo/order/${orderId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.orderId).toBe(orderId);
      expect(getRes.body.data.finalAmountTwd).toBe(28);
    });

    it('GET /api/v1/aniimo/order/:orderId should return 404 for unknown orderId', async () => {
      const res = await request(app).get('/api/v1/aniimo/order/ORD-NONEXISTENT');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('Reverse Engineering Analysis Documentation Endpoint', () => {
    it('GET /api/v1/aniimo/reverse-engineering/analysis should return structured analysis report', async () => {
      const res = await request(app).get('/api/v1/aniimo/reverse-engineering/analysis');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target.targetRegion).toBe('Taiwan (TW)');
      expect(res.body.data.target.targetCurrency).toBe('TWD (New Taiwan Dollar)');
      expect(res.body.data.target.paymentGateway).toContain('MyCard');
      expect(res.body.data.authenticationFlows.legacyViaLogin).toBeDefined();
      expect(res.body.data.authenticationFlows.uidDirectTopUp).toBeDefined();
      expect(res.body.data.endpoints.length).toBeGreaterThanOrEqual(4);
      expect(res.body.data.resilienceStrategy).toBeDefined();
    });
  });

  describe('Rate Limiter & Resilience', () => {
    it('Should include rate limit headers in API responses', async () => {
      const res = await request(app).get('/api/v1/aniimo/servers');
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('Should return 429 when client exceeds rate limit', async () => {
      const strictLimiter = new (require('../src/services/rateLimiter').SlidingWindowRateLimiter)(60000, 3);
      const testApp = require('express')();
      testApp.use(strictLimiter.middleware());
      testApp.get('/test', (_req: any, res: any) => res.json({ ok: true }));

      // Request 1, 2, 3 ok
      await request(testApp).get('/test');
      await request(testApp).get('/test');
      await request(testApp).get('/test');

      // Request 4 blocked
      const res = await request(testApp).get('/test');
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});
