import { NextRequest, NextResponse } from "next/server";
import { queryMany, withTransaction } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeString } from "@/lib/security/sanitize";
import { RowDataPacket, PoolConnection } from "mysql2/promise";
import { toCents, toMoneyString, eq } from "@/lib/factus/money";
import { parseSaleItems, computeOrderFigures, OrderLine } from "@/lib/factus/order";
import { canonicalPresentation } from "@/lib/factus/presentation";
import { ValidationError, AppError, handleApiError } from "@/lib/security/safe-error";

interface Order {
  id: number;
  customer_name: string;
  total: number;
  items: string;
  status: string;
  created_at: string;
}

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  stock: number;
  price: string;
  presentation: string;
  tax_rate: string | null;
}

interface LowStockProduct {
  name: string;
  stock: number;
  presentation?: string;
}

const LOW_STOCK_THRESHOLD = 5;

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const orders = await queryMany<Order>(
      `SELECT id, customer_name as customer, total, items, created_at as date, status
       FROM orders
       ORDER BY id DESC`
    );

    const parsedOrders = orders.map(o => {
      let items = [];
      try {
        if (o.items) {
          items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
        }
      } catch {
        items = [];
      }
      return {
        ...o,
        items,
        total: Number(o.total) || 0
      };
    });

    return NextResponse.json({ sales: parsedOrders });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message, sales: [] }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Datos inválidos");
    }

    const customer = sanitizeString(body?.customer, 100);
    if (!customer) {
      throw new ValidationError("Cliente es requerido");
    }

    // El cliente NO es autoridad de precios/total: solo aporta qué productos y cuántas unidades.
    const lines: OrderLine[] = parseSaleItems(body?.items);

    let clientTotalCents: bigint | null = null;
    if (body?.total !== undefined && body?.total !== null && body?.total !== "") {
      try {
        clientTotalCents = toCents(body.total as string | number);
      } catch {
        throw new ValidationError("Total enviado inválido");
      }
    }

    const result = await withTransaction(async (conn: PoolConnection) => {
      const itemIds = [...new Set(lines.map(l => l.productId))];

      const [products] = await conn.execute<ProductRow[]>(
        `SELECT id, name, stock, price, presentation, tax_rate
         FROM products WHERE id IN (${itemIds.map(() => '?').join(',')}) FOR UPDATE`,
        itemIds
      );

      const productMap = new Map(products.map(p => [p.id, p]));

      const stockErrors: string[] = [];
      for (const line of lines) {
        const product = productMap.get(line.productId);
        if (!product) {
          stockErrors.push(`Producto con ID ${line.productId} no encontrado`);
          continue;
        }
        if (product.stock < line.qty) {
          stockErrors.push(`Stock insuficiente para ${product.name}: disponible ${product.stock}, solicitado ${line.qty}`);
        }
      }

      if (stockErrors.length > 0) {
        throw new ValidationError("Stock insuficiente: " + stockErrors.join("; "));
      }

      const productsById: Record<number, { price: string; taxRate: string | null }> = {};
      for (const p of products) {
        productsById[p.id] = { price: p.price, taxRate: p.tax_rate };
      }

      const figures = computeOrderFigures(lines, productsById);

      // Autoridad del precio: el cliente DEBE cuadrar con el total recalculado server-side.
      if (clientTotalCents !== null && !eq(figures.totalCents, clientTotalCents)) {
        throw new ValidationError("El total enviado no coincide con el total calculado por el servidor");
      }

      const totalNumber = Number(toMoneyString(figures.totalCents));
      const subtotalNumber =
        figures.subtotalCents === null ? null : Number(toMoneyString(figures.subtotalCents));
      const taxNumber =
        figures.taxCents === null ? null : Number(toMoneyString(figures.taxCents));

      // Snapshot histórico inmutable: precio REAL server-side, presentación canónica.
      const itemsJson = JSON.stringify(lines.map(line => {
        const product = productMap.get(line.productId)!;
        return {
          id: String(product.id),
          qty: line.qty,
          price: Number(toMoneyString(figures.unitPrices.get(product.id)!)),
          name: product.name,
          presentation: canonicalPresentation(product.presentation),
        };
      }));

      const [insertResult] = await conn.execute<RowDataPacket[]>(
        `INSERT INTO orders (customer_name, total, items, status, subtotal, tax_total, discount_total)
         VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
        [customer, totalNumber, itemsJson, subtotalNumber, taxNumber, 0]
      );

      const orderId = (insertResult as any).insertId;

      const lowStockProducts: LowStockProduct[] = [];

      for (const line of lines) {
        const product = productMap.get(line.productId)!;

        await conn.execute(
          `UPDATE products SET stock = stock - ? WHERE id = ?`,
          [line.qty, product.id]
        );

        await conn.execute(
          `INSERT INTO inventory_movements (product_id, type, quantity, reason) VALUES (?, 'salida', ?, ?)`,
          [product.id, line.qty, `Venta #${orderId} - ${customer}`]
        );

        const newStock = product.stock - line.qty;
        if (newStock <= LOW_STOCK_THRESHOLD && newStock >= 0) {
          await conn.execute(
            `INSERT INTO notifications (type, product_id, message) VALUES ('stock_low', ?, ?)`,
            [product.id, `Stock bajo: ${product.name} tiene solo ${newStock} unidades disponibles`]
          );
          lowStockProducts.push({
            name: product.name,
            stock: newStock,
            presentation: product.presentation,
          });
        }
      }

      return { orderId, totalItems: lines.length, total: totalNumber, lowStockProducts };
    });

    if (result.lowStockProducts && result.lowStockProducts.length > 0) {
      const resendApiKey = process.env.RESEND_API_KEY;
      const adminEmail = process.env.ADMIN_EMAIL || "admin@cafecreencia.com";

      for (const lowStock of result.lowStockProducts) {
        if (resendApiKey) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`
              },
              body: JSON.stringify({
                from: "Café Creencia <onboarding@resend.dev>",
                to: [adminEmail],
                subject: `Alerta: Stock bajo - ${lowStock.name}`,
                html: `
                  <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #3E2723;">Alerta de Stock - Café Creencia</h2>
                      <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 10px;"><strong>Producto:</strong> ${lowStock.name}</p>
                        <p style="margin: 0 0 10px;"><strong>Stock actual:</strong> <span style="color: #d32f2f; font-weight: bold;">${lowStock.stock} unidades</span></p>
                        <p style="margin: 0 0 10px;"><strong>Presentación:</strong> ${lowStock.presentation || '500g'}</p>
                      </div>
                      <p>Esta alerta se generó automáticamente después de la <strong>Venta #${result.orderId}</strong>.</p>
                      <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Este es un correo automático. Por favor no responder.
                      </p>
                    </body>
                  </html>
                `
              })
            });
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }
        } else {
          console.log(`[EMAIL SIMULADO] Alerta de stock para ${adminEmail}: ${lowStock.name} tiene solo ${lowStock.stock} unidades`);
        }
      }
    }

    return NextResponse.json({
      id: result.orderId,
      message: `Venta #${result.orderId} registrada - ${result.totalItems} productos`,
      total: result.total,
    });

  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}