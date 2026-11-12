import { Link } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Trash2, ArrowLeft, MessageCircle } from 'lucide-react';
import { money } from '../api/client';
import { useCart } from '../contexts/CartContext';

const WHATSAPP = (import.meta.env.VITE_WHATSAPP || '').replace(/\D/g, '');

export default function Cart() {
  const { items, change, remove, clear, total } = useCart();
  const order = () => {
    const lines = items.map((x) => `• ${x.quantity} x ${x.name} (${x.color}, talla ${x.size}) — ${money(x.price * x.quantity)}`);
    const text = `Hola DSM Style Lab, quiero hacer este pedido:\n${lines.join('\n')}\n\nTotal referencial: ${money(total)}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  return (
    <div className="container-wide cart-page">
      <h1>Mi carrito</h1>
      {!items.length ? (
        <div className="empty-cart">
          <ShoppingBag size={44} strokeWidth={1.3} />
          <h2>Tu carrito está vacío</h2>
          <p>Elige una prenda y su talla para empezar.</p>
          <Link className="btn-dsm btn-dark" to="/catalogo">Ver catálogo</Link>
        </div>
      ) : (
        <div className="row g-5">
          <div className="col-lg-8">
            {items.map((x) => (
              <div className="cart-row" key={x.variantId}>
                <div className="cart-thumb">{x.image ? <img src={x.image} alt={x.name} /> : <span>DSM</span>}</div>
                <div className="cart-row-data">
                  <span className="small-label">{x.brand}</span>
                  <h3>{x.slug ? <Link to={`/producto/${x.slug}`}>{x.name}</Link> : x.name}</h3>
                  <p>{x.color} · Talla {x.size}</p>
                  <button className="cart-remove" onClick={() => remove(x.variantId)}><Trash2 size={15} /> Quitar</button>
                </div>
                <div className="cart-row-right">
                  <strong>{money(x.price * x.quantity)}</strong>
                  <div className="qty-control">
                    <button aria-label="Reducir" disabled={x.quantity <= 1} onClick={() => change(x.variantId, x.quantity - 1)}><Minus size={14} /></button>
                    <span>{x.quantity}</span>
                    <button aria-label="Aumentar" disabled={x.quantity >= x.stock} onClick={() => change(x.variantId, x.quantity + 1)}><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            <Link to="/catalogo" className="back-link mt-4"><ArrowLeft size={16} /> Seguir comprando</Link>
          </div>
          <div className="col-lg-4">
            <div className="cart-summary">
              <h3>Resumen</h3>
              <div><span>Subtotal</span><strong>{money(total)}</strong></div>
              <div><span>Envío</span><span>Se coordina por WhatsApp</span></div>
              <div className="summary-total"><span>Total referencial</span><strong>{money(total)}</strong></div>
              {WHATSAPP
                ? <button className="btn-dsm btn-cobalt w-100 justify-content-center" onClick={order}><MessageCircle size={18} /> Pedir por WhatsApp</button>
                : <div className="checkout-disabled">Configura VITE_WHATSAPP para activar el pedido</div>}
              <p>No se cobra en la web. Confirmamos stock, envío y forma de pago por WhatsApp.</p>
              <button className="clear-cart" onClick={clear}>Vaciar carrito</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
