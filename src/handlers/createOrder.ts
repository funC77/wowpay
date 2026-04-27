import { createPaymentOrder, PaymentFMConfig } from '../services/paymentFM';
import { createOrder } from '../services/database';
import { generateOrderNo } from '../utils/codeGenerator';

export async function handleCreateOrder(request: Request, env: Env): Promise<Response> {
  try {
    // 从 URL 参数获取 userId（由上游平台传递，不可前端修改）
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    const body = await request.json<{ amount: number }>();

    if (!userId) {
      return Response.json({
        success: false,
        msg: 'Missing userId parameter in URL'
      }, { status: 400 });
    }

    if (!body.amount || body.amount <= 0) {
      return Response.json({
        success: false,
        msg: 'Invalid amount'
      }, { status: 400 });
    }

    // 验证金额是否在固定档位中
    const fixedAmounts = env.FIXED_AMOUNTS.split(',').map(a => parseFloat(a.trim()));
    if (!fixedAmounts.includes(body.amount)) {
      return Response.json({
        success: false,
        msg: `Amount must be one of: ${fixedAmounts.join(', ')}`,
        allowedAmounts: fixedAmounts
      }, { status: 400 });
    }

    if (!env.API_SECRET) {
      return Response.json({
        success: false,
        msg: 'API_SECRET not configured. Please create .dev.vars file with API_SECRET'
      }, { status: 500 });
    }

    const merchantOrderNo = generateOrderNo();
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000;

    const config: PaymentFMConfig = {
      apiBaseUrl: env.API_BASE_URL,
      merchantNum: env.MERCHANT_NUM,
      apiSecret: env.API_SECRET,
      payType: env.PAY_TYPE,
      notifyUrl: env.NOTIFY_URL
    };

    const paymentResult = await createPaymentOrder(config, merchantOrderNo, body.amount);

    console.log('Payment result:', paymentResult);

    if (!paymentResult.success || !paymentResult.data) {
      return Response.json({
        success: false,
        msg: paymentResult.msg || 'Failed to create payment order',
        debug: paymentResult
      }, { status: 500 });
    }

    await createOrder(env.DB, {
      user_id: userId,
      amount: body.amount,
      merchant_order_no: merchantOrderNo,
      pay_url: paymentResult.data.payUrl,
      status: 'pending',
      created_at: now,
      expires_at: expiresAt
    });

    return Response.json({
      success: true,
      data: {
        orderNo: merchantOrderNo,
        payUrl: paymentResult.data.payUrl,
        amount: body.amount,
        expiresAt: expiresAt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    return Response.json({
      success: false,
      msg: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
