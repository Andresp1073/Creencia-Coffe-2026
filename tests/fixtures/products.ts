export const activeProduct = {
  id: 1,
  name: 'Café Tostado Medio',
  slug: 'cafe-tostado-medio',
  category: 'Café',
  category_id: 1,
  presentation: '500g',
  price: 25000,
  image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
  stock: 50,
  featured: true,
  active: true,
  description: 'Café de tueste medio con notas de chocolate y caramelo.',
};

export const inactiveProduct = {
  id: 2,
  name: 'Café Suave',
  slug: 'cafe-suave',
  category: 'Café',
  category_id: 1,
  presentation: '250g',
  price: 15000,
  image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
  stock: 5,
  featured: true,
  active: false,
  description: 'Café suave ideal para el inicio del día.',
};

export const lowStockProduct = {
  id: 3,
  name: 'Café Molido Tradicional',
  slug: 'cafe-molido',
  category: 'Café',
  category_id: 1,
  presentation: '125g',
  price: 11000,
  image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
  stock: 3,
  featured: false,
  active: true,
  description: 'Café molido listo para preparar.',
};

export const productsList = [activeProduct, inactiveProduct, lowStockProduct];