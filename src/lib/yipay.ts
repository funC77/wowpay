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
  returnUrl: string;
}

/**
 * 支付FM /startOrder 官方接口签名规则
 * sign = MD5(merchantNum + orderNo + amount + notifyUrl + secretKey)
 */
function startOrderSign(params: {
  merchantNum: string;
  orderNo: string;
  amount: string;
  notifyUrl: string;
  secretKey: string;
}): string {
  const signStr =
    params.merchantNum + params.orderNo + params.amount + params.notifyUrl + params.secretKey;
  console.log('[PayFM] signStr:', signStr);
  return md5(signStr);
}

/**
 * 易支付标准签名规则（用于回调验签兼容）
 */
function yiPaySign(params: Record<string, string>, secretKey: string): string {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== '')
    .filter(([k]) => k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b));

  const signStr = filtered.map(([k, v]) => `${k}=${v}`).join('&') + secretKey;
  return md5(signStr);
}

/**
 * 支付FM /startOrder 官方接口封装
 */
export class PayFM {
  constructor(private config: PayFMConfig) {}

  /**
   * 创建订单，返回支付跳转 URL
   */
  async createOrder(params: CreateOrderParams): Promise<string> {
    const signValue = startOrderSign({
      merchantNum: this.config.merchantNum,
      orderNo: params.orderNo,
      amount: params.amount,
      notifyUrl: params.notifyUrl,
      secretKey: this.config.secretKey,
    });

    const query = new URLSearchParams({
      merchantNum: this.config.merchantNum,
      orderNo: params.orderNo,
      amount: params.amount,
      notifyUrl: params.notifyUrl,
      returnUrl: params.returnUrl,
      payType: this.config.payType,
      sign: signValue,
    });

    const url = `${this.config.apiBaseUrl}/startOrder?${query.toString()}`;
    console.log('[PayFM] startOrder URL:', url);

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result = (await resp.json()) as {
      success: boolean;
      msg: string;
      code: number;
      data?: {
        id: string;
        payUrl: string;
        extendParams: unknown;
      };
    };

    console.log('[PayFM] startOrder response:', result);

    if (!result.success || !result.data?.payUrl) {
      throw new Error(result.msg || '创建订单失败');
    }

    return result.data.payUrl;
  }

  verifyCallback(params: Record<string, string>): boolean {
    const receivedSign = params.sign;
    if (!receivedSign) return false;

    // 回调验签使用易支付规则（兼容模式）
    const { sign: _s, sign_type: _st, ...signParams } = params;
    const computed = yiPaySign(signParams, this.config.secretKey);

    console.log('[PayFM] callback verify:', { received: receivedSign, computed });
    return computed === receivedSign;
  }
}
