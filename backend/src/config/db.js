import pg from 'pg';
import 'dotenv/config';
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
export const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL === 'true' ? {rejectUnauthorized:false} : false,max:10});
export const query=(sql,params=[])=>pool.query(sql,params);
