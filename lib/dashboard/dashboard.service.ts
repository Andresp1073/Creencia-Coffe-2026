import { queryMany, query } from "@/lib/db";

export interface DashboardProduct {
  id: number;
  name: string;
  presentation: string;
  stock: number;
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
      "SELECT id, name, presentation, stock, active, price FROM products WHERE active = TRUE ORDER BY id ASC"
    );

    const alerts: DashboardAlert[] = products
      .filter(p => p.stock > 0 && p.stock <= 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        presentation: p.presentation,
        stock: p.stock,
        status: p.stock === 0 ? "sin-stock" as const : "bajo" as const
      }))
      .sort((a, b) => a.stock - b.stock);

    const topProducts = products.slice(0, 5).map(p => ({
      id: p.id,
      name: p.name,
      presentation: p.presentation,
      stock: p.stock,
      price: p.price
    }));

    // Get sales stats
    let salesToday = 0;
    let salesMonth = 0;
    let revenueToday = 0;
    let revenueMonth = 0;

    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const todayOrders = await queryMany<{ count: number; total: number }[]>(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE DATE(created_at) = ?`,
        [today]
      );
      if (todayOrders.length > 0) {
        salesToday = todayOrders[0].count || 0;
        revenueToday = Number(todayOrders[0].total) || 0;
      }

      const monthOrders = await queryMany<{ count: number; total: number }[]>(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE DATE(created_at) >= ?`,
        [monthStartStr]
      );
      if (monthOrders.length > 0) {
        salesMonth = monthOrders[0].count || 0;
        revenueMonth = Number(monthOrders[0].total) || 0;
      }
    } catch (e) {
      console.log("Error fetching sales stats:", e);
    }

    return { 
      products, 
      alerts, 
      topProducts,
      stats: {
        salesToday,
        revenueToday,
        salesMonth,
        revenueMonth
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { products: [], alerts: [], topProducts: [], stats: { salesToday: 0, revenueToday: 0, salesMonth: 0, revenueMonth: 0 } };
  }
}