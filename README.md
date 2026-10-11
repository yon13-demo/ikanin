# Ikanin.co - Static Site

Situs Ikanin menggunakan HTML statis di `index.html`, aset di `assets/`, dan Vercel Functions di `api/` untuk pembayaran Fishbao.

## Deploy ke Vercel
**Via dashboard:** push folder ini ke GitHub -> vercel.com/new -> Import -> Framework Preset: **Other** -> Deploy
(Build Command & Output Directory dikosongkan.)

### Konfigurasi pembayaran Fishbao dan Supabase

Tambahkan environment variable berikut di **Vercel Project Settings → Environment Variables**:

- `PAKASIR_API_KEY`: API key proyek Pakasir (simpan hanya di server, jangan di HTML).
- `PAKASIR_WEBHOOK_SECRET`: secret untuk memvalidasi webhook Pakasir.
- `SUPABASE_URL`: URL proyek Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key Supabase (simpan hanya di server).
- `DEMO_ADMIN_ENABLED=true`: opsional untuk mengaktifkan dashboard demo `/leonxlab`.

Jalankan SQL di `supabase/schema.sql` pada Supabase SQL Editor sebelum deployment. Aktifkan Row Level Security; endpoint server mengakses tabel menggunakan service-role key. Slug proyek Pakasir `lxpayment` dan harga Fishbao Rp10.000 per menu digunakan oleh endpoint server. Setelah deployment, atur URL webhook proyek Pakasir ke:

`https://<domain-situs-anda>/api/pakasir-webhook`

Endpoint server membuat QRIS Pakasir, menyimpan pelanggan/pesanan, dan menerima status pembayaran melalui webhook. Halaman `/leonxlab` tanpa login bersifat publik; aktifkan hanya untuk demo dengan data uji, lalu hapus/nonaktifkan `DEMO_ADMIN_ENABLED` sebelum memakai data pelanggan sungguhan. Pembayaran dan Supabase memerlukan deployment di Vercel; membuka `index.html` langsung dari file lokal tidak menyediakan fungsi API tersebut.

**Via CLI:**
    npm i -g vercel
    vercel --prod
