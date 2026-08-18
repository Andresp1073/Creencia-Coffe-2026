-- Cafe Creencia Database Schema
-- Database: cafe_creencia
-- Alineado con la BD real (TiDB Cloud) + campos de Fase 1 (Factus)

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    category_id INT,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    presentation VARCHAR(20) NOT NULL,
    stock INT DEFAULT 0,
    stock_min INT DEFAULT 5,
    image LONGTEXT,
    featured TINYINT(1) DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    variants JSON,
    -- Campos fiscales (Fase 1 Factus)
    -- code_reference: NULL durante migración; obligatorio antes de facturar
    -- tax_rate: NULL = no configurado (no facturable) · 0.00 = excluido/sin IVA · 19.00 = IVA 19%
    code_reference VARCHAR(50) DEFAULT NULL,
    unit_measure_code VARCHAR(4) NOT NULL DEFAULT '94',
    standard_code VARCHAR(4) NOT NULL DEFAULT '999',
    tax_code VARCHAR(4) DEFAULT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_products_category (category_id),
    KEY idx_products_code_reference (code_reference),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table (datos fiscales del cliente para facturación electrónica)
-- Persona natural: names obligatorio (validado en app), company/dv NULL salvo que el tipo de documento lo requiera
-- Persona jurídica: company obligatorio (validado en app), dv aplica, names NULL
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

-- Orders table (sales)
-- Los precios incluyen IVA; orders.items es un snapshot histórico inmmutable.
-- subtotal/tax_total se llenan cuando el backend recalcule server-side (Fase 2).
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(200),
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending','confirmed','preparing','ready','delivered','cancelled') DEFAULT 'pending',
    notes TEXT,
    items JSON,
    -- Campos Fase 1 Factus (NULL en ventas históricas; no se inventan datos)
    customer_id INT DEFAULT NULL,
    payment_form VARCHAR(1) DEFAULT NULL,
    payment_method_code VARCHAR(4) DEFAULT NULL,
    payment_reference VARCHAR(50) DEFAULT NULL,
    -- Campos Fase 4B Factus: vencimiento para ventas a crédito (payment_form = "2").
    -- Obligatorio antes de facturar si es crédito; NULL si contado o venta histórica.
    payment_due_date DATE DEFAULT NULL,
    subtotal DECIMAL(12, 2) DEFAULT NULL,
    tax_total DECIMAL(12, 2) DEFAULT NULL,
    discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_orders_created (created_at),
    KEY idx_orders_customer (customer_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Invoices table (factura electrónica)
-- customer_snapshot: copia inmutable de los datos fiscales usados ante Factus
-- (no depender solo de customers; el cliente puede cambiar después de facturar)
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
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Inventory movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('entrada', 'salida') NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) DEFAULT 'stock_low',
    product_id INT,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);