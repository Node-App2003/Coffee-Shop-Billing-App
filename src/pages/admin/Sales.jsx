import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useStore } from '../../store.js';
import { money, num, fmtDate, rangeText, exportCSV, exportPDF, stamp } from '../../utils.js';
import { billsIn, sum, paymentBreakdown, dayWise } from '../../analytics.js';
import RangePicker, { initialRange, useRange } from '../../components/RangePicker.jsx';

export default function Sales() {
  const { bills, settings } = useStore();
  const cur = settings.currency || '₹';
  const [r, setR] = useState(initialRange('today'));
  const range = useRange(r);

  const list = billsIn(bills, range);
  const total = sum(list, (b) => b.total);
  const tax = sum(list, (b) => b.taxAmount || 0);
  const avg = list.length ? total / list.length : 0;
  const pay = paymentBreakdown(list);
  const days = dayWise(list);

  const head = ['Date', 'Bills', `Sales (${cur})`];
  const rows = days.map((d) => [d.day, d.bills, num(d.total)]);

  return (
    <>
      <div className="page-title">
        Sales
        <div className="row">
          <button className="btn sm" disabled={!days.length} onClick={() => exportCSV(`sales-${stamp()}.csv`, head, rows)}>
            <Download size={14} /> CSV
          </button>
          <button
            className="btn sm"
            disabled={!days.length}
            onClick={() =>
              exportPDF({
                filename: `sales-${stamp()}.pdf`,
                title: `${settings.shopName} - Sales Report`,
                subtitle: `${rangeText(range)} | Total ${cur}${num(total)} | Bills ${list.length}`,
                head,
                rows,
              })
            }
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      <RangePicker value={r} onChange={setR} />
      <div className="muted small" style={{ marginBottom: 10 }}>{rangeText(range)}</div>

      <div className="grid stats">
        <div className="card stat"><div className="lbl">Total Sales</div><div className="val">{money(total, cur)}</div></div>
        <div className="card stat"><div className="lbl">Total Bills</div><div className="val">{list.length}</div></div>
        <div className="card stat"><div className="lbl">Average Bill</div><div className="val">{money(avg, cur)}</div></div>
        {settings.taxEnabled && (
          <div className="card stat"><div className="lbl">Tax Collected</div><div className="val">{money(tax, cur)}</div></div>
        )}
        {pay.map((p) => (
          <div className="card stat" key={p.name}><div className="lbl">{p.name}</div><div className="val">{money(p.value, cur)}</div></div>
        ))}
      </div>

      <div className="card table-wrap">
        <h3>Day-wise sales</h3>
        <table className="tbl">
          <thead><tr><th>Date</th><th className="num">Bills</th><th className="num">Sales</th></tr></thead>
          <tbody>
            {days.length === 0 && (
              <tr><td colSpan={3} className="muted" style={{ textAlign: 'center' }}>No sales in this period</td></tr>
            )}
            {days.map((d) => (
              <tr key={d.day}>
                <td>{fmtDate(`${d.day}T12:00:00`)}</td>
                <td className="num">{d.bills}</td>
                <td className="num"><b>{money(d.total, cur)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
