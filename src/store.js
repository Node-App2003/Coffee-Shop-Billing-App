import { useSyncExternalStore } from 'react';

const KEY = 'cafe-billing-v1';

/* ---------- default data ---------- */
const defaultCategories = [
  { id: 'cat-coffee', name: 'Coffee', icon: '☕' },
  { id: 'cat-tea', name: 'Tea', icon: '🍵' },
  { id: 'cat-snacks', name: 'Snacks', icon: '🥪' },
  { id: 'cat-milkshakes', name: 'Milkshakes', icon: '🥤' },
  { id: 'cat-cake', name: 'Cake & Desserts', icon: '🍰' },
];
const p = (id, name, price, categoryId) => ({ id, name, price, categoryId, image: '', enabled: true });
const defaultProducts = [
  p('p1', 'Filter Coffee', 30, 'cat-coffee'),
  p('p2', 'Cappuccino', 120, 'cat-coffee'),
  p('p3', 'Latte', 130, 'cat-coffee'),
  p('p4', 'Espresso', 90, 'cat-coffee'),
  p('p5', 'Cold Coffee', 110, 'cat-coffee'),
  p('p6', 'Masala Tea', 25, 'cat-tea'),
  p('p7', 'Ginger Tea', 25, 'cat-tea'),
  p('p8', 'Green Tea', 40, 'cat-tea'),
  p('p9', 'Lemon Tea', 30, 'cat-tea'),
  p('p10', 'Veg Sandwich', 80, 'cat-snacks'),
  p('p11', 'Grilled Cheese Sandwich', 100, 'cat-snacks'),
  p('p12', 'Veg Puff', 30, 'cat-snacks'),
  p('p13', 'French Fries', 90, 'cat-snacks'),
  p('p14', 'Chocolate Milkshake', 130, 'cat-milkshakes'),
  p('p15', 'Strawberry Milkshake', 130, 'cat-milkshakes'),
  p('p16', 'Vanilla Milkshake', 120, 'cat-milkshakes'),
  p('p17', 'Banana Milkshake', 110, 'cat-milkshakes'),
  p('p18', 'Chocolate Pastry', 80, 'cat-cake'),
  p('p19', 'Cheesecake Slice', 140, 'cat-cake'),
  p('p20', 'Brownie', 90, 'cat-cake'),
  p('p21', 'Red Velvet Slice', 120, 'cat-cake'),
];

const defaultSettings = {
  shopName: 'My Coffee Shop',
  address: '',
  phone: '',
  currency: '₹',
  taxEnabled: false,
  taxName: 'GST',
  taxRate: 5,
  roundOff: true,
  footer: 'Thank you! Visit again ☕',
  billPrefix: 'FB',
  upiId: '',
  gstin: '',
  printerAddress: '', // Bluetooth thermal printer (APK only)
  printerName: '',
  printerPaper: '58', // '58' mm => 32 chars/line, '80' mm => 48 chars/line
};

const initial = () => ({
  categories: defaultCategories,
  products: defaultProducts,
  bills: [],
  expenses: [],
  workers: [], // { id, name, role, salary }
  salaryPayments: [], // { id, workerId, type: 'salary'|'advance', month, date, amount, deduction, ... }
  settings: defaultSettings,
  // passHash null = default password (admin123). PIN is an optional quick-login after the first password login.
  auth: { username: 'admin', passHash: null, pinHash: null, pinLen: 0, pinFails: 0, quickPrompted: false },
  seqs: {},
  dayClosings: [], // daily closing reports
  lastBackupAt: null,
});

/* ---------- persistence ---------- */
function load() {
  const base = initial();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return {
      ...base,
      ...saved,
      settings: { ...base.settings, ...(saved.settings || {}) },
      auth: { ...base.auth, ...(saved.auth || {}) },
    };
  } catch {
    return base;
  }
}

let state = load();
const listeners = new Set();

function commit(next) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error(e);
    window.alert('Storage is full - remove some product images or export a backup.');
  }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useStore = () => useSyncExternalStore(subscribe, () => state);
export const getState = () => state;

const billNumber = (prefix, year, seq) =>
  `${(prefix || 'FB').trim()}-${year}-${String(seq).padStart(4, '0')}`;

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

/* ---------- password hashing (device-local protection) ---------- */
async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function c53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
async function hashPassword(pw, alg) {
  const salted = `cafe-billing::${pw}`;
  const hasSubtle = !!globalThis.crypto?.subtle;
  const use = alg || (hasSubtle ? 's256' : 'c53');
  if (use === 's256' && hasSubtle) return `s256:${await sha256(salted)}`;
  return `c53:${c53(salted)}`;
}

export async function verifyLogin(username, password) {
  const a = state.auth;
  if (username.trim().toLowerCase() !== a.username.toLowerCase()) return false;
  const ok = !a.passHash
    ? password === 'admin123'
    : (await hashPassword(password, a.passHash.split(':')[0])) === a.passHash;
  if (ok && a.pinFails) commit({ ...state, auth: { ...state.auth, pinFails: 0 } }); // password unlocks the PIN again
  return ok;
}

export const PIN_MAX_FAILS = 5;

// 5 wrong PINs in a row => PIN is locked until the admin logs in with the password once.
export async function verifyPin(pin) {
  const a = state.auth;
  if (!a.pinHash) return { ok: false, locked: false, left: 0 };
  if ((a.pinFails || 0) >= PIN_MAX_FAILS) return { ok: false, locked: true, left: 0 };
  const ok = (await hashPassword(`pin:${pin}`, a.pinHash.split(':')[0])) === a.pinHash;
  const fails = ok ? 0 : (a.pinFails || 0) + 1;
  commit({ ...state, auth: { ...state.auth, pinFails: fails } });
  return { ok, locked: !ok && fails >= PIN_MAX_FAILS, left: Math.max(0, PIN_MAX_FAILS - fails) };
}

/* ---------- actions ---------- */
export const actions = {
  /* products */
  saveProduct(prod) {
    const exists = state.products.some((x) => x.id === prod.id);
    const clean = { ...prod, price: Number(prod.price) || 0 };
    commit({
      ...state,
      products: exists
        ? state.products.map((x) => (x.id === prod.id ? clean : x))
        : [...state.products, { ...clean, id: uid() }],
    });
  },
  deleteProduct(id) {
    commit({ ...state, products: state.products.filter((x) => x.id !== id) });
  },
  toggleProduct(id) {
    commit({
      ...state,
      products: state.products.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
    });
  },

  /* categories */
  saveCategory(cat) {
    const exists = state.categories.some((x) => x.id === cat.id);
    commit({
      ...state,
      categories: exists
        ? state.categories.map((x) => (x.id === cat.id ? cat : x))
        : [...state.categories, { ...cat, id: uid() }],
    });
  },
  deleteCategory(id) {
    const count = state.products.filter((x) => x.categoryId === id).length;
    if (count > 0) return { ok: false, count };
    commit({ ...state, categories: state.categories.filter((x) => x.id !== id) });
    return { ok: true };
  },

  /* bills: built as a draft first, stored only when the cashier taps Print */
  previewBill({ items, totals, payments, paymentLabel }) {
    const now = new Date();
    const s = state.settings;
    const year = String(now.getFullYear());
    const seq = (state.seqs[year] || 0) + 1;
    return {
      id: uid(),
      number: billNumber(s.billPrefix, year, seq),
      createdAt: now.toISOString(),
      items,
      ...totals,
      taxRate: s.taxEnabled ? Number(s.taxRate) : 0,
      taxName: s.taxName,
      payments,
      paymentLabel,
      // shop details are frozen into the bill so reprints look identical later
      snapshot: {
        shopName: s.shopName,
        address: s.address,
        phone: s.phone,
        gstin: s.gstin,
        currency: s.currency,
        footer: s.footer,
      },
    };
  },
  saveBill(draft) {
    const now = new Date();
    const year = String(now.getFullYear());
    const seq = (state.seqs[year] || 0) + 1;
    const bill = {
      ...draft,
      number: billNumber(state.settings.billPrefix, year, seq),
      createdAt: now.toISOString(),
    };
    commit({ ...state, bills: [bill, ...state.bills], seqs: { ...state.seqs, [year]: seq } });
    return bill;
  },

  /* expenses */
  saveExpense(exp) {
    const exists = state.expenses.some((x) => x.id === exp.id);
    const clean = { ...exp, amount: Number(exp.amount) || 0 };
    commit({
      ...state,
      expenses: exists
        ? state.expenses.map((x) => (x.id === exp.id ? clean : x))
        : [{ ...clean, id: uid() }, ...state.expenses],
    });
  },
  deleteExpense(id) {
    commit({ ...state, expenses: state.expenses.filter((x) => x.id !== id) });
  },

  /* workers */
  saveWorker(w) {
    const exists = state.workers.some((x) => x.id === w.id);
    const clean = { ...w, name: w.name.trim(), salary: Number(w.salary) || 0 };
    commit({
      ...state,
      workers: exists
        ? state.workers.map((x) => (x.id === w.id ? clean : x))
        : [...state.workers, { ...clean, id: uid() }],
    });
  },
  deleteWorker(id) {
    // old salary/advance records (and their expense entries) are kept for the accounts
    commit({ ...state, workers: state.workers.filter((x) => x.id !== id) });
  },
  // Salary or advance: stored as a payment AND added to Expenses (Staff expenses) automatically.
  // For salary, `deduction` is the advance being adjusted, so only the net cash is an expense
  // (the advance was already counted as an expense when it was given).
  addWorkerPayment({ workerId, type, amount, deduction = 0, month, date, note = '' }) {
    const w = state.workers.find((x) => x.id === workerId);
    if (!w) return;
    const id = uid();
    const net = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
    const label = type === 'advance' ? `Advance - ${w.name}` : `Salary - ${w.name} (${month})`;
    const expenseId = net > 0 ? uid() : null;
    const payment = {
      id, workerId, workerName: w.name, role: w.role, type, month, date,
      gross: type === 'salary' ? w.salary : 0,
      deduction: Number(deduction) || 0,
      amount: net, note, expenseId,
    };
    const expenses = expenseId
      ? [{ id: expenseId, date, type: 'Staff expenses', note: note ? `${label} - ${note}` : label, amount: net, paymentId: id }, ...state.expenses]
      : state.expenses;
    commit({ ...state, salaryPayments: [payment, ...state.salaryPayments], expenses });
  },
  deleteWorkerPayment(id) {
    const pay = state.salaryPayments.find((x) => x.id === id);
    if (!pay) return;
    commit({
      ...state,
      salaryPayments: state.salaryPayments.filter((x) => x.id !== id),
      expenses: state.expenses.filter((x) => x.id !== pay.expenseId),
    });
  },

  /* daily closing: one record per date (closing again the same day replaces it) */
  saveDayClosing(c) {
    const rec = { ...c, id: uid(), closedAt: new Date().toISOString() };
    commit({ ...state, dayClosings: [rec, ...state.dayClosings.filter((x) => x.date !== c.date)] });
    return rec;
  },
  deleteDayClosing(id) {
    commit({ ...state, dayClosings: state.dayClosings.filter((x) => x.id !== id) });
  },
  markBackup() {
    commit({ ...state, lastBackupAt: new Date().toISOString() });
  },

  /* settings + account */
  updateSettings(patch) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },
  async setCredentials(username, newPassword) {
    const passHash = newPassword ? await hashPassword(newPassword) : state.auth.passHash;
    commit({ ...state, auth: { ...state.auth, username: username.trim(), passHash } });
  },
  async setPin(pin) {
    const pinHash = await hashPassword(`pin:${pin}`);
    commit({ ...state, auth: { ...state.auth, pinHash, pinLen: String(pin).length, pinFails: 0 } });
  },
  disableQuickLogin() {
    commit({ ...state, auth: { ...state.auth, pinHash: null, pinLen: 0, pinFails: 0 } });
  },
  markQuickPrompted() {
    if (!state.auth.quickPrompted) commit({ ...state, auth: { ...state.auth, quickPrompted: true } });
  },

  /* backup */
  exportBackup() {
    return JSON.stringify({ app: 'cafe-billing', version: 1, data: state }, null, 2);
  },
  importBackup(text) {
    const parsed = JSON.parse(text);
    const d = parsed?.data;
    if (!d || !Array.isArray(d.products) || !Array.isArray(d.categories) || !Array.isArray(d.bills)) {
      throw new Error('Not a valid Cafe Billing backup file');
    }
    const base = initial();
    commit({
      ...base,
      ...d,
      settings: { ...base.settings, ...(d.settings || {}) },
      auth: { ...base.auth, ...(d.auth || {}) },
    });
  },
};
