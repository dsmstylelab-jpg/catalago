import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Ruler, MessageCircle, Scissors } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';

const CATS = [
  ['polos', 'Polos', 'Algodón pesado, corte boxy'],
  ['hoodies', 'Hoodies', 'Oversize, felpa de 320 g'],
  ['casacas', 'Casacas', 'Capas para la calle'],
  ['pantalones', 'Pantalones', 'Cargo, jogger y denim']
];

export default function Home() {
  const [products, setProducts] = useState([]);
  useEffect(() => { api.get('/products?featured=true&limit=8').then((d) => setProducts(d.items)).catch(() => {}); }, []);
  return (
    <>
      <section className="hero">
        <div className="container-wide hero-grid">
          <div className="hero-copy">
            <h1>Ropa que se prueba<br />en la calle.</h1>
            <p>DSM Style Lab diseña polos, hoodies y casacas en tirajes cortos. Cada prenda sale del taller con su talla, su corte y su ficha de cuidado.</p>
            <div className="hero-actions">
              <Link className="btn-dsm btn-cobalt" to="/catalogo">Ver la colección <ArrowUpRight size={18} /></Link>
              <Link className="btn-dsm btn-line" to="/catalogo?categoria=hoodies">Comprar hoodies</Link>
            </div>
          </div>
          <div className="hero-tag" aria-hidden="true">
            <div className="tag-hole" />
            <div className="tag-body">
              <b>DSM</b><span>STYLE LAB</span>
              <dl><dt>Lote</dt><dd>0{new Date().getMonth() + 1} / {new Date().getFullYear()}</dd><dt>Corte</dt><dd>Oversize</dd><dt>Tallas</dt><dd>S – XXL</dd><dt>Origen</dt><dd>Lima, PE</dd></dl>
            </div>
          </div>
        </div>
      </section>

      <section className="promise-strip">
        <div className="container-wide promise-items">
          <div><Ruler size={22} strokeWidth={1.6} /><span>Guía de tallas en cada prenda</span></div>
          <div><Scissors size={22} strokeWidth={1.6} /><span>Tirajes cortos, sin reposición</span></div>
          <div><MessageCircle size={22} strokeWidth={1.6} /><span>Confirmas tu pedido por WhatsApp</span></div>
        </div>
      </section>

      <section className="section-block container-wide">
        <div className="section-heading"><h2>Elige por prenda</h2><p>Cuatro líneas base. Cada una con varias tallas y colores.</p></div>
        <div className="category-grid">
          {CATS.map(([slug, name, desc]) => (
            <Link key={slug} className={`category-tile cat-${slug}`} to={`/catalogo?categoria=${slug}`}>
              <h3>{name}</h3><p>{desc}</p><ArrowUpRight size={26} />
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block products-section">
        <div className="container-wide">
          <div className="section-heading"><h2>Últimos drops</h2><Link className="text-link" to="/catalogo">Ver todo el catálogo <ArrowUpRight size={18} /></Link></div>
          {products.length ? (
            <div className="row g-3 g-lg-4">{products.map((p) => <div key={p.id} className="col-6 col-lg-3"><ProductCard product={p} /></div>)}</div>
          ) : (
            <div className="empty-curation">
              <h3>El próximo drop está en el taller</h3>
              <p>Las prendas destacadas aparecerán aquí cuando las marques como “Destacado” en el panel.</p>
              <Link className="text-link" to="/catalogo">Explorar catálogo <ArrowUpRight size={18} /></Link>
            </div>
          )}
        </div>
      </section>

      <section className="closing-band">
        <div className="container-wide">
          <h2>¿No sabes qué talla pedir?</h2>
          <p>Escríbenos con tu altura y peso y te recomendamos talla y corte por WhatsApp.</p>
          <Link className="btn-dsm btn-cobalt" to="/catalogo">Empezar a elegir <ArrowUpRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}
