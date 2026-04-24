# 部署步骤

## 1. 设置 Cloudflare Workers 密钥

在 Cloudflare Dashboard 中设置 `SECRET_KEY` 环境变量：

### 方法一：通过命令行（推荐）

```bash
npx wrangler secret put SECRET_KEY
```

然后输入密钥值：`0b39cc0e7decb4facb4eb992660533bf`

### 方法二：通过 Dashboard

1. 登录 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 点击 `wowpay`
4. 进入 Settings 标签页
5. 找到 Variables and Secrets
6. 点击 Add variable
7. 选择 Encrypt（加密）
8. Variable name: `SECRET_KEY`
9. Value: `0b39cc0e7decb4facb4eb992660533bf`
10. 点击 Save

## 2. 重新部署

```bash
npm run deploy
```

## 3. 测试

访问：`https://wowpay.cursor02.workers.dev/api/pay?user_id=test001&amount=100`

## 注意事项

- `SECRET_KEY` 必须设置为加密变量（Secret），不能是普通环境变量
- 设置后需要重新部署才能生效
- 本地开发时会自动从 `.env` 文件读取 `YIPAY_KEY`
