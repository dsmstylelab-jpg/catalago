import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { pool } from './config/db.js';
import { requireAdmin } from './middleware/auth.js';
import { login, refresh, logout, me } from './controllers/auth.controller.js';
import { listProducts, getProduct, taxonomy } from './controllers/store.controller.js';
import { dashboard, listAdminProducts, saveProduct, setProductStatus, listTaxAdmin, createTax, editTax, uploadImage, deleteImage } from './controllers/admin.controller.js';

for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'])
  if (!process.env[key] || process.env[key].length < 32) throw new Error(`Configura ${key} con al menos 32 caracteres`);

const app = express();
app.disable('x-powered-by');
// Render pone un proxy delante: necesario para que el rate limit vea la IP real.
app.set('trust proxy', 1);
app.use(helmet());

// Orígenes permitidos. FRONTEND_URL acepta varios separados por coma.
// En producción, además de FRONTEND_URL, se permite la versión con y sin "www".
const origins = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
);
for (const o of [...origins]) {
  try {
    const u = new URL(o);
    if (u.hostname.startsWith('www.')) origins.add(`${u.protocol}//${u.hostname.slice(4)}`);
    else if (u.hostname.includes('.') && u.hostname !== 'localhost') origins.add(`${u.protocol}//www.${u.hostname}`);
  } catch { /* origen inválido: se ignora */ }
}
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || origins.has(origin)),
  credentials: true
}));

app.use(express.json({ limit: '128kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

app.get('/', (req, res) => res.json({ name: 'DSM Style Lab API', ok: true }));
app.get('/api/health', async (req, res) => {
  try { await pool.query('select 1'); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
});

app.get('/api/products', listProducts);
app.get('/api/products/:slug', getProduct);
app.get('/api/taxonomy', taxonomy);

app.post('/api/auth/login', authLimiter, login);
app.post('/api/auth/refresh', authLimiter, refresh);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', requireAdmin, me);

app.get('/api/admin/dashboard', requireAdmin, dashboard);
app.get('/api/admin/products', requireAdmin, listAdminProducts);
app.post('/api/admin/products', requireAdmin, saveProduct);
app.put('/api/admin/products/:id', requireAdmin, saveProduct);
app.patch('/api/admin/products/:id/status', requireAdmin, setProductStatus);
app.get('/api/admin/:resource(categories|brands)', requireAdmin, listTaxAdmin);
app.post('/api/admin/:resource(categories|brands)', requireAdmin, createTax);
app.put('/api/admin/:resource(categories|brands)/:id', requireAdmin, editTax);

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      return cb(Object.assign(new Error('Solo JPG, PNG o WebP'), { status: 400 }));
    cb(null, true);
  }
});
app.post('/api/admin/products/:id/images', requireAdmin, uploader.single('image'), uploadImage);
app.delete('/api/admin/products/:id/images/:imageId', requireAdmin, deleteImage);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  const known = err.status || (err.code === '23505' ? 409 : err.code === '23503' ? 400 : err.code === '22P02' ? 400 : err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (known >= 500) console.error(err);
  res.status(known).json({
    error: known === 500 ? 'Error interno del servidor' : err.code === '23505' ? 'Ya existe un registro con esos datos (SKU, slug o nombre repetido)' : err.message
  });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`DSM Style Lab API: http://localhost:${port}`));

// Keep-alive: cada 5 min el servidor se llama a sí mismo por su URL pública.
// En Render basta con RENDER_EXTERNAL_URL (la define Render solo).
// Si prefieres usar tu dominio, define KEEP_ALIVE_URL=https://api.dsmstylelab.store
// En local no hace nada.
const keepAliveUrl = (process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
if (keepAliveUrl) {
  const ping = () =>
    fetch(`${keepAliveUrl}/api/health`)
      .then((r) => console.log(`[keep-alive] ${r.status}`))
      .catch((e) => console.error('[keep-alive] falló:', e.message));
  setInterval(ping, 5 * 60 * 1000);
}