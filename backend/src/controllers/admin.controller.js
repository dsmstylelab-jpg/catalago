import { pool, query } from '../config/db.js';
import { asyncHandler, httpError, slugify } from '../utils/common.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const allowedTables = { categories: ['name', 'slug', 'description', 'active'], brands: ['name', 'slug', 'active'] };
const GENDERS = ['hombre', 'mujer', 'unisex'];
const nullableNumber = (v) => (v === '' || v == null ? null : Number(v));

const adminBase = `select p.*,b.name as brand,c.name as category,
 (select i.url from product_images i where i.product_id=p.id order by position limit 1) as image
 from products p join brands b on b.id=p.brand_id join categories c on c.id=p.category_id`;

export const dashboard = asyncHandler(async (req, res) => {
  const [products, variants, brands, categories, lowStock] = await Promise.all([
    query('select count(*)::int as count from products where active=true'),
    query('select count(*)::int as count from product_variants where active=true'),
    query('select count(*)::int as count from brands where active=true'),
    query('select count(*)::int as count from categories where active=true'),
    query(`select p.name,v.size,v.color,v.stock from product_variants v join products p on p.id=v.product_id
           where p.active and v.active and v.stock<=5 order by v.stock,p.name limit 8`)
  ]);
  res.json({
    products: products.rows[0].count, variants: variants.rows[0].count,
    brands: brands.rows[0].count, categories: categories.rows[0].count, lowStock: lowStock.rows
  });
});

export const listAdminProducts = asyncHandler(async (req, res) => {
  const { rows } = await query(`${adminBase} order by p.created_at desc`);
  const ids = rows.map((r) => r.id);
  if (!ids.length) return res.json([]);
  const [variants, images] = await Promise.all([
    query('select * from product_variants where product_id=any($1::uuid[]) order by color,size', [ids]),
    query('select * from product_images where product_id=any($1::uuid[]) order by position', [ids])
  ]);
  res.json(rows.map((r) => ({
    ...r,
    variants: variants.rows.filter((v) => v.product_id === r.id),
    images: images.rows.filter((i) => i.product_id === r.id)
  })));
});

export const saveProduct = asyncHandler(async (req, res) => {
  const d = req.body;
  const update = Boolean(req.params.id);
  if (!d.name || !d.brand_id || !d.category_id) throw httpError(400, 'Nombre, marca y categoría son obligatorios');
  if (!GENDERS.includes(d.gender || 'unisex')) throw httpError(400, 'Género inválido');
  if (!Array.isArray(d.variants) || !d.variants.length) throw httpError(400, 'Añade al menos una talla/color');
  for (const v of d.variants) {
    const okPrice = v.price !== '' && v.price != null && Number(v.price) >= 0;
    const okCompare = v.compare_at_price === '' || v.compare_at_price == null || Number(v.compare_at_price) >= 0;
    const okStock = Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0;
    if (!String(v.size || '').trim() || !String(v.color || '').trim() || !String(v.sku || '').trim() || !okPrice || !okCompare || !okStock)
      throw httpError(400, 'Datos de talla/color inválidos');
  }
  const keys = d.variants.map((v) => `${String(v.size).trim().toLowerCase()}:${String(v.color).trim().toLowerCase()}`);
  if (new Set(keys).size !== keys.length) throw httpError(400, 'Hay combinaciones de talla y color duplicadas');
  const slug = slugify(d.slug || d.name);
  if (!slug) throw httpError(400, 'Slug inválido');

  const client = await pool.connect();
  try {
    await client.query('begin');
    let id = req.params.id;
    const params = [d.brand_id, d.category_id, String(d.name).trim(), slug, d.description || '', d.fit || null,
      d.gender || 'unisex', d.material || null, d.care || null, Boolean(d.featured), d.active !== false];
    if (update) {
      const result = await client.query(
        `update products set brand_id=$1,category_id=$2,name=$3,slug=$4,description=$5,fit=$6,gender=$7,material=$8,care=$9,featured=$10,active=$11,updated_at=now() where id=$12 returning id`,
        [...params, id]);
      if (!result.rowCount) throw httpError(404, 'Producto inexistente');
    } else {
      const r = await client.query(
        `insert into products(brand_id,category_id,name,slug,description,fit,gender,material,care,featured,active) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`, params);
      id = r.rows[0].id;
    }
    const incomingIds = [];
    for (const v of d.variants) {
      const vals = [String(v.size).trim(), String(v.color).trim(), String(v.sku).trim(), Number(v.price), nullableNumber(v.compare_at_price), Number(v.stock), v.active !== false];
      if (v.id && update) {
        const r = await client.query(
          `update product_variants set size=$1,color=$2,sku=$3,price=$4,compare_at_price=$5,stock=$6,active=$7,updated_at=now() where id=$8 and product_id=$9 returning id`,
          [...vals, v.id, id]);
        if (!r.rowCount) throw httpError(400, 'Variante inválida');
        incomingIds.push(v.id);
      } else {
        const r = await client.query(
          `insert into product_variants(product_id,size,color,sku,price,compare_at_price,stock,active) values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
          [id, ...vals]);
        incomingIds.push(r.rows[0].id);
      }
    }
    // Las variantes retiradas quedan inactivas para conservar su identidad.
    await client.query('update product_variants set active=false,updated_at=now() where product_id=$1 and not (id=any($2::uuid[]))', [id, incomingIds]);
    await client.query('commit');
    res.status(update ? 200 : 201).json({ id });
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
});

export const setProductStatus = asyncHandler(async (req, res) => {
  const { rows } = await query('update products set active=$2,updated_at=now() where id=$1 returning id,active', [req.params.id, req.body.active === true]);
  if (!rows.length) throw httpError(404, 'Producto no encontrado');
  res.json(rows[0]);
});

export const listTaxAdmin = asyncHandler(async (req, res) => {
  const table = req.params.resource;
  if (!allowedTables[table]) throw httpError(404, 'Recurso no encontrado');
  const { rows } = await query(`select * from ${table} order by name`);
  res.json(rows);
});

export const createTax = asyncHandler(async (req, res) => {
  const table = req.params.resource;
  if (!allowedTables[table]) throw httpError(404, 'Recurso no encontrado');
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Nombre obligatorio');
  const slug = slugify(req.body.slug || name);
  const { rows } = table === 'categories'
    ? await query('insert into categories(name,slug,description) values($1,$2,$3) returning *', [name, slug, req.body.description || null])
    : await query('insert into brands(name,slug) values($1,$2) returning *', [name, slug]);
  res.status(201).json(rows[0]);
});

export const editTax = asyncHandler(async (req, res) => {
  const table = req.params.resource;
  if (!allowedTables[table]) throw httpError(404, 'Recurso no encontrado');
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Nombre obligatorio');
  const slug = slugify(req.body.slug || name);
  const isCat = table === 'categories';
  const params = isCat ? [name, slug, req.body.description || null, req.body.active !== false, req.params.id]
                       : [name, slug, req.body.active !== false, req.params.id];
  const sql = isCat ? 'update categories set name=$1,slug=$2,description=$3,active=$4 where id=$5 returning *'
                    : 'update brands set name=$1,slug=$2,active=$3 where id=$4 returning *';
  const { rows } = await query(sql, params);
  if (!rows.length) throw httpError(404, 'Registro no encontrado');
  res.json(rows[0]);
});

const storage = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw httpError(503, 'Configura Supabase Storage en el servidor');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    .storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'dsm-products');
};

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Selecciona una imagen JPG, PNG o WebP');
  const product = await query('select id from products where id=$1', [req.params.id]);
  if (!product.rowCount) throw httpError(404, 'Producto no encontrado');
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[req.file.mimetype];
  if (!ext) throw httpError(400, 'Formato no permitido');
  const path = `products/${req.params.id}/${crypto.randomUUID()}.${ext}`;
  const bucket = storage();
  const upload = await bucket.upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
  if (upload.error) throw httpError(502, `No se pudo subir la imagen: ${upload.error.message}`);
  const url = bucket.getPublicUrl(path).data.publicUrl;
  try {
    const { rows } = await query(
      'insert into product_images(product_id,url,storage_path,alt_text,position) values($1,$2,$3,$4,(select coalesce(max(position)+1,0) from product_images where product_id=$1)) returning *',
      [req.params.id, url, path, req.body.alt_text || null]);
    res.status(201).json(rows[0]);
  } catch (e) { await bucket.remove([path]); throw e; }
});

export const deleteImage = asyncHandler(async (req, res) => {
  const { rows } = await query('select * from product_images where id=$1 and product_id=$2', [req.params.imageId, req.params.id]);
  if (!rows.length) throw httpError(404, 'Imagen no encontrada');
  if (rows[0].storage_path) {
    const result = await storage().remove([rows[0].storage_path]);
    if (result.error) throw httpError(502, 'No se pudo borrar del almacenamiento');
  }
  await query('delete from product_images where id=$1', [req.params.imageId]);
  res.json({ ok: true });
});
