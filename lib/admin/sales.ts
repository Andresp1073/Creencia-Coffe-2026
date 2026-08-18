import { queryMany } from "@/lib/db";

export interface Sale {
  id: number;
  date: string;
  customer: string;
  items: { id: string; qty: number; price?: number; name?: string; presentation?: string }[];
  total: number;
  customer_id?: number | null;
  payment_form?: string | null;
  payment_method_code?: string | null;
  payment_reference?: string | null;
  payment_due_date?: string | null;
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
  code_reference?: string | null;
  unit_measure_code?: string | null;
  standard_code?: string | null;
  tax_code?: string | null;
  tax_rate?: string | number | null;
}

export async function getSales(): Promise<Sale[]> {
  try {
    const orders = await queryMany<any>(
      `SELECT id, customer_name as customer, total, items, created_at as date, status,
              customer_id, payment_form, payment_method_code, payment_reference, payment_due_date
       FROM orders 
       ORDER BY id DESC`
    );
    
    return orders.map(o => ({
      id: o.id,
      date: o.date,
      customer: o.customer,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [],
      total: Number(o.total),
      customer_id: o.customer_id ?? null,
      payment_form: o.payment_form ?? null,
      payment_method_code: o.payment_method_code ?? null,
      payment_reference: o.payment_reference ?? null,
      payment_due_date: o.payment_due_date ?? null,
    }));
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const products = await queryMany<any>(
      `SELECT p.id, p.name, p.price, p.stock, p.presentation, p.active,
              p.code_reference, p.unit_measure_code, p.standard_code, p.tax_code, p.tax_rate,
              c.name as category, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       ORDER BY p.name ASC`
    );
    return products.map(p => {
      const price = Number(p.price) || 0;
      const isActive = p.active === true || p.active === 1 || p.active === '1';
      return {
        ...p,
        active: isActive,
        price,
        price_500g: price,
        price_250g: Math.round(price * 0.55),
        price_125g: Math.round(price * 0.3),
        stock: Number(p.stock) || 0,
        presentation: p.presentation || '500g',
        code_reference: p.code_reference ?? null,
        unit_measure_code: p.unit_measure_code ?? null,
        standard_code: p.standard_code ?? null,
        tax_code: p.tax_code ?? null,
        tax_rate: p.tax_rate ?? null,
      };
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}