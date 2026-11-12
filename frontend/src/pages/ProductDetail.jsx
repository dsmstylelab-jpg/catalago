import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, ShoppingBag, Ruler } from 'lucide-react';
import { api, money, SIZES } from '../api/client';
import { useCart } from '../contexts/CartContext';
import { Placeholder } from '../components/ProductCard';

const sizeRank = (s) => { const i = SIZES.indexOf(s); return i === -1 ? 99 : i; };

export default function ProductDetail() {
  const { slug } = useParams();
  const { add } = useCart();
  const [p, setP] = useState(null);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [img, setImg] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setP(null); setError(''); setImg(0);
    api.get(`/products/${encodeURIComponent(slug)}`).then((d) => {
      setP(d);
      const first = d.variants.find((v) => v.stock > 0) || d.variants[0];
      setColor(first?.color || ''); setSize(first?.size || '');
    }).catch((e) => setError(e.message));
  }, [slug]);

  const colors = useMemo(() => [...new Set((p?.variants || []).map((v) => v.color))], [p]);
  const sizesForColor = useMemo(
    () => (p?.variants || []).filter((v) => v.color === color).sort((a, b) => sizeRank(a.size) - sizeRank(b.size)), [p, color]);

  if (error) return <div className="container-wide py-5"><p>{error}</p><Link to="/catalogo">Volver al catálogo</Link></div>;
  if (!p) return <div className="container-wide py-5">Cargando prenda…</div>;

  const variant = p.variants.find((v) => v.color === color && v.size === size);
  const images = p.images.length ? p.images : [];
  const pickColor = (c) => {
    setColor(c);
    const options = p.variants.filter((v) => v.color === c);
    if (!options.some((v) => v.size === size && v.stock > 0)) setSize((options.find((v) => v.stock > 0) || options[0])?.size || '');
  };
  const onSale = variant?.compare_at_price && Number(variant.compare_at_price) > Number(variant.price);

  return (
    <div className="container-wide detail-page">
      <Link to="/catalogo" className="back-link"><ArrowLeft size={16} /> Volver al catálogo</Link>
      <div className="row gx-lg-5 gy-5">
        <div className="col-lg-7">
          <div className="detail-image">{images[img] ? <img src={images[img].url} alt={images[img].alt_text || p.name} /> : <Placeholder label={p.name} />}</div>
          {images.length > 1 && <div className="detail-thumbs">{images.map((im, i) => <button key={im.id} className={i === img ? 'active' : ''} onClick={() => setImg(i)} aria-label={`Foto ${i + 1}`}><img src={im.url} alt="" /></button>)}</div>}
        </div>
        <div className="col-lg-5 detail-content">
          <p className="detail-crumb">{p.brand} · {p.category}</p>
          <h1>{p.name}</h1>
          <p className="detail-type">{[p.fit, p.gender].filter(Boolean).join(' · ')}</p>
          <div className="detail-price">
            <h2>{variant ? money(variant.price) : 'Consultar'}</h2>
            {onSale && <s>{money(variant.compare_at_price)}</s>}
          </div>
          <p className="detail-description">{p.description || 'Prenda de edición limitada de DSM Style Lab.'}</p>

          <div className="variant-head">Color: <b>{color}</b></div>
          <div className="color-buttons">
            {colors.map((c) => <button key={c} className={c === color ? 'active' : ''} onClick={() => pickColor(c)}>{c}</button>)}
          </div>

          <div className="variant-head">Talla <span className="size-help"><Ruler size={14} /> Pregúntanos tu talla por WhatsApp</span></div>
          <div className="size-buttons">
            {sizesForColor.map((v) => (
              <button key={v.id} disabled={v.stock === 0} className={v.size === size ? 'active' : ''} onClick={() => setSize(v.size)}>{v.size}</button>
            ))}
          </div>
          {variant && <p className="stock-note">{variant.stock === 0 ? 'Sin stock en esta talla' : variant.stock <= 3 ? <><Check size={16} /> Quedan solo {variant.stock}</> : <><Check size={16} /> Disponible</>}</p>}

          <button disabled={!variant || variant.stock === 0} className="btn-dsm btn-cobalt detail-add"
            onClick={() => { add(p, variant); setMessage('Añadido al carrito'); setTimeout(() => setMessage(''), 3200); }}>
            <ShoppingBag size={19} /> Añadir al carrito
          </button>
          {message && <p className="success-note">{message}. <Link to="/carrito">Ver carrito</Link></p>}

          {(p.material || p.care) && (
            <dl className="spec-list">
              {p.material && <><dt>Material</dt><dd>{p.material}</dd></>}
              {p.fit && <><dt>Corte</dt><dd>{p.fit}</dd></>}
              {p.care && <><dt>Cuidado</dt><dd>{p.care}</dd></>}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
