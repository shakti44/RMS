-- ============================================================
-- Restaurant Management System — Complete PostgreSQL Schema
-- Multi-tenant architecture: every core table carries tenant_id
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TENANTS  (one row per restaurant brand / business)
-- ============================================================
CREATE TABLE tenants (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100) NOT NULL,
    slug          VARCHAR(50)  NOT NULL UNIQUE,          -- used in QR URLs
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(20),
    logo_url      TEXT,
    primary_color VARCHAR(7)   DEFAULT '#FF6B35',        -- hex brand color
    currency      CHAR(3)      NOT NULL DEFAULT 'INR',
    timezone      VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
    gst_number    VARCHAR(20),
    address       JSONB,                                  -- {line1,city,state,pin}
    settings      JSONB        NOT NULL DEFAULT '{}',    -- feature flags
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USERS  (staff accounts; guests order without accounts)
-- ============================================================
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'tenant_admin',
    'manager',
    'cashier',
    'waiter',
    'kitchen_staff'
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    phone         VARCHAR(20),
    password_hash TEXT         NOT NULL,
    role          user_role    NOT NULL DEFAULT 'waiter',
    avatar_url    TEXT,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    refresh_token TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

-- ============================================================
-- 3. RESTAURANTS  (a tenant may run multiple outlets)
-- ============================================================
CREATE TABLE restaurants (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    address      JSONB,
    phone        VARCHAR(20),
    open_time    TIME NOT NULL DEFAULT '09:00',
    close_time   TIME NOT NULL DEFAULT '23:00',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. TABLES  (dining tables per restaurant)
-- ============================================================
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');

CREATE TABLE restaurant_tables (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id)     ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          VARCHAR(50) NOT NULL,                    -- e.g. "T-12", "Rooftop 3"
    capacity      SMALLINT    NOT NULL DEFAULT 4,
    status        table_status NOT NULL DEFAULT 'available',
    qr_token      TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    section       VARCHAR(50),                             -- e.g. "Ground Floor"
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. KITCHEN STATIONS  (e.g. Grill, Bakery, Bar)
-- ============================================================
CREATE TABLE kitchen_stations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id)     ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          VARCHAR(80) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. CATEGORIES  (menu categories like Starters, Mains, Drinks)
-- ============================================================
CREATE TABLE categories (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    image_url     TEXT,
    sort_order    SMALLINT NOT NULL DEFAULT 0,
    is_active     BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. MENU ITEMS
-- ============================================================
CREATE TYPE item_type AS ENUM ('veg', 'non_veg', 'egg', 'vegan');

CREATE TABLE menu_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id)      ON DELETE CASCADE,
    restaurant_id     UUID NOT NULL REFERENCES restaurants(id)  ON DELETE CASCADE,
    category_id       UUID NOT NULL REFERENCES categories(id)   ON DELETE RESTRICT,
    kitchen_station_id UUID REFERENCES kitchen_stations(id)     ON DELETE SET NULL,
    name              VARCHAR(150) NOT NULL,
    description       TEXT,
    price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    image_url         TEXT,
    item_type         item_type    NOT NULL DEFAULT 'veg',
    is_available      BOOLEAN      NOT NULL DEFAULT TRUE,
    is_featured       BOOLEAN      NOT NULL DEFAULT FALSE,
    prep_time_minutes SMALLINT     NOT NULL DEFAULT 15,
    tags              TEXT[]       DEFAULT '{}',              -- e.g. ['spicy','bestseller']
    sort_order        SMALLINT     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. MODIFIER GROUPS  (e.g. "Choose Size", "Add-ons")
-- ============================================================
CREATE TABLE modifier_groups (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    is_required   BOOLEAN NOT NULL DEFAULT FALSE,
    min_select    SMALLINT NOT NULL DEFAULT 0,
    max_select    SMALLINT NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE modifier_options (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    price_delta      NUMERIC(10,2) NOT NULL DEFAULT 0,       -- +ve = surcharge
    is_default       BOOLEAN NOT NULL DEFAULT FALSE,
    is_available     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 9. INVENTORY ITEMS  (raw ingredients / packaged goods)
-- ============================================================
CREATE TYPE inventory_unit AS ENUM ('kg','g','litre','ml','piece','dozen','pack');

CREATE TABLE inventory_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id)     ON DELETE CASCADE,
    restaurant_id    UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name             VARCHAR(150) NOT NULL,
    unit             inventory_unit NOT NULL DEFAULT 'piece',
    quantity_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
    reorder_level    NUMERIC(12,3) NOT NULL DEFAULT 0,
    cost_per_unit    NUMERIC(10,2) NOT NULL DEFAULT 0,
    supplier_name    VARCHAR(100),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link menu items to ingredients (recipe / BOM)
CREATE TABLE menu_item_ingredients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id)       ON DELETE CASCADE,
    menu_item_id        UUID NOT NULL REFERENCES menu_items(id)    ON DELETE CASCADE,
    inventory_item_id   UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_used       NUMERIC(10,3) NOT NULL,                    -- per 1 serving
    UNIQUE (menu_item_id, inventory_item_id)
);

-- Ledger of all stock movements
CREATE TYPE inventory_tx_type AS ENUM ('purchase','sale_deduction','wastage','adjustment','return');

CREATE TABLE inventory_transactions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id)          ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id)  ON DELETE CASCADE,
    tx_type           inventory_tx_type NOT NULL,
    quantity_change   NUMERIC(12,3) NOT NULL,                       -- +ve = in, -ve = out
    quantity_after    NUMERIC(12,3) NOT NULL,
    note              TEXT,
    performed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id          UUID,                                         -- FK added below
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. ORDERS
-- ============================================================
CREATE TYPE order_type   AS ENUM ('dine_in','takeaway','delivery');
CREATE TYPE order_status AS ENUM (
    'pending',        -- just placed (QR or POS)
    'confirmed',      -- accepted by kitchen / staff
    'preparing',      -- kitchen working on it
    'ready',          -- ready to serve / pick up
    'served',         -- delivered to table
    'completed',      -- bill paid
    'cancelled'
);

CREATE TABLE orders (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id)          ON DELETE CASCADE,
    restaurant_id    UUID NOT NULL REFERENCES restaurants(id)      ON DELETE CASCADE,
    table_id         UUID REFERENCES restaurant_tables(id)         ON DELETE SET NULL,
    order_type       order_type   NOT NULL DEFAULT 'dine_in',
    status           order_status NOT NULL DEFAULT 'pending',
    customer_name    VARCHAR(100),
    customer_phone   VARCHAR(20),
    delivery_address JSONB,
    special_notes    TEXT,
    placed_by        UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL if QR guest
    accepted_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    served_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    placed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at      TIMESTAMPTZ,
    ready_at         TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id)     ON DELETE CASCADE,
    order_id         UUID NOT NULL REFERENCES orders(id)      ON DELETE CASCADE,
    menu_item_id     UUID NOT NULL REFERENCES menu_items(id)  ON DELETE RESTRICT,
    quantity         SMALLINT  NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price       NUMERIC(10,2) NOT NULL,                  -- snapshot at order time
    subtotal         NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    special_note     TEXT,
    status           order_status NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_item_modifiers (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id    UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES modifier_options(id) ON DELETE RESTRICT,
    price_delta      NUMERIC(10,2) NOT NULL DEFAULT 0         -- snapshot
);

-- Back-fill FK on inventory_transactions
ALTER TABLE inventory_transactions
    ADD CONSTRAINT fk_inv_tx_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- ============================================================
-- 11. BILLS & PAYMENTS
-- ============================================================
CREATE TYPE bill_status AS ENUM ('open','paid','void');
CREATE TYPE payment_method AS ENUM ('cash','card','upi','wallet','credit');

CREATE TABLE bills (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
    order_id         UUID NOT NULL REFERENCES orders(id)   ON DELETE RESTRICT UNIQUE,
    bill_number      VARCHAR(30) NOT NULL,
    subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_type    VARCHAR(20),                            -- 'flat' | 'percent'
    discount_value   NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
    coupon_code      VARCHAR(30),
    taxable_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
    cgst_rate        NUMERIC(5,2)  NOT NULL DEFAULT 2.5,
    sgst_rate        NUMERIC(5,2)  NOT NULL DEFAULT 2.5,
    cgst_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
    sgst_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_tax        NUMERIC(10,2) NOT NULL DEFAULT 0,
    grand_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
    status           bill_status   NOT NULL DEFAULT 'open',
    generated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bill_id        UUID NOT NULL REFERENCES bills(id)   ON DELETE RESTRICT,
    method         payment_method NOT NULL DEFAULT 'cash',
    amount         NUMERIC(10,2)  NOT NULL,
    reference_id   VARCHAR(100),                            -- UPI TxID / card auth
    paid_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by    UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 12. COUPONS
-- ============================================================
CREATE TYPE coupon_type AS ENUM ('flat','percent');

CREATE TABLE coupons (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code           VARCHAR(30) NOT NULL,
    coupon_type    coupon_type NOT NULL DEFAULT 'percent',
    value          NUMERIC(10,2) NOT NULL,
    max_discount   NUMERIC(10,2),
    min_order      NUMERIC(10,2) NOT NULL DEFAULT 0,
    usage_limit    INTEGER,
    times_used     INTEGER NOT NULL DEFAULT 0,
    valid_from     TIMESTAMPTZ,
    valid_until    TIMESTAMPTZ,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

-- ============================================================
-- 13. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES users(id)   ON DELETE SET NULL,
    entity       VARCHAR(50) NOT NULL,
    entity_id    UUID,
    action       VARCHAR(50) NOT NULL,        -- 'create','update','delete','status_change'
    old_data     JSONB,
    new_data     JSONB,
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES  (tune for common query patterns)
-- ============================================================
CREATE INDEX idx_orders_tenant_status      ON orders (tenant_id, status);
CREATE INDEX idx_orders_restaurant_date    ON orders (restaurant_id, placed_at DESC);
CREATE INDEX idx_order_items_order         ON order_items (order_id);
CREATE INDEX idx_menu_items_category       ON menu_items (category_id, is_available);
CREATE INDEX idx_inventory_tenant_low      ON inventory_items (tenant_id)
    WHERE quantity_on_hand <= reorder_level;
CREATE INDEX idx_bills_order               ON bills (order_id);
CREATE INDEX idx_audit_logs_tenant_date    ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_tables_qr_token           ON restaurant_tables (qr_token);

-- ============================================================
-- UPDATED_AT TRIGGER  (auto-stamp on any UPDATE)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenants','users','restaurants','restaurant_tables',
        'categories','menu_items','inventory_items','orders',
        'bills'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;
