-- Cafe Creencia Seed Data

USE credibilidad_coffee;

-- Insert categories
INSERT INTO categories (name, slug, description) VALUES
('Café', 'cafe', 'Café artesanal de alta calidad'),
('Accesorios', 'accesorios', 'Accesorios para preparar café');

-- Insert admin user (password: cafe2024admin)
INSERT INTO admin_users (username, email, password_hash, name) VALUES
('creencia', 'andresmauriciope1073@gmail.com', '$2a$10$N9qo8uLOkgxWob6qH8Y5KOF8zK9fA0zQvX0KjYz0XwO0zQvX0KjY', 'Admin Cafe Creencia');

-- Insert products
INSERT INTO products (name, slug, description, price, presentation, category_id, image, stock, featured) VALUES
('Café Tostado Medio', 'cafe-tostado-medio-500g', 'Café de tueste medio con notas de chocolate y caramelo.', 25000, '500g', 1, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=500&fit=crop', 50, true),
('Café Suave', 'cafe-suave-250g', 'Café suave ideal para comenzar el día.', 15000, '250g', 1, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=500&fit=crop', 30, true),
('Café Molido Tradicional', 'cafe-molido-tradicional-125g', 'Café molido listo para preparar en formato más generoso.', 11000, '125g', 1, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=500&fit=crop', 20, false),
('Café Premium', 'cafe-premium-500g', 'Café premium de origen seleccionado.', 35000, '500g', 1, 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400&h=500&fit=crop', 15, true);

-- Insert notifications
INSERT INTO notifications (type, title, message) VALUES
('info', 'Sistema activo', 'El sistema de gestión está funcionando correctamente'),
('warning', 'Stock bajo', 'El producto Café Suave 250g tiene stock bajo');