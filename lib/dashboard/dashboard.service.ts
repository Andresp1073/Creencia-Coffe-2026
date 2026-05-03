import { queryMany } from "@/lib/db";

export interface DashboardProduct {
  id: number;
  name: string;
  presentation: string;
  stock: number;
  stock_min?: number;
  active: boolean;
  price: number;
}

export interface DashboardAlert {
  id: number;
  name: string;
  presentation: string;
  stock: number;
  status: "bajo" | "sin-stock";
}

export async function getDashboardData() {
  try {
    const products = await queryMany<DashboardProduct>(
      "SELECT id, name, presentation, stock, stock_min, active, price FROM products WHERE active = TRUE ORDER BY id DESC"
    );

    const alerts: DashboardAlert[] = products
      .filter(p => p.stock <= 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        presentation: p.presentation,
        stock: p.stock,
        status: p.stock === 0 ? "sin-stock" as const : "bajo" as const
      }))
      .sort((a, b) => a.stock - b.stock);

    const topProducts = products.slice(0, 5).map(p => ({
      name: p.name,
      presentation: p.presentation,
      stock: p.stock,
      price: p.price
    }));

    return { products, alerts, topProducts };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { products: [], alerts: [], topProducts: [] };
  }
}