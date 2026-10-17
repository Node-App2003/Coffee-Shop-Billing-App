import { dayKey, inRange, round2, weekStart, pad } from './utils.js';

export const billsIn = (bills, range) => bills.filter((b) => inRange(b.createdAt, range));
export const expensesIn = (expenses, range) =>
  expenses.filter((e) => inRange(`${e.date}T12:00:00`, range));

export const sum = (arr, f) => round2(arr.reduce((s, x) => s + f(x), 0));

export function paymentBreakdown(bills) {
  const m = { Cash: 0, UPI: 0, Card: 0 };
  bills.forEach((b) => b.payments.forEach((p) => { m[p.method] = round2((m[p.method] || 0) + p.amount); }));
  return Object.entries(m).map(([name, value]) => ({ name, value }));
}

// qty + revenue per product name, sorted best first
export function productStats(bills) {
  const map = new Map();
  bills.forEach((b) =>
    b.items.forEach((i) => {
      const cur = map.get(i.name) || { name: i.name, qty: 0, revenue: 0 };
      cur.qty += i.qty;
      cur.revenue = round2(cur.revenue + i.qty * i.price);
      map.set(i.name, cur);
    })
  );
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sales per day (last 30), week (last 12) or month (last 12) - always includes empty periods.
export function salesSeries(bills, mode) {
  const now = new Date();
  const buckets = [];
  if (mode === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({ key: dayKey(d), label: `${d.getDate()} ${MON[d.getMonth()]}`, sales: 0 });
    }
  } else if (mode === 'weekly') {
    const ws = weekStart(now);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() - i * 7);
      buckets.push({ key: dayKey(d), label: `${d.getDate()} ${MON[d.getMonth()]}`, sales: 0 });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, sales: 0 });
    }
  }
  const idx = new Map(buckets.map((b) => [b.key, b]));
  bills.forEach((b) => {
    const d = new Date(b.createdAt);
    const key =
      mode === 'daily' ? dayKey(d) : mode === 'weekly' ? dayKey(weekStart(d)) : dayKey(d).slice(0, 7);
    const bucket = idx.get(key);
    if (bucket) bucket.sales = round2(bucket.sales + b.total);
  });
  return buckets;
}

// Day-wise table for any range
export function dayWise(bills) {
  const map = new Map();
  bills.forEach((b) => {
    const k = dayKey(b.createdAt);
    const cur = map.get(k) || { day: k, bills: 0, total: 0 };
    cur.bills += 1;
    cur.total = round2(cur.total + b.total);
    map.set(k, cur);
  });
  return [...map.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}
