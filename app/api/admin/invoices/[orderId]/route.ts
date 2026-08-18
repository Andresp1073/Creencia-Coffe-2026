import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeNumericId } from "@/lib/security/sanitize";
import { handleApiError, NotFoundError } from "@/lib/security/safe-error";
import { generateInvoice } from "@/lib/factus/invoice.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: { orderId: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const orderId = sanitizeNumericId(params?.orderId);
    if (!orderId) {
      return NextResponse.json({ error: "orderId inválido" }, { status: 400 });
    }

    const invoice = await queryOne<any>(
      `SELECT i.*, o.customer_name AS order_customer
       FROM invoices i LEFT JOIN orders o ON o.id = i.order_id
       WHERE i.order_id = ?`,
      [orderId]
    );

    if (!invoice) {
      return NextResponse.json({ error: `No existe factura para la orden ${orderId}`, invoice: null }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message, invoice: null }, { status: statusCode });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const orderId = sanitizeNumericId(params?.orderId);
    if (!orderId) {
      return NextResponse.json({ error: "orderId inválido" }, { status: 400 });
    }

    const result = await generateInvoice(orderId, {
      customer: (body?.customer as Record<string, unknown>) || undefined,
      payment: (body?.payment as Record<string, unknown>) || undefined,
    });

    return NextResponse.json({ invoice: result.invoice, created: result.created, message: result.message });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}