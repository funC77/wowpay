import { md5 } from 'js-md5';

export interface PayFMConfig {
  apiBaseUrl: string;
  merchantNum: string;
  secretKey: string;
  payType: string;
}

export interface CreateOrderParams {
  orderNo: string;
  amount: string;
  notifyUrl: string;
}

/**
 * 支付FM 接口封装
 * 文档: https://doc.支付fm.com/
 */
export class PayFM {
  constructor(private config: PayFMConfig) {}

  /**
   * 构建创建订单的完整 URL（参数放在 Query 中）
   * 签名规则: MD5(商户号 + 商户订单号 + 支付金额 + 异步通知地址 + 接入密钥)
   */
  createOrderUrl(params: CreateOrderParams): string {
    const signStr = this.config.merchantNum + params.orderNo + params.amount + params.notifyUrl + this.config.secretKey;
    const sign = md5(signStr);

    const query = new URLSearchParams({
      merchantNum: this.config.merchantNum,
      orderNo: params.orderNo,
      amount: params.amount,
      notifyUrl: params.notifyUrl,
      payType: this.config.payType,
      sign,
    });

    return `${this.config.apiBaseUrl}/startOrder?${query.toString()}`;
  }

  /**
   * 回调验签
   * 规则与请求签名一致: MD5(merchantNum + orderNo + amount + notifyUrl + secretKey)
   * 注意: 回调参数名可能与请求时略有差异，此处做兼容处理
   */
  verifyCallback(params: Record<string, string>): boolean {
    const sign = params.sign;
    if (!sign) return false;

    const merchantNum = params.merchantNum || this.config.merchantNum;
    const orderNo = params.orderNo || '';
    const amount = params.amount || '';
    const notifyUrl = params.notifyUrl || '';

    const signStr = merchantNum + orderNo + amount + notifyUrl + this.config.secretKey;
    return md5(signStr) === sign;
  }
}
