import { createPortal } from 'react-dom';
import { fmtDateTime, num } from '../utils.js';

export function ReceiptBody({ bill }) {
  const s = bill.snapshot;
  return (
    <div className="receipt">
      <div className="c shop">{s.shopName}</div>
      {s.address && <div className="c">{s.address}</div>}
      {s.phone && <div className="c">Ph: {s.phone}</div>}
      <hr />
      <div className="r"><span>Bill No</span><span>{bill.number}</span></div>
      <div className="r"><span>Date</span><span>{fmtDateTime(bill.createdAt)}</span></div>
      <hr />
      {bill.items.map((i) => (
        <div key={i.id} style={{ marginBottom: 4 }}>
          <div>{i.name}</div>
          <div className="r">
            <span>&nbsp;&nbsp;{i.qty} x {num(i.price)}</span>
            <span>{num(i.qty * i.price)}</span>
          </div>
        </div>
      ))}
      <hr />
      <div className="r"><span>Subtotal</span><span>{s.currency}{num(bill.subtotal)}</span></div>
      {bill.taxAmount > 0 && (
        <div className="r"><span>{bill.taxName} ({bill.taxRate}%)</span><span>{s.currency}{num(bill.taxAmount)}</span></div>
      )}
      {bill.roundOff !== 0 && (
        <div className="r"><span>Round off</span><span>{bill.roundOff > 0 ? '+' : ''}{num(bill.roundOff)}</span></div>
      )}
      <div className="r b" style={{ fontSize: 15, marginTop: 4 }}>
        <span>TOTAL</span><span>{s.currency}{num(bill.total)}</span>
      </div>
      <hr />
      {bill.payments.map((p, idx) => (
        <div className="r" key={idx}><span>Paid by {p.method}</span><span>{s.currency}{num(p.amount)}</span></div>
      ))}
      {s.footer && (<><hr /><div className="c">{s.footer}</div></>)}
    </div>
  );
}

// Same receipt rendered into #print-root, which is the only thing visible when printing.
export function PrintPortal({ bill }) {
  const target = document.getElementById('print-root');
  if (!bill || !target) return null;
  return createPortal(<ReceiptBody bill={bill} />, target);
}
