-- KantinKu · jalankan seluruh file ini di Supabase > SQL Editor
create table if not exists profiles(
  id uuid primary key references auth.users on delete cascade,
  nama text, role text not null default 'mahasiswa' check (role in ('mahasiswa','pengelola','admin')));
create table if not exists warung(
  id bigint generated always as identity primary key,
  nama text not null, deskripsi text, jam text, buka boolean default true,
  owner_id uuid references profiles(id) on delete set null);
create table if not exists menu(
  id bigint generated always as identity primary key,
  warung_id bigint not null references warung(id) on delete cascade,
  nama text not null, deskripsi text, harga int not null check (harga >= 0),
  kategori text default 'Makanan berat', tersedia boolean default true);
create table if not exists orders(
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references profiles(id),
  warung_id bigint not null references warung(id),
  nomor text, metode text default 'QRIS', catatan text, total int not null,
  status text not null default 'baru' check (status in ('baru','dimasak','siap','selesai','ditolak')),
  created_at timestamptz default now());
create table if not exists order_items(
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  menu_id bigint references menu(id) on delete set null,
  nama text, harga int, qty int not null check (qty > 0));

-- profil otomatis saat pendaftaran (peran awal: mahasiswa)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,nama) values (new.id, coalesce(new.raw_user_meta_data->>'nama', split_part(new.email,'@',1))); return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create or replace function owns_warung(w bigint) returns boolean language sql stable security definer set search_path=public as
$$ select is_admin() or exists(select 1 from warung where id=w and owner_id=auth.uid()) $$;

alter table profiles enable row level security; alter table warung enable row level security;
alter table menu enable row level security; alter table orders enable row level security;
alter table order_items enable row level security;

create policy "profil sendiri" on profiles for select using (id=auth.uid() or is_admin());
create policy "warung dibaca semua" on warung for select using (true);
create policy "warung dikelola admin" on warung for all using (is_admin()) with check (is_admin());
create policy "pengelola ubah warungnya" on warung for update using (owner_id=auth.uid());
create policy "menu dibaca semua" on menu for select using (true);
create policy "menu dikelola pemilik" on menu for all using (owns_warung(warung_id)) with check (owns_warung(warung_id));
create policy "pesanan dilihat pemilik/pembeli" on orders for select using (user_id=auth.uid() or owns_warung(warung_id));
create policy "pembeli membuat pesanan" on orders for insert with check (user_id=auth.uid());
create policy "pemilik ubah status" on orders for update using (owns_warung(warung_id));
create policy "item dilihat" on order_items for select using (exists(select 1 from orders o where o.id=order_id and (o.user_id=auth.uid() or owns_warung(o.warung_id))));
create policy "item dibuat pembeli" on order_items for insert with check (exists(select 1 from orders o where o.id=order_id and o.user_id=auth.uid()));

-- data contoh
insert into warung(nama,deskripsi,jam) values
 ('Warung Geprek','Ayam geprek, es teh, cireng','07.00-15.00'),
 ('Warung Bunda','Nasi rames, soto, lauk rumahan','07.00-16.00'),
 ('Warung Warjung','Snack, gorengan, minuman dingin','08.00-15.00');
insert into menu(warung_id,nama,deskripsi,harga,kategori) select id,'Ayam Geprek','Ayam crispy dengan sambal bawang',15000,'Makanan berat' from warung where nama='Warung Geprek';
insert into menu(warung_id,nama,deskripsi,harga,kategori) select id,'Es Teh Manis','Teh dingin dengan gula pas',4000,'Minuman' from warung where nama='Warung Geprek';
insert into menu(warung_id,nama,deskripsi,harga,kategori) select id,'Cireng Isi Ayam','Kenyal di luar, isi ayam pedas',8000,'Snack' from warung where nama='Warung Geprek';
insert into menu(warung_id,nama,deskripsi,harga,kategori) select id,'Nasi Rames','Nasi, lauk, sayur',12000,'Makanan berat' from warung where nama='Warung Bunda';
insert into menu(warung_id,nama,deskripsi,harga,kategori) select id,'Soto Ayam','Soto kuah bening',13000,'Makanan berat' from warung where nama='Warung Bunda';
insert into menu(warung_id,nama,deskripsi,harga,kategori) select id,'Pisang Goreng Madu','Hangat dan manis',8000,'Snack' from warung where nama='Warung Warjung';

-- Setelah mendaftar lewat website, jadikan akunmu pengelola/admin:
--   update profiles set role='admin' where id=(select id from auth.users where email='emailmu@kampus.ac.id');
--   update profiles set role='pengelola' where id=(select id from auth.users where email='pemilik@kampus.ac.id');
--   update warung set owner_id=(select id from auth.users where email='pemilik@kampus.ac.id') where nama='Warung Geprek';
