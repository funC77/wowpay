-- CreateTable
CREATE TABLE "payment_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "redeem_codes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unused',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" DATETIME,
    CONSTRAINT "redeem_codes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "payment_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "redeem_codes_code_key" ON "redeem_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "redeem_codes_order_id_key" ON "redeem_codes"("order_id");

-- CreateIndex
CREATE INDEX "redeem_codes_code_idx" ON "redeem_codes"("code");
