import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Banknote, Smartphone, CreditCard,
  Wallet, Printer, FileDown, Lock, Coffee, X, Check,
} from 'lucide-react';
import { useStore, actions } from '../store.js';
import { calcTotals, money, num, round2, printBill, shareReceiptPdf } from '../utils.js';
import Modal from '../components/Modal.jsx';
import { ReceiptBody, PrintPortal } from '../components/Receipt.jsx';

const METHODS = [
  { key: 'Cash', icon: Banknote },
  { key: 'UPI', icon: Smartphone },
  { key: 'Card', icon: CreditCard },
  { key: 'Split', icon: Wallet },
];

export default function Billing() {
  const { categories, products, settings } = useStore();
  const cur = settings.currency || '₹';

  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('Cash');
  const [split, setSplit] = useState({ Cash: '', UPI: '', Card: '' });
  const [tendered, setTendered] = useState('');
  const [bill, setBill] = useState(null);

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
    const saved = actions.addBill({
      items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      totals,
      payments,
      paymentLabel,
    });
    setBill(saved);
    setCart([]);
    setPayOpen(false);
    setCartOpen(false);
  };

  return (
    <>
      <div className="pos">
        <section className="pos-main">
          <div className="pos-top">
            <div className="row between">
              <div className="brand">
                <Coffee size={22} /> {settings.shopName}
              </div>
              <Link to="/admin" className="admin-link">
                <Lock size={14} /> Admin
              </Link>
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

          <div className="actions">
            <button className="btn" onClick={() => setPayOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={!canConfirm} onClick={confirm}>
              <Check size={16} /> Confirm &amp; Generate Bill
            </button>
          </div>
        </Modal>
      )}

      {bill && (
        <Modal title="Bill generated" onClose={() => setBill(null)}>
          <div className="badge green" style={{ marginBottom: 10 }}>✓ Bill saved - {bill.number}</div>
          <ReceiptBody bill={bill} />
          <div className="actions">
            <button className="btn" onClick={() => shareReceiptPdf(bill)}>
              <FileDown size={16} /> PDF
            </button>
            <button className="btn" onClick={() => printBill(bill)}>
              <Printer size={16} /> Print
            </button>
            <button className="btn primary" onClick={() => setBill(null)}>New Bill</button>
          </div>
        </Modal>
      )}
      <PrintPortal bill={bill} />
    </>
  );
}
