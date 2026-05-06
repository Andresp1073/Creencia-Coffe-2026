import { queryMany, query, queryOne } from "@/lib/db";

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

function getProductPrice(product: any): number {
  if (product.price && Number(product.price) > 0) {
    return Number(product.price);
  }
  if (product.description && product.description.startsWith('{')) {
    try {
      const prices = JSON.parse(product.description);
      return prices.price_500g || prices.price_250g || prices.price_125g || 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

export async function getDashboardData() {
  try {
    const productsRaw = await queryMany<any>(
      "SELECT id, name, presentation, stock, active, price, description FROM products WHERE active = TRUE ORDER BY id ASC"
    );

    const products = productsRaw.map(p => ({
      ...p,
      price: getProductPrice(p)
    }));

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
      const todayColombian = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      console.log("Dashboard - today (UTC):", today, "today (Colombian):", todayColombian);

      const allOrdersToday = await queryMany<any>(
        `SELECT id, customer_name, total, status, created_at FROM orders WHERE DATE(created_at) = ?`,
        [todayColombian]
      );
      console.log("Dashboard - allOrdersToday:", allOrdersToday);

      const allOrders = await queryMany<any>(`SELECT id, customer_name, total, status, created_at FROM orders`);
      console.log("Dashboard - allOrders (count):", allOrders.length);
      if (allOrders.length > 0) {
        console.log("Dashboard - sample order:", allOrders[0]);
      }

      const todayOrders = await queryOne<{ count: number; total: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE DATE(created_at) = ?`,
        [todayColombian]
      );
      console.log("Dashboard - todayOrders:", todayOrders);
      if (todayOrders) {
        salesToday = Number(todayOrders.count) || 0;
        revenueToday = Number(todayOrders.total) || 0;
      }

      const monthOrders = await queryOne<{ count: number; total: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE DATE(created_at) >= ?`,
        [monthStartStr]
      );
      console.log("Dashboard - monthOrders:", monthOrders);
      if (monthOrders) {
        salesMonth = Number(monthOrders.count) || 0;
        revenueMonth = Number(monthOrders.total) || 0;
      }

      salesToday = allOrdersToday.length;
      revenueToday = allOrdersToday.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      console.log("Dashboard - FINAL salesToday:", salesToday, "revenueToday:", revenueToday);
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