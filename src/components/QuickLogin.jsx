import { useEffect, useState } from 'react';
import { Fingerprint, KeyRound } from 'lucide-react';
import { useStore, actions } from '../store.js';
import { biometricStatus, biometricPrompt } from '../biometric.js';

// Form: choose a PIN (4-6 digits) and optionally turn on fingerprint.
export function QuickLoginForm({ onDone, onSkip }) {
  const { auth } = useStore();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bio, setBio] = useState(auth.biometric);
  const [bioInfo, setBioInfo] = useState({ ok: false, reason: 'Checking fingerprint...' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    biometricStatus().then(setBioInfo);
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
      <label className="check" style={{ opacity: bioInfo.ok ? 1 : 0.55 }}>
        <input type="checkbox" disabled={!bioInfo.ok} checked={bio && bioInfo.ok} onChange={(e) => setBio(e.target.checked)} />
        <Fingerprint size={18} /> Fingerprint login-um on pannu
      </label>
      {!bioInfo.ok && <p className="muted small" style={{ marginTop: -6 }}>{bioInfo.reason}</p>}
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
  const [bioInfo, setBioInfo] = useState({ ok: false, reason: 'Checking fingerprint...' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    biometricStatus().then(setBioInfo);
  }, []);

  // one tap: fingerprint on / off (PIN is already set)
  const toggleBio = async () => {
    setMsg('');
    if (!auth.biometric && !(await biometricPrompt('Fingerprint on panna unga viral vaiyunga'))) {
      return setMsg('Fingerprint confirm aagala. Thirumba try pannunga.');
    }
    actions.setBiometric(!auth.biometric);
  };

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
          {bioInfo.ok ? (
            <button className="btn primary" style={{ marginBottom: 10 }} onClick={toggleBio}>
              <Fingerprint size={16} /> {auth.biometric ? 'Turn off fingerprint' : 'Turn on fingerprint'}
            </button>
          ) : (
            <p className="muted small" style={{ marginTop: 0 }}>{bioInfo.reason}</p>
          )}
          {msg && <div className="err" style={{ marginBottom: 8 }}>{msg}</div>}
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
