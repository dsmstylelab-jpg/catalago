import { Link } from 'react-router-dom';
import { UserRoundX, ArrowLeft } from 'lucide-react';
export default function Register() {
  return (
    <div className="register-page container-wide">
      <div className="register-card">
        <UserRoundX size={32} strokeWidth={1.5} />
        <h1>Crear cuenta</h1>
        <p>Por ahora no hay registro de cuentas desde la web. Las cuentas de administración las crea el equipo.</p>
        <p>Si necesitas una, escríbenos y te ayudamos.</p>
        <div>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></div>
        <Link className="back-link" to="/"><ArrowLeft size={16} /> Volver al inicio</Link>
      </div>
    </div>
  );
}
