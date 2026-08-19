import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeNumericId } from "@/lib/security/sanitize";
import { handleApiError } from "@/lib/security/safe-error";
import { reconcileInvoice } from "@/lib/factus/invoice.service";
import { mapInvoiceForAdmin } from "@/lib/admin/invoices";

export const dynamic = "force-dynamic";

type RouteContext = { params: { orderId: string } };

/**
 * Reconciliación administrativa de una factura en `processing`.
 *
 * Solo consulta Factus (GET documentado) y sincroniza el estado local cuando
 * hay evidencia de validación. NUNCA reenvía, recrea ni genera una segunda
 * factura. Exclusivo para sesiones admin (requireApiAuth). No devuelve tokens,
 * credenciales, headers ni respuestas completas de Factus.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const orderId = sanitizeNumericId(params?.orderId);
    if (!orderId) {
      return NextResponse.json({ error: "orderId inválido" }, { status: 400 });
    }

    const result = await reconcileInvoice(orderId);

    return NextResponse.json({
      invoice: mapInvoiceForAdmin(result.invoice as Record<string, any>),
      reconciled: result.reconciled,
      message: result.message,
    });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}