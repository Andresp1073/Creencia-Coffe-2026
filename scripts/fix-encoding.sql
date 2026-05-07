-- Script para corregir caracteres ñ en la tabla orders
-- Este archivo contiene los comandos SQL para ejecutar en TiDB Cloud

-- Corregir customer_name
UPDATE orders SET customer_name = REPLACE(customer_name, '??', 'ñ') WHERE customer_name LIKE '%??%';

-- Verificar los cambios
SELECT id, customer_name FROM orders;