import { useState } from 'react';
import { Link } from 'react-router-dom';
export default function Brand({ light = false }) {
  const [missing, setMissing] = useState(false);
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to="/" aria-label="DSM Style Lab — inicio">
      {!missing && <img className="brand-mark" src="/logos/diego.jpg" onError={() => setMissing(true)} alt="" />}
      <span>DSM<small>STYLE LAB</small></span>
    </Link>
  );
}
