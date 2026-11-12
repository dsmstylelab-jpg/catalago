import { query } from '../config/db.js';
import { asyncHandler, httpError } from '../utils/common.js';

const base = `select p.id,p.name,p.slug,p.description,p.fit,p.gender,p.material,p.care,p.featured,p.active,p.created_at,
 b.id as brand_id,b.name as brand,c.id as category_id,c.name as category,c.slug as category_slug,
 (select i.url from product_images i where i.product_id=p.id order by i.position,i.created_at limit 1) as image,
 (select i.url from product_images i where i.product_id=p.id order by i.position,i.created_at offset 1 limit 1) as image2,
 (select min(v.price) from product_variants v where v.product_id=p.id and v.active=true) as min_price,
 (select coalesce(sum(v.stock),0) from product_variants v where v.product_id=p.id and v.active=true) as total_stock
 from products p join brands b on b.id=p.brand_id join categories c on c.id=p.category_id`;

const ORDERS = {
  newest: 'created_at desc',
  name: 'name asc',
  price_asc: 'min_price asc nulls last',
  price_desc: 'min_price desc nulls last'
};

export const listProducts = asyncHandler(async (req, res) => {
  const { q = '', category = '', brand = '', size = '', gender = '', sort = 'newest', featured = '', page = '1', limit = '12' } = req.query;
  const clauses = ['p.active=true', 'b.active=true', 'c.active=true'];
  const params = [];
  // "?" se reemplaza en todas sus apariciones por el mismo parámetro posicional.
  const add = (sql, val) => { params.push(val); clauses.push(sql.replaceAll('?', `$${params.length}`)); };

  if (q) add('(p.name ilike ? or b.name ilike ? or c.name ilike ?)', `%${q}%`);
  if (category) add('c.slug=?', category);
  if (brand) add('b.slug=?', brand);
  if (gender) add("(p.gender=? or p.gender='unisex')", gender);
  if (featured === 'true') clauses.push('p.featured=true');
  if (size) add('exists(select 1 from product_variants vv where vv.product_id=p.id and vv.size=? and vv.active=true and vv.stock>0)', size);

  const where = clauses.join(' and ');
  const safePage = Math.max(1, Number.parseInt(page) || 1);
  const safeLimit = Math.min(48, Math.max(1, Number.parseInt(limit) || 12));
  const order = ORDERS[sort] || ORDERS.newest;

  const count = await query(
    `select count(*)::int as total from products p join brands b on b.id=p.brand_id join categories c on c.id=p.category_id where ${where}`, params);
  const data = await query(
    `select * from (${base} where ${where}) items order by ${order} limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, safeLimit, (safePage - 1) * safeLimit]);
  res.json({ items: data.rows, total: count.rows[0].total, page: safePage, pages: Math.ceil(count.rows[0].total / safeLimit) });
});

const SIZE_ORDER = "array_position(array['XXS','XS','S','M','L','XL','XXL','XXXL'],size)";

export const getProduct = asyncHandler(async (req, res) => {
  const { rows } = await query(`${base} where p.slug=$1 and p.active=true`, [req.params.slug]);
  if (!rows.length) throw httpError(404, 'Producto no encontrado');
  const [images, variants] = await Promise.all([
    query('select id,url,alt_text,position from product_images where product_id=$1 order by position,created_at', [rows[0].id]),
    query(`select id,size,color,sku,price,compare_at_price,stock from product_variants where product_id=$1 and active=true order by color,${SIZE_ORDER} nulls last,size`, [rows[0].id])
  ]);
  res.json({ ...rows[0], images: images.rows, variants: variants.rows });
});

export const taxonomy = asyncHandler(async (req, res) => {
  const [categories, brands] = await Promise.all([
    query('select id,name,slug,description from categories where active=true order by name'),
    query('select id,name,slug from brands where active=true order by name')
  ]);
  res.json({ categories: categories.rows, brands: brands.rows });
});
