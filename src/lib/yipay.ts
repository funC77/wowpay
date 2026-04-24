import { md5 } from 'js-md5';

export interface YiPayConfig {
  apiUrl: string;
  pid: string;
  key: string;
}

export interface PayOrderParams {
  outTradeNo: string;
  notifyUrl: string;
  returnUrl: string;
  name: string;
  money: string;
  type: 'alipay' | 'wxpay' | 'qqpay';
}

export class YiPay {
  constructor(private config: YiPayConfig) {}

  private sign(params: Record<string, string>): string {
    const filtered = Object.entries(params)
      .filter(([, v]) => v !== '')
      .filter(([k]) => k !== 'sign' && k !== 'sign_type')
      .sort(([a], [b]) => a.localeCompare(b));

    const signStr = filtered.map(([k, v]) => `${k}=${v}`).join('&');
    return md5(signStr + this.config.key);
  }

  createPayUrl(params: PayOrderParams): string {
    const data: Record<string, string> = {
      pid: this.config.pid,
      type: params.type,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      name: params.name,
      money: params.money,
    };

    const sign = this.sign(data);
    const query = new URLSearchParams({ ...data, sign, sign_type: 'MD5' });

    const url = new URL('submit.php', this.config.apiUrl);
    return `${url.toString()}?${query.toString()}`;
  }

  verifyCallback(params: Record<string, string>): boolean {
    const sign = params.sign;
    if (!sign) return false;
    return this.sign(params) === sign;
  }
}
