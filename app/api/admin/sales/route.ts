import { NextRequest, NextResponse } from "next/server";
import { queryMany, query, withTransaction } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeString } from "@/lib/security/sanitize";
import { RowDataPacket, PoolConnection } from "mysql2/promise";

interface Order {
  id: number;
  customer_name: string;
  total: number;
  items: string;
  status: string;
  created_at: string;
}

interface ProductStock extends RowDataPacket {
  id: number;
  name: string;
  stock: number;
  price: number;
}

interface SaleItem {
  id: string;
  qty: number;
  price?: number;
  name?: string;
  presentation?: string;
}

const LOW_STOCK_THRESHOLD = 5;

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) {
    console.log("Auth failed:", auth.status, auth.statusText);
    return auth;
  }

  try {
    const orders = await queryMany<Order>(
      `SELECT id, customer_name as customer, total, items, created_at as date, status
       FROM orders 
       ORDER BY id DESC`
    );
    
    console.log("Orders raw:", orders);
    
    const parsedOrders = orders.map(o => {
      let items = [];
      try {
        if (o.items) {
          items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
        }
      } catch (e) {
        console.log("Error parsing items:", e);
        items = [];
      }
      return { 
        ...o, 
        items,
        total: Number(o.total) || 0
      };
    });
    
    return NextResponse.json({ sales: parsedOrders });
  } catch (error: any) {
    console.error("Error fetching sales:", error);
    console.error("Error message:", error.message);
    return NextResponse.json({ error: error.message, sales: [] });
  }
}

  export async function POST(request: NextRequest) {
    const auth = await requireApiAuth(request);
    if (auth instanceof NextResponse) return auth;

    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
      }

      console.log("POST sale body:", JSON.stringify(body, null, 2));

      const customer = sanitizeString(body?.customer, 100);
      const total = Number(body?.total) || 0;
      const items: SaleItem[] = body?.items || [];

      if (!customer) {
        return NextResponse.json({ error: "Cliente es requerido" }, { status: 400 });
      }

      if (items.length === 0) {
        return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
      }

      const itemIds = items.map(i => parseInt(i.id)).filter(id => !isNaN(id) && id > 0);
      
      if (itemIds.length === 0) {
        return NextResponse.json({ error: "Productos inválidos" }, { status: 400 });
      }

      const result = await withTransaction(async (conn: PoolConnection) => {
        const [products] = await conn.execute<ProductStock[]>(
          `SELECT id, name, stock, price FROM products WHERE id IN (${itemIds.map(() => '?').join(',')}) FOR UPDATE`,
          itemIds
        );

        console.log("Products fetched for stock:", products);

        const productMap = new Map(products.map(p => [p.id, p]));

        const stockErrors: string[] = [];
        
        for (const item of items) {
          const productId = parseInt(item.id);
          const product = productMap.get(productId);
          
          if (!product) {
            stockErrors.push(`Producto con ID ${productId} no encontrado`);
            continue;
          }
          
          console.log(`Checking stock for ${product.name}: current=${product.stock}, requested=${item.qty}`);
          
          if (product.stock < item.qty) {
            stockErrors.push(`Stock insuficiente para ${product.name}: disponible ${product.stock}, solicitado ${item.qty}`);
          }
        }
        
        if (stockErrors.length > 0) {
          throw { stockError: true, messages: stockErrors };
        }

        const itemsJson = JSON.stringify(items.map(i => ({
          id: String(i.id),
          qty: Number(i.qty),
          price: Number(i.price) || 0,
          name: String(i.name || ""),
          presentation: String(i.presentation || "")
        })));

        console.log("Items JSON to save:", itemsJson);

        const [insertResult] = await conn.execute<RowDataPacket[]>(
          `INSERT INTO orders (customer_name, total, items, status) VALUES (?, ?, ?, 'pending')`,
          [customer, total, itemsJson]
        );
        
        const orderId = (insertResult as any).insertId;
        console.log("Order inserted with ID:", orderId);

        for (const item of items) {
          const productId = parseInt(item.id);
          const product = productMap.get(productId);
          
          if (!product) continue;
          
          await conn.execute(
            `UPDATE products SET stock = stock - ? WHERE id = ?`,
            [item.qty, productId]
          );
          console.log(`Stock deducted: ${product.name} - ${item.qty}`);
          
          await conn.execute(
            `INSERT INTO inventory_movements (product_id, type, quantity, reason) VALUES (?, 'salida', ?, ?)`,
            [productId, item.qty, `Venta #${orderId} - ${customer}`]
          );
          console.log(`Inventory movement recorded for ${product.name}`);

          const newStock = product.stock - item.qty;
          console.log(`New stock for ${product.name}: ${newStock}, threshold: ${LOW_STOCK_THRESHOLD}`);
          console.log(`Condition check: newStock (${newStock}) <= threshold (${LOW_STOCK_THRESHOLD}) && newStock (${newStock}) >= 0: ${newStock <= LOW_STOCK_THRESHOLD && newStock >= 0}`);
          if (newStock <= LOW_STOCK_THRESHOLD && newStock >= 0) {
            await conn.execute(
              `INSERT INTO notifications (type, product_id, message) VALUES ('stock_low', ?, ?)`,
              [productId, `Stock bajo: ${product.name} tiene solo ${newStock} unidades disponibles`]
            );
            console.log(`Low stock notification created for ${product.name}`);
          } else {
            console.log(`Notification NOT created - condition not met`);
          }
        }

        return { orderId, totalItems: items.length };
      });

      console.log("Sale created successfully:", result);
      
      return NextResponse.json({ 
        id: result.orderId, 
        message: `Venta #${result.orderId} registrada - ${result.totalItems} productos` 
      });
      
    } catch (error: any) {
      console.error("Error creating sale:", error);
      
      if (error.stockError && error.messages) {
        return NextResponse.json({ 
          error: "Stock insuficiente", 
          details: error.messages 
        }, { status: 400 });
      }
      
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
  }
