import { useEffect, useState } from 'react';
import { Fingerprint, KeyRound } from 'lucide-react';
import { useStore, actions } from '../store.js';
import { biometricAvailable, biometricPrompt } from '../biometric.js';

// Form: choose a PIN (4-6 digits) and optionally turn on fingerprint.
export function QuickLoginForm({ onDone, onSkip }) {
  const { auth } = useStore();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bio, setBio] = useState(auth.biometric);
  const [canBio, setCanBio] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    biometricAvailable().then(setCanBio);
  }, []);

  const save = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN 4 to 6 numbers irukkanum');
    if (pin !== confirm) return setError('Rendu PIN-um match aagala');
    setBusy(true);
    if (bio && !(await biometricPrompt('Fingerprint on panna unga viral vaiyunga'))) {
      setBusy(false);
      return setError('Fingerprint confirm aagala. Thirumba try pannunga.');
    }
    await actions.setPin(pin);
    actions.setBiometric(bio);
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
      {canBio ? (
        <label className="check">
          <input type="checkbox" checked={bio} onChange={(e) => setBio(e.target.checked)} />
          <Fingerprint size={18} /> Fingerprint login-um on pannu
        </label>
      ) : (
        <p className="muted small">Fingerprint: installed Android app-la, phone-la fingerprint set pannirundha mattum varum.</p>
      )}
      {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}
      <div className="actions">
        {onSkip && <button className="btn" onClick={onSkip}>Skip</button>}
        <button className="btn primary" disabled={busy} onClick={save}>Save</button>
      </div>
    </div>
  );
}

// Settings card: shows the current state, lets the admin change or disable it.
export function QuickLoginCard() {
  const { auth } = useStore();
  const [editing, setEditing] = useState(false);

  return (
    <div className="card">
      <h3><KeyRound size={16} style={{ verticalAlign: -3 }} /> Quick login (PIN + Fingerprint)</h3>
      {editing || !auth.pinHash ? (
        <>
          {!auth.pinHash && (
            <p className="muted small" style={{ marginTop: 0 }}>
              Password-a ovvoru thadavaiyum type pannaama, PIN or fingerprint-la admin open pannalaam.
            </p>
          )}
          <QuickLoginForm onDone={() => setEditing(false)} onSkip={editing ? () => setEditing(false) : undefined} />
        </>
      ) : (
        <>
          <div className="row wrap" style={{ marginBottom: 10 }}>
            <span className="badge green">✓ PIN on</span>
            <span className={`badge ${auth.biometric ? 'green' : 'off'}`}>
              Fingerprint {auth.biometric ? 'on' : 'off'}
            </span>
          </div>
          <div className="row wrap">
            <button className="btn" onClick={() => setEditing(true)}>Change PIN / Fingerprint</button>
            <button
              className="btn danger"
              onClick={() => window.confirm('PIN & fingerprint login off pannanuma? Password mattum varum.') && actions.disableQuickLogin()}
            >
              Turn off
            </button>
          </div>
        </>
      )}
    </div>
  );
}
