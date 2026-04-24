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

function sign(params: Record<string, string>, secretKey: string): string {
  // 易支付标准签名规则：
  // 1. 过滤空值参数
  // 2. 排除 sign 和 sign_type
  // 3. 按参数名字母顺序排序
  // 4. key=value&key=value 拼接
  // 5. 末尾直接拼接密钥（无 & 分隔）
  // 6. MD5 小写
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== '')
    .filter(([k]) => k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b));

  const signStr = filtered.map(([k, v]) => `${k}=${v}`).join('&') + secretKey;
  console.log('[PayFM] signStr:', signStr);
  return md5(signStr);
}

/**
 * 支付FM /submit.php 接口封装（易支付兼容模式）
 */
export class PayFM {
  constructor(private config: PayFMConfig) {}

  createOrderUrl(params: CreateOrderParams): string {
    // 构造参与签名的参数（除 sign/sign_type 外）
    const signParams: Record<string, string> = {
      pid: this.config.merchantNum,
      type: this.config.payType,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      name: params.name,
      money: params.money,
    };

    const signValue = sign(signParams, this.config.secretKey);

    // 最终 URL 参数需包含 sign 和 sign_type
    const query = new URLSearchParams({
      ...signParams,
      sign: signValue,
      sign_type: 'MD5',
    });

    return `${this.config.apiBaseUrl}/submit.php?${query.toString()}`;
  }

  verifyCallback(params: Record<string, string>): boolean {
    const receivedSign = params.sign;
    if (!receivedSign) return false;

    // 回调验签同样使用易支付规则
    const { sign: _s, sign_type: _st, ...signParams } = params;
    const computed = sign(signParams, this.config.secretKey);

    console.log('[PayFM] callback verify:', { received: receivedSign, computed });
    return computed === receivedSign;
  }
}
