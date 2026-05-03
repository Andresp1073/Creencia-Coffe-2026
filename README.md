# Cafe Creencia - E-commerce de Café Artesanal

Sistema de ventas en línea con panel de administración construido con Next.js App Router.

## 📋 Descripción

**Cafe Creencia** es un e-commerce especializado en la venta de café artesanal. El proyecto incluye:

- **Sitio público:** Catálogo de productos, detalles, información de la marca
- **Panel de administración:** Gestión de productos, ventas, inventario, notificaciones
- **Seguridad:** Autenticación con cookies httpOnly y middleware de protección

## 🏗️ Arquitectura

### Tipo de Arquitectura
- **Monolito full-stack** con Next.js App Router
- **API Routes** integradas en el mismo proyecto
- **Separación por dominios** (auth, products, sales, inventory)
- **Protección de rutas** con middleware

### Tecnologías Principales
- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Node.js
- **Base de Datos:** MySQL con Drizzle ORM
- **Autenticación:** Cookies HTTPOnly, bcrypt para hashing
- **Testing:** Vitest, Playwright para E2E
- **Despliegue:** Vercel (recomendado)

### Estructura de Carpetas

```
cafe-creencia/
├── app/                          # Next.js App Router
│   ├── (site)/                  # Grupo de rutas públicas
│   │   ├── catalogo/            # Catálogo de productos
│   │   ├── producto/[slug]/     # Detalle de producto
│   │   └── nosotros/            # Página sobre nosotros
│   ├── (auth)/                  # Grupo de rutas de autenticación
│   │   ├── login/               # Login de admin
│   │   └── recuperar-password/  # Recuperación de contraseña
│   ├── (dashboard)/             # Grupo del panel admin
│   │   └── admin/               # Dashboard y páginas admin
│   ├── api/                     # API Routes
│   │   ├── auth/                # Endpoints de autenticación
│   │   └── products/            # Endpoints de productos
│   ├── globals.css              # Estilos globales
│   └── layout.tsx               # Layout raíz
├── components/
│   ├── ui/                      # Componentes UI base
│   └── site/                    # Componentes del sitio público
├── lib/
│   ├── auth/                    # Funciones de autenticación
│   ├── db.ts                    # Conexión a MySQL
│   └── products/                # Servicio de productos
├── database/
│   ├── schema.sql               # Esquema de base de datos
│   └── seed.sql                 # Datos de ejemplo
├── tests/                       # Tests unitarios y E2E
│   ├── api/                     # Tests de API
│   ├── fixtures/                # Datos de prueba
│   └── unit/                    # Tests unitarios
└── middleware.ts                # Protección de rutas
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- pnpm (recomendado) o npm

### 1. Clonar el repositorio
```bash
git clone https://github.com/Andresp1073/Creencia-Coffe-2026.git
cd Creencia-Coffe-2026
```

### 2. Instalar dependencias
```bash
pnpm install
# o
npm install
```

### 3. Configurar la base de datos
1. Crear una base de datos MySQL llamada `cafe_creencia`
2. Ejecutar el esquema:
```bash
mysql -u root -p cafe_creencia < database/schema.sql
```
3. Ejecutar los datos de ejemplo:
```bash
mysql -u root -p cafe_creencia < database/seed.sql
```

### 4. Configurar variables de entorno
Crear un archivo `.env` en la raíz del proyecto:
```env
# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=cafe_creencia

# Autenticación
NEXTAUTH_SECRET=tu_secreto_seguro_aqui
NEXTAUTH_URL=http://localhost:3000

# Email (opcional para recuperación de contraseña)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
```

### 5. Ejecutar el proyecto
```bash
pnpm dev
# o
npm run dev
```

El sitio estará disponible en `http://localhost:3000`

### 6. Acceder al panel de administración
- URL: `http://localhost:3000/admin`
- Usuario por defecto: `admin@creencia.com`
- Contraseña por defecto: `admin123`

## 🧪 Testing

### Tests unitarios
```bash
pnpm test
```

### Tests E2E con Playwright
```bash
pnpm test:e2e
```

## 📦 Despliegue

### Vercel (Recomendado)
1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno en Vercel
3. Desplegar automáticamente

### Otros proveedores
Asegurarse de configurar las variables de entorno y la base de datos MySQL.

## 📝 Notas de Desarrollo

- Usa `pnpm` para consistencia en dependencias
- Los tests E2E requieren una base de datos de prueba
- El middleware protege las rutas `/admin/*`
- Las imágenes se suben a un servicio externo (configurar en producción)
```

## 🛠️ Tecnologías

### Core
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript 5.5**
- **pnpm**

### Backend (API Routes)
- **Node.js**
- **MySQL2** - Base de datos
- **JOSE** - JWT
- **Bcryptjs** - Hash de contraseñas

### Frontend/UI
- **Tailwind CSS 3.4** - Estilos
- **Lucide React** - Iconos
- **Recharts** - Gráficos
- **Radix UI** - Componentes accesibles

### Herramientas
- **ESLint**
- **Prettier**

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- pnpm (recomendado)

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repositorio>
cd cafe-creencia
```

2. **Instalar dependencias**
```bash
pnpm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=creencia_coffee
JWT_SECRET=tu-secret-jwt
ADMIN_EMAIL=andresmauriciope1073@gmail.com
```

4. **Crear la base de datos**
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

5. **Ejecutar el proyecto**
```bash
pnpm dev
```

El proyecto estará disponible en:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3000/api

## 📱 Uso

### Sitio Público
- **Inicio:** http://localhost:3000/
- **Catálogo:** http://localhost:3000/catalogo
- **Producto:** http://localhost:3000/producto/[slug]

### Panel de Administración
- **Acceso:** http://localhost:3000/admin
- **Login:** http://localhost:3000/login
- **Recuperar contraseña:** http://localhost:3000/recuperar-password

**Credenciales por defecto:**
- Usuario: `creencia`
- Contraseña: `cafe2024admin`

## 🔐 Seguridad

### Autenticación
- Tokens JWT con cookies httpOnly
- Middleware para protección de rutas
- Sesión basada en cookies (no localStorage)
- Recuperación de contraseña con OTP

### Rutas Protegidas
Todas las rutas bajo `/admin` requieren autenticación y redireccionan a `/login` si no hay sesión válida.

## 📦 Scripts Disponibles

```bash
pnpm dev          # Iniciar en modo desarrollo
pnpm build        # Construir para producción
pnpm start        # Iniciar en producción
pnpm lint         # Verificar errores de código
pnpm format       # Formatear código
```

## 🧪 Pruebas

### Pruebas Unitarias
```bash
pnpm test:unit      # Ejecutar tests unitarios
pnpm test:coverage  # Tests con coverage
```

### Pruebas E2E
```bash
pnpm test:e2e       # Ejecutar tests E2E con Playwright
```

### Suite Completa (CI)
```bash
pnpm test:ci        # Ejecutar lint, typecheck, coverage, build y E2E
```

### Scripts de TypeScript
```bash
pnpm typecheck      # Verificar tipos TypeScript
```

**Nota:** Las pruebas E2E requieren que el servidor esté corriendo o Playwright lo inici automáticamente.

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

**Desarrollado con ❤️ para Cafe Creencia**