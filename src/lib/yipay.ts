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
 */
export class PayFM {
  constructor(private config: PayFMConfig) {}

  /**
   * 构建创建订单的完整 URL
   * 使用 /submit.php（支付FM实际跳转接口）
   * 签名规则: MD5(商户号 + 商户订单号 + 支付金额 + 异步通知地址 + 接入密钥)
   */
  createOrderUrl(params: CreateOrderParams): string {
    // 金额去除末尾无意义的 .00，保持与后台一致
    const cleanAmount = parseFloat(params.amount).toString();

    const signStr = this.config.merchantNum + params.orderNo + cleanAmount + params.notifyUrl + this.config.secretKey;
    const sign = md5(signStr);

    // 调试日志：打印签名字符串（不含密钥）
    console.log('[PayFM] signStr preview:', {
      prefix: this.config.merchantNum + params.orderNo + cleanAmount + params.notifyUrl,
      sign,
    });

    const query = new URLSearchParams({
      merchantNum: this.config.merchantNum,
      orderNo: params.orderNo,
      amount: cleanAmount,
      notifyUrl: params.notifyUrl,
      payType: this.config.payType,
      sign,
    });

    // 使用 /submit.php（支付FM实际接口）
    return `${this.config.apiBaseUrl}/submit.php?${query.toString()}`;
  }

  /**
   * 回调验签
   */
  verifyCallback(params: Record<string, string>): boolean {
    const sign = params.sign;
    if (!sign) return false;

    const merchantNum = params.merchantNum || this.config.merchantNum;
    const orderNo = params.orderNo || '';
    const amount = params.amount || '';
    const notifyUrl = params.notifyUrl || '';
    const cleanAmount = parseFloat(amount).toString();

    const signStr = merchantNum + orderNo + cleanAmount + notifyUrl + this.config.secretKey;
    const computed = md5(signStr);

    console.log('[PayFM] callback verify:', { received: sign, computed });
    return computed === sign;
  }
}
