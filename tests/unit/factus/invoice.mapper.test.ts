import { describe, expect, it } from "vitest";
import { mapInvoicePayload, InvoiceMappingInput } from "@/lib/factus/invoice.mapper";
import { InvoicePayloadError } from "@/lib/factus/errors";
import { toCents } from "@/lib/factus/money";

function baseInput(overrides: Partial<InvoiceMappingInput> = {}): InvoiceMappingInput {
  return {
    referenceCode: "FACT-42",
    numberingRangeId: 389,
    sendEmail: true,
    orderTotalCents: toCents(50000),
    customer: {
      identification_document_code: "13",
      identification: "123456789",
      legal_organization_code: "2",
      names: "Juan Pérez",
      email: "juan@email.com",
    },
    payment: { paymentForm: "1", paymentMethodCode: "10" },
    items: [
      {
        codeReference: "CAFE-500",
        name: "Café Tradicional 500g",
        quantity: 2,
        unitPriceCents: toCents(25000),
        taxRate: 19,
        taxCode: "01",
        unitMeasureCode: "94",
        standardCode: "999",
      },
    ],
    ...overrides,
  };
}

describe("invoice.mapper.mapInvoicePayload", () => {
  it("produce el payload según la skill (campos raíz)", () => {
    const payload = mapInvoicePayload(baseInput());

    expect(payload.reference_code).toBe("FACT-42");
    expect(payload.document).toBe("01");
    expect(payload.operation_type).toBe("10");
    expect(payload.numbering_range_id).toBe(389);
    expect(payload.send_email).toBe(true);
    expect(payload.cash_rounding_amount).toBe("0.00");
  });

  it("omite numbering_range_id cuando no se provee", () => {
    const payload = mapInvoicePayload(baseInput({ numberingRangeId: undefined }));
    expect(payload).not.toHaveProperty("numbering_range_id");
  });

  it("separa base e IVA: precio sin impuestos + tasa 19.00", () => {
    const payload = mapInvoicePayload(baseInput());
    const item = payload.items[0];

    // total 50000.00 IVA incluido => base por unidad 21008.40, tax 19%
    expect(item.code_reference).toBe("CAFE-500");
    expect(item.name).toBe("Café Tradicional 500g");
    expect(item.quantity).toBe("2.00");
    expect(item.price).toBe("21008.40");
    expect(item.taxes).toEqual([{ code: "01", rate: "19.00" }]);
    expect(item.unit_measure_code).toBe("94");
    expect(item.standard_code).toBe("999");
  });

  it("base + IVA por unidad === precio final (sin aritmética float)", () => {
    const payload = mapInvoicePayload(baseInput());
    const baseCents = toCents(payload.items[0].price);
    const finalUnitCents = toCents(25000);

    // La resta de money.ts garantiza base + IVA === precio final exacto.
    expect(baseCents + (finalUnitCents - baseCents)).toBe(finalUnitCents);
  });

  it("tax_rate 0 => excluido: precio final completo + is_excluded true", () => {
    const payload = mapInvoicePayload(
      baseInput({
        items: [
          {
            codeReference: "P-0",
            name: "Exento",
            quantity: 1,
            unitPriceCents: toCents(10000),
            taxRate: 0,
            taxCode: "01",
            unitMeasureCode: "94",
            standardCode: "999",
          },
        ],
        orderTotalCents: toCents(10000),
      })
    );

    const item = payload.items[0];
    expect(item.price).toBe("10000.00");
    expect(item.taxes).toEqual([{ code: "01", rate: "0.00", is_excluded: true }]);
  });

  it("tax_rate NULL => InvoicePayloadError", () => {
    expect(() =>
      mapInvoicePayload(
        baseInput({
          items: [
            {
              codeReference: "P-NULL",
              name: "Sin configurar",
              quantity: 1,
              unitPriceCents: toCents(10000),
              taxRate: null as unknown as number,
              taxCode: "01",
              unitMeasureCode: "94",
              standardCode: "999",
            },
          ],
        })
      )
    ).toThrow(InvoicePayloadError);
  });

  it("usa el precio histórico (orders.items[].price) enviado en centavos", () => {
    const payload = mapInvoicePayload(
      baseInput({
        items: [
          {
            codeReference: "CAFE-250",
            name: "Café 250g",
            quantity: 3,
            unitPriceCents: toCents(13000), // snapshot histórico, no products.price
            taxRate: 19,
            taxCode: "01",
            unitMeasureCode: "94",
            standardCode: "999",
          },
        ],
        orderTotalCents: toCents(39000),
      })
    );

    expect(payload.items[0].quantity).toBe("3.00");
    expect(payload.items[0].price).toBe("10924.37");
  });

  it("cliente natural: names obligatorio", () => {
    const payload = mapInvoicePayload(baseInput());
    expect(payload.customer.identification_document_code).toBe("13");
    expect(payload.customer.identification).toBe("123456789");
    expect(payload.customer.legal_organization_code).toBe("2");
    expect(payload.customer.names).toBe("Juan Pérez");
    expect(payload.customer.tribute_code).toBe("ZZ");
    expect(payload.customer.responsibilities).toEqual(["R-99-PN"]);
    expect(payload.customer.country_code).toBe("CO");
  });

  it("cliente jurídico: company + dv, names ausente", () => {
    const payload = mapInvoicePayload(
      baseInput({
        customer: {
          identification_document_code: "31",
          identification: "901234567",
          dv: "5",
          legal_organization_code: "1",
          company: "Alan Company SAS",
          trade_name: "Alan",
        },
      })
    );

    expect(payload.customer.company).toBe("Alan Company SAS");
    expect(payload.customer.dv).toBe("5");
    expect(payload.customer).not.toHaveProperty("names");
  });

  it("rechaza cliente natural sin names", () => {
    expect(() =>
      mapInvoicePayload(
        baseInput({
          customer: {
            identification_document_code: "13",
            identification: "123",
            legal_organization_code: "2",
            names: "",
          },
        })
      )
    ).toThrow(InvoicePayloadError);
  });

  it("rechaza cliente jurídico sin company", () => {
    expect(() =>
      mapInvoicePayload(
        baseInput({
          customer: {
            identification_document_code: "31",
            identification: "901234567",
            legal_organization_code: "1",
            company: "",
          },
        })
      )
    ).toThrow(InvoicePayloadError);
  });

  it("payment_details con amount = total de la orden", () => {
    const payload = mapInvoicePayload(baseInput());
    expect(payload.payment_details).toEqual([
      { payment_form: "1", payment_method_code: "10", amount: "50000.00" },
    ]);
  });

  it("payment_details con referencia de pago opcional", () => {
    const payload = mapInvoicePayload(
      baseInput({ payment: { paymentForm: "1", paymentMethodCode: "42", referenceCode: "pago-1" } })
    );
    expect(payload.payment_details[0].reference_code).toBe("pago-1");
  });

  it("cash_rounding_amount fijo en 0.00 (sin redondeo)", () => {
    expect(mapInvoicePayload(baseInput()).cash_rounding_amount).toBe("0.00");
  });
});