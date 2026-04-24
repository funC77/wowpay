import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';
import payRoutes from './routes/pay';
import redeemRoutes from './routes/redeem';

export type Env = {
  Bindings: {
    DB: D1Database;
    BASE_URL: string;
    API_BASE_URL: string;
    MERCHANT_NUM: string;
    SECRET_KEY: string;
    PAY_TYPE: string;
  };
  Variables: {
    prisma: PrismaClient;
  };
};

const app = new Hono<Env>();

app.use(logger());

// 每个请求创建 PrismaClient（D1 适配器需要绑定 env.DB）
app.use(async (c, next) => {
  const adapter = new PrismaD1(c.env.DB);
  c.set('prisma', new PrismaClient({ adapter }));
  await next();
});

app.route('/api', payRoutes);
app.route('/api', redeemRoutes);

export default app;
