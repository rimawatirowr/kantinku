const C = window.KANTINKU_CONFIG || {};
const CONFIGURED = C.SUPABASE_URL && !C.SUPABASE_URL.startsWith('ISI_');
const sb = CONFIGURED ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
const $app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp = n => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const STATUS = {baru:'Baru', dimasak:'Dimasak', siap:'Siap diambil', selesai:'Selesai', ditolak:'Ditolak'};
const NAV = {
  mahasiswa: [['', 'Beranda'], ['pesanan', 'Pesanan'], ['akun', 'Akun']],
  pengelola: [['', 'Pesanan masuk'], ['menu', 'Menu'], ['akun', 'Akun']],
  admin: [['', 'Warung'], ['laporan', 'Laporan'], ['akun', 'Akun']]
};
let me = null, cart = {w: null, items: {}};

function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }
const fail = e => { console.error(e); toast(e.message || 'Terjadi kesalahan'); };

function shell(title, sub, body, img = 'plate') {
  const here = (location.hash.slice(2).split('/')[0]) || '';
  const nav = NAV[me.role].map(([h, l]) => `<a href="#/${h}" class="${h === here ? 'on' : ''}">${l}</a>`).join('');
  $app.innerHTML = `<header class="hd"><small>${esc(sub)}</small><h1>${esc(title)}</h1><img src="assets/${img}.png" alt=""></header><main>${body}</main><nav>${nav}</nav>`;
}

/* ---------- Masuk / daftar ---------- */
function authView(mode = 'masuk') {
  const daftar = mode === 'daftar';
  $app.innerHTML = `<section class="hero"><img class="t" src="assets/tea.png" alt=""><img class="p" src="assets/plate.png" alt="">
    <h1>KantinKu</h1><p>Pesan dari HP, ambil tanpa antre. Satu aplikasi untuk semua warung di kantin kampus.</p></section>
    <section class="sheet"><div class="tabs"><button class="btn ${daftar ? 'o' : ''}" data-a="mode" data-v="masuk">Masuk</button><button class="btn ${daftar ? '' : 'o'}" data-a="mode" data-v="daftar">Daftar</button></div>
    ${daftar ? '<div><label>Nama</label><input id="nama" autocomplete="name"></div>' : ''}
    <div><label>Email</label><input id="email" type="email" autocomplete="email"></div>
    <div><label>Kata sandi</label><input id="pw" type="password" minlength="6" autocomplete="${daftar ? 'new-password' : 'current-password'}"></div>
    <button class="btn full" data-a="${daftar ? 'signup' : 'login'}">${daftar ? 'Buat akun' : 'Masuk'}</button></section>`;
}
function setupView() {
  $app.innerHTML = `<section class="hero"><h1>KantinKu</h1><p>Website sudah jalan, tinggal disambungkan ke Supabase.</p></section>
  <section class="sheet"><div class="card"><b>Langkah berikutnya</b><p class="mut">Buka <code>js/config.js</code>, isi <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code>, lalu muat ulang halaman. Panduan lengkap ada di README.md.</p></div></section>`;
}

/* ---------- Mahasiswa ---------- */
async function homeView() {
  const {data, error} = await sb.from('warung').select('*').order('id'); if (error) return fail(error);
  const open = data.filter(w => w.buka).length;
  shell('Mau makan apa hari ini?', `Selamat datang, ${me.nama || 'teman'}`, `
    <input id="q" placeholder="Cari warung atau menu" data-a="cari"><div class="row"><b>Warung di kantin</b><span class="mut">${open} warung buka</span></div>
    <div id="list">${data.map(w => `<a class="card row" data-n="${esc((w.nama + ' ' + w.deskripsi).toLowerCase())}" href="#/warung/${w.id}" style="text-decoration:none;color:inherit;margin-bottom:10px">
      <div class="row" style="justify-content:flex-start"><div class="av">${esc(w.nama.replace('Warung ', '')[0])}</div><div><b>${esc(w.nama)}</b><div class="mut">${esc(w.deskripsi)}</div><div class="mut">${w.buka ? 'Buka' : 'Tutup'} · ${esc(w.jam)}</div></div></div></a>`).join('')}</div>`);
}
async function warungView(id) {
  const [{data: w, error}, {data: m}] = await Promise.all([sb.from('warung').select('*').eq('id', id).single(), sb.from('menu').select('*').eq('warung_id', id).order('kategori').order('nama')]);
  if (error) return fail(error);
  const qty = i => (cart.w == id && cart.items[i]?.qty) || 0;
  const n = cart.w == id ? Object.values(cart.items).reduce((a, i) => a + i.qty, 0) : 0;
  const tot = cart.w == id ? Object.values(cart.items).reduce((a, i) => a + i.qty * i.harga, 0) : 0;
  shell(w.nama, `${w.buka ? 'Buka' : 'Tutup'} · ${w.jam}`, `<a href="#/" class="mut">← Semua warung</a>` + m.map(i => `<div class="card row" style="${i.tersedia ? '' : 'opacity:.55'}">
    <div><b>${esc(i.nama)}</b><div class="mut">${esc(i.deskripsi)}</div><b style="color:var(--b)">${rp(i.harga)}</b></div>
    ${i.tersedia ? `<div class="qty"><button class="m" data-a="kurang" data-w="${id}" data-i='${esc(JSON.stringify({id: i.id, nama: i.nama, harga: i.harga}))}'>−</button><span>${qty(i.id)}</span><button data-a="tambah" data-w="${id}" data-i='${esc(JSON.stringify({id: i.id, nama: i.nama, harga: i.harga}))}'>+</button></div>` : '<span class="badge">Habis</span>'}</div>`).join('')
    + (n ? `<a class="btn bar row" href="#/keranjang"><span>Lihat keranjang · ${n} item</span><span>${rp(tot)}</span></a>` : ''), 'tea');
}
async function cartView() {
  const items = Object.values(cart.items); if (!items.length) { location.hash = '#/'; return; }
  const tot = items.reduce((a, i) => a + i.qty * i.harga, 0);
  shell('Keranjang', `${items.length} menu dipilih`, `${items.map(i => `<div class="card row"><span>${i.qty}× ${esc(i.nama)}</span><b>${rp(i.qty * i.harga)}</b></div>`).join('')}
    <div><label>Metode bayar</label><select id="metode"><option>QRIS</option><option>E-wallet</option><option>Tunai di tempat</option></select></div>
    <div><label>Catatan untuk penjual</label><textarea id="catatan" rows="2" placeholder="Contoh: sambal dipisah"></textarea></div>
    <div class="row"><span>Total pembayaran</span><b style="font-size:20px">${rp(tot)}</b></div><button class="btn full" data-a="bayar">Bayar sekarang</button>`, 'tea');
}
async function ordersView() {
  const {data, error} = await sb.from('orders').select('*,order_items(*),warung(nama)').order('created_at', {ascending: false}); if (error) return fail(error);
  const mine = me.role === 'mahasiswa';
  shell(mine ? 'Pesanan saya' : 'Pesanan masuk', mine ? 'Pantau status pesananmu' : 'Terima dan proses pesanan', data.length ? data.map(o => orderCard(o, !mine)).join('') : '<div class="card mut">Belum ada pesanan.</div>', 'tea');
}
function orderCard(o, manage) {
  const act = {baru: [['ditolak', 'Tolak', 'o'], ['dimasak', 'Terima', '']], dimasak: [['siap', 'Tandai siap diambil', '']], siap: [['selesai', 'Selesai diambil', '']]}[o.status] || [];
  return `<div class="card"><div class="row"><b style="font-size:20px">${esc(o.nomor)}</b><span class="badge ${o.status}">${STATUS[o.status]}</span></div>
    <div class="mut">${esc(o.warung?.nama)} · ${new Date(o.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</div>
    <div style="margin:8px 0">${o.order_items.map(i => `${i.qty}× ${esc(i.nama)}`).join('<br>')}</div>${o.catatan ? `<div class="mut">Catatan: ${esc(o.catatan)}</div>` : ''}
    <div class="row"><span class="mut">${esc(o.metode)}</span><b>${rp(o.total)}</b></div>
    ${manage && act.length ? `<div class="tabs" style="margin-top:10px">${act.map(([s, l, c]) => `<button class="btn sm ${c}" data-a="status" data-id="${o.id}" data-s="${s}">${l}</button>`).join('')}</div>` : ''}</div>`;
}

/* ---------- Pengelola & admin ---------- */
async function menuAdminView() {
  const {data: ws} = await sb.from('warung').select('id,nama').eq('owner_id', me.id);
  if (!ws?.length) return shell('Kelola menu', 'Belum ada warung', '<div class="card mut">Akunmu belum dihubungkan ke warung. Minta admin mengisi owner warung.</div>');
  const {data: m} = await sb.from('menu').select('*').in('warung_id', ws.map(w => w.id)).order('nama');
  shell('Kelola menu', ws.map(w => w.nama).join(', '), `<div class="card"><b>Tambah menu</b>
    <label>Warung</label><select id="mw">${ws.map(w => `<option value="${w.id}">${esc(w.nama)}</option>`).join('')}</select>
    <label>Nama</label><input id="mn"><label>Harga (Rp)</label><input id="mh" type="number" min="0"><label>Kategori</label><select id="mk"><option>Makanan berat</option><option>Minuman</option><option>Snack</option></select>
    <button class="btn full" style="margin-top:10px" data-a="addmenu">Simpan menu</button></div>` +
    m.map(i => `<div class="card row"><div><b>${esc(i.nama)}</b><div class="mut">${rp(i.harga)} · ${esc(i.kategori)}</div></div><button class="btn sm ${i.tersedia ? 'o' : ''}" data-a="stok" data-id="${i.id}" data-v="${i.tersedia}">${i.tersedia ? 'Tandai habis' : 'Tersedia lagi'}</button></div>`).join(''), 'plate');
}
async function adminWarungView() {
  const {data} = await sb.from('warung').select('*').order('id');
  shell('Kelola warung', `${data.length} warung terdaftar`, `<div class="card"><label>Nama warung baru</label><input id="wn"><label>Jam buka</label><input id="wj" placeholder="07.00-15.00"><button class="btn full" style="margin-top:10px" data-a="addwarung">Tambah warung</button></div>` +
    data.map(w => `<div class="card row"><div><b>${esc(w.nama)}</b><div class="mut">${esc(w.jam)}</div></div><button class="btn sm ${w.buka ? '' : 'o'}" data-a="buka" data-id="${w.id}" data-v="${w.buka}">${w.buka ? 'Buka' : 'Tutup'}</button></div>`).join(''));
}
async function reportView() {
  const {data} = await sb.from('orders').select('total,status,warung(nama)').neq('status', 'ditolak');
  const per = {}; data.forEach(o => per[o.warung.nama] = (per[o.warung.nama] || 0) + o.total);
  const total = data.reduce((a, o) => a + o.total, 0);
  shell('Laporan keuangan', 'Semua warung', `<div class="card" style="background:var(--b);color:#fff"><small>TOTAL TRANSAKSI</small><div style="font-size:30px;font-weight:800">${rp(total)}</div><small>${data.length} pesanan</small></div>` +
    Object.entries(per).map(([n, v]) => `<div class="card row"><span>${esc(n)}</span><b>${rp(v)}</b></div>`).join(''), 'tea');
}
function accountView() {
  shell('Akun', `Peran: ${me.role}`, `<div class="card"><b>${esc(me.nama)}</b><div class="mut">${esc(me.email)}</div></div><button class="btn o full" data-a="logout">Keluar</button>`);
}

/* ---------- Router ---------- */
async function render() {
  if (!CONFIGURED) return setupView();
  const {data: {session}} = await sb.auth.getSession();
  if (!session) { me = null; return authView(); }
  if (!me) {
    const {data} = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    me = {...(data || {role: 'mahasiswa', nama: ''}), id: session.user.id, email: session.user.email};
  }
  const [r, a] = location.hash.slice(2).split('/');
  if (r === 'akun') return accountView();
  if (me.role === 'mahasiswa') {
    if (r === 'warung') return warungView(a);
    if (r === 'keranjang') return cartView();
    if (r === 'pesanan') return ordersView();
    return homeView();
  }
  if (me.role === 'pengelola') return r === 'menu' ? menuAdminView() : ordersView();
  return r === 'laporan' ? reportView() : adminWarungView();
}

/* ---------- Aksi ---------- */
document.addEventListener('input', e => {
  if (e.target.dataset.a !== 'cari') return;
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#list [data-n]').forEach(c => c.style.display = c.dataset.n.includes(q) ? '' : 'none');
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'INPUT') return;
  const a = b.dataset.a, v = id => document.getElementById(id)?.value;
  try {
    if (a === 'mode') return authView(b.dataset.v);
    if (a === 'login' || a === 'signup') {
      const email = v('email'), password = v('pw');
      const res = a === 'login' ? await sb.auth.signInWithPassword({email, password}) : await sb.auth.signUp({email, password, options: {data: {nama: v('nama')}}});
      if (res.error) throw res.error;
      if (a === 'signup' && !res.data.session) return toast('Cek email untuk konfirmasi, lalu masuk.');
      location.hash = '#/'; return render();
    }
    if (a === 'logout') { await sb.auth.signOut(); me = null; cart = {w: null, items: {}}; return authView(); }
    if (a === 'tambah' || a === 'kurang') {
      const it = JSON.parse(b.dataset.i);
      if (cart.w != b.dataset.w) cart = {w: b.dataset.w, items: {}};
      const cur = cart.items[it.id] || {...it, qty: 0};
      cur.qty = Math.max(0, cur.qty + (a === 'tambah' ? 1 : -1));
      cur.qty ? cart.items[it.id] = cur : delete cart.items[it.id];
      return render();
    }
    if (a === 'bayar') {
      const items = Object.values(cart.items), total = items.reduce((s, i) => s + i.qty * i.harga, 0);
      b.disabled = true;
      const {data: o, error} = await sb.from('orders').insert({warung_id: cart.w, total, metode: v('metode'), catatan: v('catatan') || null, nomor: 'A-' + String(Date.now() % 100).padStart(2, '0')}).select().single();
      if (error) throw error;
      const r = await sb.from('order_items').insert(items.map(i => ({order_id: o.id, menu_id: i.id, nama: i.nama, harga: i.harga, qty: i.qty})));
      if (r.error) throw r.error;
      cart = {w: null, items: {}}; toast('Pesanan terkirim'); location.hash = '#/pesanan'; return render();
    }
    if (a === 'status') { const r = await sb.from('orders').update({status: b.dataset.s}).eq('id', b.dataset.id); if (r.error) throw r.error; return render(); }
    if (a === 'addmenu') {
      if (!v('mn') || v('mh') === '') return toast('Isi nama dan harga');
      const r = await sb.from('menu').insert({warung_id: v('mw'), nama: v('mn'), harga: +v('mh'), kategori: v('mk')}); if (r.error) throw r.error; toast('Menu disimpan'); return render();
    }
    if (a === 'stok') { await sb.from('menu').update({tersedia: b.dataset.v !== 'true'}).eq('id', b.dataset.id); return render(); }
    if (a === 'addwarung') { if (!v('wn')) return toast('Isi nama warung'); const r = await sb.from('warung').insert({nama: v('wn'), jam: v('wj') || '07.00-15.00'}); if (r.error) throw r.error; return render(); }
    if (a === 'buka') { await sb.from('warung').update({buka: b.dataset.v !== 'true'}).eq('id', b.dataset.id); return render(); }
  } catch (err) { fail(err); b.disabled = false; }
});
window.addEventListener('hashchange', render);
render();
if (sb) sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { me = null; } });
