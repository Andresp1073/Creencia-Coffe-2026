import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeNumericId } from "@/lib/security/sanitize";
import { handleApiError } from "@/lib/security/safe-error";
import { getValidatedInvoiceFile } from "@/lib/factus/invoice.service";
import { InvoiceFileKind } from "@/lib/factus/factus.client";

export const dynamic = "force-dynamic";

type RouteContext = { params: { orderId: string } };

/**
 * Convierte un nombre de archivo de Factus en un nombre seguro para el header
 * Content-Disposition (impide inyección de headers vía CRLF/comillas).
 */
function safeDownloadName(
  fileName: string,
  fallback: string,
  kind: InvoiceFileKind,
): string {
  const cleaned = fileName
    .replace(/[\r\n"\\;]/g, "_")
    .replace(/[^\w.-]+/g, "_");
  const base = cleaned || fallback;
  const extension = kind === "pdf" ? ".pdf" : ".xml";
  return base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`;
}

/**
 * Descarga del PDF o XML electrónico de una factura VALIDADA.
 *
 * Solo lectura (GET). La validación de estado la hace getValidatedInvoiceFile:
 * cualquier factura no validada recibe 409 y NUNCA se consulta el endpoint de
 * descarga de Factus. Devuelve el archivo binario con Content-Disposition.
 * Exclusivo para sesiones admin (requireApiAuth). No expone tokens ni
 * credenciales; decodea el Base64 de Factus en el servidor.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const orderId = sanitizeNumericId(params?.orderId);
    if (!orderId) {
      return NextResponse.json({ error: "orderId inválido" }, { status: 400 });
    }

    const kind = new URL(request.url).searchParams.get("kind");
    if (kind !== "pdf" && kind !== "xml") {
      return NextResponse.json(
        { error: "kind debe ser 'pdf' o 'xml'" },
        { status: 400 },
      );
    }

    const { invoice, file } = await getValidatedInvoiceFile(orderId, kind);

    const buffer = Buffer.from(file.base64, "base64");
    const contentType = kind === "pdf" ? "application/pdf" : "application/xml";
    const fileName = safeDownloadName(
      file.file_name,
      `${invoice.number}.${kind}`,
      kind,
    );
    const disposition = `attachment; filename="${fileName}"`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
