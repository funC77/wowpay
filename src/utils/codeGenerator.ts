export function generateUUID(): string {
  return crypto.randomUUID();
}

export function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${timestamp}${random}`;
}

/**
 * 生成包含金额信息的兑换码
 * 格式: AMOUNT-UUID
 * 例如: 100-a1b2c3d4-e5f6-7890-abcd-ef1234567890
 */
export function generateRedemptionCode(amount: number): string {
  const uuid = crypto.randomUUID();
  return `${amount}-${uuid}`;
}

/**
 * 从兑换码中提取金额
 */
export function extractAmountFromCode(code: string): number | null {
  const parts = code.split('-');
  if (parts.length < 2) return null;
  const amount = parseFloat(parts[0]);
  return isNaN(amount) ? null : amount;
}
