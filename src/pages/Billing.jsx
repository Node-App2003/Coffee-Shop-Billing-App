import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Banknote, Smartphone, CreditCard,
  Wallet, Printer, Lock, Coffee, X, Check, Smartphone as Phone, PauseCircle, Play,
} from 'lucide-react';
import { useStore, actions } from '../store.js';
import QRCode from 'qrcode';
import { calcTotals, money, num, round2, printBill, fmtDateTime } from '../utils.js';
import Modal from '../components/Modal.jsx';
import { ReceiptBody, PrintPortal } from '../components/Receipt.jsx';

const METHODS = [
  { key: 'Cash', icon: Banknote },
  { key: 'UPI', icon: Smartphone },
  { key: 'Card', icon: CreditCard },
  { key: 'Split', icon: Wallet },
];

export default function Billing() {
  const { categories, products, settings, heldBills = [] } = useStore();
  const cur = settings.currency || '₹';

  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('Cash');
  const [split, setSplit] = useState({ Cash: '', UPI: '', Card: '' });
  const [tendered, setTendered] = useState('');
  const [draft, setDraft] = useState(null); // bill preview, NOT stored yet
  const [saved, setSaved] = useState(false); // true once Print has stored it
  const [qr, setQr] = useState('');
  const [heldOpen, setHeldOpen] = useState(false);

  const totals = useMemo(() => calcTotals(cart, settings), [cart, settings]);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const catIcon = (id) => categories.find((c) => c.id === id)?.icon || '☕';

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter(
      (p) => p.enabled && (cat === 'all' || p.categoryId === cat) && (!t || p.name.toLowerCase().includes(t))
    );
  }, [products, cat, q]);

  const qtyOf = (id) => cart.find((i) => i.id === id)?.qty || 0;

  const add = (p) =>
    setCart((c) => {
      const f = c.find((i) => i.id === p.id);
      if (f) return c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  const inc = (id) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  const dec = (id) =>
    setCart((c) => c.flatMap((i) => (i.id !== id ? [i] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : [])));
  const remove = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const clear = () => {
    if (cart.length && window.confirm('Clear the whole cart?')) setCart([]);
  };

  /* ---- hold / resume ---- */
  const hold = () => {
    if (!cart.length) return;
    const label = window.prompt('Hold name (table / customer) - optional', '');
    if (label === null) return; // cancelled
    actions.holdBill(cart, label);
    setCart([]);
    setCartOpen(false);
  };
  const resume = (h) => {
    // a cart that is being billed right now is parked automatically, so nothing is lost
    if (cart.length) actions.holdBill(cart, 'Auto hold');
    setCart(h.items);
    actions.deleteHeld(h.id);
    setHeldOpen(false);
  };
  const dropHeld = (h) => {
    if (window.confirm('Indha held bill-a delete pannanuma?')) actions.deleteHeld(h.id);
  };

  const openPay = () => {
    setMethod('Cash');
    setSplit({ Cash: '', UPI: '', Card: '' });
    setTendered('');
    setPayOpen(true);
  };

  const splitSum = round2(['Cash', 'UPI', 'Card'].reduce((s, m) => s + (Number(split[m]) || 0), 0));
  const splitLeft = round2(totals.total - splitSum);
  const splitOk = Math.abs(splitLeft) < 0.005 && totals.total > 0;
  const canConfirm = cart.length > 0 && (method !== 'Split' || splitOk);
  const change = method === 'Cash' && tendered !== '' ? round2(Number(tendered) - totals.total) : null;

  /* ---- UPI QR: exact amount + shop UPI id from Admin > Settings ---- */
  const upiId = (settings.upiId || '').trim();
  const upiAmount = method === 'UPI' ? totals.total : method === 'Split' ? round2(Number(split.UPI) || 0) : 0;
  const upiLink = upiId && upiAmount > 0
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(settings.shopName)}&am=${upiAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`${settings.shopName} bill`)}`
    : '';
  useEffect(() => {
    let live = true;
    if (!payOpen || !upiLink) { setQr(''); return undefined; }
    QRCode.toDataURL(upiLink, { width: 440, margin: 1, errorCorrectionLevel: 'M' })
      .then((u) => live && setQr(u))
      .catch(() => live && setQr(''));
    return () => { live = false; };
  }, [payOpen, upiLink]);

  const confirm = () => {
    let payments;
    if (method === 'Split') {
      payments = ['Cash', 'UPI', 'Card']
        .map((m) => ({ method: m, amount: round2(Number(split[m]) || 0) }))
        .filter((p) => p.amount > 0);
    } else {
      payments = [{ method, amount: totals.total }];
    }
    const paymentLabel = payments.length > 1 ? 'Split' : payments[0].method;
    // only a preview here - the bill is stored when Print is tapped
    setDraft(
      actions.previewBill({
        items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        totals,
        payments,
        paymentLabel,
      })
    );
    setSaved(false);
    setPayOpen(false);
  };

  const printAndSave = async () => {
    let b = draft;
    if (!saved) {
      b = actions.saveBill(draft); // stored now, with the final bill number
      setDraft(b);
      setSaved(true);
      setCart([]);
      setCartOpen(false);
      await new Promise((r) => setTimeout(r, 80)); // let the print area re-render with the saved bill
    }
    await printBill(b);
  };

  const closeDraft = () => setDraft(null); // not printed => nothing saved, cart stays

  return (
    <>
      <div className="pos">
        <section className="pos-main">
          <div className="pos-top">
            <div className="row between">
              <div className="brand">
                <Coffee size={22} /> {settings.shopName}
              </div>
              <div className="row">
                <button className="admin-link" onClick={() => setHeldOpen(true)}>
                  <PauseCircle size={14} /> Held ({heldBills.length})
                </button>
                <Link to="/admin" className="admin-link">
                  <Lock size={14} /> Admin
                </Link>
              </div>
            </div>
            <div className="search">
              <Search size={17} />
              <input
                className="input"
                placeholder="Search products..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="cats">
              <button className={`cat ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`cat ${cat === c.id ? 'active' : ''}`}
                  onClick={() => setCat(c.id)}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="products">
            {visible.length === 0 && <div className="empty">No products found</div>}
            {visible.map((p) => (
              <button key={p.id} className="prod" onClick={() => add(p)}>
                <div className="thumb">
                  {p.image ? <img src={p.image} alt="" /> : catIcon(p.categoryId)}
                  {qtyOf(p.id) > 0 && <span className="qtybadge">{qtyOf(p.id)}</span>}
                </div>
                <div className="info">
                  <div className="nm">{p.name}</div>
                  <div className="pr">{money(p.price, cur)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className={`cart ${cartOpen ? 'open' : ''}`}>
          <div className="cart-head">
            <div className="row">
              <ShoppingCart size={20} />
              <b>Current Bill</b>
              <span className="badge">{itemCount} items</span>
            </div>
            <div className="row">
              <button className="btn sm danger" onClick={clear} disabled={!cart.length}>
                <Trash2 size={14} /> Clear
              </button>
              <button className="btn sm icon only-mobile" onClick={() => setCartOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="cart-items">
            {cart.length === 0 && <div className="empty muted">Tap a product to add it</div>}
            {cart.map((i) => (
              <div className="line" key={i.id}>
                <div className="row between">
                  <b>{i.name}</b>
                  <button className="btn sm icon danger" onClick={() => remove(i.id)} title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="row between">
                  <div className="stepper">
                    <button onClick={() => dec(i.id)}><Minus size={14} /></button>
                    <span>{i.qty}</span>
                    <button onClick={() => inc(i.id)}><Plus size={14} /></button>
                  </div>
                  <div className="muted small">
                    {num(i.price)} x {i.qty} = <b style={{ color: 'var(--text)' }}>{money(i.price * i.qty, cur)}</b>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="totals">
            <div className="t"><span>Subtotal</span><span>{money(totals.subtotal, cur)}</span></div>
            {settings.taxEnabled && (
              <div className="t">
                <span>{settings.taxName} ({settings.taxRate}%)</span>
                <span>{money(totals.taxAmount, cur)}</span>
              </div>
            )}
            {totals.roundOff !== 0 && (
              <div className="t">
                <span>Round off</span>
                <span>{totals.roundOff > 0 ? '+' : ''}{num(totals.roundOff)}</span>
              </div>
            )}
            <div className="t grand"><span>Total</span><span>{money(totals.total, cur)}</span></div>
          </div>
          <div className="cart-foot">
            <button className="btn" disabled={!cart.length} onClick={hold}>
              <PauseCircle size={16} /> Hold
            </button>
            <button className="btn primary" disabled={!cart.length} onClick={openPay}>
              Pay {money(totals.total, cur)}
            </button>
          </div>
        </aside>

        {itemCount > 0 && !cartOpen && (
          <button className="cart-fab" onClick={() => setCartOpen(true)}>
            <span className="row"><ShoppingCart size={20} /> {itemCount} items</span>
            <span>{money(totals.total, cur)}</span>
          </button>
        )}
      </div>

      {heldOpen && (
        <Modal title="Held bills" onClose={() => setHeldOpen(false)}>
          {heldBills.length === 0 && <div className="muted">Hold pannina bill edhuvum illa</div>}
          <div className="dev-list">
            {heldBills.map((h) => {
              const cnt = h.items.reduce((s, i) => s + i.qty, 0);
              const tot = calcTotals(h.items, settings).total;
              return (
                <div className="dev" key={h.id}>
                  <span>
                    <b>{h.label || 'Held bill'}</b> - {money(tot, cur)}<br />
                    <span className="muted small">{cnt} items - {fmtDateTime(h.heldAt)}</span>
                  </span>
                  <span className="row">
                    <button className="btn sm primary" onClick={() => resume(h)}><Play size={14} /> Resume</button>
                    <button className="btn sm danger icon" onClick={() => dropHeld(h)}><Trash2 size={14} /></button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="actions"><button className="btn" onClick={() => setHeldOpen(false)}>Close</button></div>
        </Modal>
      )}

      {payOpen && (
        <Modal title="Payment" onClose={() => setPayOpen(false)}>
          <div className="big-total">{money(totals.total, cur)}</div>
          <div className="pay-methods">
            {METHODS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                className={`pay-m ${method === key ? 'active' : ''}`}
                onClick={() => setMethod(key)}
              >
                <Icon size={22} />
                {key === 'Split' ? 'Split' : key}
              </button>
            ))}
          </div>

          {method === 'Cash' && (
            <div className="field">
              <label>Cash received (optional)</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder={String(totals.total)}
              />
              {change !== null && (
                <div className={change >= 0 ? 'badge green' : 'err'} style={{ alignSelf: 'flex-start' }}>
                  {change >= 0 ? `Change to return: ${money(change, cur)}` : `Short by ${money(-change, cur)}`}
                </div>
              )}
            </div>
          )}

          {method === 'Split' && (
            <div>
              {['Cash', 'UPI', 'Card'].map((m) => (
                <div className="field" key={m}>
                  <label>{m} amount</label>
                  <div className="row">
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      value={split[m]}
                      onChange={(e) => setSplit((s) => ({ ...s, [m]: e.target.value }))}
                      placeholder="0"
                    />
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() =>
                        setSplit((s) => ({
                          ...s,
                          [m]: String(round2(Math.max(0, totals.total - (splitSum - (Number(s[m]) || 0))))),
                        }))
                      }
                    >
                      Rest
                    </button>
                  </div>
                </div>
              ))}
              <div className={splitOk ? 'badge green' : 'err'}>
                {splitOk
                  ? 'Amounts match the total'
                  : splitLeft > 0
                  ? `Remaining: ${money(splitLeft, cur)}`
                  : `Over by ${money(-splitLeft, cur)}`}
              </div>
            </div>
          )}

          {upiAmount > 0 && (
            <div className="qr-box">
              {!upiId ? (
                <div className="err">
                  UPI ID set pannala. Admin → Settings-la shop UPI ID add pannunga.
                </div>
              ) : qr ? (
                <>
                  <img src={qr} alt="UPI QR" />
                  <div className="small muted" style={{ marginTop: 6 }}>
                    Scan with any UPI app - {money(upiAmount, cur)} to {upiId}
                  </div>
                  <a className="btn sm" style={{ marginTop: 8, textDecoration: 'none' }} href={upiLink}>
                    <Phone size={14} /> Open UPI app
                  </a>
                </>
              ) : (
                <div className="muted small">Generating QR...</div>
              )}
            </div>
          )}

          <div className="actions">
            <button className="btn" onClick={() => setPayOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={!canConfirm} onClick={confirm}>
              <Check size={16} /> Confirm &amp; Generate Bill
            </button>
          </div>
        </Modal>
      )}

      {draft && (
        <Modal title={saved ? 'Bill saved' : 'Bill preview'} onClose={closeDraft}>
          {saved ? (
            <div className="badge green" style={{ marginBottom: 10 }}>✓ Saved - {draft.number}</div>
          ) : (
            <div className="muted small" style={{ marginBottom: 10 }}>
              Print tap pannina thaan bill save aagum.
            </div>
          )}
          <ReceiptBody bill={draft} />
          <div className="actions">
            {!saved && <button className="btn" onClick={closeDraft}>Back</button>}
            <button className="btn primary" onClick={printAndSave}>
              <Printer size={16} /> {saved ? 'Print again' : 'Print & Save'}
            </button>
            {saved && <button className="btn" onClick={closeDraft}>New Bill</button>}
          </div>
        </Modal>
      )}
      <PrintPortal bill={draft} />
    </>
  );
}
