export interface CharacterInfo {
  uid: string;
  roleName: string;
  server: string;
  serverId: string;
  level: number;
  region: string;
  orderCount?: number;
  avatarUrl?: string;
  vipLevel?: number;
}

export interface GameServer {
  serverId: string;
  serverName: string;
  serverArea: string;
  region: string;
  status: 'ONLINE' | 'MAINTENANCE';
}

export interface GamePackage {
  packageId: string;
  name: string;
  stars: number;
  bonusStars: number;
  firstTimeBonus: number;
  priceTwd: number;
  originalPriceTwd?: number;
  currency: 'TWD';
  description: string;
  badge?: string;
}

export interface TopUpOrder {
  orderId: string;
  uid: string;
  characterName: string;
  server: string;
  packageId: string;
  packageName: string;
  priceTwd: number;
  discountTwd: number;
  finalAmountTwd: number;
  paymentChannel: 'MyCard Points' | 'MyCard Billing';
  status: 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentUrl: string;
  tradeNo: string;
  createdAt: string;
  expiresAt: string;
}

export interface VerifyRequestBody {
  uid: string;
  server?: string;
}

export interface CreateOrderRequestBody {
  uid: string;
  server: string;
  packageId: string;
  paymentChannel?: 'MyCard Points' | 'MyCard Billing';
}

export interface ReverseEngineeringAnalysis {
  target: {
    officialWebshopUrl: string;
    gameName: string;
    targetRegion: string;
    targetCurrency: string;
    paymentGateway: string;
    distributorTaiwan: string;
  };
  authenticationFlows: {
    legacyViaLogin: {
      type: string;
      risk: string;
      flow: string[];
    };
    uidDirectTopUp: {
      type: string;
      benefit: string;
      flow: string[];
    };
  };
  endpoints: {
    name: string;
    method: string;
    path: string;
    description: string;
    headers: Record<string, string>;
    payload: Record<string, unknown>;
  }[];
  resilienceStrategy: {
    rateLimiting: string;
    ipRotation: string;
    captchaBypass: string;
    cacheOptimization: string;
  };
}
