import { useState } from 'react';
import { Search, Eye, Printer } from 'lucide-react';
import { useStore } from '../../store.js';
import { money, num, fmtDateTime, exportCSV, exportPDF, printBill, stamp, getRange, inRange } from '../../utils.js';
import ExportButtons from '../../components/ExportButtons.jsx';
import Modal from '../../components/Modal.jsx';
import { ReceiptBody, PrintPortal } from '../../components/Receipt.jsx';

export default function Bills() {
  const { bills, settings } = useStore();
  const cur = settings.currency || '₹';
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [view, setView] = useState(null);

  const range = getRange('custom', from, to);
  const t = q.trim().toLowerCase();
  const list = bills.filter((b) => (!t || b.number.toLowerCase().includes(t)) && inRange(b.createdAt, range));
  const total = list.reduce((s, b) => s + b.total, 0);
  const head = ['Bill No', 'Date', 'Items', 'Payment', `Total (${cur})`];
  const rows = list.map((b) => [b.number, fmtDateTime(b.createdAt), b.items.map((i) => `${i.name} x${i.qty}`).join('; '), b.paymentLabel, num(b.total)]);

  return (
    <>
      <div className="page-title">
        Bill History
        <ExportButtons
          disabled={!list.length}
          onCsv={() => exportCSV(`bills-${stamp()}.csv`, head, rows)}
          onPdf={() =>
            exportPDF({
              filename: `bills-${stamp()}.pdf`,
              title: `${settings.shopName} - Bill History`,
              subtitle: `${list.length} bills | Total ${cur}${num(total)}`,
              head,
              rows,
            })
          }
        />
      </div>

      <div className="row wrap" style={{ marginBottom: 14 }}>
        <div className="search grow" style={{ minWidth: 200 }}>
          <Search size={17} />
          <input className="input" placeholder="Search bill number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <input className="input" style={{ width: 160 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
        <input className="input" style={{ width: 160 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
        {(from || to || q) && (
          <button className="btn sm" onClick={() => { setQ(''); setFrom(''); setTo(''); }}>Reset</button>
        )}
      </div>

      <div className="muted small" style={{ marginBottom: 8 }}>
        {list.length} bill(s) - {money(total, cur)}
      </div>

      <div className="card table-wrap">
        <table className="tbl">
          <thead><tr><th>Bill No</th><th>Date &amp; Time</th><th>Payment</th><th className="num">Total</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center' }}>No bills found</td></tr>
            )}
            {list.map((b) => (
              <tr key={b.id}>
                <td><b>{b.number}</b></td>
                <td>{fmtDateTime(b.createdAt)}</td>
                <td><span className="badge">{b.paymentLabel}</span></td>
                <td className="num"><b>{money(b.total, cur)}</b></td>
                <td className="right">
                  <button className="btn sm" onClick={() => setView(b)}><Eye size={14} /> View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view && (
        <Modal title={`Bill ${view.number}`} onClose={() => setView(null)}>
          <ReceiptBody bill={view} />
          <div className="actions">
            <button className="btn primary" onClick={() => printBill(view)}><Printer size={16} /> Reprint</button>
            <button className="btn" onClick={() => setView(null)}>Close</button>
          </div>
        </Modal>
      )}
      <PrintPortal bill={view} />
    </>
  );
}
