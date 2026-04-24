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
    YIPAY_URL: string;
    YIPAY_PID: string;
    YIPAY_KEY: string;
  };
  Variables: {
    prisma: PrismaClient;
  };
};

const app = new Hono<Env>();

app.use(logger());

app.use(async (c, next) => {
  const adapter = new PrismaD1(c.env.DB);
  c.set('prisma', new PrismaClient({ adapter }));
  await next();
});

app.route('/api', payRoutes);
app.route('/api', redeemRoutes);

export default app;
