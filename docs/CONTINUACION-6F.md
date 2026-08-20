# Estado del proyecto para continuar (guardado el 2026-08-18)

Este archivo es un snapshot de contexto para retomar el trabajo en una sesión nueva.
Pégalo como prompt inicial o úsalo como referencia junto con el prompt de la Fase 6F.

## Contexto general del proyecto
- Proyecto: **Café Creencia** — POS / panel de administración en **Next.js 14.2.5** (App Router, TypeScript, Tailwind), base de datos MySQL vía `@/lib/db`.
- Objetivo del trabajo actual: integración de **facturación electrónica colombiana con la API de Factus** (endpoints `/v2/bills/validate`, `/v2/numbering-ranges`, OAuth password grant), trabajada por **fases** (6A, 6B, 6C, 6D, 6E terminadas; falta **6F**).
- Hay una skill útil: `.agents/skills/facturas-crear-y-validar/SKILL.md` (cómo componer customer, items, payment_details, cash_rounding_amount).
- Comandos de verificación:
  - `pnpm test:unit` → `vitest run tests/unit`
  - `pnpm typecheck` → `tsc --noEmit --skipLibCheck`
  - `pnpm build` → `next build --no-lint`
  - `vitest.config.ts`: jsdom, alias `@` → raíz, cobertura v8 (umbrales 70/70/60/70).

## Estado git (al cierre de 6E)
- Commit hecho: `30842df feat(factus): harden invoice requests and concurrency` (6B: F1 timeout + F2 reclamación atómica).
- **SIN commitear (working tree)**: 6C (F3 extracción de errores) + 6D (F4 semántica 429/404) + 6E (límite de reintentos) en:
  - `lib/factus/errors.ts` (26+)
  - `lib/factus/factus.client.ts` (98+)
  - `lib/factus/invoice.service.ts` (21+, solo 6E)
  - `tests/unit/factus/factus.client.test.ts` (339+)
  - `tests/unit/factus/invoice.service.test.ts` (71+)
- Otros archivos modificados/untracked en el árbol NO los tocar: `app/admin/*`, `components/ui/modal.tsx`, `components/ui/pagination.tsx`, `lib/admin/inventory.ts`, `lib/admin/sales.ts`, `lib/factus/invoice.mapper.ts`, `app/api/admin/sales/route.ts`, `package.json` (sileo), scripts (`check-db.js`, `fix-db.py`, `n8n-*`, `start-dev.ps1`, `test.json`), `agy2-pprojects/` (carpeta externa, tiene el TS5097).
- **NO se debe hacer commit salvo que se pida explícitamente.**

## Resumen de fases terminadas (Factus)
- **6B**: `fetchWithTimeout` con `FACTUS_HTTP_TIMEOUT_MS = 15_000` (exportada) y reclamación atómica `UPDATE ... WHERE id=? AND status IN ('pending','failed')` (solo la ejecución que pasa la fila a `processing` llama a Factus). Retry OAuth SOLO en 401. Commit `30842df`.
- **6C (F3)**: `safeErrorMessage` en `factus.client.ts` con `MAX_ERROR_LENGTH = 300`, `SENSITIVE_FIELD_RE`, `MESSAGE_KEY_RE`, `pushSafeMessage`, `extractFactusErrors` (depth ≤ 2), dedupe con Set, fallback "Factus respondió con HTTP {status}". 10 tests.
- **6D (F4)**: en `lib/factus/errors.ts`: `FactusRateLimitError` (429, code `FACTUS_RATE_LIMIT`, `retryAfter?: number` — solo entero positivo parseado por `parseRetryAfter`) y `FactusNotFoundError` (404, code `FACTUS_NOT_FOUND`). Ramas 429 y 404 en `handleApiResponse` antes del fallback; 401/403 y 400/422 intactos; 5xx → `FactusClientUnavailableError`. 11 tests en F4 (incluye 429/404 sin retry OAuth, retryAfter válido/inválido).
- **6E (hoy)**: 
  - `MAX_INVOICE_SEND_ATTEMPTS = 3` exportado en `lib/factus/invoice.service.ts` (junto a `GenerateInvoiceResult`).
  - Guardia en `generateInvoice` tras el check de `cancelled`: `if (invoice.status === "failed" && invoice.attempts >= MAX_INVOICE_SEND_ATTEMPTS) return { invoice, created, submitted: false, message: "...alcanzó el límite de 3 intentos; no se reenvía. Requiere revisión manual." }` — sin llamar a Factus ni hacer claim. Sin migración (reusa `invoices.attempts`).
  - 404 de `getNumberingRanges` se propaga como `FactusNotFoundError` (mismo objeto, sin convertir ni retry). Sin cambio de código necesario (ya propagaba); verificado con test de identidad `toBe(rangeError)`.
  - 6 tests nuevos: 5 en `invoice.service.test.ts` (describe "Fase 6E - propagación del 404 de numbering range y límite de reintentos") + 1 en `factus.client.test.ts` ("HTTP 404 NO hace retry de autenticación").
- **Resultado al cierre de 6E**: `pnpm test:unit` → **183/183** en 11 archivos. `typecheck` y `build` solo fallan por el error EXTERNO preexistente `agy2-pprojects/pomodoro-timer/src/main.tsx:3:17` (TS5097: import de `./App.tsx` sin `allowImportingTsExtensions`). Next muestra `✓ Compiled successfully` antes de eso. **Este TS5097 NO se toca.**

## Restricciones NO-NEGOCIABLES de las fases Factus
- NO modificar: cálculo de IVA, `lib/factus/money.ts`, `lib/factus/invoice.mapper.ts` (salvo 6F si lo pide y se indica), `order.ts`, presentation.ts, precios históricos, stock, `inventory_movements`, `orders.status`, OAuth password grant, la factura Sandbox existente, `.env`, `agy2-pprojects`, `tsconfig.json`.
- Seguridad: ningún mensaje/error puede exponer access_token, refresh_token, client_secret, password, username, Authorization, Cookie, headers completos ni body completo.
- **0 llamadas reales a Factus** en las fases; factura real Sandbox intacta: orden 150019 → `FACT-150019` → `SETP990015609`, rango 389, CUFE presente.
- NO commit salvo petición explícita. Al terminar cada fase: informe estructurado y DETENERSE (no avanzar a la siguiente fase).

## Estructura clave del código (para referencia rápida)
- `lib/factus/factus.client.ts`:
  - `getAccessToken()` (OAuth password grant, cache), `authenticatedRequest()` (retry 1x solo si 401 → `invalidateTokenCache`), `fetchWithTimeout` (AbortController + `FACTUS_HTTP_TIMEOUT_MS`), `handleApiResponse(response, kind)` con ramas 401/403, 429, 404, 400/422 (validate), fallback Unavailable; `parseRetryAfter`; `getNumberingRanges()`; `createInvoice(payload)` (POST `/v2/bills/validate`).
- `lib/factus/errors.ts`: `FactusConfigError`, `FactusAuthError`, `FactusRateLimitError` (retryAfter), `FactusNotFoundError`, `FactusClientUnavailableError`, `FactusValidationError`, `InvoicePayloadError`, `FactusNumberingRangeError` — todos extienden `AppError` (de `lib/security/safe-error.ts`).
- `lib/factus/invoice.service.ts`: `generateInvoice(orderId, options)` — orquesta: valida ítems/IVA/productos, `resolveCustomer`, `resolveNumberingRangeId` (env `FACTUS_NUMBERING_RANGE_ID` o `getNumberingRanges()`), `resolvePayment`, `mapInvoicePayload`, crea/lee invoice local (estados: pending → processing → validated|failed; processing/validated no reenvían; cancelled → `ConflictError`), claim atómico F2, catch → `failed` con `toSafeInvoiceError` (solo name+message ≤300), éxito → `validated` con `normalizeValidatedAt` (formato DD-MM-YYYY hh:mm:ss AM/PM).
- `app/api/admin/invoices/[orderId]/route.ts`: POST llama `generateInvoice`; errores vía `handleApiError` → `{ error: message, statusCode }`.
- Tests:
  - `tests/unit/factus/factus.client.test.ts`: describes getAccessToken, createInvoice, getNumberingRanges, F1 timeout (usa `flushMicrotasks()` y `abortError()` a nivel de módulo; patron `.then(() => null, (e) => e)` para evitar unhandled rejections), F3, F4.
  - `tests/unit/factus/invoice.service.test.ts`: mock de `factus.client` (`createInvoice`, `getNumberingRanges`, `invalidateTokenCache`, `getAccessToken`), `orderRow`, `productRows`, `customerRow`, `invoiceRow()`, `beforeEach` (mock default, `FACTUS_NUMBERING_RANGE_ID="389"`), `afterEach` limpia env, describe "F2 - reclamación atómica (race condition)" con `atomicMock()`, y ahora "Fase 6E ...".

## Próximo paso
- Mañana el usuario dará el **prompt de la Fase 6F**. Al recibirlo: leer este archivo como contexto, implementar 6F con las mismas reglas (test:unit, typecheck, build; informe; sin commit; detenerse).
