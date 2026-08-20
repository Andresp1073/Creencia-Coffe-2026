import { queryMany } from "@/lib/db";

/** Convierte valores Date de mysql2 (TiDB) a string ISO para render seguro en cliente. */
function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim() !== "") return value;
  return String(value);
}

/** Extrae YYYY-MM-DD de un Date/string; null si vacío. */
function toDateOnly(value: unknown): string | null {
  const iso = toIsoString(value);
  if (!iso) return null;
  const match = iso.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : iso.slice(0, 10);
}

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

export const DEFAULT_SALES_PAGE_SIZE = 10;

export interface SalesPageResult {
  sales: Sale[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function mapOrderRow(o: any): Sale {
  return {
    id: o.id,
    date: toIsoString(o.date) ?? "",
    customer: o.customer,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [],
    total: Number(o.total),
    customer_id: o.customer_id ?? null,
    payment_form: o.payment_form ?? null,
    payment_method_code: o.payment_method_code ?? null,
    payment_reference: o.payment_reference ?? null,
    payment_due_date: toDateOnly(o.payment_due_date),
  };
}

/** Paginación server-side de ventas (para /admin/ventas). */
export async function getSalesPage(page = 1, pageSize = DEFAULT_SALES_PAGE_SIZE): Promise<SalesPageResult> {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || DEFAULT_SALES_PAGE_SIZE));
  const offset = (safePage - 1) * safePageSize;
  try {
    const [countRow] = await queryMany<any>("SELECT COUNT(*) AS total FROM orders");
    const total = Number(countRow?.total) || 0;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));

    const orders = await queryMany<any>(
      `SELECT id, customer_name as customer, total, items, created_at as date, status,
              customer_id, payment_form, payment_method_code, payment_reference, payment_due_date
       FROM orders 
       ORDER BY id DESC
       LIMIT ${safePageSize} OFFSET ${offset}`,
    );

    return {
      sales: orders.map(mapOrderRow),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    };
  } catch (error) {
    console.error("Error fetching sales:", error);
    return { sales: [], total: 0, page: safePage, pageSize: safePageSize, totalPages: 1 };
  }
}

export async function getSales(): Promise<Sale[]> {
  const result = await getSalesPage(1, 10000);
  return result.sales;
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