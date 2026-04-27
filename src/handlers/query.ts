import { getOrderByMerchantOrderNo } from '../services/database';

export async function handleQuery(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orderNo = url.searchParams.get('orderNo');

    if (!orderNo) {
      return Response.json({
        success: false,
        msg: 'Missing orderNo parameter'
      }, { status: 400 });
    }

    const order = await getOrderByMerchantOrderNo(env.DB, orderNo);

    if (!order) {
      return Response.json({
        success: false,
        msg: 'Order not found'
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        orderNo: order.merchant_order_no,
        userId: order.user_id,
        amount: order.amount,
        status: order.status,
        redemptionCode: order.redemption_code || null,
        isRedeemed: order.is_redeemed === 1,
        createdAt: order.created_at,
        paidAt: order.paid_at || null,
        redeemedAt: order.redeemed_at || null
      }
    });
  } catch (error) {
    return Response.json({
      success: false,
      msg: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
