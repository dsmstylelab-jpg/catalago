import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const [argName, argEmail, argPassword] = process.argv.slice(2);
const name = argName || process.env.ADMIN_NAME;
const email = argEmail || process.env.ADMIN_EMAIL;
const password = argPassword || process.env.ADMIN_PASSWORD;

if (!name || !email?.includes('@') || !password || password.length < 10) {
  console.error('Falta nombre, correo válido (con @) o contraseña de 10+ caracteres.');
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
await pool.query(
  `insert into admins(name,email,password_hash) values($1,$2,$3)
   on conflict (email) do update set password_hash=excluded.password_hash,name=excluded.name,active=true,updated_at=now()`,
  [name, email.toLowerCase(), hash]);
console.log('Administrador listo:', email);
await pool.end();