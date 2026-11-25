# KantinKu

Website pesan makanan kantin kampus: pesan dari HP, ambil tanpa antre.
Frontend statis (HTML/CSS/JS) + database & login Supabase + hosting GitHub Pages.

Peran: **mahasiswa** (pesan), **pengelola** (terima pesanan, kelola menu), **admin** (kelola warung, laporan).

## 1. Sambungkan ke Supabase
1. Buat project di https://supabase.com.
2. Buka **SQL Editor**, tempel seluruh isi `supabase/schema.sql`, lalu **Run**.
3. Buka **Project Settings → API**, salin **Project URL** dan **anon public key**.
4. Isi keduanya di `js/config.js`. (Jangan pakai `service_role` key.)
5. Untuk uji coba, matikan konfirmasi email di **Authentication → Providers → Email → Confirm email**.

## 2. Jadikan akunmu admin / pengelola
Daftar dulu lewat website, lalu jalankan di SQL Editor:

```sql
update profiles set role='admin' where id=(select id from auth.users where email='emailmu@kampus.ac.id');
update profiles set role='pengelola' where id=(select id from auth.users where email='pemilik@kampus.ac.id');
update warung set owner_id=(select id from auth.users where email='pemilik@kampus.ac.id') where nama='Warung Geprek';
```

## 3. Sambungkan ke GitHub dan deploy
```bash
git init
git add .
git commit -m "KantinKu pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/kantinku.git
git push -u origin main
```
Lalu di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Setiap `git push` ke `main` akan otomatis men-deploy ke `https://USERNAME.github.io/kantinku/`.

Tambahkan URL itu di Supabase: **Authentication → URL Configuration → Site URL**.

## Menjalankan lokal
```bash
python3 -m http.server 8000   # buka http://localhost:8000
```

## Struktur
- `index.html`, `css/style.css`, `js/app.js`: tampilan dan logika
- `js/config.js`: URL dan anon key Supabase
- `supabase/schema.sql`: tabel, Row Level Security, data contoh
- `.github/workflows/pages.yml`: deploy otomatis ke GitHub Pages
