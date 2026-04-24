import { Hono } from 'hono';
import type { Env } from '../index';
import { PayFM } from '../lib/yipay';
import { generateCode } from '../lib/redeemCode';

const app = new Hono<Env>();

/**
 * 创建支付订单并直接跳转至支付FM收银台
 * GET /api/pay?user_id=xxx&amount=xxx
 */
app.get('/pay', async (c) => {
  const prisma = c.get('prisma');
  const userId = c.req.query('user_id');
  const amount = c.req.query('amount');

  if (!userId || !amount) {
    return c.text('缺少参数: user_id, amount', 400);
  }

  const orderId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // 1. 先创建本地订单记录
  await prisma.paymentOrder.create({
    data: {
      id: orderId,
      userId,
      amount: parseFloat(Number(amount).toFixed(2)),
      status: 'pending',
    },
  });

  const env = c.env;

  // 2. 构造支付FM跳转地址（/submit.php 直连模式）
  const payFm = new PayFM({
    apiBaseUrl: env.API_BASE_URL,
    merchantNum: env.MERCHANT_NUM,
    secretKey: env.SECRET_KEY,
    payType: env.PAY_TYPE,
  });

  const orderUrl = payFm.createOrderUrl({
    outTradeNo: orderId,
    money: Number(amount).toFixed(2),
    notifyUrl: `${env.BASE_URL}/api/pay/callback`,
    returnUrl: `${env.BASE_URL}/success.html?orderId=${orderId}`,
    name: '平台额度充值',
  });

  // 直接跳转到支付FM收银台
  return c.redirect(orderUrl);
});

/**
 * 支付FM 异步通知回调
 * POST /api/pay/callback
 */
app.post('/pay/callback', async (c) => {
  const prisma = c.get('prisma');
  const params = (await c.req.parseBody()) as Record<string, string>;

  const env = c.env;
  const payFm = new PayFM({
    apiBaseUrl: env.API_BASE_URL,
    merchantNum: env.MERCHANT_NUM,
    secretKey: env.SECRET_KEY,
    payType: env.PAY_TYPE,
  });

  // 验签
  if (!payFm.verifyCallback(params)) {
    console.error('支付FM回调签名验证失败', params);
    return c.text('fail', 400);
  }

  // 回调订单号字段为 out_trade_no
  const orderId = params.out_trade_no;
  if (!orderId) {
    return c.text('fail', 400);
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { redeemCode: true },
  });

  if (!order) {
    console.error('回调订单不存在', orderId);
    return c.text('success');
  }

  if (order.status === 'paid' || order.redeemCode) {
    return c.text('success');
  }

  // 生成兑换码并更新订单状态
  const code = generateCode();

  await prisma.$transaction([
    prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: 'paid', paidAt: new Date() },
    }),
    prisma.redeemCode.create({
      data: {
        code,
        orderId,
        userId: order.userId,
        amount: order.amount,
        status: 'unused',
      },
    }),
  ]);

  console.log('支付成功，生成兑换码', { orderId, code });
  return c.text('success');
});

/**
 * 查询订单状态和兑换码
 * GET /api/pay/code?orderId=xxx
 */
app.get('/pay/code', async (c) => {
  const prisma = c.get('prisma');
  const orderId = c.req.query('orderId');

  if (!orderId) {
    return c.json({ error: '缺少 orderId' }, 400);
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { redeemCode: true },
  });

  if (!order) {
    return c.json({ error: '订单不存在' }, 404);
  }

  return c.json({
    status: order.status,
    code: order.redeemCode?.code || null,
    amount: order.redeemCode?.amount || null,
  });
});

/**
 * 模拟支付回调（测试用）
 * POST /api/pay/test-callback
 */
app.post('/pay/test-callback', async (c) => {
  const prisma = c.get('prisma');
  const { orderId } = await c.req.json<{ orderId?: string }>();

  if (!orderId) {
    return c.json({ error: '缺少 orderId' }, 400);
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { redeemCode: true },
  });

  if (!order) {
    return c.json({ error: '订单不存在' }, 404);
  }

  if (order.status === 'paid' || order.redeemCode) {
    return c.json({
      message: '该订单已支付',
      code: order.redeemCode?.code,
      orderId,
    });
  }

  const code = generateCode();

  await prisma.$transaction([
    prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: 'paid', paidAt: new Date() },
    }),
    prisma.redeemCode.create({
      data: {
        code,
        orderId,
        userId: order.userId,
        amount: order.amount,
        status: 'unused',
      },
    }),
  ]);

  console.log('【测试】模拟支付成功，生成兑换码', { orderId, code });
  return c.json({
    message: '模拟支付成功',
    code,
    orderId,
  });
});

export default app;
