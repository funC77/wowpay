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

  createPayUrl(params: PayOrderParams): string {
    // 支付FM签名规则: MD5(pid + out_trade_no + money + notify_url + key)
    const signStr = this.config.pid + params.outTradeNo + params.money + params.notifyUrl + this.config.key;
    const sign = md5(signStr);

    const data: Record<string, string> = {
      pid: this.config.pid,
      type: params.type,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      name: params.name,
      money: params.money,
      sign,
      sign_type: 'MD5',
    };

    const query = new URLSearchParams(data).toString();
    const url = new URL('submit.php', this.config.apiUrl);
    return `${url.toString()}?${query.toString()}`;
  }

  verifyCallback(params: Record<string, string>): boolean {
    const sign = params.sign;
    if (!sign) return false;

    // 回调验签同样使用纯值拼接规则
    // 优先使用回调参数中的值，若 notify_url 缺失则尝试用原始 notify_url（此处由调用方保证）
    const signStr = params.pid + params.out_trade_no + params.money + params.notify_url + this.config.key;
    return md5(signStr) === sign;
  }
}
