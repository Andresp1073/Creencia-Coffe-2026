import { query, queryOne, queryMany } from "@/lib/db";
import { NotFoundError, ValidationError, ConflictError, safeJsonParse } from "@/lib/security/safe-error";
import { toCents, toMoneyString } from "./money";
import { mapInvoicePayload, InvoiceItemSeed, InvoiceCustomerSeed } from "./invoice.mapper";
import { createInvoice as sendInvoiceToFactus, getNumberingRanges } from "./factus.client";
import { FactusInvoiceResponse } from "./types";
import {
  InvoicePayloadError,
  FactusConfigError,
  FactusNumberingRangeError,
} from "./errors";

export interface OrderItemRow {
  id: number | string;
  qty: number;
  price: number | string;
  name?: string;
  presentation?: string;
}

export interface CustomerInput {
  identification_document_code?: string;
  identification?: string;
  dv?: string | null;
  legal_organization_code?: string;
  tribute_code?: string;
  responsibilities?: string[] | null;
  company?: string | null;
  trade_name?: string | null;
  names?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  country_code?: string;
  municipality_code?: string | null;
}

export interface PaymentInput {
  payment_form?: string;
  payment_method_code?: string;
  payment_reference?: string;
  /** Vencimiento (YYYY-MM-DD) para crédito (payment_form="2"). */
  payment_due_date?: string;
}

export interface GenerateInvoiceOptions {
  customer?: CustomerInput;
  payment?: PaymentInput;
}

export interface InvoiceRow {
  id: number;
  order_id: number;
  customer_id: number | null;
  customer_snapshot: string | null;
  reference_code: string;
  status: string;
  number: string | null;
  cufe: string | null;
  is_validated: number;
  validated_at: string | null;
  totals: string | null;
  links: string | null;
  error: string | null;
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateInvoiceResult {
  invoice: InvoiceRow;
  created: boolean;
  submitted: boolean;
  message: string;
}

/* ---------------------------------------------------------------------------
 * Helpers de validación fiscal
 * ------------------------------------------------------------------------- */

function parseOrderItems(raw: unknown): OrderItemRow[] {
  const items = typeof raw === "string" ? safeJsonParse<OrderItemRow[]>(raw, []) : raw;
  if (!Array.isArray(items) || items.length === 0) {
    throw new InvoicePayloadError("La orden no tiene ítems facturables");
  }
  for (const item of items) {
    const id = Number(item.id);
    const qty = Number(item.qty);
    const price = Number(item.price);
    if (!Number.isInteger(id) || id <= 0) {
      throw new InvoicePayloadError("La orden contiene un ítem sin producto válido");
    }
    if (!Number.isInteger(qty) || qty < 1) {
      throw new InvoicePayloadError(`Cantidad inválida en el ítem ${id}`);
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new InvoicePayloadError(`Precio inválido en el ítem ${id}: el precio histórico se toma de orders.items`);
    }
  }
  return items;
}

/** Valida y normaliza los datos fiscales del cliente (códigos de la skill). */
function normalizeCustomerInput(input: CustomerInput): CustomerInput {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Datos fiscales del cliente requeridos");
  }
  const docCode = input.identification_document_code?.trim();
  const identification = input.identification?.trim();
  const legal = input.legal_organization_code?.trim();

  if (!docCode) throw new ValidationError("identification_document_code es requerido (código DIAN, ej. 13 cédula, 31 NIT)");
  if (!identification) throw new ValidationError("identification es requerido (sin dígito de verificación)");
  if (!legal || (legal !== "1" && legal !== "2")) {
    throw new ValidationError("legal_organization_code debe ser 1 (jurídica) o 2 (natural)");
  }
  if (legal === "1" && !input.company?.trim()) {
    throw new ValidationError("Para persona jurídica se requiere company");
  }
  if (legal === "2" && !input.names?.trim()) {
    throw new ValidationError("Para persona natural se requiere names");
  }

  const responsibilities = Array.isArray(input.responsibilities)
    ? input.responsibilities.map((r) => String(r).trim()).filter(Boolean)
    : [];

  return {
    identification_document_code: docCode,
    identification: String(identification).replace(/\s+/g, ""),
    dv: input.dv?.trim() || null,
    legal_organization_code: legal,
    tribute_code: input.tribute_code?.trim() || "ZZ",
    responsibilities,
    company: input.company?.trim() || null,
    trade_name: input.trade_name?.trim() || null,
    names: input.names?.trim() || null,
    address: input.address?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    country_code: input.country_code?.trim() || "CO",
    municipality_code: input.municipality_code?.trim() || null,
  };
}

/* ---------------------------------------------------------------------------
 * Resoluciones (customer, payment, numbering range)
 * ------------------------------------------------------------------------- */

async function findOrCreateCustomer(input: CustomerInput): Promise<number> {
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM customers WHERE identification_document_code = ? AND identification = ?`,
    [input.identification_document_code, input.identification]
  );
  if (existing) return existing.id;

  const result = await query<{ insertId: number }>(
    `INSERT INTO customers
       (identification_document_code, identification, dv, legal_organization_code,
        tribute_code, responsibilities, company, trade_name, names, address,
        email, phone, country_code, municipality_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.identification_document_code,
      input.identification,
      input.dv ?? null,
      input.legal_organization_code,
      input.tribute_code ?? "ZZ",
      input.responsibilities && input.responsibilities.length > 0
        ? JSON.stringify(input.responsibilities)
        : null,
      input.company ?? null,
      input.trade_name ?? null,
      input.names ?? null,
      input.address ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.country_code ?? "CO",
      input.municipality_code ?? null,
    ]
  );
  return result.insertId;
}

async function resolveCustomer(
  order: { customer_id: number | null },
  options: GenerateInvoiceOptions
): Promise<{ customer: InvoiceCustomerSeed; customerId: number | null }> {
  if (order.customer_id) {
    const existing = await queryOne<any>(
      `SELECT identification_document_code, identification, dv, legal_organization_code,
              tribute_code, responsibilities, company, trade_name, names, address,
              email, phone, country_code, municipality_code
       FROM customers WHERE id = ?`,
      [order.customer_id]
    );
    if (existing) {
      return {
        customer: {
          identification_document_code: existing.identification_document_code,
          identification: existing.identification,
          dv: existing.dv,
          legal_organization_code: existing.legal_organization_code,
          tribute_code: existing.tribute_code,
          responsibilities: parseResponsibilities(existing.responsibilities),
          company: existing.company,
          trade_name: existing.trade_name,
          names: existing.names,
          address: existing.address,
          email: existing.email,
          phone: existing.phone,
          country_code: existing.country_code,
          municipality_code: existing.municipality_code,
        },
        customerId: order.customer_id,
      };
    }
  }

  if (!options.customer) {
    throw new InvoicePayloadError(
      "Se requieren datos fiscales del cliente para facturar. Pasa customer en el body."
    );
  }

  const normalized = normalizeCustomerInput(options.customer);
  const customerId = await findOrCreateCustomer(normalized);
  const persisted = await queryOne<any>(
    `SELECT id, identification_document_code, identification, dv, legal_organization_code,
            tribute_code, responsibilities, company, trade_name, names, address,
            email, phone, country_code, municipality_code
     FROM customers WHERE id = ?`,
    [customerId]
  );
  if (!persisted) {
    throw new InvoicePayloadError("No se pudo persistir el cliente fiscal");
  }
  return {
    customer: {
      identification_document_code: persisted.identification_document_code,
      identification: persisted.identification,
      dv: persisted.dv,
      legal_organization_code: persisted.legal_organization_code,
      tribute_code: persisted.tribute_code,
      responsibilities: parseResponsibilities(persisted.responsibilities),
      company: persisted.company,
      trade_name: persisted.trade_name,
      names: persisted.names,
      address: persisted.address,
      email: persisted.email,
      phone: persisted.phone,
      country_code: persisted.country_code,
      municipality_code: persisted.municipality_code,
    },
    customerId,
  };
}

function parseResponsibilities(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    const parsed = safeJsonParse<string[]>(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

async function resolveNumberingRangeId(): Promise<number | undefined> {
  const configured = process.env.FACTUS_NUMBERING_RANGE_ID;
  if (configured && configured.trim() !== "") {
    const id = Number(configured.trim());
    if (!Number.isInteger(id) || id <= 0) {
      throw new FactusConfigError("FACTUS_NUMBERING_RANGE_ID configurado es inválido");
    }
    return id;
  }

  const ranges = await getNumberingRanges();
  if (ranges.length === 0) {
    throw new FactusNumberingRangeError("No hay rangos de numeración disponibles en Factus");
  }
  if (ranges.length > 1) {
    throw new FactusNumberingRangeError(
      "Hay varios rangos de numeración activos: configura FACTUS_NUMBERING_RANGE_ID para seleccionar uno"
    );
  }
  return ranges[0].id;
}

function normalizeDueDateValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    return value.trim().slice(0, 10);
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    // mysql2 entrega columnas DATE como Date a medianoche UTC: getters UTC
    // preservan el calendario "YYYY-MM-DD" sin corrimientos de zona horaria.
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

function resolvePayment(
  order: {
    total: number | string;
    payment_form: string | null;
    payment_method_code: string | null;
    payment_reference: string | null;
    payment_due_date: unknown;
  },
  options: GenerateInvoiceOptions
): { paymentForm: string; paymentMethodCode: string; referenceCode?: string; dueDate?: string } {
  const provided = options.payment || {};
  // Precedencia: datos capturados en la orden > request. NO se inventan defaults.
  const paymentForm = order.payment_form || provided.payment_form || "";
  const paymentMethodCode = order.payment_method_code || provided.payment_method_code || "";
  const referenceCode = order.payment_reference || provided.payment_reference || undefined;
  const rawDueDate = normalizeDueDateValue(order.payment_due_date) || normalizeDueDateValue(provided.payment_due_date) || null;

  if (!paymentForm) {
    throw new ValidationError(
      "La venta necesita datos de pago antes de facturarse: se requieren payment_form y payment_method_code en la orden o en el request."
    );
  }
  if (paymentForm !== "1" && paymentForm !== "2") {
    throw new ValidationError("payment_form inválido: use 1 (contado) o 2 (crédito)");
  }
  if (!paymentMethodCode) {
    throw new ValidationError(
      "payment_method_code es requerido: la venta necesita un medio de pago antes de facturarse."
    );
  }

  // Crédito (payment_form="2"): Factus exige payment_details.due_date.
  let dueDate: string | undefined;
  if (paymentForm === "2") {
    if (!rawDueDate) {
      throw new ValidationError(
        "La venta es a crédito (payment_form=2) y requiere payment_due_date (YYYY-MM-DD) antes de facturarse."
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDueDate)) {
      throw new ValidationError("payment_due_date debe tener formato YYYY-MM-DD");
    }
    dueDate = rawDueDate;
  }

  return { paymentForm, paymentMethodCode, referenceCode, dueDate };
}

function toSafeInvoiceError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { phase: "factus", name: error.name, message: error.message.slice(0, 300) };
  }
  return { phase: "factus", name: "FactusError", message: "Error desconocido" };
}

/* ---------------------------------------------------------------------------
 * Customer: API pública (usada también por app/api/admin/customers)
 * ------------------------------------------------------------------------- */

/** Valida, crea o busca un cliente fiscal. Devuelve su id y el seed normalizado. */
export async function saveFiscalCustomer(input: CustomerInput): Promise<{ id: number; seed: InvoiceCustomerSeed }> {
  const normalized = normalizeCustomerInput(input);
  const customerId = await findOrCreateCustomer(normalized);
  const persisted = await queryOne<any>(
    `SELECT identification_document_code, identification, dv, legal_organization_code,
            tribute_code, responsibilities, company, trade_name, names, address,
            email, phone, country_code, municipality_code
     FROM customers WHERE id = ?`,
    [customerId]
  );
  if (!persisted) {
    throw new InvoicePayloadError("No se pudo persistir el cliente fiscal");
  }
  return {
    id: customerId,
    seed: {
      identification_document_code: persisted.identification_document_code,
      identification: persisted.identification,
      dv: persisted.dv,
      legal_organization_code: persisted.legal_organization_code,
      tribute_code: persisted.tribute_code,
      responsibilities: parseResponsibilities(persisted.responsibilities),
      company: persisted.company,
      trade_name: persisted.trade_name,
      names: persisted.names,
      address: persisted.address,
      email: persisted.email,
      phone: persisted.phone,
      country_code: persisted.country_code,
      municipality_code: persisted.municipality_code,
    },
  };
}

/* ---------------------------------------------------------------------------
 * Orquestador principal
 * ------------------------------------------------------------------------- */

export async function generateInvoice(
  orderId: number,
  options: GenerateInvoiceOptions = {}
): Promise<GenerateInvoiceResult> {
  const order = await queryOne<any>(
    `SELECT id, total, items, customer_id, payment_form, payment_method_code, payment_reference, payment_due_date
     FROM orders WHERE id = ?`,
    [orderId]
  );
  if (!order) {
    throw new NotFoundError(`Orden ${orderId} no encontrada`);
  }

  const orderItems = parseOrderItems(order.items);
  const productIds = [...new Set(orderItems.map((i) => Number(i.id)))];

  const products = await queryMany<any>(
    `SELECT id, name, code_reference, unit_measure_code, standard_code, tax_code, tax_rate
     FROM products WHERE id IN (${productIds.map(() => "?").join(",")})`,
    productIds
  );
  const productMap = new Map(products.map((p) => [p.id, p]));

  const fiscalIssues: string[] = [];
  for (const item of orderItems) {
    const product = productMap.get(Number(item.id));
    if (!product) {
      fiscalIssues.push(`Producto ${item.id} no existe`);
      continue;
    }
    if (product.tax_rate === null || product.tax_rate === undefined || product.tax_rate === "") {
      fiscalIssues.push(`${product.name}: tax_rate NULL (producto sin configuración fiscal)`);
    }
    if (!product.code_reference) {
      fiscalIssues.push(`${product.name}: code_reference sin configurar`);
    }
    if (!product.unit_measure_code) {
      fiscalIssues.push(`${product.name}: unit_measure_code sin configurar`);
    }
    if (!product.standard_code) {
      fiscalIssues.push(`${product.name}: standard_code sin configurar`);
    }
  }
  if (fiscalIssues.length > 0) {
    throw new InvoicePayloadError("Configuración fiscal incompleta: " + fiscalIssues.join("; "));
  }

  const items: InvoiceItemSeed[] = orderItems.map((item) => {
    const product = productMap.get(Number(item.id))!;
    // El precio SIEMPRE proviene de orders.items[].price (snapshot histórico).
    return {
      codeReference: product.code_reference,
      name: product.name,
      quantity: Number(item.qty),
      unitPriceCents: toCents(item.price),
      taxRate: Number(product.tax_rate),
      taxCode: product.tax_code || "01",
      unitMeasureCode: product.unit_measure_code,
      standardCode: product.standard_code,
    };
  });

  const payment = resolvePayment(order, options);
  const { customer: customerSeed, customerId } = await resolveCustomer(order, options);
  const numberingRangeId = await resolveNumberingRangeId();
  const sendEmail = process.env.FACTUS_SEND_EMAIL !== "false";

  const referenceCode = `FACT-${order.id}`;

  // --- Invoice local: búsqueda / creación (idempotencia) ---
  let invoice = await queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE order_id = ?`, [order.id]);
  let created = false;

  if (!invoice) {
    try {
      const result = await query<{ insertId: number }>(
        `INSERT INTO invoices (order_id, customer_id, reference_code, status)
         VALUES (?, ?, ?, 'pending')`,
        [order.id, order.customer_id, referenceCode]
      );
      invoice = await queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = ?`, [result.insertId]);
      created = true;
    } catch (insertError: any) {
      if (insertError?.code !== "ER_DUP_ENTRY") throw insertError;
      invoice = await queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE order_id = ?`, [order.id]);
    }
  }

  if (!invoice) {
    throw new InvoicePayloadError("No se pudo crear la factura local");
  }

  if (invoice.status === "validated") {
    return { invoice, created, submitted: false, message: `La factura ${invoice.reference_code} ya está validada` };
  }
  if (invoice.status === "processing") {
    return {
      invoice,
      created,
      submitted: false,
      message: `La factura ${invoice.reference_code} quedó en procesamiento; no se reenvía para evitar duplicados. Requiere reconciliación (revisar en Factus).`,
    };
  }
  if (invoice.status === "cancelled") {
    throw new ConflictError(`La factura ${invoice.reference_code} está cancelada; no se reenvía automáticamente`);
  }

  // --- Construcción del payload (snapshot del cliente = lo EXACTO enviado) ---
  const payload = mapInvoicePayload({
    referenceCode,
    numberingRangeId,
    sendEmail,
    orderTotalCents: toCents(order.total),
    customer: customerSeed,
    payment,
    items,
  });

  const attempts = (invoice.attempts || 0) + 1;
  await query(
    `UPDATE invoices SET status = 'processing', customer_id = ?, customer_snapshot = ?,
            attempts = ?, last_attempt_at = NOW(), error = NULL
     WHERE id = ?`,
    [customerId ?? order.customer_id, JSON.stringify(payload.customer), attempts, invoice.id]
  );
  const refreshed = await queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = ?`, [invoice.id]);
  if (!refreshed) {
    throw new InvoicePayloadError("No se pudo recuperar la factura local");
  }
  invoice = refreshed;

  let factusResponse: FactusInvoiceResponse;
  try {
    factusResponse = await sendInvoiceToFactus(payload);
  } catch (error) {
    await query(
      `UPDATE invoices SET status = 'failed', attempts = ?, last_attempt_at = NOW(), error = ? WHERE id = ?`,
      [attempts, JSON.stringify(toSafeInvoiceError(error)), invoice.id]
    );
    throw error;
  }

  const d = factusResponse.data || (factusResponse as FactusInvoiceResponse);
  await query(
    `UPDATE invoices SET status = 'validated', number = ?, cufe = ?, is_validated = ?,
            validated_at = ?, totals = ?, links = ?, error = NULL
     WHERE id = ?`,
    [
      d.number ?? null,
      d.cufe ?? null,
      d.is_validated ? 1 : 0,
      d.validated_at ?? null,
      JSON.stringify(d.totals ?? null),
      JSON.stringify(d.links ?? null),
      invoice.id,
    ]
  );

  const updated = await queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = ?`, [invoice.id]);
  if (!updated) {
    throw new InvoicePayloadError("No se pudo recuperar la factura validada");
  }
  return {
    invoice: updated,
    created,
    submitted: true,
    message: `Factura ${updated.number || referenceCode} validada`,
  };
}