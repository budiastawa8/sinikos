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

2. Isi `DATABASE_URL` (Neon), `AUTH_SECRET`, dan opsional `FONNTE_TOKEN` / `CRON_SECRET`.

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
2. Set env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `FONNTE_TOKEN`, `CRON_SECRET`.
3. Build memakai `prisma generate` (sudah di script `build`).
4. Jalankan migrasi: `npx prisma migrate deploy`.
5. Cron: `vercel.json` → `/api/cron/billing` (Authorization Bearer `CRON_SECRET`).
6. Tiap pemilik kos: di Midtrans mereka, Notification URL = `https://<domain>/api/payments/midtrans/notification`.

## Alur bisnis singkat

1. Daftar → onboarding organisasi + properti
2. Pengaturan Midtrans (akun pemilik) + aktifkan payment channels
3. Tambah kamar & penyewa → check-in
4. Generate tagihan → buat link bayar / kirim WA
5. Penyewa bayar → webhook melunasi; atau catat bayar manual

## Catatan PWA

Arsitektur siap ditambah PWA (manifest + service worker) di fase lanjut.
