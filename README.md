# SiniKos

SaaS multi-tenant untuk manajemen kos (pemilik/pengelola): properti, kamar, penyewa, kontrak, tagihan, notifikasi WhatsApp (**Fonnte**), dan pembayaran online (**Midtrans per organisasi**).

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- PostgreSQL (Neon) + Prisma
- Auth.js (credentials)
- Vercel Cron + Fonnte WhatsApp API
- Midtrans Snap **model B**: tiap Organization memakai akun Midtrans sendiri (uang sewa ke pemilik kos)

## Setup lokal

1. Salin env:

```bash
cp .env.example .env
```

2. Isi `DATABASE_URL` (Neon), `AUTH_SECRET`, dan opsional `FONNTE_TOKEN` / `CRON_SECRET`. Untuk menerima pembayaran langganan, isi `PLATFORM_MIDTRANS_SERVER_KEY` (Sandbox: `SB-Mid-server-...`) dan biarkan `PLATFORM_MIDTRANS_IS_PRODUCTION=false` sampai uji Production.

3. Install & migrasi:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

4. Setelah login: **Pengaturan → Midtrans** → isi Server Key akun Midtrans Anda (Sandbox atau Production), aktifkan, dan set Notification URL di dashboard Midtrans ke URL yang ditampilkan.

## Deploy Vercel

1. Push repo, import ke Vercel.
2. Set env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `FONNTE_TOKEN`, `CRON_SECRET`, `PLATFORM_MIDTRANS_SERVER_KEY`, `PLATFORM_MIDTRANS_IS_PRODUCTION`.
3. Build memakai `prisma generate` (sudah di script `build`).
4. Jalankan migrasi: `npx prisma migrate deploy`.
5. Cron: `vercel.json` → `/api/cron/billing` (Authorization Bearer `CRON_SECRET`).
6. Tiap pemilik kos: di Midtrans mereka, Notification URL = `https://<domain>/api/payments/midtrans/notification`.
7. Akun Midtrans **platform** (langganan): Notification URL = `https://<domain>/api/payments/midtrans/subscription`.

## Paket langganan

| | Gratis | Pro |
| --- | --- | --- |
| Harga | Rp 0 | Rp 50.000 / bulan atau Rp 500.000 / tahun |
| Properti | 1 | Tanpa batas |
| Kamar | 5 | Tanpa batas |
| Kontrak aktif | 5 | Tanpa batas |
| Catat bayar manual | Ya | Ya |
| Link bayar sewa (Midtrans pemilik) | Tidak | Ya |
| WhatsApp otomatis | Tidak | Ya |

Uang langganan masuk ke Midtrans platform (`PLATFORM_MIDTRANS_SERVER_KEY`), terpisah dari uang sewa (key per organisasi). Organisasi yang sudah ada saat migrasi ini dapat Pro selama 30 hari. Setelah masa berlaku lewat, cron harian menurunkan paket ke Gratis; data lama tetap ada, penambahan baru ikut batas Gratis.

Di Sandbox, selesaikan pembayaran di simulator Midtrans lalu buka menu Langganan (halaman itu juga mengecek status jika webhook terlambat).

## Alur bisnis singkat

1. Daftar → onboarding organisasi + properti
2. Pengaturan Midtrans (akun pemilik) + aktifkan payment channels
3. Tambah kamar & penyewa → check-in
4. Generate tagihan → buat link bayar / kirim WA
5. Penyewa bayar → webhook melunasi; atau catat bayar manual

## Catatan PWA

Arsitektur siap ditambah PWA (manifest + service worker) di fase lanjut.
