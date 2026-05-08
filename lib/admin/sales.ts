import { queryMany } from "@/lib/db";

export interface Sale {
  id: number;
  date: string;
  customer: string;
  items: { id: string; qty: number; price?: number; name?: string; presentation?: string }[];
  total: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  price_500g?: number;
  price_250g?: number;
  price_125g?: number;
  stock: number;
  presentation: string;
  active?: boolean;
}

export async function getSales(): Promise<Sale[]> {
  try {
    const orders = await queryMany<any>(
      `SELECT id, customer_name as customer, total, items, created_at as date, status
       FROM orders 
       ORDER BY id DESC`
    );
    
    return orders.map(o => ({
      id: o.id,
      date: o.date,
      customer: o.customer,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [],
      total: Number(o.total)
    }));
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const products = await queryMany<any>(
      `SELECT p.id, p.name, p.price, p.price_500g, p.price_250g, p.price_125g, 
              p.stock, p.presentation, c.name as category, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = TRUE
       ORDER BY p.name ASC`
    );
    return products.map(p => {
      const price = Number(p.price) || 0;
      const price500 = Number(p.price_500g) || 0;
      const price250 = Number(p.price_250g) || 0;
      const price125 = Number(p.price_125g) || 0;
      const base = price500 || price;
      return {
        ...p,
        price: base || price,
        price_500g: base || price,
        price_250g: price250 || Math.round((price500 || price) * 0.55),
        price_125g: price125 || Math.round((price500 || price) * 0.3),
        stock: Number(p.stock) || 0,
        presentation: p.presentation || '500g'
      };
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}