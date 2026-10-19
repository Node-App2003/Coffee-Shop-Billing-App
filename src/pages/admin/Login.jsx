import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Delete } from 'lucide-react';
import { verifyLogin, verifyPin, useStore, PIN_MAX_FAILS } from '../../store.js';

// onSuccess(method) - method is 'password' or 'pin'
export default function Login({ onSuccess }) {
  const { auth } = useStore();
  const pinLen = auth.pinLen || 4;
  const pinLocked = (auth.pinFails || 0) >= PIN_MAX_FAILS;

  const [mode, setMode] = useState(auth.pinHash && !pinLocked ? 'pin' : 'password');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    auth.pinHash && pinLocked ? 'Rombha thappa PIN. Password-a use pannunga.' : ''
  );
  const [busy, setBusy] = useState(false);

  const submitPin = async (value) => {
    setBusy(true);
    const r = await verifyPin(value);
    setBusy(false);
    if (r.ok) return onSuccess('pin');
    setPin('');
    if (r.locked) {
      setMode('password');
      setError('5 thadava thappu. Ippo password-a use pannunga.');
    } else {
      setError(`Thappu PIN. ${r.left} try irukku.`);
    }
  };

  const digit = (d) => {
    if (busy || pin.length >= pinLen) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === pinLen) submitPin(next);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const ok = await verifyLogin(username, password);
    setBusy(false);
    if (ok) onSuccess('password');
    else setError('Wrong username or password');
  };

  if (mode === 'pin') {
    return (
      <div className="login-wrap">
        <div className="card login">
          <div className="row" style={{ marginBottom: 6 }}>
            <Lock size={22} color="var(--brown)" />
            <h2>Enter PIN</h2>
          </div>
          <div className="pin-dots">
            {Array.from({ length: pinLen }).map((_, i) => (
              <span key={i} className={i < pin.length ? 'on' : ''} />
            ))}
          </div>
          <div className="err" style={{ minHeight: 20, textAlign: 'center' }}>{error}</div>
          <div className="keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} onClick={() => digit(d)}>{d}</button>
            ))}
            <span />
            <button onClick={() => digit('0')}>0</button>
            <button onClick={() => setPin((p) => p.slice(0, -1))} title="Delete"><Delete size={22} /></button>
          </div>
          <p style={{ textAlign: 'center', marginBottom: 0 }}>
            <a href="#pw" className="admin-link" onClick={(e) => { e.preventDefault(); setMode('password'); setError(''); }}>
              Use password instead
            </a>
          </p>
          <p style={{ textAlign: 'center', marginBottom: 0 }}>
            <Link to="/" className="admin-link">← Back to billing</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submitPassword}>
        <div className="row" style={{ marginBottom: 6 }}>
          <Lock size={22} color="var(--brown)" />
          <h2>Admin Login</h2>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>Only the shop owner can open this area.</p>
        <div className="field">
          <label>Username</label>
          <input className="input" autoFocus autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          Login
        </button>
        {!auth.passHash && (
          <p className="muted small" style={{ marginBottom: 0 }}>
            First time? Username <b>admin</b>, password <b>admin123</b>. Login pannina piragu PIN set pannalaam.
          </p>
        )}
        {auth.pinHash && !pinLocked && (
          <p style={{ marginBottom: 0 }}>
            <a href="#pin" className="admin-link" onClick={(e) => { e.preventDefault(); setMode('pin'); setError(''); }}>
              Use PIN instead
            </a>
          </p>
        )}
        <p style={{ marginBottom: 0 }}>
          <Link to="/" className="admin-link">← Back to billing</Link>
        </p>
      </form>
    </div>
  );
}
