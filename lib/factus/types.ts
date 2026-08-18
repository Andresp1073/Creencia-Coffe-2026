/**
 * Tipos del contrato HTTP de Factus (factura electrónica estándar).
 *
 * Nombres de campos, códigos y estructura siguen exactamente:
 *   .agents/skills/facturas-crear-y-validar/SKILL.md
 *
 * NO inventar campos fuera de la skill.
 */

export interface FactusTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  [key: string]: unknown;
}

export interface FactusNumberingRange {
  id: number;
  name?: string;
  prefix?: string;
  from?: number;
  to?: number;
  resolution?: string;
  start_date?: string;
  end_date?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface FactusPaymentDetail {
  payment_form: string;
  payment_method_code: string;
  reference_code?: string;
  amount: string;
  due_date?: string;
}

export interface FactusCustomer {
  identification_document_code: string;
  identification: string;
  dv?: string;
  legal_organization_code: string;
  tribute_code?: string;
  responsibilities?: string[];
  company?: string;
  trade_name?: string;
  names?: string;
  address?: string;
  email?: string;
  phone?: string;
  country_code?: string;
  municipality_code?: string;
}

export interface FactusItemTax {
  code: string;
  rate: string;
  is_excluded?: boolean;
}

export interface FactusWithholdingTax {
  code: string;
  rate: string;
}

export interface FactusInvoiceItem {
  code_reference: string;
  name: string;
  quantity: string;
  discount_rate?: string;
  discount_amount?: string;
  price: string;
  unit_measure_code: string;
  standard_code: string;
  note?: string;
  taxes: FactusItemTax[];
  withholding_taxes?: FactusWithholdingTax[];
}

export interface FactusAllowanceCharge {
  concept_type: string;
  is_surcharge: boolean;
  reason: string;
  base_amount: string;
  amount: string;
}

export interface FactusInvoicePayload {
  reference_code: string;
  document: string;
  numbering_range_id?: number;
  operation_type: string;
  send_email: boolean;
  observation?: string;
  created_time?: string;
  cash_rounding_amount: string;
  payment_details: FactusPaymentDetail[];
  customer: FactusCustomer;
  items: FactusInvoiceItem[];
  allowance_charges?: FactusAllowanceCharge[];
}

export interface FactusInvoiceTotals {
  prepayment_amount?: string;
  gross_amount?: string;
  taxable_amount?: string;
  tax_amount?: string;
  surcharge_amount?: string;
  total?: string;
}

export interface FactusInvoiceResponse {
  status?: string;
  message?: string;
  data: {
    reference_code?: string;
    number?: string;
    document_type?: { code: string; name: string };
    operation_type?: { code: string; name: string };
    is_validated: boolean;
    validated_at?: string | null;
    errors?: Record<string, unknown>;
    cufe?: string;
    links?: { qr?: string; public_url?: string };
    totals?: FactusInvoiceTotals;
    customer?: FactusCustomer;
    items?: FactusInvoiceItem[];
    numbering_range?: unknown;
  };
}