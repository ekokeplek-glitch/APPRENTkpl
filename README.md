<div align="center">

# 🛵 RyokoRent Android APK

**Aplikasi Operasional & Administrasi Rental Sepeda Motor Malang & Batu**  
*Berbasis Progressive Web App (PWA) Standalone, Offline-First LocalStorage, Pelacakan Armada, Kwitansi Paperless, dan Otomasi WhatsApp.*

[![Platform](https://img.shields.io/badge/Platform-Android%20APK%20%2F%20PWA-3DDC84.svg?logo=android&logoColor=white)](#instalasi-pwa-android)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](#tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript&logoColor=white)](#tech-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](#tech-stack)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?logo=vite&logoColor=white)](#tech-stack)
[![ZLCE](https://img.shields.io/badge/Metodologi-ZLCE%20v3.2.2-informational.svg)](BLUEPRINT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Fitur Utama](#-fitur-utama) • [Form Booking 13 Field](#-template-booking-13-field) • [Panduan Instalasi](#-panduan-instalasi--menjalankan) • [Integrasi Eksternal](#-integrasi-eksternal) • [Struktur Proyek](#-struktur-proyek)

---

</div>

## 📖 Tentang RyokoRent

**RyokoRent** adalah aplikasi sistem operasi rental sepeda motor modern yang dirancang khusus untuk memenuhi kebutuhan bisnis sewa motor di kawasan wisata **Kota Malang dan Kota Batu, Jawa Timur**. 

Aplikasi ini beroperasi dengan prinsip **Offline-First**, memungkinkan pemilik rental, operator kantor, mekanik garasi, hingga kurir lapangan tetap dapat menginput pemesanan, mengecek ketersediaan unit motor, melakukan serah terima di hotel/stasiun, serta melacak armada bahkan saat jaringan internet lambat atau terputus.

---

## ✨ Fitur Utama

### 1. 📋 Template Booking Standar 13 Field & Smart Chat Parser
- Formulir booking rapi mencakup 13 field identitas dan operasional lengkap tanpa kompromi.
- **Smart WhatsApp Chat Parser**: Memungkinkan operator menempelkan (*paste*) pesan format booking acak langsung dari chat WhatsApp pelanggan, lalu secara otomatis mengekstrak data ke form dalam 1 detik.
- Tombol **1-Klik Salin Format Kosong** siap kirim ke calon penyewa di WhatsApp.

### 2. 🔄 State Machine Penyewaan 5 Status Terproteksi
Alur transaksi mengikuti siklus hidup operasional rental yang ketat:
1. `ryokou_booking` (Pemesanan Baru): Menunggu verifikasi admin dan penguncian unit fisik motor garasi.
2. `ryokou_approved` (Disetujui): Unit fisik telah dikunci permanen, menunggu jadwal serah terima oleh kurir atau tamu datang ke pool.
3. `ryokou_disewa` (Sedang Berjalan): Motor telah diserahterimakan ke penyewa. Dilindungi proteksi anti-hapus (D-20) untuk mencegah kehilangan catatan audit.
4. `ryokou_diservis` (Diservis): Unit mengalami kendala teknis atau masuk jadwal perawatan berkala di bengkel.
5. `ryokou_selesai` (Selesai): Unit telah diterima kembali di Pool Malang / Pool Batu, denda keterlambatan terkalkulasi otomatis.

### 3. ⏱️ Turnaround Buffer 60 Menit & Anti Double-Booking
- Algoritma `isUnitAvailableForRange` secara cerdas memberikan jeda waktu **60 menit** sebelum waktu sewa dimulai dan sesudah waktu sewa berakhir.
- Jeda ini dialokasikan untuk pembersihan motor, inspeksi fisik, pengisian bahan bakar, dan pengecekan kelengkapan 2 helm SNI.

### 4. 💰 Katalog Tarif Multi-Tier Dinamis (Termasuk Sewa 1 Bulan)
- Mendukung opsi **ShortRent jam** (3 Jam, 6 Jam, 9 Jam, 12 Jam).
- Mendukung opsi **Sewa Harian** (1 Hari / 24 Jam, 1 Minggu / 7 Hari, dan **1 Bulan / 30 Hari**).
- Tombol kalkulasi tanggal selesai otomatis $+30$ hari saat paket 1 bulan dipilih.

### 5. 🔧 Panel Catatan Servis Rutin 7 Kategori
Pencatatan riwayat perawatan berkala armada garasi dengan 7 kategori spesifik:
1. Ganti Oli Mesin
2. Ganti Gear Oli / Gardan
3. Ganti Kampas Rem (Depan/Belakang)
4. Ganti Ban (Depan/Belakang)
5. Servis CVT Part (Roller, V-Belt, Slider)
6. Baterai Kering / Aki
7. Servis Kecelakaan / Insiden

### 6. 🛵 Pelacakan Posisi Armada Garasi & Status Kurir
Setiap unit fisik motor terpantau lokasinya secara transparan:
- `parkir`: Pool Malang (Jl. MT Haryono Dinoyo) atau Pool Batu (Jl. Diponegoro Sisir).
- `kurir`: **Sedang Dipakai Kurir** (disertai nama kurir penanggung jawab operasional).
- `disewa`: Bersama penyewa (nama penyewa, nomor booking, tenggat kembali).
- `servis`: Di bengkel rekanan (nama bengkel, kontak mekanik, estimasi selesai).

### 7. 👥 Role-Based Access Control (RBAC) 4 Tingkat
- **Administrator**: Hak akses penuh seluruh sistem (finansial, user, armada, pengaturan).
- **Admin Custom**: Hak akses granular yang dapat disesuaikan per-user (bisa menyembunyikan laporan omset).
- **Operator**: Khusus operasional harian (booking, tracking, servis, tanpa akses ekspor keuangan).
- **Kurir**: Portal ringkas satu layar khusus serah terima & penjemputan unit, tombol chat WA tamu 1-klik, tanpa informasi omset bisnis.

### 8. 🧾 Kwitansi Digital Paperless & Salin Teks Ringkasan Kasir
- Modal kwitansi digital resmi Ryoko Rent tanpa boros kertas.
- Cetak / Simpan langsung ke format **PDF**.
- Tombol **Salin Teks Ringkasan Nota Kasir** untuk dikirim instan via chat WhatsApp.
- Rincian Berita Acara Serah Terima (BAST: 2 helm SNI, 2 jas hujan, bensin, deposit).

### 9. ⏰ Countdown Pengembalian Real-Time & Kalkulasi Denda Live
- Live ticker hitung mundur waktu sewa aktif.
- 4 tingkat urgensi visual: **Aman (Hijau)**, **H-2 Jam (Kuning)**, **H-1 Jam (Oranye)**, **Overdue/Terlambat (Merah Berkedip)**.
- Rumus denda keterlambatan bertingkat (*step-up*) untuk paket jam, serta denda harian per jam untuk sewa harian/bulanan dengan toleransi 60 menit.

### 10. ⚡ Fitur 'Quick Share' WhatsApp & Modal Detail Booking
- Komponen modal detail booking komprehensif (`BookingDetailModal.tsx`) dengan tab navigasi ganda: Rincian Transaksi 13 Poin & Quick Share WhatsApp.
- Generator 3 template pesan WhatsApp resmi otomatis:
  1. **Konfirmasi Booking**: Rincian pemesanan lengkap, jadwal ambil/kembali, lokasi serah terima, rincian biaya, kelengkapan helm/jas hujan, dan instruksi verifikasi identitas fisik.
  2. **Pengingat Pengembalian**: Reminder ramah tenggat sewa, lokasi pengembalian, checklist pengecekan BBM/STNK/helm/barang bagasi, serta opsi perpanjangan sewa sebelum denda D-27.
  3. **Ucapan Terima Kasih**: Apresiasi pasca sewa selesai, ajakan review rating bintang 5 Google Maps, dan voucher diskon khusus repeat order.
- Fitur **Live WhatsApp Preview Box**, tombol 1-klik **Kirim ke WhatsApp**, dan 1-klik **Salin Pesan**.
- Tombol pintas Quick Share disematkan langsung di kartu transaksi Bookings, header kartu, dan modal Kwitansi Digital.

### 11. 📊 Visual Analytics Tren Pendapatan 7 Hari Terakhir (Recharts)
- Integrasi pustaka **Recharts** pada `DashboardView` via komponen `RevenueTrendChart.tsx`.
- Mode tampilan interaktif: **Kurva Area** (Sewa Pokok vs Denda vs Total) dan **Batang Unit** (Pola Permintaan Pasar).
- Indikator metrik kunci: Total Omset 7 Hari, Rata-Rata Harian, Puncak Permintaan (*Peak Demand Day* di akhir pekan), dan Volume Unit Disewa.
- Tooltip gelap (*dark-themed custom tooltip*) yang informatif dan responsif.

### 12. 📈 Laporan Kinerja Bulanan & Tingkat Okupansi Armada (`MonthlyReportView`)
- Modul analisis jangka panjang untuk pemilik rental:
  $$\text{Tingkat Okupansi (\%)} = \frac{\text{Total Hari-Unit Tersewa}}{\text{Kapasitas Armada (16 Unit} \times \text{Hari dalam Bulan)}} \times 100\%$$
- Grafik ganda Recharts (`ComposedChart`): Batang Pendapatan Bulanan (Rp) dan Garis Tingkat Okupansi (%).
- Tabel histori operasional multi-bulan (Mei s/d Oktober 2026): Omset pokok, denda overtime, biaya pemeliharaan servis garasi (7 kategori), laba bersih operasional, dan model terlaris.
- Pemetaan distribusi pangsa pasar per model motor armada (*Honda Scoopy*, *Yamaha NMAX*, *Honda CRF 150L*, *Yamaha Fazzio*).
- Tombol **Salin Memo WhatsApp Manajemen** untuk pelaporan eksekutif kepada pemilik/investor dan tombol **Cetak PDF**.

### 13. 📝 Log Operasional Harian & Catatan Insiden Lapangan
- Komponen terintegrasi pada `DashboardView` (`DailyOperationalLogSection.tsx`) untuk mendokumentasikan serah terima shift harian, kendala teknis unit, kondisi cuaca, hingga insiden kemacetan jalur wisata Malang & Batu.
- Tersimpan permanen ke database **LocalStorage** (`dailyOperationalLogs`) dengan auto-migrasi aman.
- Filter klasifikasi terarah: **Serah Terima Shift**, **Insiden Lapangan**, **Lalu Lintas & Cuaca**, **Kondisi Armada**, dan **Instruksi Tim**.
- Indikator tingkat urgensi visual bertingkat: **Normal**, **Penting (⚠️)**, dan **Darurat (🚨 Berkedip)**.
- Form pencatatan cepat dengan dukungan pengaitan unit fisik garasi (`SCP-01`, `NMAX-02`), titik lokasi kejadian, kronologi lengkap, dan identitas penulis.
- Fitur **1-Klik Kirim WA / Salin Format**: Menghasilkan format pesan WhatsApp rapi untuk dibagikan secara instan ke grup koordinasi kurir dan manajemen rental.

---

## 📝 Template Booking 13 Field

Format standar transaksi pemesanan unit RyokoRent:

| No | Nama Field | Deskripsi & Contoh |
| :-: | :--- | :--- |
| 1 | **Nama Penyewa** | Nama lengkap sesuai kartu identitas (mis. *Ridho berkati*) |
| 2 | **Alamat Sesuai KTP** | Domisili asal penyewa (mis. *JL. Pek raya harmoni II*) |
| 3 | **ID Pendukung** | SIM C, KTM Mahasiswa, NPWP, Paspor, atau BPJS |
| 4 | **Alamat Saat Ini** | Lokasi tinggal selama di Malang/Batu (Rumah, Kos, atau Hotel/Apartemen) |
| 5 | **ID Sosial Media** | Akun Instagram, TikTok, atau Facebook (mis. *@ridhoxw*) |
| 6 | **Nomor Telepon / WA** | Nomor telepon aktif WhatsApp (mis. *085845595139*) |
| 7 | **Nomor Telepon Darurat** | Kontak keluarga / kerabat yang bisa dihubungi jika darurat |
| 8 | **Jadwal Mulai** | Tanggal & jam pengambilan unit (YYYY-MM-DD HH:mm) |
| 9 | **Jadwal Selesai** | Tanggal & jam pengembalian unit (YYYY-MM-DD HH:mm) |
| 10 | **Lokasi Pengantaran** | Titik temu antar unit (mis. *Apartemen Begawan / Stasiun Malang*) |
| 11 | **Lokasi Penjemputan** | Titik temu pengembalian unit oleh kurir / pool |
| 12 | **Model Unit Motor** | Tipe motor yang disewa (Scoopy, NMAX, CRF 150L, Fazzio, dll.) |
| 13 | **Jumlah Helm SNI** | Jumlah helm yang dipinjamkan (1 atau 2 helm) |

---

## 🔌 Integrasi Eksternal

### A. WhatsApp Messaging Gateway
- URL format standar `https://api.whatsapp.com/send?phone=...&text=...` berstandar UTF-8.
- 6 template pesan otomatis:
  1. Konfirmasi Booking Baru
  2. Surat Tugas Pengantaran Kurir Lapangan
  3. Tagihan Invoice Sewa Bulanan (1 Bulan)
  4. Pengingat Jatuh Tempo Pengembalian Ramah (H-2 Jam)
  5. Kwitansi Pengembalian & Denda Keterlambatan
  6. Notifikasi Unit Selesai Servis dari Bengkel

### B. Google Sheets Collaboration (`src/services/googleSheetsService.ts`)
- Ekspor seluruh transaksi 13 field langsung ke **CSV** atau **Google Apps Script Webhook**.
- Alur review & opsi operasional di spreadsheet:
  - Kolom **Status Review**: `PENDING_REVIEW` | `APPROVED` | `REJECTED` | `NEED_DOCS`
  - Kolom **Opsi Tindak Lanjut**: `Siapkan Unit` | `Tugaskan Kurir` | `Kirim Tagihan DP` | `Jadwalkan Servis`
  - Kolom **Aksi Eksekusi**: Status persetujuan final yang dicatat otomatis.

### C. Telegram Bot Return Alert (`src/services/telegramBotService.ts`)
- Bot notifikasi jatuh tempo otomatis ke grup/channel Telegram Admin & Operator.
- Notifikasi H-2 Jam, H-1 Jam, dan Keterlambatan (*Overdue*).
- Tombol aksi inline Telegram (*Inline Keyboard*):
  - `[ 🔍 Review Detail ]`
  - `[ ✅ Setujui Selesai ]`
  - `[ ⏳ Perpanjang Sewa ]`
  - `[ ⚠️ Tagih Denda ]`

---

## 🛠️ Tech Stack

- **Framework Frontend:** React 19 + TypeScript
- **Bundler:** Vite 8 (Modern ESM with `import.meta.dirname`)
- **Styling:** Tailwind CSS v4 + Motion
- **Visualisasi Data & Grafik:** Recharts (^3.10.1)
- **Ikonografi:** Lucide React
- **PWA Engine:** `vite-plugin-pwa` + Web App Manifest
- **Penyimpanan Data:** Browser LocalStorage (`ryokourent_db_v1`) + Export/Import JSON
- **Metodologi Pengembangan:** Zero-Loss Context Engineering (ZLCE) v3.2.2

---

## 🚀 Panduan Instalasi & Menjalankan

### Prasyarat
- Node.js `>= 20.19.0` (disarankan Node.js 22 LTS)
- npm atau bun

### Langkah Menjalankan di Lokal:
```bash
# 1. Klon repositori
git clone https://github.com/kepekmalang-cell/RyoAPPkepek.git
cd RyoAPPkepek

# 2. Pasang dependensi
npm install

# 3. Jalankan server pengembangan lokal
npm run dev
```
Buka browser di alamat: `http://localhost:3000`

### Pengujian & Build Produksi:
```bash
# Uji kompilasi TypeScript
npm run lint

# Buat bundel produksi PWA
npm run build

# Validasi integritas dokumen ZLCE
python3 scripts/zlce/zlce-check.py . --no-git
```

---

## 📱 Instalasi PWA Android (Mode APK Standalone)

Aplikasi dapat dipasang langsung pada perangkat Android tanpa Google Play Store:
1. Buka peramban **Google Chrome** di perangkat smartphone Android Anda.
2. Akses tautan web aplikasi RyokoRent.
3. Klik tombol **"Pasang APK"** di pojok kanan atas, atau buka menu Chrome (titik tiga `⋮`) lalu pilih **"Tambahkan ke Layar Utama" (Add to Home Screen)** / **"Install App"**.
4. Ikon **RyokoRent** akan muncul di app drawer Android Anda dan dapat dijalankan dengan tampilan layar penuh (*standalone mobile app*).

---

## 📁 Struktur Proyek

```text
.
├── BLUEPRINT.md                 # Sumber kebenaran spesifikasi, aturan bisnis BR-01 s/d BR-08
├── TASKS.md                     # Daftar task pengembangan terstruktur ZLCE
├── SESSION_STATE.md             # Status aktif sesi pengerjaan, matriks task, & log audit
├── README.md                    # Dokumentasi resmi proyek (berkas ini)
├── docs/                        # Dokumentasi arsitektur & panduan
│   ├── CLAUDE_REVIEW_GUIDE.md   # Panduan file upload untuk review Claude
│   ├── CLAUDE_PROMPT.md         # Prompt siap salin untuk review Claude
│   ├── REVIEW_ACTION_PLAN.md    # Kerangka pemeriksaan & rencana penyesuaian review
│   ├── GOOGLE_SHEETS_INTEGRATION.md # Panduan integrasi Google Sheets
│   └── TELEGRAM_BOT_INTEGRATION.md  # Panduan integrasi Bot Telegram
├── scripts/
│   └── zlce/                    # Skrip pengujian status ZLCE (zlce-check.py, snapshot, collect)
├── src/
│   ├── components/              # Antarmuka modular:
│   │   ├── DashboardView.tsx    # Pusat kontrol, metrik, ketersediaan, & tren Recharts
│   │   ├── DailyOperationalLogSection.tsx # Log harian, serah terima shift & insiden lapangan
│   │   ├── MonthlyReportView.tsx# Laporan kinerja bulanan & okupansi armada jangka panjang
│   │   ├── RevenueTrendChart.tsx# Visualisasi tren omset 7 hari (Recharts Area & Bar)
│   │   ├── BookingDetailModal.tsx# Detail booking & generator Quick Share WhatsApp 3 template
│   │   ├── BookingsView.tsx     # State machine sewa motor & kartu booking interaktif
│   │   ├── DigitalReceiptModal.tsx # Kwitansi paperless PDF & salin nota kasir
│   │   ├── CountdownAlertBanner.tsx # Alert jatuh tempo real-time bergradasi
│   │   ├── CourierDashboardView.tsx # Portal tugas kurir antar/jemput & WhatsApp tamu
│   │   ├── FleetView.tsx        # Manajemen armada, master model motor, & bulk pricing
│   │   ├── ServiceLogsView.tsx  # Catatan servis rutin garasi 7 kategori
│   │   ├── UserManagementView.tsx # Manajemen akun pengguna & RBAC 4 tingkat
│   │   ├── SettingsView.tsx     # Konfigurasi, Google Sheets webhook, & Bot Telegram
│   │   └── RecoveryTab.tsx      # Wizard snapshot ZLCE Studio
│   ├── data/                    # Seed data 16 unit garasi, 6 model, dan transaksi awal
│   ├── services/                # Logika bisnis: bookingEngine, whatsappService, googleSheets, telegramBot
│   ├── types/                   # Definisi tipe TypeScript ryoko.ts & zlce.ts
│   └── utils/                   # Helper hitung mundur, parser chat WhatsApp, clipboard, formatting
├── public/                      # Aset statis, ikon Android PWA, favicon
├── vite.config.ts               # Konfigurasi bundler Vite & PWA (import.meta.dirname)
└── package.json                 # Metadata pustaka dan dependensi
```

---

## 📄 Lisensi

Didistribusikan di bawah lisensi [MIT](LICENSE) © 2026 RyokoRent Malang & Batu Contributors.
