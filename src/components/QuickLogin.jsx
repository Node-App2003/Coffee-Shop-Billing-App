import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useStore, actions } from '../store.js';

// Form: choose a PIN (4-6 digits).
export function QuickLoginForm({ onDone, onSkip }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN 4 to 6 numbers irukkanum');
    if (pin !== confirm) return setError('Rendu PIN-um match aagala');
    setBusy(true);
    await actions.setPin(pin);
    setBusy(false);
    onDone?.();
  };

  return (
    <div>
      <div className="field">
        <label>New PIN (4-6 numbers)</label>
        <input className="input" type="password" inputMode="numeric" maxLength={6} autoComplete="off"
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </div>
      <div className="field">
        <label>Confirm PIN</label>
        <input className="input" type="password" inputMode="numeric" maxLength={6} autoComplete="off"
          value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))} />
      </div>
      {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}
      <div className="actions">
        {onSkip && <button className="btn" onClick={onSkip}>Skip</button>}
        <button className="btn primary" disabled={busy} onClick={save}>Save</button>
      </div>
    </div>
  );
}

// Settings card: shows the current state, lets the admin change or turn off the PIN.
export function QuickLoginCard() {
  const { auth } = useStore();
  const [editing, setEditing] = useState(false);

  return (
    <div className="card">
      <h3><KeyRound size={16} style={{ verticalAlign: -3 }} /> Quick login (PIN)</h3>
      {editing || !auth.pinHash ? (
        <>
          {!auth.pinHash && (
            <p className="muted small" style={{ marginTop: 0 }}>
              Password-a ovvoru thadavaiyum type pannaama, PIN-la admin open pannalaam.
            </p>
          )}
          <QuickLoginForm onDone={() => setEditing(false)} onSkip={editing ? () => setEditing(false) : undefined} />
        </>
      ) : (
        <>
          <div className="row wrap" style={{ marginBottom: 10 }}>
            <span className="badge green">✓ PIN on</span>
          </div>
          <div className="row wrap">
            <button className="btn" onClick={() => setEditing(true)}>Change PIN</button>
            <button
              className="btn danger"
              onClick={() => window.confirm('PIN login off pannanuma? Password mattum varum.') && actions.disableQuickLogin()}
            >
              Turn off
            </button>
          </div>
        </>
      )}
    </div>
  );
}
