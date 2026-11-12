import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Menu, Instagram, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Brand from './Brand';
import { useCart } from '../contexts/CartContext';

const NAV = [['/', 'Inicio'], ['/catalogo', 'Todo'], ['/catalogo?categoria=polos', 'Polos'], ['/catalogo?categoria=hoodies', 'Hoodies'], ['/catalogo?categoria=casacas', 'Casacas'], ['/catalogo?categoria=pantalones', 'Pantalones']];

export default function Layout({ children }) {
  const { count } = useCart();
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();
  const close = () => setMobile(false);
  return (
    <>
      <div className="announcement">Hecho en Lima · Nuevas tallas cada semana</div>
      <header className="site-header">
        <div className="container-wide header-inner">
          <Brand />
          <nav className={`main-nav ${mobile ? 'show' : ''}`}>
            {NAV.map(([to, label]) => <NavLink key={to} end={to === '/'} onClick={close} to={to}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <button aria-label="Buscar prendas" className="icon-btn" onClick={() => { navigate('/catalogo'); setTimeout(() => document.getElementById('global-search')?.focus(), 50); }}><Search size={21} strokeWidth={1.8} /></button>
            <Link to="/carrito" aria-label="Carrito" className="icon-btn cart-icon"><ShoppingBag size={21} strokeWidth={1.8} />{count > 0 && <b>{count}</b>}</Link>
            <button aria-label="Menú" className="icon-btn menu-toggle" onClick={() => setMobile(!mobile)}><Menu size={23} /></button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="container-wide">
          <div className="row g-5">
            <div className="col-lg-5">
              <Brand light />
              <p className="footer-description">Ropa urbana diseñada y probada en Lima. Cortes oversize, telas pesadas y tirajes cortos.</p>
              <span className="footer-social"><Instagram size={19} /> @dsmstylelab</span>
            </div>
            <div className="col-6 col-lg-3">
              <h5>Comprar</h5>
              <Link to="/catalogo">Todas las prendas</Link>
              <Link to="/catalogo?categoria=polos">Polos</Link>
              <Link to="/catalogo?categoria=hoodies">Hoodies</Link>
              <Link to="/catalogo?categoria=accesorios">Accesorios</Link>
            </div>
            <div className="col-6 col-lg-4">
              <h5>Información</h5>
              <Link to="/login">Acceso administrativo</Link>
              <Link to="/registro">Crear cuenta</Link>
              <p className="footer-note"><ShieldCheck size={16} /> Los pedidos se confirman por WhatsApp. No se cobra en la web.</p>
            </div>
          </div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} DSM Style Lab. Todos los derechos reservados.</span><span>Lima, Perú</span></div>
        </div>
      </footer>
    </>
  );
}
