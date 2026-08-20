import { queryMany } from "@/lib/db";

export interface InventoryProduct {
  id: number;
  name: string;
  presentation: string;
  stock: number;
  active?: boolean;
}

export interface InventoryMovement {
  id: number;
  date: string;
  product_name: string;
  type: "entrada" | "salida";
  qty: number;
  note?: string;
}

export async function getMovements(): Promise<InventoryMovement[]> {
  try {
    const movements = await queryMany<any>(
      `SELECT im.id, im.type, im.quantity, im.reason, im.created_at, 
              p.name as product_name, p.presentation
       FROM inventory_movements im
       LEFT JOIN products p ON im.product_id = p.id
       ORDER BY im.created_at DESC
       LIMIT 50`
    );
    
    return movements.map(m => ({
      id: m.id,
      date: new Date(m.created_at).toISOString().split('T')[0],
      product_name: m.product_name ? `${m.product_name} ${m.presentation}` : 'Producto desconocido',
      type: m.type,
      qty: m.quantity,
      note: m.reason || ''
    }));
  } catch (error) {
    console.error("Error fetching movements:", error);
    return [];
  }
}

export async function getInventoryData() {
  try {
    const products = await queryMany<InventoryProduct>(
      "SELECT id, name, presentation, stock, active FROM products ORDER BY id"
    );
    
    const movements = await getMovements();
    
    return { products, movements };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return { products: [], movements: [] };
  }
}