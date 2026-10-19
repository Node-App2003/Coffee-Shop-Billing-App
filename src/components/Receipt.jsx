import { createPortal } from 'react-dom';
import { fmtDateTime, num } from '../utils.js';

export function ReceiptBody({ bill }) {
  const s = bill.snapshot;
  const cur = s.currency || '₹';
  return (
    <div className="receipt">
      <div className="c shop">{s.shopName}</div>
      {s.address && <div className="c addr">{s.address}</div>}
      {s.phone && <div className="c">Ph: {s.phone}</div>}
      <hr />
      <div className="kv left"><span>Bill No :</span><b>{bill.number}</b></div>
      <div className="kv left"><span>Date&nbsp;&nbsp;&nbsp;:</span><span>{fmtDateTime(bill.createdAt)}</span></div>
      <hr />
      <div className="it head">
        <span>Item</span><span className="n">Qty</span><span className="n">Rate</span><span className="n">Amount</span>
      </div>
      {bill.items.map((i) => (
        <div className="it" key={i.id}>
          <span className="nm">{i.name}</span>
          <span className="n">{i.qty}</span>
          <span className="n">{num(i.price)}</span>
          <span className="n">{num(i.qty * i.price)}</span>
        </div>
      ))}
      <hr />
      <div className="kv"><span>Subtotal</span><span>{cur}{num(bill.subtotal)}</span></div>
      {bill.taxAmount > 0 && (
        <div className="kv"><span>{bill.taxName} ({bill.taxRate}%)</span><span>{cur}{num(bill.taxAmount)}</span></div>
      )}
      {bill.roundOff !== 0 && (
        <div className="kv"><span>Round off</span><span>{bill.roundOff > 0 ? '+' : '-'}{cur}{num(Math.abs(bill.roundOff))}</span></div>
      )}
      <div className="kv total"><span>TOTAL</span><span>{cur}{num(bill.total)}</span></div>
      <hr />
      {bill.payments.map((p, idx) => (
        <div className="kv" key={idx}><span>Paid by {p.method}</span><span>{cur}{num(p.amount)}</span></div>
      ))}
      {s.footer && (<><hr /><div className="c foot">{s.footer}</div></>)}
    </div>
  );
}

// Same receipt rendered into #print-root, which is the only thing visible when printing.
export function PrintPortal({ bill }) {
  const target = document.getElementById('print-root');
  if (!bill || !target) return null;
  return createPortal(<ReceiptBody bill={bill} />, target);
}
