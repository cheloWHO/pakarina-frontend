# Pakarina Center — Frontend

React + Vite · Deploy en Vercel

---

## Setup local

```bash
git clone https://github.com/TU_USUARIO/pakarina-frontend.git
cd pakarina-frontend
npm install
cp .env.example .env
# Editar .env con la URL del backend
npm run dev
```

Abre http://localhost:5173

---

## Variables de entorno

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://pakarina-api-production.up.railway.app` |

---

## Deploy en Vercel

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "feat: frontend inicial Pakarina Center"
git remote add origin https://github.com/TU_USUARIO/pakarina-frontend.git
git push -u origin main
```

### 2. Conectar en Vercel
- Ir a vercel.com → New Project → Import desde GitHub
- Seleccionar `pakarina-frontend`
- Framework: **Vite**
- Build command: `npm run build` (auto-detectado)
- Output directory: `dist` (auto-detectado)

### 3. Agregar variable de entorno en Vercel
Settings → Environment Variables:
```
VITE_API_URL = https://pakarina-api-production.up.railway.app
```

### 4. Deploy
Vercel despliega automáticamente en cada push a main.

### 5. Dominio personalizado
Settings → Domains → agregar `app.pakarinacenter.com`
Luego en GoDaddy → DNS → agregar CNAME apuntando a Vercel.

---

## Estructura del proyecto

```
src/
├── api/
│   ├── client.js          ← axios con JWT interceptor
│   └── index.js           ← todas las llamadas al backend
├── components/
│   ├── ui/index.jsx       ← Btn, Card, Badge, Input, Select, StatCard, Alert, Spinner
│   └── layout/
│       └── AdminLayout.jsx← sidebar + nav para admins
├── context/
│   └── AuthContext.jsx    ← login/logout global
├── pages/
│   ├── LoginPage.jsx
│   ├── admin/
│   │   ├── DashboardPage.jsx   ← stats + alertas de vencimiento
│   │   ├── BebesPage.jsx       ← registro bebé + pago en 4 pasos
│   │   ├── ClasesPage.jsx      ← marcar asistencia con 1 click
│   │   ├── FinanzasPage.jsx    ← resumen + gastos
│   │   └── InventarioPage.jsx  ← stock + movimientos
│   └── parent/
│       ├── PortalLayout.jsx
│       └── PortalPage.jsx      ← clases restantes + historial
├── utils/index.js         ← helpers de fecha, moneda, etiquetas
├── App.jsx                ← router con rutas protegidas por rol
└── main.jsx
```

---

## Roles y acceso

| Rol | Acceso | Login |
|-----|--------|-------|
| `admin` | `/admin/*` | Email + contraseña definida |
| `parent` | `/portal` | Email + últimos 10 dígitos WhatsApp |

Marcelo (local_id = NULL) ve todos los locales.
Admins de local solo ven su propio local.

---

## Rutas backend que se deben agregar

Ver archivo `BACKEND_RUTAS_FALTANTES.js` — contiene el código completo para:
- `GET /api/servicios`
- `GET /api/grupos`
- `GET /api/inventario/stock`
- `GET /api/inventario/productos`
- `POST /api/inventario/movimientos`
