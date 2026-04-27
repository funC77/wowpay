CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  merchant_order_no TEXT UNIQUE NOT NULL,
  platform_order_no TEXT,
  pay_url TEXT,
  redemption_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  is_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  redeemed_at INTEGER,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_merchant_order_no ON orders(merchant_order_no);
CREATE INDEX IF NOT EXISTS idx_redemption_code ON orders(redemption_code);
CREATE INDEX IF NOT EXISTS idx_user_id ON orders(user_id);
