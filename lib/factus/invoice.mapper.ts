import { divideRound, splitTaxIncluded, toMoneyString } from "./money";
import { InvoicePayloadError } from "./errors";

/**
 * Mapper puro: transforma datos ya validados (order, customer, payment,
 * configuración fiscal, numbering range) en el payload EXACTO de Factus.
 *
 * Prohibiciones:
 *  - NO hace SQL.
 *  - NO llama fetch.
 *  - NO obtiene tokens.
 *  - NO modifica la BD.
 */

export interface InvoiceCustomerSeed {
  identification_document_code: string;
  identification: string;
  dv?: string | null;
  legal_organization_code: string;
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

export interface InvoicePaymentSeed {
  paymentForm: string;
  paymentMethodCode: string;
  referenceCode?: string | null;
  /** Vencimiento YYYY-MM-DD, requerido por Factus cuando payment_form = "2" (crédito). */
  dueDate?: string | null;
}

export interface InvoiceItemSeed {
  codeReference: string;
  name: string;
  quantity: number;
  /** Precio unitario final con IVA incluido (orders.items[].price), en centavos. */
  unitPriceCents: bigint;
  taxRate: number;
  taxCode: string;
  unitMeasureCode: string;
  standardCode: string;
}

export interface InvoiceMappingInput {
  referenceCode: string;
  numberingRangeId?: number;
  sendEmail: boolean;
  orderTotalCents: bigint;
  customer: InvoiceCustomerSeed;
  payment: InvoicePaymentSeed;
  items: InvoiceItemSeed[];
}

function formatRate(rate: number): string {
  return (Math.round(rate * 100) / 100).toFixed(2);
}

/**
 * Total que Factus calcula para una línea: base = price × qty y el IVA se
 * aplica sobre la base de la línea (no prorrateado por unidad). Factus redondea
 * el impuesto a centavos, por eso totales con qty > 1 pueden desviarse 1 centavo
 * del precio con IVA incluido (base + IVA unitarios × qty). Por ejemplo
 * 4 × 7000 c/IVA 19% => base 23529.40, IVA 23529.40 × 0.19 = 4470.586 → 4470.59,
 * total línea 27999.99 (en vez de 28000.00).
 */
function computeFactusLineTotalCents(seed: InvoiceItemSeed): bigint {
  const unitSplit = splitTaxIncluded(seed.unitPriceCents, seed.taxRate);
  if (!unitSplit) {
    throw new InvoicePayloadError(
      `tax rate inválido para ${seed.codeReference}`,
    );
  }
  const baseLineCents = unitSplit.base * BigInt(seed.quantity);
  if (seed.taxRate === 0) return baseLineCents;
  const rateScaled = BigInt(Math.round(seed.taxRate * 100));
  const taxLineCents = divideRound(baseLineCents * rateScaled, 10000n);
  return baseLineCents + taxLineCents;
}

function assertCustomerFiscalData(seed: InvoiceCustomerSeed): void {
  if (!seed.identification_document_code || !seed.identification) {
    throw new InvoicePayloadError(
      "Datos fiscales del cliente incompletos: identification_document_code e identification son requeridos",
    );
  }
  if (
    seed.legal_organization_code !== "1" &&
    seed.legal_organization_code !== "2"
  ) {
    throw new InvoicePayloadError(
      "legal_organization_code inválido: use 1 (jurídica) o 2 (natural)",
    );
  }
  if (seed.legal_organization_code === "1" && !seed.company) {
    throw new InvoicePayloadError(
      "Para persona jurídica (legal_organization_code=1) se requiere company",
    );
  }
  if (seed.legal_organization_code === "2" && !seed.names) {
    throw new InvoicePayloadError(
      "Para persona natural (legal_organization_code=2) se requiere names",
    );
  }
}

function mapCustomer(seed: InvoiceCustomerSeed) {
  assertCustomerFiscalData(seed);

  return {
    identification_document_code: seed.identification_document_code,
    identification: seed.identification,
    legal_organization_code: seed.legal_organization_code,
    tribute_code: seed.tribute_code || "ZZ",
    responsibilities:
      Array.isArray(seed.responsibilities) && seed.responsibilities.length > 0
        ? seed.responsibilities
        : ["R-99-PN"],
    ...(seed.dv ? { dv: seed.dv } : {}),
    ...(seed.company ? { company: seed.company } : {}),
    ...(seed.trade_name ? { trade_name: seed.trade_name } : {}),
    ...(seed.names ? { names: seed.names } : {}),
    ...(seed.address ? { address: seed.address } : {}),
    ...(seed.email ? { email: seed.email } : {}),
    ...(seed.phone ? { phone: seed.phone } : {}),
    ...(seed.country_code
      ? { country_code: seed.country_code }
      : { country_code: "CO" }),
    ...(seed.municipality_code
      ? { municipality_code: seed.municipality_code }
      : {}),
  };
}

function mapItem(seed: InvoiceItemSeed) {
  if (!Number.isInteger(seed.quantity) || seed.quantity < 1) {
    throw new InvoicePayloadError(
      `Cantidad inválida para ${seed.codeReference}`,
    );
  }

  const unitSplit = splitTaxIncluded(seed.unitPriceCents, seed.taxRate);
  if (!unitSplit) {
    // tax_rate inválido (no numérico o negativo); el service ya bloquea NULL antes.
    throw new InvoicePayloadError(
      `tax rate inválido para ${seed.codeReference}`,
    );
  }

  const taxes = [
    {
      code: seed.taxCode || "01",
      rate: formatRate(seed.taxRate),
      ...(seed.taxRate === 0 ? { is_excluded: true } : {}),
    },
  ];

  return {
    code_reference: seed.codeReference,
    name: seed.name,
    quantity: `${seed.quantity}.00`,
    discount_rate: "0.00",
    price: toMoneyString(unitSplit.base),
    unit_measure_code: seed.unitMeasureCode,
    standard_code: seed.standardCode,
    taxes,
  };
}

function mapPayments(input: InvoiceMappingInput) {
  if (!input.payment.paymentForm || !input.payment.paymentMethodCode) {
    throw new InvoicePayloadError("payment_details incompletos");
  }
  return [
    {
      payment_form: input.payment.paymentForm,
      payment_method_code: input.payment.paymentMethodCode,
      amount: toMoneyString(input.orderTotalCents),
      ...(input.payment.referenceCode
        ? { reference_code: input.payment.referenceCode }
        : {}),
      ...(input.payment.dueDate ? { due_date: input.payment.dueDate } : {}),
    },
  ];
}

export function mapInvoicePayload(input: InvoiceMappingInput) {
  if (!input.referenceCode) {
    throw new InvoicePayloadError("reference_code requerido");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new InvoicePayloadError("items requeridos");
  }

  // Total que Factus sumará por líneas (base + IVA sobre la línea, redondeado).
  const factusTotalCents = input.items.reduce(
    (acc, item) => acc + computeFactusLineTotalCents(item),
    0n,
  );
  // Diferencia de redondeo entre lo cobrado (order.total) y el total por líneas.
  const cashRoundingCents = input.orderTotalCents - factusTotalCents;

  return {
    reference_code: input.referenceCode,
    document: "01",
    ...(input.numberingRangeId
      ? { numbering_range_id: input.numberingRangeId }
      : {}),
    operation_type: "10",
    send_email: input.sendEmail,
    cash_rounding_amount: toMoneyString(cashRoundingCents),
    payment_details: mapPayments(input),
    customer: mapCustomer(input.customer),
    items: input.items.map(mapItem),
  };
}
