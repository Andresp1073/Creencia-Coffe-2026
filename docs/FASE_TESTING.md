# Fase de Testing - Cafe Creencia

## Estrategia de Pruebas

### Tipos de Pruebas Implementadas

1. **Pruebas Unitarias (Vitest)**
   - Utils: formatCOP, cn
   - Auth: session functions

2. **Pruebas E2E (Playwright)**
   - Público: homepage, catálogo, producto
   - Auth: login, logout, protección de rutas
   - Admin: navegación entre secciones

3. **Integración CI/CD (GitHub Actions)**
   - Lint y typecheck
   - Coverage con umbrales
   - Build
   - E2E tests

---

## Herramientas Usadas

- **Vitest** - Test runner para unit tests
- **React Testing Library** - Testing de componentes React
- **Playwright** - E2E testing
- **MSW** - Mocking de APIs (preparado)
- **GitHub Actions** - CI/CD

---

## Cómo Ejecutar las Pruebas

### Pruebas Unitarias
```bash
pnpm test:unit
# or
pnpm test
```

### Pruebas con Coverage
```bash
pnpm test:coverage
```

### Pruebas E2E
```bash
pnpm test:e2e
```

### Suite Completa (CI)
```bash
pnpm test:ci
```

---

## Estructura de Tests

```
tests/
├── unit/
│   ├── auth/
│   │   └── session.test.ts
│   ├── utils/
│   │   ├── cn.test.ts
│   │   └── formatCOP.test.ts
│   └── validators/
├── api/
├── e2e/
│   ├── admin.spec.ts
│   ├── auth.spec.ts
│   └── public-site.spec.ts
├── fixtures/
│   ├── products.ts
│   ├── sales.ts
│   └── users.ts
└── setup/
    └── vitest.setup.ts
```

---

## Configuración de Coverage

Umbrales configurados en `vitest.config.ts`:
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

---

## Base de Datos de Testing

Para testing se usa la base de datos `cafe_creencia_test`.

Variables de entorno en `.env.test.local`:
- DB_NAME=cafe_creencia_test
- JWT_SECRET=test-secret-key
- RESEND_API_KEY=re_test_...

**Nota:** No usar la base de datos de producción.

---

## Mocking

- **Jose (JWT)**: Mocks en vitest.setup.ts
- **DB**: Mocks en vitest.setup.ts
- **Emails**: No se envían realmente (Resend mock)

---

## Reglas de Seguridad en Tests

✓ No usar credenciales reales
✓ No usar API keys de producción
✓ No enviar correos reales
✓ No guardar passwords en logs
✓ .env.test.local excluido de git

---

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `pnpm test` | Ejecutar todos los tests |
| `pnpm test:unit` | Solo unit tests |
| `pnpm test:api` | Solo API tests |
| `pnpm test:e2e` | Solo E2E tests |
| `pnpm test:coverage` | Con coverage report |
| `pnpm test:ci` | Suite completa para CI |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm build` | Build de producción |

---

## Ejecución Local de E2E

Para ejecutar E2E tests:
1. Asegurarse de que el servidor no esté corriendo en puerto 3000
2. Playwright inicie automáticamente el servidor con `pnpm dev`
3. Los tests usarán `http://localhost:3000`

---

## Notas Adicionales

- Los tests E2E requieren que el servidor esté corriendo o se iniciarán automáticamente
- Playwright está configurado para usar Chromium
- Screenshots y videos solo se guardan en fallos
- El CI bloquea el deploy si fallan las pruebas