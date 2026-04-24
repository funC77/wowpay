import { md5 } from 'js-md5';

export interface PayFMConfig {
  apiBaseUrl: string;
  merchantNum: string;
  secretKey: string;
  payType: string;
}

export interface CreateOrderParams {
  outTradeNo: string;
  money: string;
  notifyUrl: string;
  returnUrl: string;
  name: string;
}

/**
 * 支付FM /submit.php 接口封装
 * 参数名使用易支付风格（pid/out_trade_no/money/notify_url），
 * 签名规则按支付FM文档：MD5(商户号 + 商户订单号 + 支付金额 + 异步通知地址 + 接入密钥)
 */
export class PayFM {
  constructor(private config: PayFMConfig) {}

  createOrderUrl(params: CreateOrderParams): string {
    // 支付FM签名规则：商户号 + 商户订单号 + 支付金额 + 异步通知地址 + 接入密钥
    const signStr = this.config.merchantNum + params.outTradeNo + params.money + params.notifyUrl + this.config.secretKey;
    const sign = md5(signStr);

    console.log('[PayFM] signStr preview:', {
      prefix: this.config.merchantNum + params.outTradeNo + params.money + params.notifyUrl,
      sign,
    });

    // 使用易支付风格参数名，与 /submit.php 接口兼容
    const query = new URLSearchParams({
      pid: this.config.merchantNum,
      type: this.config.payType,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      name: params.name,
      money: params.money,
      sign,
      sign_type: 'MD5',
    });

    return `${this.config.apiBaseUrl}/submit.php?${query.toString()}`;
  }

  verifyCallback(params: Record<string, string>): boolean {
    const sign = params.sign;
    if (!sign) return false;

    // 回调验签同样使用支付FM规则
    const pid = params.pid || this.config.merchantNum;
    const outTradeNo = params.out_trade_no || '';
    const money = params.money || '';
    const notifyUrl = params.notify_url || '';

    const signStr = pid + outTradeNo + money + notifyUrl + this.config.secretKey;
    const computed = md5(signStr);

    console.log('[PayFM] callback verify:', { received: sign, computed });
    return computed === sign;
  }
}
