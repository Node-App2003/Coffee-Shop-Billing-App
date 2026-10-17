import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { verifyLogin, useStore } from '../../store.js';

export default function Login({ onSuccess }) {
  const { auth } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const ok = await verifyLogin(username, password);
    setBusy(false);
    if (ok) onSuccess();
    else setError('Wrong username or password');
  };

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <div className="row" style={{ marginBottom: 6 }}>
          <Lock size={22} color="var(--brown)" />
          <h2>Admin Login</h2>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>Only the shop owner can open this area.</p>
        <div className="field">
          <label>Username</label>
          <input
            className="input"
            autoFocus
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          Login
        </button>
        {!auth.passHash && (
          <p className="muted small" style={{ marginBottom: 0 }}>
            First time? Username <b>admin</b>, password <b>admin123</b>. Change it in Settings after login.
          </p>
        )}
        <p style={{ marginBottom: 0 }}>
          <Link to="/" className="admin-link">← Back to billing</Link>
        </p>
      </form>
    </div>
  );
}
