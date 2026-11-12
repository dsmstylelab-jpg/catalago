import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, SIZES } from '../api/client';
import ProductCard from '../components/ProductCard';

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [tax, setTax] = useState({ categories: [], brands: [] });
  const [result, setResult] = useState({ items: [], pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const category = params.get('categoria') || '', brand = params.get('marca') || '', size = params.get('talla') || '';
  const gender = params.get('genero') || '', sort = params.get('orden') || 'newest', q = params.get('q') || '';
  const page = Number(params.get('pagina') || 1);

  const set = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'pagina') next.delete('pagina');
    setParams(next);
  };
  useEffect(() => { api.get('/taxonomy').then(setTax).catch(() => {}); }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    const qp = new URLSearchParams({ page: String(page), limit: '12', sort, q });
    if (category) qp.set('category', category);
    if (brand) qp.set('brand', brand);
    if (size) qp.set('size', size);
    if (gender) qp.set('gender', gender);
    api.get(`/products?${qp}`).then((d) => { if (!cancelled) setResult(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, brand, size, gender, sort, q, page]);

  const Chip = ({ active, onClick, children }) => <button className={active ? 'selected' : ''} onClick={onClick}>{children}</button>;

  return (
    <>
      <div className="page-intro">
        <div className="container-wide"><h1>Catálogo</h1><p>Filtra por prenda, talla o corte.</p></div>
      </div>
      <div className="container-wide catalog-layout">
        <aside className="filters-panel">
          <div className="filter-title"><SlidersHorizontal size={17} /><b>Filtros</b></div>
          <label className="filter-label" htmlFor="global-search">Buscar</label>
          <div className="search-field"><Search size={17} /><input id="global-search" value={q} onChange={(e) => set('q', e.target.value)} placeholder="Polo, hoodie, cargo…" /></div>
          <span className="filter-label">Prenda</span>
          <div className="filter-options">
            <Chip active={!category} onClick={() => set('categoria', '')}>Todas</Chip>
            {tax.categories.map((c) => <Chip key={c.id} active={category === c.slug} onClick={() => set('categoria', c.slug)}>{c.name}</Chip>)}
          </div>
          <span className="filter-label">Talla</span>
          <div className="size-chips">
            {SIZES.map((s) => <button key={s} className={size === s ? 'selected' : ''} onClick={() => set('talla', size === s ? '' : s)}>{s}</button>)}
          </div>
          <span className="filter-label">Para</span>
          <div className="filter-options">
            <Chip active={!gender} onClick={() => set('genero', '')}>Todos</Chip>
            <Chip active={gender === 'hombre'} onClick={() => set('genero', 'hombre')}>Hombre</Chip>
            <Chip active={gender === 'mujer'} onClick={() => set('genero', 'mujer')}>Mujer</Chip>
          </div>
          {tax.brands.length > 1 && (<>
            <label className="filter-label" htmlFor="brand-select">Marca</label>
            <select id="brand-select" className="form-select" value={brand} onChange={(e) => set('marca', e.target.value)}>
              <option value="">Todas las marcas</option>
              {tax.brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
            </select>
          </>)}
          <button className="reset-filters" onClick={() => setParams({})}><RotateCcw size={15} /> Limpiar filtros</button>
        </aside>

        <div className="catalog-content">
          <div className="catalog-toolbar">
            <span>{loading ? 'Buscando…' : `${result.total} prenda${result.total === 1 ? '' : 's'}`}</span>
            <div className="sort-control">
              <label htmlFor="sort">Ordenar</label>
              <select id="sort" value={sort} onChange={(e) => set('orden', e.target.value)}>
                <option value="newest">Más recientes</option>
                <option value="name">Nombre A-Z</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
              </select>
            </div>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? <div className="catalog-loading">Cargando prendas…</div>
            : result.items.length ? <div className="row g-3 g-lg-4">{result.items.map((p) => <div className="col-6 col-xl-4" key={p.id}><ProductCard product={p} /></div>)}</div>
            : <div className="catalog-loading"><h3>No hay prendas con esos filtros</h3><p>Quita un filtro o prueba otra talla.</p><button className="btn-dsm btn-dark" onClick={() => setParams({})}>Ver todo</button></div>}
          {result.pages > 1 && (
            <div className="pagination-dsm">
              <button aria-label="Página anterior" disabled={page <= 1} onClick={() => set('pagina', String(page - 1))}><ChevronLeft size={18} /></button>
              <span>{page} de {result.pages}</span>
              <button aria-label="Página siguiente" disabled={page >= result.pages} onClick={() => set('pagina', String(page + 1))}><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
