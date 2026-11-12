# LUVARIA · Perfumería selecta

Tienda web para perfumes **árabes, nicho y diseñador** con presentaciones **completas y decants**, catálogo, carrusel y carrito simulado. Panel administrativo privado para gestionar productos, marcas, categorías, variantes, stock e imágenes.

## Tecnologías y capas

- **Frontend (presentación)**: React 18 + Vite + React Router + Bootstrap 5 + Lucide React + CSS personalizado.
- **API (enrutamiento/controladores)**: Node.js + Express con rutas públicas y privadas.
- **Middleware (seguridad)**: JWT access, refresh con rotación persistida en PostgreSQL, bcrypt, Helmet, CORS, rate limiting en login/refresh.
- **Datos (persistencia)**: PostgreSQL de Supabase vía `pg`; Supabase Storage para imágenes. La capa de acceso a datos reside en `backend/src/config/db.js` y consultas parametrizadas en controladores (separación básica de capas; para escalar, mover SQL a repositorios).
- **Persistencia del carrito**: `localStorage` del navegador. No hay pedidos ni cobros.

## 1. Crear el proyecto Supabase

1. Crear un proyecto Supabase y localizar el **Connection String de PostgreSQL**. Si usas el pooler, emplea la cadena URI que recomienda Supabase para tu red (IPv4/IPv6).
2. Ejecutar `backend/sql/schema.sql` completo en el SQL Editor del proyecto. Se crearán las tablas, índices, categorías iniciales y el bucket público `luvaria-products` (si tu proyecto no permite crear buckets desde SQL, crea manualmente un bucket público con ese nombre, límite 5 MB, JPG/PNG/WebP).
3. Obtener `SUPABASE_URL` y **service_role key** de Supabase. **Nunca** coloques la service role key en el frontend ni la publiques. Esta app no requiere activar acceso anónimo de escritura.

## 2. Configurar backend

```bash
cd backend
cp .env.example .env
npm install
```

En Windows PowerShell: `Copy-Item .env.example .env`.

Editar `.env`: `DATABASE_URL`, `DATABASE_SSL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL` y las variables `ADMIN_*`.

Genera **dos secretos distintos** de al menos 32 caracteres. Por ejemplo, `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` (ejecutar dos veces).

```bash
npm run seed:admin
npm run dev
```

`seed:admin` crea o restablece la cuenta de administrador según el `.env`. Después de crear el administrador, **quita `ADMIN_PASSWORD` del `.env` o protege ese archivo adecuadamente**. El acceso público para crear cuentas está deshabilitado por completo (no hay endpoint de registro).

API: `http://localhost:4000/api/health`

## 3. Configurar frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`. Inicia sesión en `/login` con el correo/contraseña que configuraste.

## Logo oficial

Ubica tu logo real en **`frontend/public/logos/luvaria.jpg`**. Esa ruta está referenciada desde el `index.html` (favicon) y el encabezado/pie de página. **El logo no se ha incluido**, ya que no fue adjuntado; se mostrará el wordmark tipográfico de respaldo hasta que copies el archivo.

## Flujo de uso

1. Crea las marcas desde el panel (`/admin`). Las categorías Árabes, Nicho y Diseñador se cargan inicialmente.
2. Crea un perfume, selecciona marca/categoría y define notas, descripción, concentración, género y visibilidad.
3. Agrega variantes separadas: `completo` y/o `decant`, cada una con su volumen (ml), SKU, precio y stock. Cada par **tipo + ml** debe ser único dentro del mismo perfume.
4. Sube imágenes. Puedes agregar varias o eliminarlas después de guardar el producto. Se almacenan en Supabase Storage.
5. Marca algunos perfumes como **destacados** para mostrarlos en la sección principal.
6. En el catálogo puedes filtrar por categoría, marca, tipo de presentación, buscar y ordenar. El carrito no envía órdenes.

## Esquema normalizado

- `admins`: credenciales de administradores, hash bcrypt.
- `refresh_tokens`: hash SHA-256, familia de sesión, expiración, revocación y rotación.
- `categories`: taxonomía de perfumería.
- `brands`: marcas de fragancias.
- `products`: definición única de un perfume, FK a categoría y marca.
- `product_variants`: tipos, tamaños, precios, SKUs, stock y disponibilidad; relación 1:N con `products`.
- `product_images`: varias fotografías por producto, URL y ruta Storage.

No se duplican perfumes por presentación, y no se reutiliza el stock entre decants y completos.

## Seguridad y producción

- JWT de acceso: 15 minutos por defecto, **solo en memoria** del frontend.
- Refresh token: cookie `HttpOnly`, `SameSite=Lax`, `Secure` con `NODE_ENV=production`; hash en BD, rotación al refrescar y revocación al cerrar sesión.
- Si los frontend/backend estarán en sitios **cross-site** diferentes en producción, adapta cookies SameSite/CORS/CSRF según despliegue; se recomienda mismo sitio detrás de reverse proxy. No usar `SameSite=None` sin medidas CSRF.
- Las rutas administrativas verifican JWT y el estado activo del administrador en BD.
- Protege DATABASE_URL y SUPABASE_SERVICE_ROLE_KEY como secretos del servidor. Usa TLS, limita orígenes CORS, configura backups y monitoreo, y verifica permisos del bucket.
- **Advertencia de sesión concurrente**: el refresh token rota, por lo que refrescos simultáneos de pestañas independientes pueden revocar un token previamente usado; para producción multi-pestaña sincroniza la renovación entre pestañas.
- La validación de la API cubre casos básicos pero no pretende ser un sistema de comercio electrónico listo para transacciones financieras. No implementa checkout, pago, órdenes, descuentos, despacho ni facturación.

## Estructura

```
luvaria/
  backend/
    src/config/db.js
    src/controllers/{auth,store,admin}.controller.js
    src/middleware/auth.js
    src/utils/common.js
    src/server.js
    sql/schema.sql
    scripts/create-admin.js
  frontend/
    index.html
    public/logos/luvaria.jpg   ← colocar logo original
    public/visuals/hero-perfume.svg
    src/api/client.js
    src/contexts/{AuthContext,CartContext}.jsx
    src/components/{Brand,Layout,ProductCard}.jsx
    src/pages/{Home,Catalog,ProductDetail,Cart,Login,Register,Admin}.jsx
    src/styles/site.css
```
