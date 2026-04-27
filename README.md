# WowPay2 - 支付FM兑换码平台

基于 Cloudflare Workers 和支付FM的兑换码支付平台。

## 功能特性

- 用户输入ID和金额创建订单
- 调用支付FM生成支付链接
- 支付成功后自动生成UUID格式兑换码
- 订单查询接口
- 使用Cloudflare D1数据库存储

## 本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 创建D1数据库
```bash
npm run db:create
```

复制输出的 `database_id`，更新 `wrangler.toml` 中的 `database_id` 字段。

### 3. 执行数据库迁移
```bash
npm run db:migrate
```

### 4. 配置环境变量

编辑 `wrangler.toml`，填入你的支付FM配置：
- `MERCHANT_NUM`: 商户号
- `API_BASE_URL`: 支付FM接口地址
- `PAY_TYPE`: 支付方式（如 alipay）
- `NOTIFY_URL`: 回调地址（部署后的域名 + /api/notify）

创建 `.dev.vars` 文件（本地开发用）：
```
API_SECRET=your-payment-fm-secret-key
```

### 5. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:8787`

## 部署到 Cloudflare Workers

### 前置准备

1. 注册 Cloudflare 账号：https://dash.cloudflare.com/sign-up
2. 安装 Wrangler CLI（如果还没安装）：
   ```bash
   npm install -g wrangler
   ```
3. 登录 Cloudflare：
   ```bash
   wrangler login
   ```

### 步骤 1：创建生产环境 D1 数据库

```bash
# 创建数据库
wrangler d1 create wowpay2_db

# 输出示例：
# ✅ Successfully created DB 'wowpay2_db'
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "wowpay2_db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

复制输出的 `database_id`，更新 [wrangler.toml](wrangler.toml:8) 中的 `database_id` 字段。

### 步骤 2：初始化数据库表结构

```bash
# 执行 schema.sql 创建表
wrangler d1 execute wowpay2_db --file=./schema.sql
```

### 步骤 3：配置生产环境变量

编辑 [wrangler.toml](wrangler.toml:10)，更新以下配置：

```toml
[vars]
MERCHANT_NUM = "你的商户号"
API_BASE_URL = "https://api-xxx.zhifu.fm.xxx.com/api"
PAY_TYPE = "alipay"
NOTIFY_URL = "https://你的worker域名.workers.dev/api/notify"  # 部署后会获得
```

**注意**：`NOTIFY_URL` 需要在首次部署后更新为实际的 Worker 域名。

### 步骤 4：设置密钥（Secret）

```bash
# 设置支付FM密钥（生产环境）
wrangler secret put API_SECRET

# 输入提示后，粘贴你的支付FM密钥
```

### 步骤 5：部署到 Cloudflare Workers

```bash
# 部署
npm run deploy

# 或直接使用 wrangler
wrangler deploy
```

部署成功后，你会看到类似输出：
```
✨ Deployment complete!
🌍 https://wowpay2.你的账号.workers.dev
```

### 步骤 6：更新回调地址

1. 复制部署后的 Worker 域名（如 `https://wowpay2.xxx.workers.dev`）
2. 更新 [wrangler.toml](wrangler.toml:14) 中的 `NOTIFY_URL`：
   ```toml
   NOTIFY_URL = "https://wowpay2.xxx.workers.dev/api/notify"
   ```
3. 重新部署：
   ```bash
   npm run deploy
   ```
4. 在支付FM后台配置相同的回调地址

### 步骤 7：绑定自定义域名（可选）

如果你想使用自己的域名：

1. 在 Cloudflare Dashboard 进入 Workers & Pages
2. 选择你的 Worker（wowpay2）
3. 点击 "Settings" → "Triggers" → "Custom Domains"
4. 添加自定义域名（如 `pay.yourdomain.com`）
5. 更新 `wrangler.toml` 中的 `NOTIFY_URL` 为自定义域名
6. 重新部署

### 方式二：GitHub Actions 自动部署

如果你想通过 GitHub 自动部署：

1. 获取 Cloudflare API Token：
   - 访问 https://dash.cloudflare.com/profile/api-tokens
   - 点击 "Create Token"
   - 使用 "Edit Cloudflare Workers" 模板
   - 复制生成的 Token

2. 获取 Account ID：
   - 在 Cloudflare Dashboard 右侧可以看到 Account ID

3. 在 GitHub 仓库设置 Secrets（Settings → Secrets and variables → Actions）：
   - `CLOUDFLARE_API_TOKEN`: 刚才创建的 API Token
   - `CLOUDFLARE_ACCOUNT_ID`: 你的 Account ID
   - `API_SECRET`: 支付FM密钥

4. 推送代码到 `main` 分支，GitHub Actions 会自动部署

### 验证部署

访问你的 Worker 域名，应该能看到支付表单页面：
```
https://wowpay2.xxx.workers.dev
```

测试创建订单：
```bash
curl -X POST https://wowpay2.xxx.workers.dev/api/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test001","amount":1.00}'
```

### 查看日志

实时查看 Worker 日志：
```bash
wrangler tail
```

### 常见问题

**Q: 部署后访问显示 "Error 1101: Worker threw exception"**
- 检查 D1 数据库是否正确绑定
- 检查 `database_id` 是否正确
- 运行 `wrangler tail` 查看详细错误

**Q: 支付回调失败**
- 确认 `NOTIFY_URL` 配置正确
- 确认支付FM后台配置的回调地址一致
- 检查签名密钥 `API_SECRET` 是否正确

**Q: 如何更新已部署的 Worker**
- 修改代码后直接运行 `npm run deploy`
- 如果修改了 Secret，需要重新运行 `wrangler secret put API_SECRET`

## API 接口

### 创建订单
```
POST /api/create
Content-Type: application/json

{
  "userId": "user123",
  "amount": 100
}
```

### 查询订单
```
GET /api/query?orderNo=xxx
```

### 核销兑换码
```
POST /api/redeem
Content-Type: application/json

{
  "code": "uuid-format-code"
}
```

### 支付回调（支付FM调用）
```
POST /api/notify?orderNo=xxx&platformOrderNo=xxx&sign=xxx
```

## 注意事项

1. 部署后记得更新 `wrangler.toml` 中的 `NOTIFY_URL` 为实际域名
2. 支付FM回调地址必须是公网可访问的HTTPS地址
3. 订单有效期为15分钟
4. 兑换码在支付成功后生成，格式为UUID

## 技术栈

- Cloudflare Workers
- TypeScript
- Cloudflare D1 (SQLite)
- 原生路由（无框架，轻量化）

## License

MIT
