import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
export async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
    const claims = jwt.verify(auth.slice(7), process.env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'], issuer: 'dsm-api', audience: 'dsm-admin'
    });
    if (claims.type !== 'access') return res.status(401).json({ error: 'Token inválido' });
    const { rows } = await query('select id,name,email from admins where id=$1 and active=true', [claims.sub]);
    if (!rows.length) return res.status(401).json({ error: 'Acceso revocado' });
    req.admin = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión no válida o expirada' });
  }
}
