import { getOrderByRedemptionCode, redeemCode } from '../services/database';

export async function handleRedeem(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json<{ code: string }>();

    if (!body.code) {
      return Response.json({
        success: false,
        msg: 'Missing redemption code'
      }, { status: 400 });
    }

    const order = await getOrderByRedemptionCode(env.DB, body.code);

    if (!order) {
      return Response.json({
        success: false,
        msg: 'Invalid redemption code'
      }, { status: 404 });
    }

    if (order.status !== 'paid') {
      return Response.json({
        success: false,
        msg: 'Order not paid yet'
      }, { status: 400 });
    }

    if (order.is_redeemed) {
      return Response.json({
        success: false,
        msg: 'Code already redeemed',
        data: {
          redeemedAt: order.redeemed_at
        }
      }, { status: 400 });
    }

    const redeemedAt = Date.now();
    await redeemCode(env.DB, body.code, redeemedAt);

    return Response.json({
      success: true,
      msg: 'Redemption successful',
      data: {
        userId: order.user_id,
        amount: order.amount,
        redeemedAt: redeemedAt
      }
    });
  } catch (error) {
    return Response.json({
      success: false,
      msg: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
