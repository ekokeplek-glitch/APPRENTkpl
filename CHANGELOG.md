# Changelog

Semua perubahan penting pada proyek ini dicatat dalam berkas ini.
Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini menganut [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.4.0] - 2026-10-24

### Ditambahkan
- Fitur **'Log Operasional Harian & Insiden Lapangan'** (`DailyOperationalLogSection.tsx`) langsung pada `DashboardView` untuk mencatat serah terima shift, kendala di lapangan, info cuaca/lalu lintas, kondisi armada, dan instruksi tim.
- Skema database `dailyOperationalLogs` pada LocalStorage (`RyokoDatabase`) dengan mekanisme auto-migrasi aman pada `storageService.ts`.
- Filter klasifikasi 5 kategori: *Serah Terima Shift*, *Insiden Lapangan*, *Lalu Lintas & Cuaca*, *Kondisi Armada*, dan *Instruksi Tim*.
- Filter prioritas bertingkat (*Normal*, *Penting ⚠️*, dan *Darurat 🚨 dengan animasi visual*).
- Opsi pengaitan unit fisik garasi (misal *SCP-01*, *NMAX-01*) dan lokasi kejadian spesifik (misal *Pool Dinoyo*, *Alun-Alun Batu*).
- Form cepat penambahan catatan operasional dengan integrasi otomatis akun staf yang sedang bertugas.
- Fitur 1-klik **Kirim WA** dan **Salin Format WhatsApp** untuk diseminasi instan laporan insiden ke grup koordinasi lapangan.
- Pencatatan mutasi penambahan dan penghapusan log ke dalam riwayat `auditLogs` sistem.

## [3.3.0] - 2026-10-24

### Ditambahkan
- Komponen `MonthlyReportView` yang merangkum total pendapatan, jumlah booking, dan tingkat okupansi armada per bulan menggunakan histori data booking untuk manajemen operasional jangka panjang.
- Perhitungan otomatis Tingkat Okupansi Armada (% Occupancy Rate) berbasis unit-hari tersewa terhadap kapasitas penuh armada garasi 16 unit.
- Grafik dual-axis interaktif Recharts (`ComposedChart`) korelasi pendapatan bulanan (Rp) dan tingkat okupansi (%).
- Tab navigasi baru **"Laporan"** (`reports`) pada Android Bottom Navigation untuk Administrator/Owner (`canViewRevenue`).
- Komponen `RevenueTrendChart` berbasis **Recharts** (^3.10.1) pada `DashboardView` untuk visualisasi tren omset dan intensitas permintaan unit 7 hari terakhir (AreaChart & BarChart).
- Komponen `BookingDetailModal` dengan fitur **Quick Share WhatsApp** untuk menghasilkan 3 template pesan resmi (Konfirmasi Booking, Pengingat Pengembalian, dan Ucapan Terima Kasih).
- Fitur live preview pesan WhatsApp gelap, tombol 1-klik "Kirim ke WhatsApp", dan 1-klik "Salin Pesan" dengan konfirmasi visual.
- Tombol ekspor memo eksekutif laporan manajemen WhatsApp dan cetak PDF pada `MonthlyReportView`.

### Diubah
- Konfigurasi `vite.config.ts` diperbarui menggunakan `import.meta.dirname` menggantikan `__dirname` untuk kompatibilitas native ESM Vite 8.
- Penambahan tombol pintas "Laporan Bulanan & Okupansi" di bagian header rekapitulasi finansial `DashboardView`.
- Kartu transaksi pada `BookingsView` dan modal `DigitalReceiptModal` dilengkapi tombol aksi langsung *Quick Share WA*.

## [3.2.2] - 2026-10-24

### Ditambahkan
- Inisialisasi arsitektur RyokoRent Android APK berbasis LocalStorage.
- Model data `MotorModel`, `PhysicalUnit`, `UnitTracking`, `BookingRecord`, dan `ServiceRecord`.
- Panel Catatan Servis Rutin 7 kategori (Oli Mesin, Oli Gardan, Kampas Rem, Ganti Ban, CVT Part, Aki/Baterai, Servis Kecelakaan).
- Dukungan tarif sewa 1 Bulan menggantikan paket 2 Minggu.
- Status `diservis` pada alur state machine dan posisi armada `kurir` disertai nama kurir penanggung jawab.
- Jeda ketersediaan turnaround buffer disesuaikan menjadi 60 menit.
- Filter rekapitulasi omset & laporan finansial berdasarkan rentang tanggal kustom.
- Integrasi tab Recovery ZLCE Studio untuk pembuatan snapshot pemulihan langsung dari antarmuka aplikasi.
- Fitur WhatsApp lanjutan (tagihan sewa bulanan, surat tugas kurir, pengingat jatuh tempo H-2 jam).

### Diubah
- Sinkronisasi `BLUEPRINT.md` dengan penyesuaian aturan bisnis BR-01, BR-02, BR-04, BR-06, dan penempatan WhatsApp pada Bagian 10.
- Penyederhanaan alur pemesanan tanpa meminta/memblokir NIK KTP.
