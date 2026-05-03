# Seguridad - Café Creencia

## Medidas Implementadas

### Protección contra XSS (Cross-Site Scripting)
- Sanitización de todos los inputs de usuario en APIs
- No se utiliza `dangerouslySetInnerHTML` sin sanitización
- Los datos de descripción, nombres y otros campos se limpian antes de guardarse
- Validación de longitud máxima para prevenir ataques de sobreflujo

### Protección contra SQL Injection
- Todas las queries usan consultas parametrizadas (`pool.execute` con params)
- Sanitización de IDs numéricos con validación de rango
- Sanitización de slugs para URLs
- No hay concatenación de strings en SQL

### Seguridad en Cookies
- `httpOnly: true` - No accesible desde JavaScript
- `sameSite: "lax"` - Protegido contra CSRF
- `secure: true` en producción
- Sin `maxAge` - Cookie de sesión que se elimina al cerrar el navegador

### Autenticación JWT
- Token con expiración de 24h
- Verificación en middleware para rutas /admin
- Verificación en todas las APIs /api/admin/*
- No se almacenan tokens en localStorage ni sessionStorage

### Rate Limiting
Implementado en:
- `/api/auth/login` - 5 intentos por IP en 15 minutos
- `/api/auth/forgot-password` - 3 intentos por IP en 1 hora
- `/api/auth/verify-otp` - 3 intentos por IP en 15 minutos
- `/api/auth/reset-password` - 3 intentos por IP en 1 hora

### Headers de Seguridad
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Protección de Rutas
- `/admin` requiere sesión válida
- `/api/admin/*` requiere autenticación JWT
- APIs públicas limitadas a rutas específicas

### Validación de Inputs
- Sanitización de strings (eliminación de caracteres peligrosos `<>`)
- Validación de IDs como números positivos
- Validación de emails
- Validación de longitud máxima

### Manejo de Errores
- No se exponen stack traces
- Mensajes de error genéricos y seguros
- Errores de base de datos no expuestos al cliente

## Pendientes / Mejoras Futuras

- [ ] Implementar auditoría de acciones (login, logout, CRUD)
- [ ] Agregar refresh tokens
- [ ] Implementar 2FA
- [ ] Agregar logging de seguridad
- [ ] Configurar CSP (Content Security Policy)
- [ ] Tests de penetración automatizados

## Variables de Entorno Sensibles

```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET
```

No subir `.env` al repositorio.