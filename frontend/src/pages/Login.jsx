import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await login({ email, password }); navigate('/admin', { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="auth-outer">
      <div className="auth-aside"><span>DSM STYLE LAB</span><h2>Panel del taller</h2><p>Acceso exclusivo para el equipo administrativo.</p></div>
      <div className="auth-main">
        <div className="auth-card">
          <Link className="back-link" to="/"><ArrowLeft size={16} /> Volver a la tienda</Link>
          <div className="auth-icon"><LockKeyhole size={24} /></div>
          <h1>Iniciar sesión</h1>
          <p>Ingresa tus credenciales de administrador.</p>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@dsmstylelab.com" />
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button className="btn-dsm btn-dark w-100 justify-content-center" disabled={busy}>{busy ? 'Ingresando…' : 'Iniciar sesión'}</button>
          </form>
          <p className="auth-footer">¿No tienes acceso? <Link to="/registro">Información sobre cuentas</Link></p>
        </div>
      </div>
    </div>
  );
}
