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
      `SELECT p.*, c.name as category, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = TRUE AND p.stock > 0
       ORDER BY p.name ASC`
    );
    return products.map(p => ({
      ...p,
      price: p.price_500g || p.price || 0
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}