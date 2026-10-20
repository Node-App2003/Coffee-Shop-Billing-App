import { useState } from 'react';
import { Save, Download, Upload, Printer, Bluetooth } from 'lucide-react';
import { useStore, actions, verifyLogin } from '../../store.js';
import { isNative, fmtDateTime } from '../../utils.js';
import { shareBackup } from '../../backup.js';
import { QuickLoginCard } from '../../components/QuickLogin.jsx';

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function Settings() {
  const { settings, auth, lastBackupAt } = useStore();
  const [s, setS] = useState(settings);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => {
    setSaved(false);
    setS((x) => ({ ...x, [k]: v }));
  };

  const saveShop = () => {
    if (s.gstin && !GSTIN_RE.test(s.gstin.trim())) return window.alert('GSTIN format sari illa. 15 characters venum (example: 33ABCDE1234F1Z5) - illa empty-a vidunga.');
    actions.updateSettings({
      ...s,
      shopName: s.shopName.trim() || 'My Coffee Shop',
      currency: s.currency.trim() || '₹',
      taxRate: Number(s.taxRate) || 0,
      billPrefix: (s.billPrefix || 'FB').trim().toUpperCase(),
      upiId: (s.upiId || '').trim(),
      gstin: (s.gstin || '').trim().toUpperCase(),
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
          <div className="field"><label>GST number (GSTIN)</label>
            <input className="input" autoCapitalize="characters" maxLength={15} placeholder="33ABCDE1234F1Z5" value={s.gstin || ''} onChange={(e) => set('gstin', e.target.value.toUpperCase())} />
            <span className="muted small">Bill-la shop name keezha print aagum. Venaa-na empty-a vidunga.</span>
            {s.gstin && !GSTIN_RE.test(s.gstin.trim()) && <span className="err">GSTIN 15 characters irukkanum (example: 33ABCDE1234F1Z5)</span>}
          </div>
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

          <PrinterCard s={s} set={set} />

          <div className="card">
            <h3>Backup</h3>
            <p className="muted small" style={{ marginTop: 0 }}>
              All data indha device-la mattum irukku. Backup button-a thatti WhatsApp / Google Drive / Gmail-la file-a save pannunga (3 naal ku mela edukkala-na admin-la reminder varum).
            </p>
            <p className="small" style={{ marginTop: 0 }}>
              Last backup: <b>{lastBackupAt ? fmtDateTime(lastBackupAt) : 'Innum edukkala'}</b>
            </p>
            <div className="row wrap">
              <button className="btn" onClick={() => shareBackup().catch((e) => window.alert(e?.message || 'Backup aagala'))}>
                <Download size={16} /> Backup (share / save)
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

/* ---- Bluetooth thermal printer (APK only) ---- */
function PrinterCard({ s, set }) {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState('');
  const native = isNative();

  // printer choices are saved immediately (no need to press "Save settings")
  const pick = (patch) => {
    Object.entries(patch).forEach(([k, v]) => set(k, v));
    actions.updateSettings(patch);
  };

  const scan = async () => {
    setMsg('');
    setScanning(true);
    try {
      const bt = await import('../../bluetoothPrinter.js');
      const found = await bt.scanPrinters(setDevices);
      if (!found.length) setMsg('Printer kidaikkala. Phone Bluetooth-la printer-a pair pannitu marubadi scan pannunga.');
    } catch (e) {
      setMsg(e?.message || 'Scan aagala - Bluetooth permission allow pannirukkingala?');
    }
    setScanning(false);
  };

  const test = async () => {
    setMsg('');
    try {
      const bt = await import('../../bluetoothPrinter.js');
      await bt.testPrint(s.printerAddress, s.printerPaper === '80' ? 48 : 32);
      setMsg('Test print anupirukkom ✓');
    } catch (e) {
      setMsg(e?.message || 'Print aagala');
    }
  };

  return (
    <div className="card">
      <h3><Bluetooth size={16} style={{ verticalAlign: -3 }} /> Bluetooth printer</h3>
      {!native ? (
        <p className="muted small" style={{ marginTop: 0 }}>Indha option Android APK-la mattum work aagum (browser-la normal print dialog varum).</p>
      ) : (
        <>
          <p className="muted small" style={{ marginTop: 0 }}>
            Mudhalla phone Settings - Bluetooth-la printer-a pair pannunga. Appuram inga Scan pannunga. Select pannina aprm "Print &amp; Save" nera printer-la print aagum.
          </p>
          <div className="field"><label>Paper size</label>
            <select className="input" value={s.printerPaper} onChange={(e) => pick({ printerPaper: e.target.value })}>
              <option value="58">58 mm (small printer)</option>
              <option value="80">80 mm</option>
            </select>
          </div>
          {s.printerAddress ? (
            <div className="dev">
              <span><b>{s.printerName || 'Printer'}</b><br /><span className="muted small">{s.printerAddress}</span></span>
              <span className="row">
                <button className="btn sm" onClick={test}><Printer size={14} /> Test</button>
                <button className="btn sm danger" onClick={() => pick({ printerAddress: '', printerName: '' })}>Remove</button>
              </span>
            </div>
          ) : (
            <span className="badge">Printer select pannala - PDF share use aagum</span>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" disabled={scanning} onClick={scan}>{scanning ? 'Scanning...' : 'Scan printers'}</button>
          </div>
          <div className="dev-list">
            {devices.map((d) => (
              <div className="dev" key={d.address}>
                <span><b>{d.name}</b><br /><span className="muted small">{d.address}</span></span>
                <button className="btn sm primary" onClick={() => pick({ printerAddress: d.address, printerName: d.name })}>Select</button>
              </div>
            ))}
          </div>
          {msg && <div className="small">{msg}</div>}
        </>
      )}
    </div>
  );
}
