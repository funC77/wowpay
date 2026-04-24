# WowPay - 支付交易平台B

基于易支付的个人支付系统，为平台A提供额度充值兑换码服务。

## 技术栈

- TypeScript + Express
- Prisma ORM + SQLite（开发）/ MySQL（生产）
- 易支付聚合支付

## 项目结构

```
wowpay/
├── prisma/
│   └── schema.prisma      # 数据库模型
├── public/
│   ├── pay.html           # 充值页面
│   └── success.html       # 支付成功页
├── src/
│   ├── index.ts           # 入口
│   ├── lib/
│   │   ├── prisma.ts      # 数据库客户端
│   │   ├── yipay.ts       # 易支付工具
│   │   └── redeemCode.ts  # 兑换码生成
│   └── routes/
│       ├── pay.ts         # 支付路由
│       └── redeem.ts      # 兑换码路由
├── .env                   # 环境变量
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的易支付配置：

```env
YIPAY_URL=https://你的易支付域名/
YIPAY_PID=你的商户ID
YIPAY_KEY=你的商户密钥
BASE_URL=https://你的域名（生产）或 http://localhost:3000（开发）
```

### 3. 初始化数据库

```bash
npx prisma migrate dev --name init
```

### 4. 启动服务

```bash
npm run dev
```

服务启动后访问：`http://localhost:3000/pay.html`

## 核心流程

### 1. 发起支付（平台A → 平台B）

平台A直接跳转：
```
GET /api/pay?user_id=xxx&amount=100
```

B生成订单，跳转易支付收银台，用户扫码支付。

### 2. 支付回调（易支付 → 平台B）

用户支付成功后，易支付异步通知：
```
POST /api/pay/callback
```

B验签 → 更新订单状态 → 生成兑换码。

### 3. 查询兑换码

支付成功页轮询：
```
GET /api/pay/code?orderId=xxx
```

### 4. 核销兑换码（平台A）

验证（不核销）：
```
GET /api/redeem/verify?code=XXXX-XXXX-XXXX-XXXX
```

核销：
```
POST /api/redeem/consume
Body: { "code": "XXXX-XXXX-XXXX-XXXX", "user_id": "xxx" }
```

## 开发注意事项

1. **回调地址**：开发时用 `ngrok` 做内网穿透，让易支付能访问到 `BASE_URL`
2. **幂等**：回调和核销都做了幂等处理，重复请求不会重复发码或扣款
3. **签名**：易支付回调必须验签，防止伪造
4. **金额校验**：回调时会比对金额，防止篡改

## 生产部署

1. 将 `DATABASE_URL` 改为 MySQL/PostgreSQL
2. 更新 `prisma/schema.prisma` 中的 `provider`
3. 确保 `BASE_URL` 使用 HTTPS
4. 部署后运行 `npx prisma migrate deploy`
