import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { pool, query } from '../config/db.js';
import { hashToken, publicAdmin, httpError, asyncHandler } from '../utils/common.js';

const accessM = Number(process.env.ACCESS_TOKEN_MINUTES || 15);
const refreshD = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const COOKIE = 'dsm_refresh';
const JWT_OPTS = { algorithm: 'HS256', issuer: 'dsm-api', audience: 'dsm-admin' };
const cookieOptions = () => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
  path: '/api/auth', maxAge: refreshD * 86400000
});
const access = (admin) =>
  jwt.sign({ type: 'access' }, process.env.JWT_ACCESS_SECRET, { ...JWT_OPTS, subject: admin.id, expiresIn: `${accessM}m` });

async function createRefresh(client, adminId, familyId) {
  const id = crypto.randomUUID();
  const raw = jwt.sign({ type: 'refresh', jti: id, family: familyId }, process.env.JWT_REFRESH_SECRET,
    { ...JWT_OPTS, subject: adminId, expiresIn: `${refreshD}d` });
  await client.query(
    "insert into refresh_tokens(id,admin_id,token_hash,family_id,expires_at) values($1,$2,$3,$4,now()+($5::int * interval '1 day'))",
    [id, adminId, hashToken(raw), familyId, refreshD]);
  return { id, raw };
}

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) throw httpError(400, 'Email y contraseña obligatorios');
  const { rows } = await query('select * from admins where lower(email)=$1 and active=true', [email]);
  const valid = rows.length && (await bcrypt.compare(password, rows[0].password_hash));
  if (!valid) throw httpError(401, 'Credenciales incorrectas');
  const client = await pool.connect();
  let token;
  try { token = await createRefresh(client, rows[0].id, crypto.randomUUID()); } finally { client.release(); }
  res.cookie(COOKIE, token.raw, cookieOptions()).json({ accessToken: access(rows[0]), admin: publicAdmin(rows[0]) });
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (!raw) throw httpError(401, 'No hay sesión');
  let claims;
  try { claims = jwt.verify(raw, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'], issuer: 'dsm-api', audience: 'dsm-admin' }); }
  catch { res.clearCookie(COOKIE, cookieOptions()); throw httpError(401, 'Sesión expirada'); }
  if (claims.type !== 'refresh') throw httpError(401, 'Token inválido');

  const client = await pool.connect();
  let admin, newToken, reuse = false;
  try {
    await client.query('begin');
    const { rows } = await client.query(
      `select t.*,a.name,a.email,a.active from refresh_tokens t join admins a on a.id=t.admin_id where t.id=$1 for update of t`, [claims.jti]);
    const old = rows[0];
    if (!old || old.token_hash !== hashToken(raw) || !old.active || new Date(old.expires_at) < new Date())
      throw httpError(401, 'Sesión no válida');
    if (old.revoked_at) {
      // Reutilización de un token ya rotado: se revoca toda la familia.
      await client.query('update refresh_tokens set revoked_at=coalesce(revoked_at,now()) where family_id=$1', [old.family_id]);
      reuse = true;
    } else {
      newToken = await createRefresh(client, old.admin_id, old.family_id);
      await client.query('update refresh_tokens set revoked_at=now(),replaced_by=$2 where id=$1', [old.id, newToken.id]);
      admin = old;
    }
    await client.query('commit');
  } catch (e) { try { await client.query('rollback'); } catch {} throw e; }
  finally { client.release(); }

  if (reuse) throw httpError(401, 'Sesión revocada');
  res.cookie(COOKIE, newToken.raw, cookieOptions()).json({
    accessToken: access({ id: admin.admin_id }),
    admin: publicAdmin({ id: admin.admin_id, name: admin.name, email: admin.email })
  });
});

export const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (raw) await query('update refresh_tokens set revoked_at=now() where token_hash=$1 and revoked_at is null', [hashToken(raw)]);
  res.clearCookie(COOKIE, cookieOptions()).json({ ok: true });
});

export const me = asyncHandler(async (req, res) => res.json({ admin: publicAdmin(req.admin) }));
