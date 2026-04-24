import { Hono } from 'hono';
import type { Env } from '../index';
import { YiPay } from '../lib/yipay';
import { generateCode } from '../lib/redeemCode';

const app = new Hono<Env>();

app.get('/pay', async (c) => {
  const prisma = c.get('prisma');
  const userId = c.req.query('user_id');
  const amount = c.req.query('amount');

  if (!userId || !amount) {
    return c.text('缺少参数: user_id, amount', 400);
  }

  const orderId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;

  await prisma.paymentOrder.create({
    data: {
      id: orderId,
      userId,
      amount: parseFloat(Number(amount).toFixed(2)),
      status: 'pending',
    },
  });

  const yipay = new YiPay({
    apiUrl: c.env.YIPAY_URL,
    pid: c.env.YIPAY_PID,
    key: c.env.YIPAY_KEY,
  });

  const payUrl = yipay.createPayUrl({
    outTradeNo: orderId,
    notifyUrl: `${c.env.BASE_URL}/api/pay/callback`,
    returnUrl: `${c.env.BASE_URL}/success.html?orderId=${orderId}`,
    name: '平台额度充值',
    money: Number(amount).toFixed(2),
    type: 'alipay',
  });

  return c.redirect(payUrl);
});

app.post('/pay/callback', async (c) => {
  const prisma = c.get('prisma');
  const params = await c.req.parseBody() as Record<string, string>;

  const yipay = new YiPay({
    apiUrl: c.env.YIPAY_URL,
    pid: c.env.YIPAY_PID,
    key: c.env.YIPAY_KEY,
  });

  if (!yipay.verifyCallback(params)) {
    console.error('易支付回调签名验证失败', params);
    return c.text('fail', 400);
  }

  if (params.trade_status !== 'TRADE_SUCCESS') {
    return c.text('success');
  }

  const orderId = params.out_trade_no;

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

  const callbackMoney = parseFloat(params.money);
  const orderMoney = parseFloat(order.amount.toString());
  if (Math.abs(callbackMoney - orderMoney) > 0.01) {
    console.error('回调金额不匹配', { orderId, callbackMoney, orderMoney });
    return c.text('fail', 400);
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

  console.log('支付成功，生成兑换码', { orderId, code });
  return c.text('success');
});

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
