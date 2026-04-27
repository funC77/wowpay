import { handleCreateOrder } from './handlers/createOrder';
import { handleNotify } from './handlers/notify';
import { handleQuery } from './handlers/query';
import { handleRedeem } from './handlers/redeem';

const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>充值兑换码</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 480px; width: 100%; padding: 40px; }
    h1 { color: #333; margin-bottom: 30px; text-align: center; font-size: 28px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; color: #555; font-weight: 500; margin-bottom: 8px; font-size: 14px; }
    input { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; transition: border-color 0.3s; }
    input:focus { outline: none; border-color: #667eea; }
    button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    button:hover { transform: translateY(-2px); }
    button:active { transform: translateY(0); }
    .result { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; display: none; }
    .result.show { display: block; }
    .result h3 { color: #333; margin-bottom: 15px; font-size: 18px; }
    .result-item { margin-bottom: 12px; padding: 10px; background: white; border-radius: 6px; }
    .result-label { color: #666; font-size: 13px; margin-bottom: 4px; }
    .result-value { color: #333; font-weight: 600; word-break: break-all; }
    .pay-btn { margin-top: 15px; background: #28a745; }
    .error { background: #fee; border-left: 4px solid #f44; }
    .success { background: #efe; border-left: 4px solid #4f4; }
  </style>
</head>
<body>
  <div class="container">
    <h1>充值兑换码</h1>
    <form id="orderForm">
      <div class="form-group">
        <label for="userId">用户ID</label>
        <input type="text" id="userId" name="userId" required placeholder="请输入用户ID">
      </div>
      <div class="form-group">
        <label for="amount">充值金额（元）</label>
        <input type="number" id="amount" name="amount" step="0.01" min="0.01" required placeholder="请输入充值金额">
      </div>
      <button type="submit">创建订单</button>
    </form>
    <div id="result" class="result"></div>
  </div>
  <script>
    document.getElementById('orderForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = document.getElementById('userId').value;
      const amount = parseFloat(document.getElementById('amount').value);
      const resultDiv = document.getElementById('result');

      try {
        const response = await fetch('/api/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, amount })
        });
        const data = await response.json();

        if (data.success) {
          resultDiv.className = 'result show success';
          resultDiv.innerHTML = \`
            <h3>订单创建成功</h3>
            <div class="result-item">
              <div class="result-label">订单号</div>
              <div class="result-value">\${data.data.orderNo}</div>
            </div>
            <div class="result-item">
              <div class="result-label">充值金额</div>
              <div class="result-value">¥\${data.data.amount}</div>
            </div>
            <div class="result-item">
              <div class="result-label">有效期至</div>
              <div class="result-value">\${new Date(data.data.expiresAt).toLocaleString('zh-CN')}</div>
            </div>
            <button class="pay-btn" onclick="window.open('\${data.data.payUrl}', '_blank')">前往支付</button>
            <button class="pay-btn" onclick="queryOrder('\${data.data.orderNo}')" style="background:#007bff;margin-top:10px;">查询兑换码</button>
          \`;
        } else {
          resultDiv.className = 'result show error';
          resultDiv.innerHTML = \`<h3>创建失败</h3><p>\${data.msg}</p>\`;
        }
      } catch (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = \`<h3>请求失败</h3><p>\${error.message}</p>\`;
      }
    });

    async function queryOrder(orderNo) {
      const resultDiv = document.getElementById('result');
      try {
        const response = await fetch(\`/api/query?orderNo=\${orderNo}\`);
        const data = await response.json();

        if (data.success) {
          if (data.data.status === 'paid' && data.data.redemptionCode) {
            resultDiv.className = 'result show success';
            resultDiv.innerHTML = \`
              <h3>支付成功</h3>
              <div class="result-item">
                <div class="result-label">兑换码</div>
                <div class="result-value" style="font-size:18px;color:#28a745;">\${data.data.redemptionCode}</div>
              </div>
              <div class="result-item">
                <div class="result-label">用户ID</div>
                <div class="result-value">\${data.data.userId}</div>
              </div>
              <div class="result-item">
                <div class="result-label">充值金额</div>
                <div class="result-value">¥\${data.data.amount}</div>
              </div>
              <div class="result-item">
                <div class="result-label">核销状态</div>
                <div class="result-value">\${data.data.isRedeemed ? '已核销 (' + new Date(data.data.redeemedAt).toLocaleString('zh-CN') + ')' : '未核销'}</div>
              </div>
            \`;
          } else {
            resultDiv.className = 'result show';
            resultDiv.innerHTML = \`<h3>订单状态：\${data.data.status === 'pending' ? '待支付' : data.data.status}</h3><p>请完成支付后再查询</p>\`;
          }
        } else {
          resultDiv.className = 'result show error';
          resultDiv.innerHTML = \`<h3>查询失败</h3><p>\${data.msg}</p>\`;
        }
      } catch (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = \`<h3>查询失败</h3><p>\${error.message}</p>\`;
      }
    }
  </script>
</body>
</html>`;

export interface Env {
  DB: D1Database;
  MERCHANT_NUM: string;
  API_BASE_URL: string;
  API_SECRET: string;
  PAY_TYPE: string;
  NOTIFY_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' && request.method === 'GET') {
      return new Response(HTML_PAGE, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    if (path === '/api/create' && request.method === 'POST') {
      return handleCreateOrder(request, env);
    }

    if (path === '/api/notify' && (request.method === 'POST' || request.method === 'GET')) {
      return handleNotify(request, env);
    }

    if (path === '/api/query' && request.method === 'GET') {
      return handleQuery(request, env);
    }

    if (path === '/api/redeem' && request.method === 'POST') {
      return handleRedeem(request, env);
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
  }
};
