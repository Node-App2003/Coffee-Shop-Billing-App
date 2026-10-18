import { useState } from 'react';
import { Plus, Pencil, Trash2, Banknote, Wallet } from 'lucide-react';
import { useStore, actions } from '../../store.js';
import { money, num, round2, dayKey, monthKey, fmtDate, exportCSV, exportPDF, stamp } from '../../utils.js';
import { sum } from '../../analytics.js';
import ExportButtons from '../../components/ExportButtons.jsx';
import Modal from '../../components/Modal.jsx';

export const ROLES = ['Tea Master', 'Cleaner', 'Biller', 'Shop Keeper'];

const monthLabel = (m) =>
  new Date(`${m}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export default function Workers() {
  const { workers, salaryPayments, settings } = useStore();
  const cur = settings.currency || '₹';
  const [month, setMonth] = useState(monthKey(new Date()));
  const [edit, setEdit] = useState(null); // worker form
  const [pay, setPay] = useState(null); // salary / advance form
  const [error, setError] = useState('');

  /* ---- per worker numbers for the selected month ---- */
  const data = workers.map((w) => {
    const mine = salaryPayments.filter((p) => p.workerId === w.id);
    const advances = mine.filter((p) => p.type === 'advance');
    const balance = round2(sum(advances, (p) => p.amount) - sum(mine, (p) => p.deduction || 0));
    const paid = mine.find((p) => p.type === 'salary' && p.month === month);
    const advMonth = sum(advances.filter((p) => p.month === month), (p) => p.amount);
    return { ...w, balance, paid, advMonth };
  });

  const payroll = sum(workers, (w) => w.salary);
  const paidCount = data.filter((d) => d.paid).length;
  const pending = sum(data.filter((d) => !d.paid), (d) => d.salary);
  const owedAdvance = sum(data, (d) => d.balance);
  const history = salaryPayments
    .filter((p) => p.month === month)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  /* ---- worker add / edit ---- */
  const saveWorker = () => {
    if (!edit.name.trim()) return setError('Name is required');
    if (!(Number(edit.salary) > 0)) return setError('Enter the monthly salary');
    actions.saveWorker(edit);
    setEdit(null);
  };
  const delWorker = (w) => {
    if (window.confirm(`Delete ${w.name}? Old salary / advance records stay in Expenses.`)) actions.deleteWorker(w.id);
  };

  /* ---- salary / advance ---- */
  const openSalary = (w) => {
    setError('');
    const ded = Math.min(w.balance, w.salary);
    setPay({ worker: w, type: 'salary', date: dayKey(new Date()), deduction: ded > 0 ? String(ded) : '', amount: '', note: '' });
  };
  const openAdvance = (w) => {
    setError('');
    setPay({ worker: w, type: 'advance', date: dayKey(new Date()), deduction: '', amount: '', note: '' });
  };

  const ded = Number(pay?.deduction) || 0;
  const net = pay ? round2((pay.worker.salary || 0) - ded) : 0;

  const savePay = () => {
    if (!pay.date) return setError('Pick a date');
    if (pay.type === 'advance') {
      if (!(Number(pay.amount) > 0)) return setError('Enter the advance amount');
      actions.addWorkerPayment({
        workerId: pay.worker.id, type: 'advance', amount: Number(pay.amount),
        month: pay.date.slice(0, 7), date: pay.date, note: pay.note,
      });
    } else {
      if (ded < 0 || ded > pay.worker.balance) return setError(`Advance deduction max ${money(pay.worker.balance, cur)}`);
      if (ded > pay.worker.salary) return setError('Deduction cannot be more than the salary');
      actions.addWorkerPayment({
        workerId: pay.worker.id, type: 'salary', amount: net, deduction: ded,
        month, date: pay.date, note: pay.note,
      });
    }
    setPay(null);
  };

  const delPayment = (p) => {
    if (window.confirm('Delete this payment? Matching Expenses entry-um remove aagum.')) actions.deleteWorkerPayment(p.id);
  };

  /* ---- exports ---- */
  const head = ['Name', 'Role', `Salary (${cur})`, `Advance given (${cur})`, `Advance balance (${cur})`, 'Salary status', `Net paid (${cur})`];
  const rows = data.map((d) => [
    d.name, d.role, num(d.salary), num(d.advMonth), num(d.balance),
    d.paid ? `Paid ${d.paid.date}` : 'Pending', d.paid ? num(d.paid.amount) : '0.00',
  ]);
  const hHead = ['Date', 'Worker', 'Role', 'Type', `Advance adjusted (${cur})`, `Amount (${cur})`];
  const hRows = history.map((p) => [p.date, p.workerName, p.role, p.type === 'advance' ? 'Advance' : 'Salary', num(p.deduction || 0), num(p.amount)]);

  return (
    <>
      <div className="page-title">
        Workers
        <div className="row wrap">
          <ExportButtons
            disabled={!workers.length}
            onCsv={() => exportCSV(`workers-${month}-${stamp()}.csv`, head, rows)}
            onPdf={() =>
              exportPDF({
                filename: `workers-${month}-${stamp()}.pdf`,
                title: `${settings.shopName} - Workers & Salary`,
                subtitle: `${monthLabel(month)} | Paid ${paidCount}/${workers.length}`,
                head,
                rows,
              })
            }
          />
          <button className="btn primary" onClick={() => { setError(''); setEdit({ id: '', name: '', role: ROLES[0], salary: '' }); }}>
            <Plus size={16} /> Add Worker
          </button>
        </div>
      </div>

      <div className="row wrap" style={{ marginBottom: 14 }}>
        <label className="small muted">Month</label>
        <input className="input" style={{ width: 180 }} type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>

      <div className="grid stats">
        <div className="card stat"><div className="lbl">Monthly payroll</div><div className="val">{money(payroll, cur)}</div></div>
        <div className="card stat"><div className="lbl">Salary paid</div><div className="val pos">{paidCount} / {workers.length}</div></div>
        <div className="card stat"><div className="lbl">Salary pending</div><div className="val neg">{money(pending, cur)}</div></div>
        <div className="card stat"><div className="lbl">Advance balance</div><div className="val">{money(owedAdvance, cur)}</div></div>
      </div>

      <div className="card table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th><th>Role</th><th className="num">Salary</th><th className="num">Advance balance</th>
              <th>{monthLabel(month)}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No workers yet - Add Worker click pannunga</td></tr>
            )}
            {data.map((d) => (
              <tr key={d.id}>
                <td><b>{d.name}</b></td>
                <td><span className="badge">{d.role}</span></td>
                <td className="num">{money(d.salary, cur)}</td>
                <td className="num">{d.balance > 0 ? <span className="err">{money(d.balance, cur)}</span> : money(0, cur)}</td>
                <td>
                  {d.paid ? (
                    <span className="badge green">✓ Paid {fmtDate(`${d.paid.date}T12:00:00`)}</span>
                  ) : (
                    <span className="badge off">Pending</span>
                  )}
                </td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sm primary" disabled={!!d.paid} onClick={() => openSalary(d)}>
                    <Banknote size={14} /> {d.paid ? 'Paid' : 'Pay Salary'}
                  </button>{' '}
                  <button className="btn sm" onClick={() => openAdvance(d)}><Wallet size={14} /> Advance</button>{' '}
                  <button className="btn sm icon" title="Edit" onClick={() => { setError(''); setEdit({ ...d }); }}><Pencil size={14} /></button>{' '}
                  <button className="btn sm icon danger" title="Delete" onClick={() => delWorker(d)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap section">
        <div className="row between wrap">
          <h3>Payments - {monthLabel(month)}</h3>
          <ExportButtons
            disabled={!history.length}
            onCsv={() => exportCSV(`salary-payments-${month}-${stamp()}.csv`, hHead, hRows)}
            onPdf={() =>
              exportPDF({
                filename: `salary-payments-${month}-${stamp()}.pdf`,
                title: `${settings.shopName} - Salary & Advance`,
                subtitle: `${monthLabel(month)} | Total paid ${cur}${num(sum(history, (p) => p.amount))}`,
                head: hHead,
                rows: hRows,
              })
            }
          />
        </div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Worker</th><th>Type</th><th className="num">Adjusted</th><th className="num">Amount</th><th></th></tr></thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No payments this month</td></tr>
            )}
            {history.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(`${p.date}T12:00:00`)}</td>
                <td>{p.workerName} <span className="muted small">({p.role})</span></td>
                <td><span className={`badge ${p.type === 'salary' ? 'green' : ''}`}>{p.type === 'salary' ? 'Salary' : 'Advance'}</span></td>
                <td className="num">{p.deduction ? money(p.deduction, cur) : '-'}</td>
                <td className="num"><b>{money(p.amount, cur)}</b></td>
                <td className="right">
                  <button className="btn sm icon danger" title="Delete" onClick={() => delPayment(p)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit Worker' : 'Add Worker'} onClose={() => setEdit(null)}>
          <div className="field">
            <label>Name</label>
            <input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Role</label>
            <select className="select" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Monthly salary ({cur})</label>
            <input className="input" type="number" inputMode="decimal" value={edit.salary} onChange={(e) => setEdit({ ...edit, salary: e.target.value })} />
          </div>
          {error && <div className="err">{error}</div>}
          <div className="actions">
            <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn primary" onClick={saveWorker}>Save</button>
          </div>
        </Modal>
      )}

      {pay && (
        <Modal title={`${pay.type === 'salary' ? 'Pay Salary' : 'Advance'} - ${pay.worker.name}`} onClose={() => setPay(null)}>
          {pay.type === 'salary' ? (
            <>
              <div className="card" style={{ marginBottom: 12, boxShadow: 'none' }}>
                <div className="row between"><span className="muted">Month</span><b>{monthLabel(month)}</b></div>
                <div className="row between"><span className="muted">Salary</span><b>{money(pay.worker.salary, cur)}</b></div>
                <div className="row between"><span className="muted">Advance balance</span><b>{money(pay.worker.balance, cur)}</b></div>
              </div>
              <div className="field">
                <label>Advance to deduct ({cur})</label>
                <input className="input" type="number" inputMode="decimal" value={pay.deduction} placeholder="0" onChange={(e) => setPay({ ...pay, deduction: e.target.value })} />
              </div>
              <div className="big-total">{money(net, cur)}</div>
              <div className="muted small right" style={{ textAlign: 'center', marginBottom: 10 }}>Net amount to pay</div>
            </>
          ) : (
            <div className="field">
              <label>Advance amount ({cur})</label>
              <input className="input" type="number" inputMode="decimal" autoFocus value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            </div>
          )}
          <div className="field">
            <label>Date</label>
            <input className="input" type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input className="input" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
          </div>
          <div className="muted small">Indha payment Expenses-la (Staff expenses) automatic-ah add aagum.</div>
          {error && <div className="err" style={{ marginTop: 6 }}>{error}</div>}
          <div className="actions">
            <button className="btn" onClick={() => setPay(null)}>Cancel</button>
            <button className="btn primary" onClick={savePay}>
              {pay.type === 'salary' ? 'Pay Salary' : 'Give Advance'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
