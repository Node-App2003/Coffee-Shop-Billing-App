import { useState } from 'react';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useStore, actions } from '../../store.js';
import { money, num, dayKey, fmtDate, rangeText, exportCSV, stamp } from '../../utils.js';
import { expensesIn, sum } from '../../analytics.js';
import RangePicker, { initialRange, useRange } from '../../components/RangePicker.jsx';
import Modal from '../../components/Modal.jsx';

export const EXPENSE_TYPES = ['Milk purchase', 'Coffee powder', 'Sugar', 'Staff expenses', 'Other shop expenses'];

const blank = () => ({ id: '', date: dayKey(new Date()), type: EXPENSE_TYPES[0], note: '', amount: '' });

export default function Expenses() {
  const { expenses, settings } = useStore();
  const cur = settings.currency || '₹';
  const [r, setR] = useState(initialRange('month'));
  const range = useRange(r);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  const list = expensesIn(expenses, range).sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = sum(list, (e) => e.amount);
  const byType = EXPENSE_TYPES.map((t) => ({ t, v: sum(list.filter((e) => e.type === t), (e) => e.amount) }));

  const save = () => {
    if (!(Number(edit.amount) > 0)) return setError('Enter an amount greater than 0');
    if (!edit.date) return setError('Pick a date');
    actions.saveExpense(edit);
    setEdit(null);
  };

  return (
    <>
      <div className="page-title">
        Expenses
        <div className="row">
          <button
            className="btn sm"
            disabled={!list.length}
            onClick={() =>
              exportCSV(`expenses-${stamp()}.csv`, ['Date', 'Type', 'Note', `Amount (${cur})`],
                list.map((e) => [e.date, e.type, e.note, num(e.amount)]))
            }
          >
            <Download size={14} /> CSV
          </button>
          <button className="btn primary" onClick={() => { setError(''); setEdit(blank()); }}>
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      <RangePicker value={r} onChange={setR} />
      <div className="muted small" style={{ marginBottom: 10 }}>{rangeText(range)}</div>

      <div className="grid stats">
        <div className="card stat"><div className="lbl">Total Expenses</div><div className="val neg">{money(total, cur)}</div></div>
        {byType.map(({ t, v }) => (
          <div className="card stat" key={t}><div className="lbl">{t}</div><div className="val">{money(v, cur)}</div></div>
        ))}
      </div>

      <div className="card table-wrap">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Type</th><th>Note</th><th className="num">Amount</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center' }}>No expenses in this period</td></tr>
            )}
            {list.map((e) => (
              <tr key={e.id}>
                <td>{fmtDate(`${e.date}T12:00:00`)}</td>
                <td><span className="badge">{e.type}</span></td>
                <td>{e.note}</td>
                <td className="num"><b>{money(e.amount, cur)}</b></td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sm icon" onClick={() => { setError(''); setEdit({ ...e }); }}><Pencil size={14} /></button>{' '}
                  <button className="btn sm icon danger" onClick={() => window.confirm('Delete this expense?') && actions.deleteExpense(e.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit Expense' : 'Add Expense'} onClose={() => setEdit(null)}>
          <div className="field">
            <label>Date</label>
            <input className="input" type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
          </div>
          <div className="field">
            <label>Type</label>
            <select className="select" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
              {EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Amount ({cur})</label>
            <input className="input" type="number" inputMode="decimal" autoFocus value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} />
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input className="input" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          </div>
          {error && <div className="err">{error}</div>}
          <div className="actions">
            <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </>
  );
}
