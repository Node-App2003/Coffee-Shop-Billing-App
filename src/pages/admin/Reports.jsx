import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useStore } from '../../store.js';
import { money, num, rangeText, exportCSV, exportPDF, stamp } from '../../utils.js';
import { billsIn, expensesIn, sum, paymentBreakdown, productStats, salesSeries } from '../../analytics.js';
import RangePicker, { initialRange, useRange } from '../../components/RangePicker.jsx';

const BROWN = '#6f4e37';
const PAY_COLORS = ['#6f4e37', '#c08a5b', '#8fb996'];
const MODES = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];

export default function Reports() {
  const { bills, expenses, products, settings } = useStore();
  const cur = settings.currency || '₹';
  const [r, setR] = useState(initialRange('month'));
  const [mode, setMode] = useState('daily');
  const range = useRange(r);

  const list = billsIn(bills, range);
  const exps = expensesIn(expenses, range);
  const sales = sum(list, (b) => b.total);
  const spent = sum(exps, (e) => e.amount);
  const profit = sales - spent;
  const stats = productStats(list);
  const best = stats.slice(0, 5);

  // least selling: every enabled product, including ones with zero sales in this period
  const sold = new Map(stats.map((s) => [s.name, s.qty]));
  const least = products
    .filter((p) => p.enabled)
    .map((p) => ({ name: p.name, qty: sold.get(p.name) || 0 }))
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 5);

  const pay = paymentBreakdown(list);
  const payShown = pay.filter((p) => p.value > 0);
  const series = salesSeries(bills, mode);
  const vs = [
    { name: 'Sales', value: sales },
    { name: 'Expenses', value: spent },
    { name: 'Profit', value: Math.max(profit, 0) },
  ];

  const fmtTip = (v) => money(v, cur);

  const exportRows = () => [
    ['Total sales', num(sales)],
    ['Total bills', list.length],
    ['Total expenses', num(spent)],
    ['Estimated profit', num(profit)],
    ...pay.map((p) => [`Paid by ${p.name}`, num(p.value)]),
    ...best.map((b, i) => [`Best seller #${i + 1}: ${b.name}`, `${b.qty} sold`]),
    ...least.map((b, i) => [`Least seller #${i + 1}: ${b.name}`, `${b.qty} sold`]),
  ];

  return (
    <>
      <div className="page-title">
        Reports &amp; Analytics
        <div className="row">
          <button className="btn sm" onClick={() => exportCSV(`report-${stamp()}.csv`, ['Metric', 'Value'], exportRows())}>
            <Download size={14} /> CSV
          </button>
          <button
            className="btn sm"
            onClick={() =>
              exportPDF({
                filename: `report-${stamp()}.pdf`,
                title: `${settings.shopName} - Report`,
                subtitle: rangeText(range),
                head: ['Metric', 'Value'],
                rows: exportRows(),
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
        <div className="card stat"><div className="lbl">Sales</div><div className="val">{money(sales, cur)}</div></div>
        <div className="card stat"><div className="lbl">Bills</div><div className="val">{list.length}</div></div>
        <div className="card stat"><div className="lbl">Expenses</div><div className="val neg">{money(spent, cur)}</div></div>
        <div className="card stat">
          <div className="lbl">Estimated Profit</div>
          <div className={`val ${profit >= 0 ? 'pos' : 'neg'}`}>{money(profit, cur)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between wrap">
          <h3>Sales graph</h3>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {MODES.map(([k, label]) => (
              <button key={k} className={`tab ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="chart-box">
          <ResponsiveContainer>
            <BarChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={fmtTip} />
              <Bar dataKey="sales" name="Sales" fill={BROWN} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid two" style={{ marginBottom: 14 }}>
        <div className="card">
          <h3>Payment method breakdown</h3>
          {payShown.length === 0 ? (
            <div className="muted small">No sales in this period</div>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={payShown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {payShown.map((p, i) => (
                      <Cell key={p.name} fill={PAY_COLORS[['Cash', 'UPI', 'Card'].indexOf(p.name) % 3]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={fmtTip} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Expense vs Sales</h3>
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={vs} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={fmtTip} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill={BROWN} />
                  <Cell fill="#c62828" />
                  <Cell fill="#2e7d32" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card table-wrap">
          <h3>Best-selling products</h3>
          <table className="tbl">
            <thead><tr><th>Product</th><th className="num">Qty</th><th className="num">Revenue</th></tr></thead>
            <tbody>
              {best.length === 0 && <tr><td colSpan={3} className="muted">No sales yet</td></tr>}
              {best.map((b) => (
                <tr key={b.name}><td>{b.name}</td><td className="num">{b.qty}</td><td className="num">{money(b.revenue, cur)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card table-wrap">
          <h3>Least-selling products</h3>
          <table className="tbl">
            <thead><tr><th>Product</th><th className="num">Qty</th></tr></thead>
            <tbody>
              {least.length === 0 && <tr><td colSpan={2} className="muted">No products</td></tr>}
              {least.map((b) => (
                <tr key={b.name}><td>{b.name}</td><td className="num">{b.qty}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
