-- ============================================================
-- Migración incremental · Fase 1 · Integración Factus
-- Archivo: database/migrations/001_fase1_factus.sql
-- DB objetivo: cafe_creencia (TiDB Cloud, MySQL compatible)
--
-- Naturaleza: SOLO ADITIVO (crea tablas/columnas/índices nuevos).
-- NO elimina columnas, NO borra datos, NO modifica valores existentes.
-- Es idempotente: puede ejecutarse de nuevo sin errores.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla customers (datos fiscales del cliente)
--    Persona natural: names obligatorio (app); company/dv NULL
--    Persona jurídica: company obligatorio (app); dv aplica; names NULL
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identification_document_code VARCHAR(2) NOT NULL,
    identification VARCHAR(20) NOT NULL,
    dv VARCHAR(2) DEFAULT NULL,
    legal_organization_code VARCHAR(1) NOT NULL,
    tribute_code VARCHAR(2) NOT NULL DEFAULT 'ZZ',
    responsibilities JSON DEFAULT NULL,
    company VARCHAR(200) DEFAULT NULL,
    names VARCHAR(200) DEFAULT NULL,
    trade_name VARCHAR(200) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    email VARCHAR(200) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'CO',
    municipality_code VARCHAR(10) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_customer_document (identification_document_code, identification),
    KEY idx_customers_email (email)
);

-- ------------------------------------------------------------
-- 2. Tabla invoices (factura electrónica)
--    customer_snapshot: copia inmutable de los datos fiscales usados ante Factus
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    customer_id INT DEFAULT NULL,
    customer_snapshot JSON DEFAULT NULL,
    reference_code VARCHAR(50) NOT NULL,
    status ENUM('pending', 'processing', 'validated', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    number VARCHAR(50) DEFAULT NULL,
    cufe VARCHAR(255) DEFAULT NULL,
    is_validated TINYINT(1) NOT NULL DEFAULT 0,
    validated_at DATETIME DEFAULT NULL,
    totals JSON DEFAULT NULL,
    links JSON DEFAULT NULL,
    error JSON DEFAULT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_attempt_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_invoice_order (order_id),
    UNIQUE KEY uq_invoice_reference (reference_code),
    KEY idx_invoices_status (status),
    KEY idx_invoices_customer (customer_id),
    CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 3. Campos fiscales en products (todos NULL/default, no rompen nada)
--    code_reference: NULL durante migración; obligatorio antes de facturar
--    tax_rate: NULL = no configurado (no facturable) · 0.00 = excluido/sin IVA · 19.00 = IVA 19%
-- ------------------------------------------------------------
ALTER TABLE products ADD COLUMN code_reference VARCHAR(50) DEFAULT NULL;
ALTER TABLE products ADD COLUMN unit_measure_code VARCHAR(4) NOT NULL DEFAULT '94';
ALTER TABLE products ADD COLUMN standard_code VARCHAR(4) NOT NULL DEFAULT '999';
ALTER TABLE products ADD COLUMN tax_code VARCHAR(4) DEFAULT NULL;
ALTER TABLE products ADD COLUMN tax_rate DECIMAL(5, 2) DEFAULT NULL;

CREATE INDEX idx_products_code_reference ON products (code_reference);

-- ------------------------------------------------------------
-- 4. Campos Fase 1 en orders (NULL en ventas históricas; no se inventan datos)
--    payment_form / payment_method_code permanecen NULL en ventas antiguas
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN customer_id INT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN payment_form VARCHAR(1) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN payment_method_code VARCHAR(4) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(50) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN subtotal DECIMAL(12, 2) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN tax_total DECIMAL(12, 2) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

CREATE INDEX idx_orders_customer ON orders (customer_id);

-- ------------------------------------------------------------
-- 5. Foreign keys adicionales (orders -> customers)
-- ------------------------------------------------------------
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;