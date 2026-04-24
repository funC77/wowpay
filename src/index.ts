import express from 'express';
import { httpServerHandler } from 'cloudflare:node';
import { setEnv } from './lib/env';
import payRoutes from './routes/pay';
import redeemRoutes from './routes/redeem';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', payRoutes);
app.use('/api', redeemRoutes);

app.listen(3000);

const handler = httpServerHandler({ port: 3000 });

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    setEnv(env);
    return handler.fetch!(request as any, env, ctx);
  }
};
