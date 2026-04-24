import { Router } from 'express';
import { getPrisma } from '../lib/prisma';

const router = Router();

router.get('/redeem/verify', async (req, res) => {
  const prisma = getPrisma();
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({ error: '缺少兑换码' });
  }

  const normalized = code.trim().toUpperCase().replace(/-/g, '');
  const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12)}`;

  const record = await prisma.redeemCode.findUnique({
    where: { code: formatted },
  });

  if (!record) {
    return res.status(404).json({ error: '兑换码不存在' });
  }

  if (record.status === 'used') {
    return res.status(400).json({ error: '兑换码已被使用' });
  }

  return res.json({
    valid: true,
    amount: record.amount,
    code: record.code,
  });
});

router.post('/redeem/consume', async (req, res) => {
  const prisma = getPrisma();
  const { code, user_id } = req.body as { code?: string; user_id?: string };

  if (!code) {
    return res.status(400).json({ error: '缺少兑换码' });
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

    return res.json({
      success: true,
      amount: result.amount,
      code: result.code,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '核销失败';
    return res.status(400).json({ error: message });
  }
});

export default router;
