export const rupiah = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
export const number = value => new Intl.NumberFormat('id-ID').format(value || 0);
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const dateLabel = date => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T12:00:00+07:00`));
export function dateRange(period, custom) {
  const end = today(), date = new Date(`${end}T12:00:00+07:00`);
  if (period === 'custom') return custom;
  if (period === 'all') return { from: '2000-01-01', to: end };
  if (period === 'today') return { from: end, to: end };
  if (period === 'month') return { from: end.slice(0, 7) + '-01', to: end };
  date.setUTCDate(date.getUTCDate() - 6);
  return { from: date.toISOString().slice(0, 10), to: end };
}
export function summarize(data, range) {
  const within = x => x.date >= range.from && x.date <= range.to;
  const entries = data.ledger.filter(within);
  const sales = data.sales.filter(s => s.status === 'paid' && within(s));
  const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const salesTotal = sales.reduce((s, e) => s + e.total, 0);
  const cost = sales.reduce((s, e) => s + e.cost, 0);
  const operating = entries.filter(e => e.type === 'expense' && e.category !== 'Pembelian stok').reduce((s, e) => s + e.amount, 0);
  const other = entries.filter(e => e.type === 'income' && e.category !== 'Penjualan' && e.category !== 'Modal pemilik').reduce((s, e) => s + e.amount, 0);
  const profit = salesTotal + other - cost - operating;
  const balance = data.settings.initialBalance + data.ledger.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0);
  const byProduct = Object.create(null);
  sales.forEach(s => s.items.forEach(i => { const p = byProduct[i.product_id] ||= { name: i.name, qty: 0, total: 0, profit: 0 }; p.qty += i.qty; p.total += i.qty * i.price; p.profit += i.qty * (i.price - i.cost); }));
  return { entries, sales, income, expense, salesTotal, cost, operating, other, profit, balance, best: Object.values(byProduct).sort((a, b) => b.qty - a.qty) };
}
export function chartData(entries, range) {
  const buckets = new Map();
  const start = new Date(`${range.from}T12:00:00Z`), end = new Date(`${range.to}T12:00:00Z`);
  const byMonth = (end - start) / 86400000 > 62;
  if (range.from === '2000-01-01') {
    const oldest = entries.map(e => e.date).sort()[0] || range.to;
    start.setTime(new Date(`${oldest}T12:00:00Z`).getTime());
  }
  for (let d = new Date(start); d <= end; byMonth ? d.setUTCMonth(d.getUTCMonth() + 1, 1) : d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, byMonth ? 7 : 10);
    buckets.set(key, { key, label: new Intl.DateTimeFormat('id-ID', byMonth ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }).format(d), income: 0, expense: 0 });
  }
  for (const e of entries) { const b = buckets.get(e.date.slice(0, byMonth ? 7 : 10)); if (b) b[e.type] += e.amount; }
  return [...buckets.values()];
}
export function download(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCsv(entries) {
  const row = values => values.map(v => `"${String(v).replaceAll('"', '""').replace(/^[=+@-]/, "'$&")}"`).join(',');
  download(`keuangan-warung-${today()}.csv`, '\uFEFF' + [row(['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Metode', 'Nominal']), ...entries.map(e => row([e.date, e.type === 'income' ? 'Pemasukan' : 'Pengeluaran', e.category, e.note, e.method, e.amount]))].join('\r\n'), 'text/csv;charset=utf-8');
}
