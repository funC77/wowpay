import { verifyNotifySign } from '../utils/crypto';
import { getOrderByMerchantOrderNo, updateOrderToPaid } from '../services/database';
import { generateRedemptionCode } from '../utils/codeGenerator';

export async function handleNotify(request: Request, env: Env): Promise<Response> {
  try {
    let orderNo: string | null = null;
    let platformOrderNo: string | null = null;
    let sign: string | null = null;

    // 支持 POST 表单和 GET 查询参数两种方式
    if (request.method === 'POST') {
      const formData = await request.formData();
      orderNo = formData.get('orderNo') as string;
      platformOrderNo = formData.get('platformOrderNo') as string;
      sign = formData.get('sign') as string;
    } else {
      const url = new URL(request.url);
      orderNo = url.searchParams.get('orderNo');
      platformOrderNo = url.searchParams.get('platformOrderNo');
      sign = url.searchParams.get('sign');
    }

    console.log('Notify received:', { orderNo, platformOrderNo, sign });

    if (!orderNo || !platformOrderNo || !sign) {
      console.error('Missing required parameters');
      return new Response('fail', { status: 400 });
    }

    const isValid = await verifyNotifySign(
      env.MERCHANT_NUM,
      orderNo,
      platformOrderNo,
      env.API_SECRET,
      sign
    );

    console.log('Signature verification:', isValid);

    if (!isValid) {
      console.error('Signature verification failed');
      return new Response('fail', { status: 403 });
    }

    const order = await getOrderByMerchantOrderNo(env.DB, orderNo);

    if (!order) {
      console.error('Order not found:', orderNo);
      return new Response('fail', { status: 404 });
    }

    console.log('Order found:', order);

    if (order.status === 'paid') {
      console.log('Order already paid, returning success');
      return new Response('success');
    }

    // 生成包含金额信息的兑换码
    const redemptionCode = generateRedemptionCode(order.amount);
    const paidAt = Date.now();

    console.log('Updating order to paid with redemption code:', redemptionCode);

    await updateOrderToPaid(env.DB, orderNo, platformOrderNo, redemptionCode, paidAt);

    console.log('Order updated successfully');

    return new Response('success');
  } catch (error) {
    console.error('Notify error:', error);
    return new Response('fail', { status: 500 });
  }
}
