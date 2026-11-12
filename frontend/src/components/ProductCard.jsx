import { Link } from 'react-router-dom';
import { money } from '../api/client';

export function Placeholder({ label = 'DSM' }) {
  return (
    <div className="product-fallback">
      <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M40 12 22 24 8 46l16 9 8-8v61h56V47l8 8 16-9-14-22-18-12c-3 9-10 14-20 14s-17-5-20-14Z" fill="currentColor" /></svg>
      <span>{label}</span>
    </div>
  );
}

export default function ProductCard({ product }) {
  const soldOut = Number(product.total_stock) === 0;
  return (
    <Link to={`/producto/${product.slug}`} className="product-card text-decoration-none">
      <div className="product-image">
        {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <Placeholder />}
        {product.image2 && <img className="alt-img" src={product.image2} alt="" loading="lazy" />}
        {product.featured && <span className="card-tag">Nuevo drop</span>}
        {soldOut && <span className="card-tag sold">Agotado</span>}
      </div>
      <div className="product-info">
        <small>{product.category}</small>
        <h3>{product.name}</h3>
        <p>{product.min_price != null ? `Desde ${money(product.min_price)}` : 'Próximamente'}</p>
      </div>
    </Link>
  );
}
