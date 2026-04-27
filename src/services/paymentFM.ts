import { generateSign } from '../utils/crypto';

export interface PaymentFMConfig {
  apiBaseUrl: string;
  merchantNum: string;
  apiSecret: string;
  payType: string;
  notifyUrl: string;
}

export interface CreateOrderResponse {
  success: boolean;
  msg: string;
  code: number;
  timestamp: number;
  data?: {
    id: string;
    payUrl: string;
  };
}

export async function createPaymentOrder(
  config: PaymentFMConfig,
  orderNo: string,
  amount: number
): Promise<CreateOrderResponse> {
  const amountStr = amount.toFixed(2);

  const sign = await generateSign(
    config.merchantNum,
    orderNo,
    amountStr,
    config.notifyUrl,
    config.apiSecret
  );

  const params = new URLSearchParams({
    merchantNum: config.merchantNum,
    orderNo: orderNo,
    amount: amountStr,
    notifyUrl: config.notifyUrl,
    payType: config.payType,
    sign: sign
  });

  const url = `${config.apiBaseUrl}/startOrder?${params.toString()}`;

  console.log('Payment FM Request:', {
    url,
    method: 'POST',
    params: Object.fromEntries(params),
    signString: `${config.merchantNum}${orderNo}${amountStr}${config.notifyUrl}${config.apiSecret}`,
    signResult: sign
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const text = await response.text();
    console.log('Response text:', text);

    if (!text || text.trim() === '') {
      console.error('Empty response from Payment FM');
      return {
        success: false,
        msg: 'Empty response from payment gateway',
        code: 500,
        timestamp: Date.now()
      };
    }

    const result = JSON.parse(text) as CreateOrderResponse;
    console.log('Payment FM Response:', result);

    return result;
  } catch (error) {
    console.error('Payment FM Error:', error);
    throw error;
  }
}
