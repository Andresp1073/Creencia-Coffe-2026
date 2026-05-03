export const saleExample = {
  id: 1,
  customer_name: 'Juan Pérez',
  customer_phone: '3001234567',
  customer_email: 'juan@email.com',
  total: 75000,
  status: 'pendiente',
  payment_method: 'transferencia',
  notes: 'Entregar en la tarde',
  created_at: new Date('2024-01-15'),
};

export const saleWithItems = {
  id: 2,
  customer_name: 'María García',
  customer_phone: '3009876543',
  customer_email: 'maria@email.com',
  total: 50000,
  status: 'completada',
  payment_method: 'efectivo',
  notes: '',
  created_at: new Date('2024-01-16'),
  items: [
    { product_id: 1, quantity: 2, unit_price: 25000 },
  ],
};

export const salesList = [saleExample, saleWithItems];