import { Router } from 'express';
import { getEnv } from '../lib/env';
import { getPrisma } from '../lib/prisma';
import { createPayUrl, verifyCallback } from '../lib/yipay';
import { generateCode } from '../lib/redeemCode';

const router = Router();

router.get('/pay', async (req, res) => {
  const prisma = getPrisma();
  const userId = req.query.user_id as string;
  const amount = req.query.amount as string;

  if (!userId || !amount) {
    return res.status(400).send('缺少参数: user_id, amount');
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

  const env = getEnv();
  const payUrl = createPayUrl({
    outTradeNo: orderId,
    notifyUrl: `${env.BASE_URL}/api/pay/callback`,
    returnUrl: `${env.BASE_URL}/success.html?orderId=${orderId}`,
    name: '平台额度充值',
    money: Number(amount).toFixed(2),
    type: 'alipay',
  });

  return res.redirect(payUrl);
});

router.post('/pay/callback', async (req, res) => {
  const prisma = getPrisma();
  const params = req.body as Record<string, string>;

  if (!verifyCallback(params)) {
    console.error('易支付回调签名验证失败', params);
    return res.status(400).send('fail');
  }

  if (params.trade_status !== 'TRADE_SUCCESS') {
    return res.send('success');
  }

  const orderId = params.out_trade_no;

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { redeemCode: true },
  });

  if (!order) {
    console.error('回调订单不存在', orderId);
    return res.send('success');
  }

  if (order.status === 'paid' || order.redeemCode) {
    return res.send('success');
  }

  const callbackMoney = parseFloat(params.money);
  const orderMoney = parseFloat(order.amount.toString());
  if (Math.abs(callbackMoney - orderMoney) > 0.01) {
    console.error('回调金额不匹配', { orderId, callbackMoney, orderMoney });
    return res.status(400).send('fail');
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
  return res.send('success');
});

router.get('/pay/code', async (req, res) => {
  const prisma = getPrisma();
  const orderId = req.query.orderId as string;

  if (!orderId) {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { redeemCode: true },
  });

  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }

  return res.json({
    status: order.status,
    code: order.redeemCode?.code || null,
    amount: order.redeemCode?.amount || null,
  });
});

router.post('/pay/test-callback', async (req, res) => {
  const prisma = getPrisma();
  const { orderId } = req.body as { orderId?: string };

  if (!orderId) {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { redeemCode: true },
  });

  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }

  if (order.status === 'paid' || order.redeemCode) {
    return res.json({
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
  return res.json({
    message: '模拟支付成功',
    code,
    orderId,
  });
});

export default router;
