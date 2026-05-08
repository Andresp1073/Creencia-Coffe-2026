-- Cafe Creencia Seed Data
-- Based on schema.sql

USE cafe_creencia;

-- Insert default admin user (password: cafe2024)
INSERT INTO admin_users (username, password_hash) VALUES
('creencia', '$2a$10$rVY.vHLCjNqCXLVyCFYfTuqQX1dLGJQJXvP5wqNxGK5L5H5gxW5Gy');

-- Insert categories
INSERT INTO categories (name, slug, description, active) VALUES
('Café', 'cafe', 'Café artesanal de alta calidad', TRUE),
('Accesorios', 'accesorios', 'Accesorios para preparar café', TRUE),
('Bebidas', 'bebidas', 'Bebidas a base de café', TRUE),
('Paquetes', 'paquetes', 'Paquetes y combos', TRUE);

-- Insert products
INSERT INTO products (name, slug, category_id, presentation, price, stock, description, image, featured, active) VALUES
('Café Tostado Medio', 'cafe-tostado-medio-500g', 1, '500g', 25000, 50, 'Café de tueste medio con notas de chocolate y caramelo. Origen seleccionado de alta montaña.', '/imagenes/Producto.jpg', TRUE, TRUE),
('Café Suave', 'cafe-suave-250g', 1, '250g', 15000, 30, 'Café suave ideal para comenzar el día. Tueste ligero que conserva todos los sabores.', '/imagenes/Producto.jpg', TRUE, TRUE),
('Café Molido Tradicional', 'cafe-molido-tradicional-125g', 1, '125g', 11000, 20, 'Café molido listo para preparar. Formato práctico de 125 gramos.', '/imagenes/Producto.jpg', FALSE, TRUE),
('Café Premium', 'cafe-premium-500g', 1, '500g', 35000, 15, 'Café premium de origen seleccionado. Granos de especialidad tostados artesanalmente.', '/imagenes/Producto.jpg', TRUE, TRUE),
('Café Sabor a Menta', 'cafe-sabor-menta-500g', 1, '500g', 28000, 8, 'Café con sabor a menta, una experiencia única.', '/imagenes/Producto.jpg', TRUE, TRUE),
('Café Sabor a Limoncillo', 'cafe-sabor-limoncillo-500g', 1, '500g', 28000, 3, 'Café infusionado con limoncillo, frescura natural.', '/imagenes/Producto.jpg', TRUE, TRUE);

-- Insert sample notifications
INSERT INTO notifications (type, product_id, message, is_read) VALUES
('info', NULL, 'Sistema de gestión activo - Bienvenido al dashboard de Café Creencia', TRUE),
('stock_low', 5, 'Stock bajo: Café Sabor a Menta tiene solo 8 unidades disponibles', FALSE),
('stock_low', 6, 'Stock bajo: Café Sabor a Limoncillo tiene solo 3 unidades disponibles', FALSE);

-- Insert sample inventory movements
INSERT INTO inventory_movements (product_id, type, quantity, reason) VALUES
(1, 'entrada', 50, 'Stock inicial - Café Tostado Medio'),
(2, 'entrada', 30, 'Stock inicial - Café Suave'),
(3, 'entrada', 20, 'Stock inicial - Café Molido Tradicional'),
(4, 'entrada', 15, 'Stock inicial - Café Premium');

-- Insert sample orders
INSERT INTO orders (customer_name, total, items, status) VALUES
('Cliente Ejemplo 1', 40000, '[{"id":"1","qty":1,"price":25000,"name":"Café Tostado Medio","presentation":"500grs"},{"id":"2","qty":1,"price":15000,"name":"Café Suave","presentation":"250grs"}]', 'completed'),
('Cliente Ejemplo 2', 35000, '[{"id":"4","qty":1,"price":35000,"name":"Café Premium","presentation":"500grs"}]', 'completed');