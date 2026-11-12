import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, Building2, Layers, LogOut, Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, Menu, X, ImagePlus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, money, SIZES } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Brand from '../components/Brand';

const blankVariant = () => ({ size: 'M', color: '', sku: '', price: '', compare_at_price: '', stock: 0, active: true });
const blankProduct = () => ({ name: '', slug: '', brand_id: '', category_id: '', description: '', fit: 'Oversize', gender: 'unisex', material: '', care: '', featured: false, active: true, variants: [blankVariant()] });
const LINKS = [['dashboard', 'Resumen', LayoutDashboard], ['products', 'Prendas', Package], ['categories', 'Categorías', Tags], ['brands', 'Marcas', Building2]];
const HEADING = { dashboard: 'Resumen general', products: 'Gestión de prendas', categories: 'Categorías', brands: 'Marcas' };

export default function Admin() {
  const [view, setView] = useState('dashboard'), [mobile, setMobile] = useState(false);
  const [dashboard, setDashboard] = useState(null), [products, setProducts] = useState([]), [brands, setBrands] = useState([]), [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null), [taxEdit, setTaxEdit] = useState(null);
  const [form, setForm] = useState(blankProduct()), [taxForm, setTaxForm] = useState({ name: '', description: '', active: true });
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState(null), [query, setQuery] = useState('');
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [d, p, b, c] = await Promise.all([api.get('/admin/dashboard', true), api.get('/admin/products', true), api.get('/admin/brands', true), api.get('/admin/categories', true)]);
      setDashboard(d); setProducts(p); setBrands(b); setCategories(c);
    } catch (e) { setNotice({ message: e.message, error: true }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const msg = (message, error = false) => { setNotice({ message, error }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const changeView = (v) => { setView(v); setMobile(false); setEditing(null); setTaxEdit(null); setQuery(''); };
  const startCreate = () => { setForm(blankProduct()); setEditing('new'); setFile(null); };
  const startEdit = (p) => {
    setForm({ ...p, variants: p.variants.filter((v) => v.active).map((v) => ({ ...v, price: String(v.price), compare_at_price: v.compare_at_price ?? '' })) });
    setEditing(p.id); setFile(null);
  };
  const field = (k, v) => setForm((old) => ({ ...old, [k]: v }));
  const variantField = (i, k, v) => setForm((old) => ({ ...old, variants: old.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  async function save(e) {
    e.preventDefault(); setBusy(true);
    try {
      let id = editing;
      const body = { ...form, variants: form.variants.map((v) => ({ ...v, sku: String(v.sku).trim() })) };
      if (editing === 'new') { const d = await api.post('/admin/products', body, true); id = d.id; }
      else await api.put(`/admin/products/${editing}`, body, true);
      if (file) await api.upload(`/admin/products/${id}/images`, file);
      await load(); setEditing(null); setFile(null); msg('Prenda guardada correctamente.');
    } catch (err) { msg(err.message, true); } finally { setBusy(false); }
  }
  async function status(p) {
    try { await api.patch(`/admin/products/${p.id}/status`, { active: !p.active }, true); await load(); msg('Estado actualizado.'); }
    catch (e) { msg(e.message, true); }
  }
  async function removeImage(im) {
    if (!window.confirm('¿Eliminar esta imagen?')) return;
    try { await api.delete(`/admin/products/${editing}/images/${im.id}`, true); setForm((old) => ({ ...old, images: old.images.filter((x) => x.id !== im.id) })); await load(); msg('Imagen eliminada.'); }
    catch (e) { msg(e.message, true); }
  }
  async function addImage() {
    if (!file || editing === 'new') return;
    setBusy(true);
    try { const im = await api.upload(`/admin/products/${editing}/images`, file); setForm((old) => ({ ...old, images: [...(old.images || []), im] })); setFile(null); await load(); msg('Imagen subida correctamente.'); }
    catch (e) { msg(e.message, true); } finally { setBusy(false); }
  }
  function startTax(row) { setTaxEdit(row?.id || 'new'); setTaxForm(row ? { ...row } : { name: '', description: '', active: true }); }
  async function saveTax(e) {
    e.preventDefault(); setBusy(true);
    try {
      if (taxEdit === 'new') await api.post(`/admin/${view}`, taxForm, true); else await api.put(`/admin/${view}/${taxEdit}`, taxForm, true);
      await load(); setTaxEdit(null); msg(`${view === 'brands' ? 'Marca' : 'Categoría'} guardada.`);
    } catch (err) { msg(err.message, true); } finally { setBusy(false); }
  }
  async function flipTax(row) {
    try { await api.put(`/admin/${view}/${row.id}`, { ...row, active: !row.active }, true); await load(); msg('Estado actualizado.'); }
    catch (err) { msg(err.message, true); }
  }
  async function leave() { await logout(); navigate('/login', { replace: true }); }

  const minPrice = (p) => { const prices = p.variants.filter((v) => v.active).map((v) => Number(v.price)); return prices.length ? money(Math.min(...prices)) : '—'; };
  const activeCount = (p) => p.variants.filter((v) => v.active).length;

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${mobile ? 'show' : ''}`}>
        <div className="admin-sidebar-brand"><Brand light /><button className="admin-mobile-close" aria-label="Cerrar menú" onClick={() => setMobile(false)}><X size={22} /></button></div>
        <div className="sidebar-group-label">Administración</div>
        <nav>{LINKS.map(([key, label, Icon]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => changeView(key)}><Icon size={19} strokeWidth={1.8} />{label}</button>)}</nav>
        <div className="sidebar-bottom"><Link to="/"><ArrowLeft size={18} /> Ver tienda</Link><button onClick={leave}><LogOut size={18} /> Cerrar sesión</button></div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <button className="admin-burger" aria-label="Abrir menú" onClick={() => setMobile(true)}><Menu size={22} /></button>
          <span>Panel / {HEADING[view]}</span>
          <div className="admin-profile"><span>{admin?.name}</span><div>{admin?.name?.[0]?.toUpperCase() || 'A'}</div></div>
        </header>

        <div className="admin-content">
          {notice && (
            <div className={`alert alert-${notice.error ? 'danger' : 'success'} d-flex justify-content-between align-items-center`} role="alert">
              <span>{notice.error ? <AlertCircle size={18} className="me-2" /> : <CheckCircle2 size={18} className="me-2" />}{notice.message}</span>
              <button className="btn-close" aria-label="Cerrar" onClick={() => setNotice(null)} />
            </div>
          )}
          <div className="admin-heading">
            <div><h1>{HEADING[view]}</h1><p>Gestiona el catálogo de DSM Style Lab.</p></div>
            {view === 'products' && !editing && <button className="btn-dsm btn-dark" onClick={startCreate}><Plus size={18} /> Nueva prenda</button>}
            {['brands', 'categories'].includes(view) && !taxEdit && <button className="btn-dsm btn-dark" onClick={() => startTax()}><Plus size={18} /> {view === 'brands' ? 'Nueva marca' : 'Nueva categoría'}</button>}
          </div>

          {view === 'dashboard' && (<>
            <div className="row g-3">
              {[['Prendas activas', dashboard?.products, Package], ['Tallas y colores', dashboard?.variants, Layers], ['Marcas', dashboard?.brands, Building2], ['Categorías', dashboard?.categories, Tags]].map(([name, num, Icon]) => (
                <div key={name} className="col-6 col-xl-3"><div className="stat-card"><Icon size={23} strokeWidth={1.6} /><div className="stat-number">{num ?? '—'}</div><div className="stat-name">{name}</div></div></div>
              ))}
            </div>
            <div className="admin-panel mt-4">
              <h3>Stock bajo (5 o menos)</h3>
              {dashboard?.lowStock?.length ? (
                <div className="table-responsive"><table className="table admin-table"><thead><tr><th>Prenda</th><th>Color · Talla</th><th>Stock</th></tr></thead>
                  <tbody>{dashboard.lowStock.map((v, i) => <tr key={i}><td>{v.name}</td><td>{v.color} · {v.size}</td><td><span className="status status-off">{v.stock} disponibles</span></td></tr>)}</tbody></table></div>
              ) : <p className="text-muted mb-0">No hay variantes con stock bajo.</p>}
            </div>
          </>)}

          {view === 'products' && (editing ? (
            <div className="admin-panel editor-panel">
              <button className="back-link mb-4" onClick={() => setEditing(null)}><ArrowLeft size={16} /> Volver a prendas</button>
              <h3>{editing === 'new' ? 'Nueva prenda' : 'Editar prenda'}</h3>
              <form onSubmit={save}>
                <div className="row g-3">
                  <div className="col-md-8"><label>Nombre *</label><input required className="form-control" value={form.name} onChange={(e) => field('name', e.target.value)} /></div>
                  <div className="col-md-4"><label>Slug (opcional)</label><input className="form-control" value={form.slug || ''} onChange={(e) => field('slug', e.target.value)} placeholder="Se genera solo" /></div>
                  <div className="col-md-6"><label>Marca *</label>
                    <select required className="form-select" value={form.brand_id} onChange={(e) => field('brand_id', e.target.value)}><option value="">Seleccionar marca</option>{brands.filter((x) => x.active || x.id === form.brand_id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
                  <div className="col-md-6"><label>Categoría *</label>
                    <select required className="form-select" value={form.category_id} onChange={(e) => field('category_id', e.target.value)}><option value="">Seleccionar categoría</option>{categories.filter((x) => x.active || x.id === form.category_id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
                  <div className="col-12"><label>Descripción</label><textarea className="form-control" rows="4" value={form.description} onChange={(e) => field('description', e.target.value)} /></div>
                  <div className="col-md-6"><label>Corte</label><input className="form-control" value={form.fit || ''} onChange={(e) => field('fit', e.target.value)} placeholder="Oversize, Regular, Boxy…" /></div>
                  <div className="col-md-6"><label>Para</label>
                    <select className="form-select" value={form.gender} onChange={(e) => field('gender', e.target.value)}><option value="unisex">Unisex</option><option value="hombre">Hombre</option><option value="mujer">Mujer</option></select></div>
                  <div className="col-md-6"><label>Material</label><input className="form-control" value={form.material || ''} onChange={(e) => field('material', e.target.value)} placeholder="100% algodón peinado 240 g" /></div>
                  <div className="col-md-6"><label>Cuidado</label><input className="form-control" value={form.care || ''} onChange={(e) => field('care', e.target.value)} placeholder="Lavar del revés, agua fría" /></div>
                  <div className="col-12 d-flex gap-4">
                    <label className="check-row"><input type="checkbox" checked={!!form.featured} onChange={(e) => field('featured', e.target.checked)} /> Destacado en inicio</label>
                    <label className="check-row"><input type="checkbox" checked={form.active !== false} onChange={(e) => field('active', e.target.checked)} /> Activo</label>
                  </div>
                </div>

                <div className="editor-section-head"><h4>Tallas, colores y precios</h4>
                  <button type="button" onClick={() => field('variants', [...form.variants, { ...blankVariant(), color: form.variants.at(-1)?.color || '' }])}><Plus size={16} /> Agregar variante</button></div>
                <datalist id="sizes">{SIZES.map((s) => <option key={s} value={s} />)}</datalist>
                {form.variants.map((v, i) => (
                  <div className="variant-editor" key={v.id || i}>
                    <div className="row g-2">
                      <div className="col-md-2"><label>Talla</label><input list="sizes" required className="form-control" value={v.size} onChange={(e) => variantField(i, 'size', e.target.value)} /></div>
                      <div className="col-md-2"><label>Color</label><input required className="form-control" value={v.color} onChange={(e) => variantField(i, 'color', e.target.value)} placeholder="Negro" /></div>
                      <div className="col-md-2"><label>SKU único</label><input required className="form-control" value={v.sku} onChange={(e) => variantField(i, 'sku', e.target.value)} /></div>
                      <div className="col-md-2"><label>Precio S/</label><input type="number" min="0" step="0.01" required className="form-control" value={v.price} onChange={(e) => variantField(i, 'price', e.target.value)} /></div>
                      <div className="col-md-2"><label>Precio antes</label><input type="number" min="0" step="0.01" className="form-control" value={v.compare_at_price} onChange={(e) => variantField(i, 'compare_at_price', e.target.value)} /></div>
                      <div className="col-md-1"><label>Stock</label><input type="number" min="0" step="1" required className="form-control" value={v.stock} onChange={(e) => variantField(i, 'stock', e.target.value)} /></div>
                      <div className="col-md-1 d-flex align-items-end"><button type="button" title="Quitar variante" className="trash-btn" disabled={form.variants.length === 1} onClick={() => field('variants', form.variants.filter((_, j) => i !== j))}><Trash2 size={18} /></button></div>
                    </div>
                  </div>
                ))}

                <div className="editor-section-head"><h4>Fotos de la prenda</h4></div>
                {form.images?.length > 0 && <div className="admin-images">{form.images.map((im) => <div key={im.id}><img src={im.url} alt="Foto de la prenda" /><button type="button" title="Eliminar imagen" onClick={() => removeImage(im)}><X size={16} /></button></div>)}</div>}
                <p className="text-muted small">JPG, PNG o WebP, hasta 5 MB. La primera foto es la principal y la segunda aparece al pasar el cursor. {editing === 'new' ? 'La foto se sube al guardar.' : 'Puedes subir varias.'}</p>
                <div className="upload-row">
                  <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {editing !== 'new' && <button type="button" className="btn-outline-admin" disabled={!file || busy} onClick={addImage}><ImagePlus size={17} /> Subir foto</button>}
                </div>
                <div className="editor-actions">
                  <button type="button" className="btn-outline-admin" onClick={() => setEditing(null)}>Cancelar</button>
                  <button type="submit" className="btn-dsm btn-dark" disabled={busy}>{busy ? 'Guardando…' : 'Guardar prenda'}</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="admin-panel">
              <div className="admin-search"><Search size={18} /><input placeholder="Buscar por prenda o marca…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
              <div className="table-responsive"><table className="table admin-table">
                <thead><tr><th>Prenda</th><th>Categoría</th><th>Variantes</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{products.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase())).map((p) => (
                  <tr key={p.id}>
                    <td><div className="admin-product-cell">{p.image ? <img src={p.image} alt="" /> : <div className="table-fallback">D</div>}<div><b>{p.name}</b><small>{p.brand}</small></div></div></td>
                    <td>{p.category}</td>
                    <td>{activeCount(p)}<small className="d-block text-muted">Desde {minPrice(p)}</small></td>
                    <td><span className={`status ${p.active ? 'status-on' : 'status-off'}`}>{p.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td><div className="row-actions"><button title="Editar" onClick={() => startEdit(p)}><Pencil size={17} /></button><button title={p.active ? 'Inhabilitar' : 'Reactivar'} onClick={() => status(p)}>{p.active ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></td>
                  </tr>))}</tbody>
              </table>{!products.length && <div className="p-4 text-center text-muted">Aún no hay prendas. Agrega la primera.</div>}</div>
            </div>
          ))}

          {['brands', 'categories'].includes(view) && (taxEdit ? (
            <div className="admin-panel editor-panel tax-editor">
              <button className="back-link mb-4" onClick={() => setTaxEdit(null)}><ArrowLeft size={16} /> Volver</button>
              <h3>{taxEdit === 'new' ? 'Nuevo registro' : 'Editar registro'}</h3>
              <form onSubmit={saveTax}>
                <label>Nombre *</label><input className="form-control mb-3" required value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} />
                {view === 'categories' && <><label>Descripción</label><textarea className="form-control mb-3" value={taxForm.description || ''} onChange={(e) => setTaxForm({ ...taxForm, description: e.target.value })} /></>}
                {taxEdit !== 'new' && <label className="check-row"><input type="checkbox" checked={taxForm.active !== false} onChange={(e) => setTaxForm({ ...taxForm, active: e.target.checked })} /> Activo</label>}
                <div className="editor-actions"><button className="btn-outline-admin" type="button" onClick={() => setTaxEdit(null)}>Cancelar</button><button className="btn-dsm btn-dark" disabled={busy}>Guardar</button></div>
              </form>
            </div>
          ) : (
            <div className="admin-panel">
              <div className="admin-search"><Search size={18} /><input placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
              <div className="table-responsive"><table className="table admin-table">
                <thead><tr><th>Nombre</th><th>Slug</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{(view === 'brands' ? brands : categories).filter((x) => x.name.toLowerCase().includes(query.toLowerCase())).map((x) => (
                  <tr key={x.id}><td><b>{x.name}</b></td><td>{x.slug}</td>
                    <td><span className={`status ${x.active ? 'status-on' : 'status-off'}`}>{x.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td><div className="row-actions"><button title="Editar" onClick={() => startTax(x)}><Pencil size={17} /></button><button title={x.active ? 'Inhabilitar' : 'Reactivar'} onClick={() => flipTax(x)}>{x.active ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></td></tr>))}</tbody>
              </table></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
