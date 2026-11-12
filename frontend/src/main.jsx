import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/site.css';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

function Public() { return <Layout><Outlet /></Layout>; }
function Protected() {
  const { admin, loading } = useAuth();
  if (loading) return <div className="page-loading">Cargando sesión…</div>;
  return admin ? <Outlet /> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Public />}>
              <Route index element={<Home />} />
              <Route path="catalogo" element={<Catalog />} />
              <Route path="producto/:slug" element={<ProductDetail />} />
              <Route path="carrito" element={<Cart />} />
              <Route path="registro" element={<Register />} />
            </Route>
            <Route path="login" element={<Login />} />
            <Route element={<Protected />}><Route path="admin/*" element={<Admin />} /></Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
