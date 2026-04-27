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
    h1 { color: #333; margin-bottom: 10px; text-align: center; font-size: 28px; }
    .user-info { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; color: #555; font-weight: 500; margin-bottom: 12px; font-size: 14px; }
    .amount-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .amount-option { padding: 16px; border: 2px solid #e0e0e0; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.3s; background: white; }
    .amount-option:hover { border-color: #667eea; transform: translateY(-2px); }
    .amount-option.selected { border-color: #667eea; background: #f0f4ff; }
    .amount-value { font-size: 24px; font-weight: 700; color: #333; }
    .amount-label { font-size: 12px; color: #999; margin-top: 4px; }
    button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; margin-top: 10px; }
    button:hover { transform: translateY(-2px); }
    button:active { transform: translateY(0); }
    button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .result { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; display: none; }
    .result.show { display: block; }
    .result h3 { color: #333; margin-bottom: 15px; font-size: 18px; }
    .result-item { margin-bottom: 12px; padding: 10px; background: white; border-radius: 6px; }
    .result-label { color: #666; font-size: 13px; margin-bottom: 4px; }
    .result-value { color: #333; font-weight: 600; word-break: break-all; }
    .pay-btn { background: #28a745; }
    .error { background: #fee; border-left: 4px solid #f44; }
    .success { background: #efe; border-left: 4px solid #4f4; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; color: #856404; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>充值兑换码</h1>
    <div class="user-info" id="userInfo">加载中...</div>
    <div id="warningBox"></div>
    <form id="orderForm">
      <div class="form-group">
        <label>选择充值金额</label>
        <div class="amount-options" id="amountOptions">
          <!-- 动态生成 -->
        </div>
      </div>
      <button type="submit" id="submitBtn" disabled>立即支付</button>
    </form>
    <div id="result" class="result"></div>
  </div>
  <script>
    let selectedAmount = null;
    let userId = null;
    const fixedAmounts = [10, 30, 50, 100, 200]; // 默认金额档位

    // 从 URL 获取 userId
    const urlParams = new URLSearchParams(window.location.search);
    userId = urlParams.get('userId');

    if (!userId) {
      document.getElementById('warningBox').innerHTML = '<div class="warning">⚠️ 缺少用户ID参数。请通过正确的链接访问，例如：?userId=your_user_id</div>';
      document.getElementById('userInfo').textContent = '未识别用户';
      document.getElementById('submitBtn').disabled = true;
    } else {
      document.getElementById('userInfo').innerHTML = \`当前用户：<strong>\${userId}</strong>\`;
    }

    // 生成金额选项
    const amountOptionsDiv = document.getElementById('amountOptions');
    fixedAmounts.forEach(amount => {
      const option = document.createElement('div');
      option.className = 'amount-option';
      option.innerHTML = \`
        <div class="amount-value">¥\${amount}</div>
        <div class="amount-label">充值</div>
      \`;
      option.onclick = () => selectAmount(amount, option);
      amountOptionsDiv.appendChild(option);
    });

    function selectAmount(amount, element) {
      selectedAmount = amount;
      document.querySelectorAll('.amount-option').forEach(el => el.classList.remove('selected'));
      element.classList.add('selected');
      document.getElementById('submitBtn').disabled = !userId;
    }

    document.getElementById('orderForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!userId) {
        alert('缺少用户ID参数');
        return;
      }

      if (!selectedAmount) {
        alert('请选择充值金额');
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = '跳转中...';

      try {
        const response = await fetch(\`/api/create?userId=\${encodeURIComponent(userId)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: selectedAmount })
        });
        const data = await response.json();

        if (data.success) {
          // 直接跳转到支付页面
          window.location.href = data.data.payUrl;
        } else {
          const resultDiv = document.getElementById('result');
          resultDiv.className = 'result show error';
          resultDiv.innerHTML = \`<h3>创建失败</h3><p>\${data.msg}</p>\${data.allowedAmounts ? '<p>允许的金额：' + data.allowedAmounts.join(', ') + '</p>' : ''}\`;
          submitBtn.disabled = false;
          submitBtn.textContent = '立即支付';
        }
      } catch (error) {
        const resultDiv = document.getElementById('result');
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = \`<h3>请求失败</h3><p>\${error.message}</p>\`;
        submitBtn.disabled = false;
        submitBtn.textContent = '立即支付';
      }
    });
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
  FIXED_AMOUNTS: string;
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
