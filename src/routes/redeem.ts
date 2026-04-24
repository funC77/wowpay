import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<Env>();

app.get('/redeem/verify', async (c) => {
  const prisma = c.get('prisma');
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: '缺少兑换码' }, 400);
  }

  const normalized = code.trim().toUpperCase().replace(/-/g, '');
  const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12)}`;

  const record = await prisma.redeemCode.findUnique({
    where: { code: formatted },
  });

  if (!record) {
    return c.json({ error: '兑换码不存在' }, 404);
  }

  if (record.status === 'used') {
    return c.json({ error: '兑换码已被使用' }, 400);
  }

  return c.json({
    valid: true,
    amount: record.amount,
    code: record.code,
  });
});

app.post('/redeem/consume', async (c) => {
  const prisma = c.get('prisma');
  const { code, user_id } = await c.req.json<{ code?: string; user_id?: string }>();

  if (!code) {
    return c.json({ error: '缺少兑换码' }, 400);
  }

  const normalized = code.trim().toUpperCase().replace(/-/g, '');
  const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12)}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.redeemCode.findUnique({
        where: { code: formatted },
      });

      if (!record) {
        throw new Error('兑换码不存在');
      }

      if (record.status === 'used') {
        if (user_id && record.userId === user_id) {
          return record;
        }
        throw new Error('兑换码已被使用');
      }

      const updated = await tx.redeemCode.update({
        where: { code: formatted },
        data: {
          status: 'used',
          usedAt: new Date(),
        },
      });

      return updated;
    });

    return c.json({
      success: true,
      amount: result.amount,
      code: result.code,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '核销失败';
    return c.json({ error: message }, 400);
  }
});

export default app;
