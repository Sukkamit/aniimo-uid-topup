import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { aniimoController } from './controllers/aniimoController';
import { rateLimiter } from './services/rateLimiter';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static UI demo files
  let publicPath = path.join(__dirname, 'public');
  if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
    const srcPublic = path.join(__dirname, '../src/public');
    if (fs.existsSync(path.join(srcPublic, 'index.html'))) {
      publicPath = srcPublic;
    }
  }
  app.use(express.static(publicPath));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'Aniimo UID Top-Up API',
      region: 'Taiwan (TW)',
      currency: 'TWD',
      payment_gateway: 'MyCard',
      timestamp: new Date().toISOString(),
    });
  });

  // Apply rate limiter to API routes
  app.use('/api/', rateLimiter.middleware());

  // API v1 Routes
  app.post('/api/v1/aniimo/verify', aniimoController.verifyCharacter);
  app.get('/api/v1/aniimo/servers', aniimoController.getServers);
  app.get('/api/v1/aniimo/packages', aniimoController.getPackages);
  app.post('/api/v1/aniimo/order/create', aniimoController.createOrder);
  app.get('/api/v1/aniimo/order/:orderId', aniimoController.getOrder);
  app.get('/api/v1/aniimo/reverse-engineering/analysis', aniimoController.getReverseEngineeringReport);

  // Fallback for SPA/UI demo
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Global 404 handler for API routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Error]:', err);
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    });
  });

  return app;
}
