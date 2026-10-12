import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { aniimoClientService } from '../services/aniimoClient';

const verifySchema = z.object({
  uid: z.string().min(1, 'UID is required'),
  server: z.string().optional().default('4'),
});

const createOrderSchema = z.object({
  uid: z.string().min(1, 'UID is required'),
  server: z.string().optional().default('4'),
  packageId: z.string().min(1, 'packageId is required'),
  paymentChannel: z.enum(['MyCard Points', 'MyCard Billing']).optional().default('MyCard Points'),
});

export class AniimoController {
  // 1. POST /api/v1/aniimo/verify
  public verifyCharacter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const { uid, server } = parsed.data;
      const character = await aniimoClientService.verifyCharacter(uid, server);

      res.status(200).json({
        success: true,
        code: 'VERIFICATION_SUCCESS',
        message: 'Character verified successfully',
        data: {
          uid: character.uid,
          role_name: character.roleName,
          server: character.server,
          server_id: character.serverId,
          level: character.level,
          region: character.region,
          order_count: character.orderCount || 0,
          avatar_url: character.avatarUrl,
          vip_level: character.vipLevel || 1,
        },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        code: 'CHARACTER_NOT_FOUND',
        message: err.message,
      });
    }
  };

  // 2. GET /api/v1/aniimo/servers
  public getServers = async (_req: Request, res: Response): Promise<void> => {
    const servers = aniimoClientService.getServers();
    res.status(200).json({
      success: true,
      data: servers,
    });
  };

  // 3. GET /api/v1/aniimo/packages
  public getPackages = async (_req: Request, res: Response): Promise<void> => {
    const packages = aniimoClientService.getPackages();
    res.status(200).json({
      success: true,
      region: 'Taiwan (TW)',
      currency: 'TWD',
      payment_gateway: 'MyCard',
      data: packages,
    });
  };

  // 4. POST /api/v1/aniimo/order/create
  public createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid order request',
          details: parsed.error.issues,
        });
        return;
      }

      const { uid, server, packageId, paymentChannel } = parsed.data;
      const order = await aniimoClientService.createTopUpOrder(uid, server, packageId, paymentChannel);

      res.status(201).json({
        success: true,
        code: 'ORDER_CREATED',
        message: 'Top-up order created successfully. Please proceed to payment.',
        data: order,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        code: 'ORDER_CREATION_FAILED',
        message: err.message,
      });
    }
  };

  // 5. GET /api/v1/aniimo/order/:orderId
  public getOrder = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const order = aniimoClientService.getOrder(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: `Order '${orderId}' not found.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  };

  // 6. GET /api/v1/aniimo/reverse-engineering/analysis
  public getReverseEngineeringReport = async (_req: Request, res: Response): Promise<void> => {
    const report = aniimoClientService.getReverseEngineeringAnalysis();
    res.status(200).json({
      success: true,
      data: report,
    });
  };
}

export const aniimoController = new AniimoController();
