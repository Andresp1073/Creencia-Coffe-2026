import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { handleApiError } from "@/lib/security/safe-error";
import { saveFiscalCustomer, CustomerInput } from "@/lib/factus/invoice.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const customer = (await request.json()) as CustomerInput;
    const saved = await saveFiscalCustomer(customer);
    return NextResponse.json({ id: saved.id, customer: saved.seed, message: "Cliente fiscal guardado" });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 50);

    let customers;
    if (q) {
      customers = await queryMany<any>(
        `SELECT id, identification_document_code, identification, dv, legal_organization_code,
                company, names, trade_name, email, phone, country_code, municipality_code
         FROM customers
         WHERE identification LIKE ? OR names LIKE ? OR company LIKE ?
         ORDER BY id DESC LIMIT 50`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );
    } else {
      customers = await queryMany<any>(
        `SELECT id, identification_document_code, identification, dv, legal_organization_code,
                company, names, trade_name, email, phone, country_code, municipality_code
         FROM customers ORDER BY id DESC LIMIT 100`
      );
    }

    return NextResponse.json({ customers });
  } catch (error) {
    const { error: message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message, customers: [] }, { status: statusCode });
  }
}