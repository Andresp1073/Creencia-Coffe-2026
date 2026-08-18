import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeNumericId } from "@/lib/security/sanitize";
import { handleApiError } from "@/lib/security/safe-error";
import { generateInvoice } from "@/lib/factus/invoice.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const orderId = sanitizeNumericId(body?.orderId);
    if (!orderId) {
      return NextResponse.json({ error: "orderId es requerido" }, { status: 400 });
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

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const invoices = await queryMany<any>(
      `SELECT i.id, i.order_id, i.customer_id, i.reference_code, i.status, i.number, i.cufe,
              i.is_validated, i.validated_at, i.totals, i.links, i.error, i.attempts,
              i.last_attempt_at, i.created_at, o.customer_name AS order_customer
       FROM invoices i
       LEFT JOIN orders o ON o.id = i.order_id
       ORDER BY i.id DESC`
    );
    return NextResponse.json({ invoices });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message, invoices: [] }, { status: statusCode });
  }
}