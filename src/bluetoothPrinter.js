// Direct Bluetooth thermal printing (APK only). The plugin is loaded lazily so the web build never needs it.
// Printer must be paired once in the phone's Bluetooth settings.
let plugin = null;
async function P() {
  if (!plugin) plugin = (await import('capacitor-thermal-printer')).CapacitorThermalPrinter;
  return plugin;
}

// Scan for printers; calls onFound(list) as devices appear. Resolves when the scan finishes.
export async function scanPrinters(onFound, maxMs = 10000) {
  const T = await P();
  const found = new Map();
  const push = (arg) => {
    const list = Array.isArray(arg) ? arg : arg?.devices || [];
    list.forEach((d) => d?.address && found.set(d.address, { name: d.name || 'Printer', address: d.address }));
    onFound([...found.values()]);
  };
  const h1 = await T.addListener('discoverDevices', push);
  let done;
  const finished = new Promise((r) => { done = r; });
  const h2 = await T.addListener('discoveryFinish', () => done());
  try {
    await T.startScan();
    await Promise.race([finished, new Promise((r) => setTimeout(r, maxMs))]);
  } finally {
    try { await T.stopScan(); } catch { /* already stopped */ }
    h1?.remove?.();
    h2?.remove?.();
  }
  return [...found.values()];
}

async function ensureConnected(address) {
  const T = await P();
  try {
    if (await T.isConnected()) return T;
  } catch { /* not connected */ }
  const res = await T.connect({ address });
  if (res === null || res === false) throw new Error('Printer connect aagala - on-la irukka, pair aagiruka nu paarunga');
  return T;
}

// lines: [{ t, b }] from receiptLines()
export async function printLines(address, lines) {
  const T = await ensureConnected(address);
  let q = T.begin().align('left');
  lines.forEach((l) => {
    q = l.b ? q.bold().text(`${l.t}\n`).clearFormatting() : q.text(`${l.t}\n`);
  });
  await q.text('\n\n\n').cutPaper().write();
}

export async function testPrint(address, cols = 32) {
  const line = '-'.repeat(cols);
  await printLines(address, [
    { t: 'PRINTER TEST', b: true },
    { t: line },
    { t: 'Bluetooth printing works!' },
    { t: line },
  ]);
}
