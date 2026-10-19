import { useState } from 'react';
import { Save, Download, Upload } from 'lucide-react';
import { useStore, actions, verifyLogin } from '../../store.js';
import { saveText, dmy } from '../../utils.js';
import { QuickLoginCard } from '../../components/QuickLogin.jsx';

export default function Settings() {
  const { settings, auth } = useStore();
  const [s, setS] = useState(settings);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => {
    setSaved(false);
    setS((x) => ({ ...x, [k]: v }));
  };

  const saveShop = () => {
    actions.updateSettings({
      ...s,
      shopName: s.shopName.trim() || 'My Coffee Shop',
      currency: s.currency.trim() || '₹',
      taxRate: Number(s.taxRate) || 0,
      billPrefix: (s.billPrefix || 'FB').trim().toUpperCase(),
      upiId: (s.upiId || '').trim(),
    });
    setSaved(true);
  };

  /* ---- account ---- */
  const [acc, setAcc] = useState({ current: '', username: auth.username, password: '', confirm: '' });
  const [accMsg, setAccMsg] = useState({ type: '', text: '' });

  const saveAccount = async () => {
    if (!(await verifyLogin(auth.username, acc.current))) {
      return setAccMsg({ type: 'err', text: 'Current password is wrong' });
    }
    if (!acc.username.trim()) return setAccMsg({ type: 'err', text: 'Username cannot be empty' });
    if (acc.password && acc.password.length < 4) return setAccMsg({ type: 'err', text: 'New password needs at least 4 characters' });
    if (acc.password !== acc.confirm) return setAccMsg({ type: 'err', text: 'New passwords do not match' });
    await actions.setCredentials(acc.username, acc.password);
    setAcc((a) => ({ ...a, current: '', password: '', confirm: '' }));
    setAccMsg({ type: 'ok', text: 'Login details updated' });
  };

  /* ---- backup ---- */
  const restore = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!window.confirm('Restore this backup? Current data on this device will be replaced.')) return;
    try {
      actions.importBackup(await f.text());
      window.alert('Backup restored. The app will reload.');
      window.location.reload();
    } catch (err) {
      window.alert(err.message || 'Could not read the backup file');
    }
  };

  return (
    <>
      <div className="page-title">Settings</div>

      <div className="grid two">
        <div className="card">
          <h3>Shop details</h3>
          <div className="field"><label>Shop name</label>
            <input className="input" value={s.shopName} onChange={(e) => set('shopName', e.target.value)} /></div>
          <div className="field"><label>Address</label>
            <textarea className="input" rows={2} value={s.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="field"><label>Phone number</label>
            <input className="input" value={s.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div className="row">
            <div className="field grow"><label>Currency</label>
              <input className="input" value={s.currency} maxLength={4} onChange={(e) => set('currency', e.target.value)} /></div>
            <div className="field grow"><label>Bill number prefix</label>
              <input className="input" value={s.billPrefix} maxLength={6} onChange={(e) => set('billPrefix', e.target.value)} /></div>
          </div>
          <div className="field"><label>UPI ID (QR payment-ku)</label>
            <input className="input" autoCapitalize="none" placeholder="yourshop@okaxis" value={s.upiId || ''} onChange={(e) => set('upiId', e.target.value)} />
            <span className="muted small">Billing-la UPI select pannina indha ID-ku exact amount-oda QR varum.</span>
            {s.upiId && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(s.upiId.trim()) && (
              <span className="err">UPI ID format sari illa (example: name@bank)</span>
            )}
          </div>
          <div className="field"><label>Bill footer message</label>
            <input className="input" value={s.footer} onChange={(e) => set('footer', e.target.value)} /></div>

          <h3 style={{ marginTop: 16 }}>Tax &amp; rounding</h3>
          <label className="check">
            <input type="checkbox" checked={s.taxEnabled} onChange={(e) => set('taxEnabled', e.target.checked)} />
            Add tax to bills
          </label>
          {s.taxEnabled && (
            <div className="row">
              <div className="field grow"><label>Tax name</label>
                <input className="input" value={s.taxName} onChange={(e) => set('taxName', e.target.value)} /></div>
              <div className="field grow"><label>Rate (%)</label>
                <input className="input" type="number" inputMode="decimal" value={s.taxRate} onChange={(e) => set('taxRate', e.target.value)} /></div>
            </div>
          )}
          <label className="check">
            <input type="checkbox" checked={s.roundOff} onChange={(e) => set('roundOff', e.target.checked)} />
            Round off the grand total to the nearest rupee
          </label>

          <div className="row">
            <button className="btn primary" onClick={saveShop}><Save size={16} /> Save settings</button>
            {saved && <span className="badge green">Saved</span>}
          </div>
          <p className="muted small">Changes apply to new bills. Old bills keep the details they were printed with.</p>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <h3>Admin login</h3>
            <div className="field"><label>Current password</label>
              <input className="input" type="password" value={acc.current} onChange={(e) => setAcc({ ...acc, current: e.target.value })} /></div>
            <div className="field"><label>Username</label>
              <input className="input" autoCapitalize="none" value={acc.username} onChange={(e) => setAcc({ ...acc, username: e.target.value })} /></div>
            <div className="field"><label>New password (leave empty to keep the same)</label>
              <input className="input" type="password" value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} /></div>
            <div className="field"><label>Confirm new password</label>
              <input className="input" type="password" value={acc.confirm} onChange={(e) => setAcc({ ...acc, confirm: e.target.value })} /></div>
            {accMsg.text && <div className={accMsg.type === 'ok' ? 'badge green' : 'err'} style={{ marginBottom: 10 }}>{accMsg.text}</div>}
            <button className="btn primary" onClick={saveAccount}>Update login</button>
          </div>

          <QuickLoginCard />

          <div className="card">
            <h3>Backup</h3>
            <p className="muted small" style={{ marginTop: 0 }}>
              All data is stored on this device. Take a backup regularly - it also lets you move to a new phone.
            </p>
            <div className="row wrap">
              <button className="btn" onClick={() => saveText(`cafe-backup-${dmy()}.json`, actions.exportBackup(), 'application/json')}>
                <Download size={16} /> Export backup
              </button>
              <label className="btn" style={{ cursor: 'pointer' }}>
                <Upload size={16} /> Restore backup
                <input type="file" accept="application/json,.json" hidden onChange={restore} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
