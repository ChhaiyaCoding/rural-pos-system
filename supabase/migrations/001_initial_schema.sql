-- ============================================================
-- Rural POS — Initial Schema
-- Run: supabase db push
-- ============================================================

-- Tenants (one per business)
CREATE TABLE tenants (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name              TEXT NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
                    CHECK (subscription_tier IN ('free', 'basic', 'pro')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (one per user, linked to auth.users)
CREATE TABLE profiles (
  id         TEXT PRIMARY KEY,  -- matches auth.users.id
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'cashier'
             CHECK (role IN ('owner', 'cashier')),
  name_km    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name_km             TEXT NOT NULL,
  barcode             TEXT,
  unit                TEXT NOT NULL DEFAULT 'មេ',
  cost_price          BIGINT NOT NULL DEFAULT 0,  -- KHR integer
  sell_price          BIGINT NOT NULL DEFAULT 0,  -- KHR integer
  stock_qty           INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

-- Customers
CREATE TABLE customers (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name_km       TEXT NOT NULL,
  phone         TEXT,
  debt_balance  BIGINT NOT NULL DEFAULT 0,  -- KHR integer, running balance
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Sales (append-only — never update amount or delete)
CREATE TABLE sales (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cashier_id   TEXT NOT NULL REFERENCES profiles(id),
  total_amount BIGINT NOT NULL,   -- KHR integer
  paid_amount  BIGINT NOT NULL,   -- KHR integer
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'debt', 'partial')),
  customer_id  TEXT REFERENCES customers(id),
  note         TEXT,
  is_void      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sale Items (append-only)
CREATE TABLE sale_items (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id    TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  tenant_id  TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  name_km    TEXT NOT NULL,   -- snapshot at time of sale
  qty        INTEGER NOT NULL,
  unit_price BIGINT NOT NULL, -- KHR integer
  subtotal   BIGINT NOT NULL  -- KHR integer
);

-- Debt Transactions (append-only — never update or delete)
CREATE TABLE debt_transactions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sale_id     TEXT REFERENCES sales(id),
  amount      BIGINT NOT NULL,  -- KHR integer
  type        TEXT NOT NULL CHECK (type IN ('charge', 'payment')),
  note        TEXT,
  is_void     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security — filter every table by tenant_id
-- ============================================================

ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transactions ENABLE ROW LEVEL SECURITY;

-- Helper: get the tenant_id of the calling user from their profile
CREATE OR REPLACE FUNCTION auth_tenant_id() RETURNS TEXT
  LANGUAGE sql STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()::text;
$$;

-- RLS policies (tenant isolation)
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON sales
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON sale_items
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON debt_transactions
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON profiles
  USING (tenant_id = auth_tenant_id());

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

CREATE INDEX idx_products_tenant   ON products(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_barcode  ON products(tenant_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_customers_tenant  ON customers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_tenant_date ON sales(tenant_id, created_at DESC) WHERE NOT is_void;
CREATE INDEX idx_debt_customer     ON debt_transactions(tenant_id, customer_id, created_at DESC);
