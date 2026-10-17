import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative = () => Capacitor.isNativePlatform();

/* ---------- money ---------- */
const nf = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (n) => nf.format(Number(n) || 0);
export const money = (n, cur = '₹') => `${cur}${num(n)}`;
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function calcTotals(items, settings) {
  const subtotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
  const taxAmount = settings.taxEnabled ? round2((subtotal * Number(settings.taxRate || 0)) / 100) : 0;
  const raw = round2(subtotal + taxAmount);
  const total = settings.roundOff ? Math.round(raw) : raw;
  const roundOff = round2(total - raw);
  return { subtotal, taxAmount, roundOff, total };
}

/* ---------- dates ---------- */
export const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
export const monthKey = (d) => dayKey(d).slice(0, 7);
export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
export const weekStart = (d) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
};
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
export const stamp = () => {
  const n = new Date();
  return `${dayKey(n).replace(/-/g, '')}-${pad(n.getHours())}${pad(n.getMinutes())}`;
};

export function getRange(key, customFrom = '', customTo = '') {
  const now = new Date();
  const today = startOfDay(now);
  switch (key) {
    case 'today':
      return { from: today, to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: y, to: endOfDay(y) };
    }
    case 'week':
      return { from: weekStart(now), to: endOfDay(now) };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case 'custom':
      return {
        from: customFrom ? new Date(`${customFrom}T00:00:00`) : null,
        to: customTo ? new Date(`${customTo}T23:59:59.999`) : null,
      };
    default:
      return { from: null, to: null };
  }
}
export const inRange = (iso, r) => {
  const t = new Date(iso).getTime();
  return (!r.from || t >= r.from.getTime()) && (!r.to || t <= r.to.getTime());
};
export const rangeText = (r) => {
  if (!r.from && !r.to) return 'All time';
  if (r.from && r.to && dayKey(r.from) === dayKey(r.to)) return fmtDate(r.from);
  return `${r.from ? fmtDate(r.from) : 'Start'} - ${r.to ? fmtDate(r.to) : 'Now'}`;
};

/* ---------- file export (browser download or Android share sheet) ---------- */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function shareNative(filename, data, encoding) {
  const r = await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
    ...(encoding ? { encoding } : {}),
  });
  await Share.share({ title: filename, url: r.uri, dialogTitle: 'Save or share' });
}

export async function saveText(filename, text, mime = 'text/plain') {
  if (isNative()) return shareNative(filename, text, Encoding.UTF8);
  downloadBlob(new Blob([text], { type: mime }), filename);
}

const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (head, rows) =>
  '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
export const exportCSV = (filename, head, rows) =>
  saveText(filename, toCSV(head, rows), 'text/csv;charset=utf-8');

// jsPDF's built-in fonts have no rupee glyph, so PDFs use "Rs." and plain ASCII.
const pdfText = (v) =>
  String(v ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x20-\x7E]/g, '');

async function savePdf(doc, filename) {
  if (isNative()) {
    const b64 = doc.output('datauristring').split(',')[1];
    return shareNative(filename, b64);
  }
  doc.save(filename);
}

export async function exportPDF({ filename, title, subtitle = '', head, rows }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(pdfText(title), 14, 16);
  doc.setFontSize(10);
  doc.text(pdfText(subtitle), 14, 23);
  autoTable(doc, {
    head: [head.map(pdfText)],
    body: rows.map((r) => r.map(pdfText)),
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [111, 78, 55] },
  });
  await savePdf(doc, filename);
}

/* ---------- bill printing ---------- */
const W = 40;
const center = (t) => ' '.repeat(Math.max(0, Math.floor((W - t.length) / 2))) + t;
const lr = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;
const rs = (n) => `Rs.${num(n)}`;

// word-wrap plain text into lines of at most `width` characters (keeps manual line breaks)
function wrap(text, width) {
  const out = [];
  String(text || '')
    .split(/\r?\n/)
    .forEach((para) => {
      let line = '';
      para.split(/\s+/).filter(Boolean).forEach((w) => {
        while (w.length > width) {
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, width));
          w = w.slice(width);
        }
        if (!line) line = w;
        else if ((line + ' ' + w).length <= width) line += ' ' + w;
        else { out.push(line); line = w; }
      });
      if (line) out.push(line);
    });
  return out;
}

// Item table: name(16) qty(3) rate(8) amount(9)  => 16+1+3+1+8+1+9 = 39 columns
function itemLines(i) {
  const names = wrap(pdfText(i.name), 16);
  const cols = `${String(i.qty).padStart(3)} ${num(i.price).padStart(8)} ${num(i.qty * i.price).padStart(9)}`;
  return names.map((n, idx) => (idx === 0 ? n.padEnd(16) + ' ' + cols : n));
}

export async function shareReceiptPdf(bill) {
  const { jsPDF } = await import('jspdf');
  const s = bill.snapshot;
  const L = [];
  const line = '-'.repeat(W);
  wrap(pdfText(s.shopName), W).forEach((t) => L.push(center(t)));
  if (s.address) wrap(pdfText(s.address), W).forEach((t) => L.push(center(t)));
  if (s.phone) L.push(center(`Ph: ${pdfText(s.phone)}`));
  L.push(line, lr('Bill No', bill.number), lr('Date', pdfText(fmtDateTime(bill.createdAt))), line);
  L.push('Item'.padEnd(16) + ' ' + 'Qty'.padStart(3) + ' ' + 'Rate'.padStart(8) + ' ' + 'Amount'.padStart(9), line);
  bill.items.forEach((i) => L.push(...itemLines(i)));
  L.push(line, lr('Subtotal', rs(bill.subtotal)));
  if (bill.taxAmount) L.push(lr(`${pdfText(bill.taxName)} (${bill.taxRate}%)`, rs(bill.taxAmount)));
  if (bill.roundOff) L.push(lr('Round off', `${bill.roundOff > 0 ? '+' : ''}${num(bill.roundOff)}`));
  L.push(line, lr('TOTAL', rs(bill.total)), line);
  bill.payments.forEach((p) => L.push(lr(`Paid by ${p.method}`, rs(p.amount))));
  if (s.footer) {
    L.push(line);
    wrap(pdfText(s.footer), W).forEach((t) => L.push(center(t)));
  }
  const lh = 3.7;
  const h = 14 + L.length * lh;
  const doc = new jsPDF({ unit: 'mm', format: [80, h] });
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  L.forEach((t, idx) => doc.text(t, 5, 8 + idx * lh));
  await savePdf(doc, `${bill.number}.pdf`);
}

// Browser: system print dialog. Android WebView has no reliable window.print(),
// so the APK shares a receipt PDF (print it via the Android print service / printer app).
export async function printBill(bill) {
  if (isNative()) return shareReceiptPdf(bill);
  window.print();
}

/* ---------- images ---------- */
export function resizeImage(file, max = 320) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
