# LOG-POL — Sistema de Gestión Logística
### POLHER S.A.

Sistema web para la gestión de pedidos, vehículos, conductores y reportes logísticos.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20 + Express 4 |
| Base de datos | MongoDB Atlas (Mongoose 8) |
| Autenticación | JWT + sesiones persistentes en DB |
| Frontend | React 18 + Vite 8 |
| Estilos | CSS vanilla (sin framework) |
| Package manager | pnpm 11 |
| Deploy | Render (backend: web service / frontend: static site) |
| CI/CD | GitHub Actions |

---

## Estructura del proyecto

```
LOG-POL/
├── backend/                  API REST (Node.js/Express)
│   ├── app.js                Configuración Express + rutas
│   ├── server.js             Conexión MongoDB + listen
│   ├── login.js              POST /api/login (con rate limiting)
│   ├── logout.js             POST /api/logout
│   ├── middleware/
│   │   └── auth.js           JWT verificarToken + soloRol (RBAC)
│   ├── models/               Esquemas Mongoose
│   │   ├── Usuario.js
│   │   ├── Conductor.js
│   │   ├── Vehiculo.js
│   │   ├── Pedido.js
│   │   ├── Producto.js
│   │   ├── Entrega.js
│   │   ├── Sesion.js
│   │   └── Reporte.js
│   ├── routes/
│   │   ├── usuarios.js
│   │   ├── vehiculos.js
│   │   ├── pedidos.js
│   │   ├── seguimiento.js
│   │   └── reportes.js
│   └── .env.example
├── frontend-react/           SPA React/Vite
│   ├── src/
│   │   ├── api.js            apiFetch + BASE_URL centralizada
│   │   ├── App.jsx           Router principal
│   │   ├── Nav.jsx           Navegación dinámica por rol
│   │   ├── Login.jsx
│   │   ├── CambiarPassword.jsx
│   │   ├── RRHH.jsx
│   │   ├── Vehiculos.jsx
│   │   ├── Pedidos.jsx
│   │   ├── Seguimiento.jsx
│   │   └── Reportes.jsx
│   └── .env.example
├── render.yaml               Infraestructura como código (Render Blueprint)
└── .github/
    └── workflows/
        └── pipeline.yml      CI/CD: build + deploy automático
```

---

## Levantar en local

### Requisitos
- Node.js 20+
- pnpm 11+ (`npm install -g pnpm`)
- Cuenta en MongoDB Atlas con un cluster activo

### 1. Variables de entorno

```bash
# backend/.env  (copiar de backend/.env.example)
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=clave-secreta-local
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

```bash
# frontend-react/.env.local  (opcional, usa localhost:3001 por defecto)
VITE_API_URL=http://localhost:3001
```

### 2. Instalar dependencias

```bash
cd backend && pnpm install
cd ../frontend-react && pnpm install
```

### 3. Iniciar servidores

```bash
# Backend (en una terminal)
cd backend && node server.js

# Frontend (en otra terminal)
cd frontend-react && pnpm dev
```

- **Backend:** http://localhost:3001
- **Frontend:** http://localhost:5173

---

## Autenticación y seguridad

### Flujo de login

```
1. POST /api/login  { email, password }
2. Backend verifica bcrypt (12 rounds)
3. Genera JWT firmado con JWT_SECRET (expira en 8h)
4. Crea registro en colección Sesion { token_jwt, activa: true }
5. Responde con { token, usuario }
6. Frontend guarda token en localStorage
```

### Middleware `verificarToken`

Aplicado a todas las rutas protegidas. Verifica:
1. Header `Authorization: Bearer <token>` presente
2. JWT válido y no expirado (`jwt.verify`)
3. Sesión activa en base de datos (`Sesion.activa === true`)

Si alguna verificación falla → **401 Unauthorized**.

### Logout

```
POST /api/logout  →  setea Sesion.activa = false
```
El token queda inválido para todas las requests subsiguientes aunque no haya expirado.

### Rate limiting (OWASP A04)

`POST /api/login`: máximo **10 intentos cada 15 minutos** por IP.  
Al superar el límite → **429 Too Many Requests**.

### Control de acceso por rol (RBAC)

Middleware `soloRol(...roles)` protege rutas sensibles:

| Rol | Rutas permitidas |
|---|---|
| `Recursos Humanos` | CRUD usuarios, ver seguimiento, reportes |
| `Encargado de logística` | CRUD vehículos, CRUD pedidos, ver seguimiento, reportes |
| `Chofer` | Ver sus propios pedidos en ruta, marcar entregado |

> **Restricción clave:** Solo `Chofer` y `Recursos Humanos` pueden marcar un pedido como entregado (`PUT /api/seguimiento/:id/entregar`). El `Encargado de logística` tiene acceso de lectura al seguimiento pero no puede cambiar estados.

### Contraseñas (OWASP A02 / A07)

Requisitos mínimos:
- 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 número
- Al menos 1 carácter especial (`!@#$%` etc.)

Hash con **bcrypt, 12 rounds**.

---

## Modelos de datos

### Usuario
```
email         String (único, requerido)
contrasena    String (hash bcrypt)
tipo_usuario  "Recursos Humanos" | "Encargado de logística" | "Chofer"
activo        Boolean (baja lógica)
requiere_cambio_contrasena  Boolean
ultimo_login  Date
```

### Conductor
```
usuario_id    ObjectId → Usuario (requerido)
nombre        String
apellido      String
dni           String (sparse unique — requerido para Choferes)
telefono      String
licencia      String
```

### Vehiculo
```
patente           String (único, requerido)
marca / modelo    String
anio              Number
capacidad_kg      Number
conductor_asignado  String (nombre del chofer)
conductor_dni     String
estado            "Disponible" | "En ruta" | "Fuera de servicio"
```

### Pedido
```
cliente_nombre          String
destino                 String
peso_total_kg           Number
estado                  "Pendiente" | "En ruta" | "Entregado"
prioridad               "Normal" | "Alta" | "Urgente"
vehiculo_id             ObjectId → Vehiculo
fecha_creacion          Date
fecha_entrega_estimada  Date
```

### Producto
```
pedido_id         ObjectId → Pedido
descripcion       String
cantidad          Number
peso_unitario_kg  Number
```

### Entrega
```
pedido_id     ObjectId → Pedido
conductor_id  ObjectId → Conductor
usuario_id    ObjectId → Usuario
estado        String
fecha_salida  Date
fecha_entrega Date
```

### Sesion
```
usuario_id  ObjectId → Usuario
token_jwt   String
expira_en   Date
activa      Boolean
```

### Reporte
```
usuario_id  ObjectId → Usuario
tipo        "Pedidos" | "Entregas" | "Vehículos" | "Rendimiento conductores"
fecha_desde / fecha_hasta  Date
formato     "PDF"
generado_en Date
```

---

## API — Endpoints

### Autenticación
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/login` | No | Login. Rate limit: 10/15min |
| POST | `/api/logout` | Sí | Invalida la sesión activa |

### Usuarios
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | Cualquiera | Lista todos los usuarios |
| GET | `/api/usuarios/stats` | Cualquiera | Contadores por tipo/estado |
| POST | `/api/usuarios` | Recursos Humanos | Crea usuario (+ Conductor si es Chofer) |
| PUT | `/api/usuarios/:id` | Cualquiera | Actualiza datos |
| DELETE | `/api/usuarios/:id` | Cualquiera | Baja lógica (activo = false) |
| POST | `/api/usuarios/:id/cambiar-password` | Cualquiera | Cambia contraseña |

### Vehículos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/vehiculos` | Lista vehículos con carga actual calculada |
| GET | `/api/vehiculos/stats` | Contadores por estado |
| POST | `/api/vehiculos` | Crea vehículo (patente requerida) |
| PUT | `/api/vehiculos/:id` | Actualiza vehículo |

### Pedidos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pedidos` | Lista pedidos con productos |
| GET | `/api/pedidos/stats` | Contadores por estado |
| POST | `/api/pedidos` | Crea pedido. Valida capacidad si se asigna vehículo |
| PUT | `/api/pedidos/:id/asignar` | Asigna vehículo y pasa a "En ruta" |
| PUT | `/api/pedidos/:id/estado` | Cambia estado directamente |

### Seguimiento
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/seguimiento` | Cualquiera | Pedidos en ruta o entregados. Chofer solo ve los suyos |
| GET | `/api/seguimiento/stats` | Cualquiera | Contadores en ruta / entregados / retrasados / urgentes |
| PUT | `/api/seguimiento/:id/entregar` | Chofer / RRHH | Marca pedido como Entregado, crea registro Entrega |

### Reportes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reportes` | Historial (últimos 50) |
| GET | `/api/reportes/stats` | Total generados / generados hoy |
| POST | `/api/reportes/generar` | Genera PDF. Body: `{ tipo, fecha_desde, fecha_hasta }` |

**Tipos de reporte disponibles:**
- `pedidos` — todos los pedidos del período
- `entregas` — pedidos entregados con conductor y cumplimiento de plazo
- `vehiculos` — utilización de flota por vehículo
- `rendimiento` — métricas por conductor (tasa de entrega %)

---

## Frontend — Módulos

### Login (`/login`)
Formulario de autenticación. Redirige al módulo inicial según el rol del usuario.

| Rol | Redirección inicial |
|---|---|
| Encargado de logística | `/pedidos` |
| Recursos Humanos | `/rrhh` |
| Chofer | `/seguimiento` |

Al ingresar por primera vez con una cuenta nueva, redirige a `/cambiar-password`.

### Cambiar contraseña (`/cambiar-password`)
Formulario obligatorio al primer login. Valida los 4 requisitos de contraseña en tiempo real con indicador de fortaleza.

### Usuarios — RRHH (`/rrhh`)
Visible para: `Recursos Humanos`

- Lista de usuarios con avatar, rol y estado (activo/inactivo)
- Filtro por rol y búsqueda por nombre/email
- Crear usuario: valida contraseña en tiempo real, pide DNI si es Chofer
- Editar: cambiar datos y opcionalmente nueva contraseña
- Dar de baja (baja lógica)

### Vehículos (`/vehiculos`)
Visible para: `Encargado de logística`

- Lista de vehículos con carga actual y barra de capacidad
- El conductor se selecciona de un dropdown de Choferes registrados
- Crear / editar vehículo
- Panel lateral con estadísticas de flota

### Pedidos (`/pedidos`)
Visible para: `Encargado de logística`

- Lista de pedidos con estado, cliente, destino y vehículo asignado
- Filtro por estado y búsqueda
- Crear pedido con productos opcionales
- Asignar vehículo con validación de capacidad en tiempo real
- Panel lateral con contadores y alertas de pedidos sin asignar

### Seguimiento (`/seguimiento`)
Visible para: todos los roles

- Dos pestañas: **En ruta** / **Entregados**
- Tarjetas con alerta visual de tiempo:
  - 🟢 Verde: dentro del plazo (> 24hs)
  - 🟡 Amarillo: urgente (< 24hs)
  - 🔴 Rojo: retrasado (fecha vencida)
- Auto-refresh cada 60 segundos
- Modal de detalle con productos, datos del vehículo y timeline de estados
- Botón "Marcar entregado": **visible solo para Chofer y RRHH**, oculto para Encargado de logística
- Chofer solo ve los pedidos asignados a su vehículo

### Reportes (`/reportes`)
Visible para: `Encargado de logística` / `Recursos Humanos`

- Selección de tipo de reporte (4 tarjetas)
- Rango de fechas desde/hasta
- Genera y descarga un PDF con tabla formateada
- Historial de los últimos 50 reportes generados
- Panel lateral con estadísticas y tipo seleccionado

### Navegación por rol

| Módulo | Encargado logística | Recursos Humanos | Chofer |
|---|---|---|---|
| Pedidos | ✓ | — | — |
| Vehículos | ✓ | — | — |
| Seguimiento | ✓ | ✓ | ✓ (solo los propios) |
| Reportes | ✓ | ✓ | — |
| Usuarios (RRHH) | — | ✓ | — |

---

## Utilidad `apiFetch`

Todos los módulos del frontend usan `apiFetch` en lugar de `fetch` directamente:

```js
// src/api.js
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function apiFetch(url, options = {}) {
  // Agrega automáticamente Authorization: Bearer <token>
  // Si recibe 401, limpia localStorage y redirige a /login
}
```

Esto centraliza el manejo del token y las redirecciones por sesión expirada.

---

## Deploy en Render

### Infraestructura (`render.yaml`)

Define dos servicios en Render:
- `logpol-api` — web service Node.js (backend)
- `logpol-app` — static site (frontend React)

Para desplegar: conectar el repositorio en [render.com](https://render.com) → New → Blueprint. Render detecta el `render.yaml` automáticamente y crea ambos servicios.

### Variables de entorno en Render

**Backend (`logpol-api`)**
| Variable | Descripción |
|---|---|
| `MONGO_URI` | URI de MongoDB Atlas |
| `JWT_SECRET` | Render lo genera automático |
| `CORS_ORIGIN` | URL del frontend en Render |
| `PORT` | Fijado en `10000` por el render.yaml |

**Frontend (`logpol-app`)**
| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL del backend en Render |

### Pipeline CI/CD (`.github/workflows/pipeline.yml`)

Se ejecuta en cada push a la rama `luhueda` y en PRs a `main`:

```
push / PR
    │
    ├── build-frontend   →  pnpm install + pnpm build (verifica que no haya errores)
    │
    └── validate-backend →  pnpm install --prod + node --check (verifica sintaxis)
            │
            └── (solo push a luhueda) deploy
                    │
                    ├── curl RENDER_BACKEND_DEPLOY_HOOK
                    └── curl RENDER_FRONTEND_DEPLOY_HOOK
```

**Secrets requeridos en GitHub** (Settings → Secrets → Actions):
| Secret | Descripción |
|---|---|
| `RENDER_BACKEND_DEPLOY_HOOK` | Deploy hook del servicio backend en Render |
| `RENDER_FRONTEND_DEPLOY_HOOK` | Deploy hook del servicio frontend en Render |
| `VITE_API_URL` | URL del backend (para el build de CI) |

---

## Consideraciones de seguridad implementadas (OWASP)

| Control | Implementación |
|---|---|
| A01 Broken Access Control | JWT en cada request + verificación de sesión activa en DB + RBAC por rol |
| A02 Cryptographic Failures | bcrypt 12 rounds, JWT firmado con secreto de entorno |
| A04 Insecure Design | Rate limiting en login (10 req/15min), validación de inputs en backend |
| A07 Identification Failures | Logout invalida token en DB, tokens con expiración de 8h |
| CORS | Origen restringido a la URL del frontend (env `CORS_ORIGIN`) |
