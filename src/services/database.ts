export interface Order {
  id?: number;
  user_id: string;
  amount: number;
  merchant_order_no: string;
  platform_order_no?: string;
  pay_url?: string;
  redemption_code?: string;
  status: 'pending' | 'paid' | 'expired';
  is_redeemed: number;
  created_at: number;
  paid_at?: number;
  redeemed_at?: number;
  expires_at: number;
}

export async function createOrder(db: D1Database, order: Order): Promise<void> {
  await db.prepare(
    `INSERT INTO orders (user_id, amount, merchant_order_no, pay_url, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    order.user_id,
    order.amount,
    order.merchant_order_no,
    order.pay_url,
    order.status,
    order.created_at,
    order.expires_at
  ).run();
}

export async function getOrderByMerchantOrderNo(db: D1Database, orderNo: string): Promise<Order | null> {
  const result = await db.prepare(
    'SELECT * FROM orders WHERE merchant_order_no = ?'
  ).bind(orderNo).first<Order>();

  return result || null;
}

export async function updateOrderToPaid(
  db: D1Database,
  merchantOrderNo: string,
  platformOrderNo: string,
  redemptionCode: string,
  paidAt: number
): Promise<void> {
  await db.prepare(
    `UPDATE orders
     SET status = 'paid', platform_order_no = ?, redemption_code = ?, paid_at = ?
     WHERE merchant_order_no = ?`
  ).bind(platformOrderNo, redemptionCode, paidAt, merchantOrderNo).run();
}

export async function getOrderByRedemptionCode(db: D1Database, code: string): Promise<Order | null> {
  const result = await db.prepare(
    'SELECT * FROM orders WHERE redemption_code = ?'
  ).bind(code).first<Order>();

  return result || null;
}

export async function redeemCode(db: D1Database, code: string, redeemedAt: number): Promise<void> {
  await db.prepare(
    `UPDATE orders
     SET is_redeemed = 1, redeemed_at = ?
     WHERE redemption_code = ?`
  ).bind(redeemedAt, code).run();
}
