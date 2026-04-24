import crypto from 'crypto';
import { getEnv } from './env';

export interface PayOrderParams {
  outTradeNo: string;
  notifyUrl: string;
  returnUrl: string;
  name: string;
  money: string;
  type: 'alipay' | 'wxpay' | 'qqpay';
}

function sign(params: Record<string, string>): string {
  const env = getEnv();
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== '')
    .filter(([k]) => k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b));

  const signStr = filtered.map(([k, v]) => `${k}=${v}`).join('&');
  return crypto.createHash('md5').update(signStr + env.YIPAY_KEY).digest('hex');
}

export function createPayUrl(params: PayOrderParams): string {
  const env = getEnv();
  const data: Record<string, string> = {
    pid: env.YIPAY_PID,
    type: params.type,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    return_url: params.returnUrl,
    name: params.name,
    money: params.money,
  };

  const s = sign(data);
  const query = new URLSearchParams({ ...data, sign: s, sign_type: 'MD5' });

  const url = new URL('submit.php', env.YIPAY_URL);
  return `${url.toString()}?${query.toString()}`;
}

export function verifyCallback(params: Record<string, string>): boolean {
  const s = params.sign;
  if (!s) return false;
  return sign(params) === s;
}
