# Revisión final — Fase 3 (Integración Factus, SANDBOX)

> Documento de cierre de la Fase 3. Backend Factus implementado, corregido y revisado.
> Fase 4 = UI de facturación + prueba real contra Sandbox.

## Estado (18/ago/2026)

- **Fase 1** (commit `f4795e4`) y **Fase 2** implementadas (Fase 2 sin commitear aún).
- **Fase 3 corregida y cerrada**: se eliminó el default de pago, se corrigió OAuth a `password grant` (documentación oficial) y se agregaron tests de invariantes.
- `pnpm test:unit` → **99/99 passing** (8 archivos).
- `pnpm typecheck` → sin errores propios. Solo el error ajeno preexistente:
  `agy2-pprojects/pomodoro-timer/src/main.tsx` TS5097. NO modificar esa carpeta ni ocultarlo vía tsconfig.
- `pnpm build` → la app compila; el build solo falla en el type-check del archivo ajeno (problema preexistente).

## Contrato Factus (fuente de verdad)

- **Skill**: `.agents/skills/facturas-crear-y-validar/SKILL.md` (payload, campos, códigos, respuesta).
- **OAuth** (la skill solo dice `POST /oauth/token`; el detalle viene de la **documentación oficial** de Factus):
  - `POST {base}/oauth/token`, cuerpo **form-urlencoded** (`application/x-www-form-urlencoded`).
  - Parámetros: `grant_type=password`, `client_id`, `client_secret`, `username`, `password`.
  - Respuesta: `{ token_type, expires_in, access_token, refresh_token }`.
  - El token vive ÚNICAMENTE en memoria; se envía como `Authorization: Bearer {token}`; ante 401 se invalida, se obtiene uno nuevo y se reintenta UNA vez.

### Variables de entorno (SOLO en `.env`, nunca `NEXT_PUBLIC_*`)

| Variable | Uso |
|---|---|
| `FACTUS_BASE_URL` | `https://api-sandbox.factus.com.co` (sandbox) |
| `FACTUS_CLIENT_ID` | Credencial OAuth |
| `FACTUS_CLIENT_SECRET` | Credencial OAuth |
| `FACTUS_USERNAME` | Email de la cuenta Factus (OAuth password grant) |
| `FACTUS_PASSWORD` | Contraseña de la cuenta Factus (OAuth password grant) |
| `FACTUS_NUMBERING_RANGE_ID` | Rango obligatorio si hay más de uno activo |
| `FACTUS_SEND_EMAIL` | `"false"` desactiva el envío de correo al cliente |

## Reglas de negocio implementadas (invariantes)

- **Precio histórico**: la factura SIEMPRE usa `orders.items[].price`. `products` aporta solo fiscal:
  `code_reference`, `name`, `unit_measure_code`, `standard_code`, `tax_code`, `tax_rate`. Nunca `products.price`.
- **Reference code**: `reference_code = FACT-{orderId}`. Estable en creación, retry, `failed`, `processing` y `validated`.
  Nunca depende de `invoice.id`, timestamp ni UUID.
- **Idempotencia**: migración define `UNIQUE(order_id)` y `UNIQUE(reference_code)`. El service busca por `order_id`;
  si no existe inserta (con fallback `ER_DUP_ENTRY`); `validated` no reenvía; `failed` puede reintentar con el mismo reference; `cancelled` lanza `ConflictError`.
- **Pago obligatorio**: NO se inventan `payment_form`/`payment_method_code`. Si faltan en la orden y en el request →
  `ValidationError` claro. Precedencia: `order.payment_*` > request.
- **Customer snapshot**: `invoices.customer_snapshot` = objeto `customer` exacto enviado a Factus (seed → mapper → payload → snapshot).
- **IVA**: `tax_rate NULL` = producto no configurado → bloquea la factura. `tax_rate 0` = excluido (`is_excluded: true`).
  `tax_rate 19` = IVA 19%. Todo el cálculo usa `lib/factus/money.ts` (centavos BigInt); `base + IVA === precio final`.
- **Numbering range**: si existe `FACTUS_NUMBERING_RANGE_ID` se usa; si no, se consulta `GET /v2/numbering-ranges`:
  0 rangos → error; 1 solo rango → se usa; varios → error pidiendo configuración. Nunca se elige arbitrariamente.
- **Estados de invoice**: `pending → processing → validated | failed | cancelled`.
  - `processing`: NO se reenvía automáticamente (evita duplicados); se devuelve la invoice existente y se indica que requiere reconciliación.
    La skill no define endpoint de estado/consulta, por lo que la reconciliación es manual contra Factus.
- **Stock/orden**: la generación de factura NO modifica stock, NO crea `inventory_movements`, NO toca `products.stock`,
  NO cambia `orders.status` ni `orders.customer_id`.

## Seguridad

- Credenciales salen exclusivamente de `process.env` (nunca `NEXT_PUBLIC_FACTUS_*`, ni hardcodeadas).
- `access_token` solo en memoria; nunca en logs ni en respuestas API.
- No hay `console.*` en el cliente Factus; los errores Factus se sanitizan (`toSafeInvoiceError`, mensaje truncado).
- Rutas admin con `requireApiAuth` + `handleApiError`.

## Archivos de Fase 3

| Archivo | Rol |
|---|---|
| `lib/factus/errors.ts` | Errores tipados (extienden `AppError`) |
| `lib/factus/types.ts` | Contrato HTTP de Factus |
| `lib/factus/money.ts` | Dinero en centavos BigInt (compartido con Fase 2) |
| `lib/factus/factus.client.ts` | Cliente HTTP: OAuth password grant, `createInvoice`, `getNumberingRanges`, 401→reintento único |
| `lib/factus/invoice.mapper.ts` | Mapper puro → payload de la skill; IVA separado desde `orders.items[].price` |
| `lib/factus/invoice.service.ts` | Orquestador: order → fiscal config → payment → customer → idempotencia → Factus → persistencia |
| `app/api/admin/invoices/route.ts` | POST generar + GET listar |
| `app/api/admin/invoices/[orderId]/route.ts` | POST reintentar + GET consultar |
| `app/api/admin/customers/route.ts` | POST crear/buscar + GET listar/buscar |
| `tests/unit/factus/*.test.ts` | Tests de client, mapper, service y money (mocks fetch/db) |

## Para probar contra sandbox

Requiere en `.env` (real, no commitear): `FACTUS_BASE_URL`, `FACTUS_CLIENT_ID`, `FACTUS_CLIENT_SECRET`,
`FACTUS_USERNAME`, `FACTUS_PASSWORD`, `FACTUS_NUMBERING_RANGE_ID` (o tener 1 solo rango activo), `FACTUS_SEND_EMAIL`.
Además: configurar fiscal a los productos (`code_reference`, `tax_rate` 0/19; `tax_code` default "01"=IVA si NULL) y que la venta tenga `payment_form`/`payment_method_code`.
Flujo: `POST /api/admin/invoices` con `{ orderId, customer: {...}, payment: { payment_form, payment_method_code } }`.

## Limitaciones actuales

- No existe endpoint de estado/reconciliación en la skill → una invoice en `processing` queda para reconciliación manual contra Factus.
- Ventas históricas sin `payment_form`/`payment_method_code` quedan bloqueadas hasta capturar el pago (decisión: no inventar datos).
- Sin UI de facturación ni CRUD visual de clientes (Fase 4).

## NO hacer todavía (Fase 4)

UI de facturación, página `/admin/facturas`, `admin-layout-client.tsx`, rediseñar ventas, pagos online, `order_items`,
migrar ventas, producción. Commit/push solo con autorización explícita.
