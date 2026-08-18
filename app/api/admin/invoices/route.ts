import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeNumericId } from "@/lib/security/sanitize";
import { handleApiError } from "@/lib/security/safe-error";
import { generateInvoice } from "@/lib/factus/invoice.service";
import { getInvoices } from "@/lib/admin/invoices";

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
    const invoices = await getInvoices();
    return NextResponse.json({ invoices });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message, invoices: [] }, { status: statusCode });
  }
}