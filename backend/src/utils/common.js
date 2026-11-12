import crypto from 'node:crypto';
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const httpError = (status, message) => Object.assign(new Error(message), { status });
export const slugify = (text = '') =>
  String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const publicAdmin = (a) => ({ id: a.id, name: a.name, email: a.email });
