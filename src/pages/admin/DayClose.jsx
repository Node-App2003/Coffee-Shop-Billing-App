import { useState } from 'react';
import { Download, FileText, Lock } from 'lucide-react';
import { useStore, actions } from '../../store.js';
import { money, num, round2, fmtDate, fmtDateTime, dayKey, exportCSV, exportPDF } from '../../utils.js';
import { paymentBreakdown, sum } from '../../analytics.js';
import { shareBackup } from '../../backup.js';

// rows shown in the CSV / PDF / screen for one closing record
const closingRows = (c) => [
  ['Date', fmtDate(`${c.date}T12:00:00`)],
  ['Total bills', c.bills],
  ['Total sales', num(c.sales)],
  ['Cash sales', num(c.cash)],
  ['UPI sales', num(c.upi)],
  ['Card sales', num(c.card)],
  ['Total expenses', num(c.expenses)],
  ['Profit (sales - expenses)', num(c.sales - c.expenses)],
  ['Opening cash', num(c.openingCash)],
  ['Expected cash in hand', num(c.expectedCash)],
  ['Counted cash in hand', num(c.countedCash)],
  ['Difference (counted - expected)', num(c.difference)],
  ...(c.note ? [['Note', c.note]] : []),
];

function exportRecord(c, shop, kind) {
  const name = `day-close-${c.date}`;
  const rows = closingRows(c);
  if (kind === 'csv') return exportCSV(`${name}.csv`, ['Item', 'Value'], rows);
  return exportPDF({ filename: `${name}.pdf`, title: `${shop} - Daily Closing Report`, subtitle: fmtDate(`${c.date}T12:00:00`), head: ['Item', 'Amount (Rs.)'], rows });
}

export default function DayClose() {
  const [date, setDate] = useState(dayKey(new Date()));
  return (
    <>
      <div className="page-title">Close Day</div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Date</label>
        <input className="input" type="date" value={date} max={dayKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>
      <Closing key={date} date={date} />
      <History />
    </>
  );
}

function Closing({ date }) {
  const { bills, expenses, dayClosings, settings } = useStore();
  const cur = settings.currency || '₹';
  const existing = dayClosings.find((c) => c.date === date);

  const list = bills.filter((b) => dayKey(b.createdAt) === date);
  const exps = expenses.filter((e) => e.date === date);
  const sales = sum(list, (b) => b.total);
  const spent = sum(exps, (e) => e.amount);
  const pay = Object.fromEntries(paymentBreakdown(list).map((p) => [p.name, p.value]));

  // opening cash defaults to the counted cash of the latest earlier closing
  const prev = [...dayClosings].filter((c) => c.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const [opening, setOpening] = useState(String(existing?.openingCash ?? prev?.countedCash ?? 0));
  const [counted, setCounted] = useState(existing ? String(existing.countedCash) : '');
  const [note, setNote] = useState(existing?.note || '');

  const expected = round2(Number(opening || 0) + (pay.Cash || 0) - spent);
  const countedNum = counted === '' ? expected : Number(counted) || 0;
  const diff = round2(countedNum - expected);

  const record = () => ({
    date, bills: list.length, sales,
    cash: pay.Cash || 0, upi: pay.UPI || 0, card: pay.Card || 0,
    expenses: spent, openingCash: Number(opening) || 0,
    expectedCash: expected, countedCash: countedNum, difference: diff, note: note.trim(),
  });

  const close = async () => {
    if (existing && !window.confirm('Indha date already close pannirukku. Marubadiyum close panni maathanuma?')) return;
    const rec = actions.saveDayClosing(record());
    if (window.confirm('Day closed ✓\n\nIppove backup eduthukalaama? (WhatsApp / Drive-ku anupalaam)')) {
      try { await shareBackup(); } catch (e) { window.alert(e?.message || 'Backup aagala'); }
    }
    return rec;
  };

  return (
    <>
      <div className="grid stats">
        <div className="card stat"><div className="lbl">Total Sales</div><div className="val">{money(sales, cur)}</div></div>
        <div className="card stat"><div className="lbl">Bills</div><div className="val">{list.length}</div></div>
        <div className="card stat"><div className="lbl">Cash</div><div className="val">{money(pay.Cash || 0, cur)}</div></div>
        <div className="card stat"><div className="lbl">UPI</div><div className="val">{money(pay.UPI || 0, cur)}</div></div>
        <div className="card stat"><div className="lbl">Card</div><div className="val">{money(pay.Card || 0, cur)}</div></div>
        <div className="card stat"><div className="lbl">Expenses</div><div className="val neg">{money(spent, cur)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between wrap">
          <h3>Cash in hand</h3>
          {existing && <span className="badge green"><Lock size={12} /> Closed {fmtDateTime(existing.closedAt)}</span>}
        </div>
        <div className="row">
          <div className="field grow"><label>Opening cash (kaala-la irundha cash)</label>
            <input className="input" type="number" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} /></div>
          <div className="field grow"><label>Counted cash (ippo drawer-la irukkura cash)</label>
            <input className="input" type="number" inputMode="decimal" placeholder={String(expected)} value={counted} onChange={(e) => setCounted(e.target.value)} /></div>
        </div>
        <div className="kv-list" style={{ margin: '4px 0 10px' }}>
          <div className="row between"><span>Expected cash = Opening + Cash sales - Expenses</span><b>{money(expected, cur)}</b></div>
          <div className="row between"><span>Difference</span>
            <b className={diff === 0 ? 'diff-ok' : 'diff-bad'}>{diff > 0 ? '+' : ''}{money(diff, cur)}</b></div>
        </div>
        <div className="field"><label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Anaiku ellaa expenses-um (salary, advance included) drawer cash-la irundhu pogudhunu eduthukkirom.
        </p>
        <div className="row wrap">
          <button className="btn primary" onClick={close}><Lock size={16} /> {existing ? 'Close again' : 'Close Day'}</button>
          <button className="btn" onClick={() => exportRecord(record(), settings.shopName, 'csv')}><Download size={14} /> CSV</button>
          <button className="btn" onClick={() => exportRecord(record(), settings.shopName, 'pdf')}><FileText size={14} /> PDF (share)</button>
        </div>
      </div>
    </>
  );
}

function History() {
  const { dayClosings, settings } = useStore();
  const cur = settings.currency || '₹';
  const rows = [...dayClosings].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="card table-wrap">
      <h3>Closed days</h3>
      <table className="tbl">
        <thead><tr><th>Date</th><th className="num">Sales</th><th className="num">Cash in hand</th><th className="num">Diff</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center' }}>Innum edhuvum close pannala</td></tr>}
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{fmtDate(`${c.date}T12:00:00`)}</td>
              <td className="num">{money(c.sales, cur)}</td>
              <td className="num">{money(c.countedCash, cur)}</td>
              <td className={`num ${c.difference === 0 ? 'diff-ok' : 'diff-bad'}`}>{money(c.difference, cur)}</td>
              <td className="num">
                <button className="btn sm" onClick={() => exportRecord(c, settings.shopName, 'pdf')}><FileText size={14} /> PDF</button>{' '}
                <button className="btn sm danger" onClick={() => window.confirm('Indha closing record delete pannanuma?') && actions.deleteDayClosing(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
