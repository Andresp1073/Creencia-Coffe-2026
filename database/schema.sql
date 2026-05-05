-- Cafe Creencia Database Schema
-- Database: cafe_creencia

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
    presentation ENUM('500g', '250g', '125g') DEFAULT '500g',
    price DECIMAL(10, 2) NOT NULL,
    price_500g DECIMAL(10, 2),
    price_250g DECIMAL(10, 2),
    price_125g DECIMAL(10, 2),
    stock INT DEFAULT 0,
    image VARCHAR(500),
    description TEXT,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (sales)
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    items JSON,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Insert default admin user (password: cafe2024)
INSERT INTO admin_users (username, password_hash) 
VALUES ('creencia', '$2a$10$rVY.vHLCjNqCXLVyCFYfTuqQX1dLGJQJXvP5wqNxGK5L5H5gxW5Gy');

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES 
('Café', 'cafe', 'Café en grano o molido'),
('Accesorios', 'accesorios', 'Accesorios para prepare café');

-- Insert sample products
INSERT INTO products (name, slug, category_id, presentation, price, stock, active) VALUES
('Café Tradicional', 'cafe-tradicional-500g', 1, '500g', 25000, 10, TRUE),
('Café Suave', 'cafe-suave-500g', 1, '500g', 28000, 10, TRUE),
('Café Orgánico', 'cafe-organico-500g', 1, '500g', 35000, 10, TRUE);

-- Create indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);