# BACKLOG TASK PENGEMBANGAN: RyokoRent Android APK

Definisi task. **Status task tidak ditulis di sini**; status ada di `SESSION_STATE.md`. Enum: `PENDING | READY | IN_PROGRESS | BLOCKED | DONE`.

---

## 1. PETA FASE

* **FASE 0: Pondasi & Spesifikasi ZLCE** (`TASK-001`)
* **FASE 1: Arsitektur Model Data & Servis** (`TASK-002`)
* **FASE 2: Panel Catatan Servis Rutin & Penugasan Kurir** (`TASK-003`)
* **FASE 3: Form Pemesanan Baru, Laporan Omset & WhatsApp Ekstra** (`TASK-004`)
* **FASE 4: Integrasi Wizard Recovery ZLCE Studio & Verifikasi Akhir** (`TASK-005`)
* **FASE 5: Panel Manajemen User & Role-Based Access Control 4 Tingkat** (`TASK-006`)
* **FASE 6: Kwitansi Paperless, Countdown Real-Time & Armada Dinamis** (`TASK-007`, `TASK-008`, `TASK-009`)
* **FASE 7: Review Claude, README Resmi, & Integrasi Kolaborasi Eksternal** (`TASK-010`, `TASK-011`, `TASK-012`, `TASK-013`, `TASK-014`)
* **FASE 8: Quick Share WhatsApp, Recharts Visualizer & Laporan Okupansi Bulanan** (`TASK-015`, `TASK-016`, `TASK-017`)
* **FASE 9: Integritas Jadwal, Mesin Transisi Terproteksi & Redaksi Keamanan** (`TASK-018`, `TASK-019`, `TASK-020`)
* **FASE 10: Robustness Integrasi Eksternal & Optimasi Mobile PWA** (`TASK-021`, `TASK-022`)

---

## 2. FORMAT TASK

### TASK-001: Inisialisasi Repositori & Dokumen Kontrol ZLCE
* **Fase:** FASE 0
* **Deskripsi:** Setup lingkungan, integrasi VitePWA, manifest Android, dan berkas kontrol ZLCE (`BLUEPRINT.md`, `TASKS.md`, `SESSION_STATE.md`, `HANDOVER.md`).
* **Dependensi:** -
* **File:** `BLUEPRINT.md`, `TASKS.md`, `SESSION_STATE.md`, `HANDOVER.md`, `vite.config.ts`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Berkas kontrol ZLCE terisi lengkap dan lolos verifikasi `zlce-check.py`.
  2. Kompilasi TypeScript `npm run lint` berjalan 0 error.
* **Test Case:** Build & Lint verification
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`; tempel output.

---

### TASK-002: Penyesuaian Skema & Model Data (Tarif 1 Bulan, Kurir, 7 Kategori Servis, Buffer 60 Mnt)
* **Fase:** FASE 1
* **Deskripsi:** Memperbarui antarmuka TypeScript `src/types/ryoko.ts` dan logika perhitungan di `src/services/bookingEngine.ts` untuk mendukung tarif 1 Bulan (menggantikan 2 Minggu), status posisi unit `kurir` beserta nama kurir, status booking `ryokou_diservis`, jeda turnaround buffer 60 menit, dan entitas `ServiceRecord` (7 kategori).
* **Dependensi:** `TASK-001`
* **File:** `src/types/ryoko.ts`, `src/services/bookingEngine.ts`, `src/data/seedData.ts`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `harga1Bulan` dan durasi `1_bulan` terdefinisi dan terkalkulasi akurat.
  2. `ServiceRecord` mencakup 7 kategori servis spesifik.
  3. Turnaround buffer dikalibrasi menjadi 60 menit (3600 detik).
  4. Unit tracking mendukung status `kurir` dengan field `namaKurir`.
* **Test Case:** Monthly tariff & 60-min buffer test
* **Metode Verifikasi:** Jalankan `npm run lint` dan verifikasi kalkulasi tarif.

---

### TASK-003: Implementasi Panel Catatan Servis Rutin 7 Kategori & Posisi Kurir di UI
* **Fase:** FASE 2
* **Deskripsi:** Membuat komponen `src/components/ServiceLogsView.tsx` untuk input dan riwayat servis rutin 7 kategori armada garasi, serta menambahkan opsi status posisi "Dipakai Kurir" (dengan nama kurir) pada tab Lacak Unit dan modal update tracking.
* **Dependensi:** `TASK-002`
* **File:** `src/components/ServiceLogsView.tsx`, `src/components/TrackingView.tsx`, `src/components/ActionModals.tsx`, `src/components/AndroidBottomNav.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Pengguna dapat mencatat dan melihat riwayat servis armada dengan 7 kategori spesifik (Ganti Oli Mesin, Oli Gardan, Kampas Rem, Ban, CVT Part, Aki, Kecelakaan).
  2. Unit armada dapat dipindahkan ke status "Dipakai Kurir" dengan mengisi nama kurir.
* **Test Case:** Service logs create & filter test
* **Metode Verifikasi:** Uji input catatan servis dan perpindahan status unit.

---

### TASK-004: Form Pemesanan Baru, Laporan Omset & Fitur WhatsApp Lanjutan
* **Fase:** FASE 3
* **Deskripsi:** Memperbarui `NewBookingModal.tsx` dengan pilihan durasi 1 Bulan, opsi kurir pengantar, dan penyederhanaan tanpa sensor NIK. Menambahkan fitur filter rekapitulasi omset per rentang tanggal di Dashboard/Laporan, serta menambahkan generator WhatsApp untuk tagihan bulanan, surat tugas kurir, dan pengingat jatuh tempo H-2 jam.
* **Dependensi:** `TASK-003`
* **File:** `src/components/NewBookingModal.tsx`, `src/services/whatsappService.ts`, `src/components/DashboardView.tsx`, `src/components/BookingsView.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Form order mendukung sewa 1 bulan (+30 hari otomatis) dan opsi penugasan kurir.
  2. Filter tanggal omset di Dashboard menghitung total pendapatan sesuai rentang waktu yang dipilih.
  3. Fitur WhatsApp mencakup notifikasi kurir, tagihan sewa bulanan, dan pengingat jatuh tempo H-2 jam.
* **Test Case:** Order creation & WhatsApp link generation
* **Metode Verifikasi:** Uji input pemesanan sewa 1 bulan dan verifikasi format pesan WA.

---

### TASK-005: Integrasi Wizard Recovery ZLCE Studio & Verifikasi Akhir
* **Fase:** FASE 4
* **Deskripsi:** Mengintegrasikan tab Recovery ZLCE Studio ke dalam antarmuka aplikasi RyokoRent APK, memungkinkan operator/pengembang membuat dan menyalin snapshot pemulihan langsung dari UI, serta memastikan build produksi PWA siap pakai.
* **Dependensi:** `TASK-004`
* **File:** `src/App.tsx`, `src/components/RecoveryTab.tsx`, `scripts/zlce/zlce-snapshot.sh`
* **Docs Terkait:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Tombol/tab ZLCE Recovery dapat diakses di aplikasi untuk membuat snapshot seketika.
  2. Skrip `scripts/zlce/zlce-check.py` lolos dengan status OK (0 error, 0 warn).
  3. Build produksi `npm run build` sukses 100%.
* **Test Case:** Full app verification & ZLCE check
* **Metode Verifikasi:** Jalankan `python3 scripts/zlce/zlce-check.py .` dan `npm run build`.

---

### TASK-006: Panel Manajemen User & Role-Based Access Control (4 Tingkat)
* **Fase:** FASE 5
* **Deskripsi:** Mengimplementasikan Panel Manajemen Pengguna dengan 4 tingkatan hak akses: (1) Administrator (all access), (2) Admin Custom Access (izin granular yang dapat dikustomisasi per-user), (3) Operator (akses terbatas: operasional booking, lacak unit, servis, tanpa akses ekspor omset/reset sistem/manajemen user), dan (4) Kurir (akses sangat terbatas: hanya tugas serah terima, penjemputan unit, chat WhatsApp tamu, dan status kurir motor, tanpa finansial/pengaturan). Dilengkapi dengan Pengalih Akun Cepat (Quick Switcher) di Top Bar dan Panel Pengaturan User.
* **Dependensi:** `TASK-005`
* **File:** `src/types/ryoko.ts`, `src/data/seedData.ts`, `src/services/storageService.ts`, `src/components/UserManagementView.tsx`, `src/components/CourierDashboardView.tsx`, `src/components/AndroidTopBar.tsx`, `src/components/AndroidBottomNav.tsx`, `src/App.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Tersedia 4 tingkatan peran: Administrator, Admin Custom, Operator, dan Kurir.
  2. Admin Custom dapat diatur izin granularnya (lihat omset, kelola booking, lacak unit, servis, armada, pengaturan, kelola user, recovery).
  3. Operator dibatasi dari akses omset finansial agregat, reset sistem, dan manajemen user.
  4. Kurir memiliki tampilan ringkas khusus pengantaran & penjemputan unit dengan aksi satu-klik dan kontak WhatsApp penyewa.
  5. Pengguna dapat berganti akun secara langsung melalui Switcher Profil di Top Bar atau tab Pengguna.
* **Test Case:** Role switching, permission enforcement & courier workflow
* **Metode Verifikasi:** Jalankan `python3 scripts/zlce/zlce-check.py . --no-git` dan `npm run lint`.

---

### TASK-007: Modul Kwitansi Digital Paperless & Salin Teks Ringkasan Nota Kasir Cepat
* **Fase:** FASE 6
* **Deskripsi:** Mengimplementasikan modal Kwitansi Digital / Invoice resmi Ryoko Rent Malang & Batu tanpa cetak kertas (paperless). Mendukung preview nota kasir digital yang rapi, tombol Simpan / Unduh PDF, tombol Salin Teks Ringkasan Nota Kasir untuk chat cepat WhatsApp, rincian Berita Acara Serah Terima (BAST: kelengkapan 2 helm, 2 jas hujan, bensin, deposit), serta kirim WhatsApp 1-klik. Tersedia di setiap card booking dan dashboard kurir.
* **Dependensi:** `TASK-006`
* **File:** `src/components/DigitalReceiptModal.tsx`, `src/components/BookingsView.tsx`, `src/components/CourierDashboardView.tsx`, `src/App.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Terdapat tombol "Kwitansi / Invoice" pada setiap card booking dan view kurir.
  2. Modal kwitansi menampilkan identitas rental, detail penyewa, rincian biaya (tarif + denda jika ada), unit motor, nomor plat, dan kelengkapan unit.
  3. Pengguna dapat mengunduh / menyimpan nota dalam format PDF tanpa perlu cetak kertas.
  4. Pengguna dapat menyalin teks ringkasan nota kasir untuk chat cepat hanya dengan 1-klik.
  5. Tersedia tombol kirim kwitansi langsung ke WhatsApp penyewa.
* **Test Case:** Digital receipt modal, PDF export trigger, quick copy text
* **Metode Verifikasi:** Jalankan `npm run lint` dan verifikasi fungsi salin nota kasir & render modal.

---

### TASK-008: Sistem Countdown Pengembalian Real-Time & Alert Jatuh Tempo di Dashboard/Kurir
* **Fase:** FASE 6
* **Deskripsi:** Mengimplementasikan banner hitung mundur (countdown) waktu sewa real-time pada beranda dan dashboard kurir, mengklasifikasikan unit dalam status Aman, H-2 Jam, H-1 Jam, dan Overdue, disertai kalkulasi denda otomatis per menit/jam dan generator pesan pengingat jatuh tempo WhatsApp.
* **Dependensi:** `TASK-007`
* **File:** `src/components/DashboardView.tsx`, `src/components/CourierDashboardView.tsx`, `src/services/whatsappService.ts`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Banner status countdown tampil interaktif dengan indikator warna (hijau, kuning H-2 jam, merah overdue).
  2. Tombol kirim pengingat pengembalian ke WhatsApp penyewa tersedia langsung dari banner.
* **Test Case:** Countdown timer & alert calculations
* **Metode Verifikasi:** Jalankan `npm run lint`.

---

### TASK-009: Master Model Motor Dinamis & Manajemen Tarif Khusus di FleetView
* **Fase:** FASE 6
* **Deskripsi:** Menambahkan fitur CRUD master model motor baru (tambah model, ubah nama, cc, transmisi, tarif spesifik per durasi termasuk tarif 1 bulan) di `FleetView.tsx` agar katalog armada garasi dapat diperluas secara fleksibel tanpa edit kode sumber.
* **Dependensi:** `TASK-008`
* **File:** `src/components/FleetView.tsx`, `src/services/storageService.ts`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Operator/Admin dapat menambah model motor baru dengan tarif lengkap (ShortRent, Harian, 1 Bulan).
  2. Data tersimpan persisten di LocalStorage dan langsung muncul di opsi booking baru.
* **Test Case:** Create/Edit motor model
* **Metode Verifikasi:** Jalankan `python3 scripts/zlce/zlce-check.py .` dan `npm run lint`.

---

### TASK-010: Panduan Review Kode Claude & Prompt Instruksi Unggah Berkas
* **Fase:** FASE 7
* **Deskripsi:** Menyusun dokumen panduan pengunggahan berkas (`docs/CLAUDE_REVIEW_GUIDE.md`) dan berkas prompt siap salin (`docs/CLAUDE_PROMPT.md`) untuk melakukan audit kode mendalam oleh model Anthropic Claude (Sonnet 3.5 / 3.7 / Opus) yang mencakup kepatuhan 13 field form booking, state machine 5 status, jeda 60 menit buffer, proteksi NIK, dan kesiapan PWA Android.
* **Dependensi:** `TASK-009`
* **File:** `docs/CLAUDE_REVIEW_GUIDE.md`, `docs/CLAUDE_PROMPT.md`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Panduan memuat daftar tier berkas yang wajib diunggah beserta estimasi token.
  2. Prompt Claude mencakup 6 fokus tinjauan kode dan format output terstruktur.
* **Test Case:** Review prompt readiness
* **Metode Verifikasi:** Verifikasi kelengkapan berkas `docs/CLAUDE_REVIEW_GUIDE.md` & `docs/CLAUDE_PROMPT.md`.

---

### TASK-011: Berkas Dokumentasi Resmi README.md Proyek RyokoRent
* **Fase:** FASE 7
* **Deskripsi:** Mengganti file README upstream dengan dokumentasi resmi dan komprehensif untuk RyokoRent Android APK, mencakup fitur 13-field booking, state machine, 60-menit turnaround buffer, tarif 1 bulan, RBAC 4 tingkat, kwitansi paperless, hitung mundur real-time, panduan instalasi PWA di Android Chrome, dan diagram struktur repositori.
* **Dependensi:** `TASK-010`
* **File:** `README.md`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `README.md` mendokumentasikan 100% kapabilitas fungsional aplikasi RyokoRent.
  2. Menyertakan tabel 13 field booking, panduan setup lokal, dan langkah instalasi PWA Android.
* **Test Case:** Project documentation audit
* **Metode Verifikasi:** Periksa isi `README.md` dan kompilasi build.

---

### TASK-012: Kerangka Pemeriksaan & Rencana Penyesuaian Tindak Lanjut Hasil Review
* **Fase:** FASE 7
* **Deskripsi:** Menyusun rencana aksi dan tabel log penyesuaian hasil review (`docs/REVIEW_ACTION_PLAN.md`) dengan rubrik triase prioritas (P0 Kritis, P1 Operasional, P2 UX), matriks evaluasi mandiri awal, dan prosedur eksekusi kode terstandarisasi.
* **Dependensi:** `TASK-011`
* **File:** `docs/REVIEW_ACTION_PLAN.md`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Dokumen triase menyediakan rubrik klasifikasi severity P0, P1, P2.
  2. Memuat tabel log penyesuaian yang siap mencatat hasil temuan review Claude.
* **Test Case:** Action plan readiness
* **Metode Verifikasi:** Verifikasi kelengkapan `docs/REVIEW_ACTION_PLAN.md`.

---

### TASK-013: Arsitektur & Layanan Sinkronisasi Kolaborasi Google Sheets
* **Fase:** FASE 7
* **Deskripsi:** Mengimplementasikan modul layanan kolaborasi Google Sheets (`src/services/googleSheetsService.ts`) dan dokumentasi integrasi (`docs/GOOGLE_SHEETS_INTEGRATION.md`) untuk pemetaan 13 field form booking ke baris spreadsheet 26 kolom (termasuk status review admin, opsi operasional, dan aksi disetujui), fungsi ekspor CSV UTF-8 instan, antrean sinkronisasi offline, serta integrasi input webhook di panel Pengaturan.
* **Dependensi:** `TASK-012`
* **File:** `src/services/googleSheetsService.ts`, `docs/GOOGLE_SHEETS_INTEGRATION.md`, `src/types/ryoko.ts`, `src/components/SettingsView.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Format 26 kolom Google Sheets mencakup 13 field standar + kolom Review, Opsi, Aksi.
  2. Tombol unduh CSV dan sinkronisasi webhook tersedia di menu Pengaturan.
  3. Mendukung antrean lokal di LocalStorage saat offline.
* **Test Case:** CSV export & sheets row mapping
* **Metode Verifikasi:** Jalankan `npm run lint` dan uji fungsi generator baris spreadsheet.

---

### TASK-014: Sistem Alert Pengembalian via Bot Telegram Admin & Aksi Interaktif
* **Fase:** FASE 7
* **Deskripsi:** Mengimplementasikan modul layanan Bot Telegram (`src/services/telegramBotService.ts`) dan dokumentasi (`docs/TELEGRAM_BOT_INTEGRATION.md`) untuk mengirimkan notifikasi jatuh tempo (H-2 Jam, H-1 Jam, Overdue) langsung ke Telegram Admin, dilengkapi 4 tombol inline action (Review Detail, Setujui Selesai, Perpanjang Sewa, Kenakan Denda), integrasi tombol Bot TG di CountdownAlertBanner, dan panel konfigurasi token di Pengaturan.
* **Dependensi:** `TASK-013`
* **File:** `src/services/telegramBotService.ts`, `docs/TELEGRAM_BOT_INTEGRATION.md`, `src/components/CountdownAlertBanner.tsx`, `src/components/SettingsView.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Template pesan Telegram memformat data penyewa, unit motor, sisa waktu, dan denda estimasi.
  2. Tersedia 4 tombol aksi inline interaktif Telegram dengan callback data terdefinisi.
  3. Pengaturan menyediakan input Token & Chat ID dengan fitur uji coba koneksi dan alert contoh.
  4. Banner hitung mundur memiliki tombol pemicu notifikasi Telegram instan.
* **Test Case:** Telegram alert generation & callback handler
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-015: Fitur 'Quick Share' WhatsApp & Modal Detail Booking
* **Fase:** FASE 8
* **Deskripsi:** Mengimplementasikan modal detail transaksi booking (`src/components/BookingDetailModal.tsx`) dan generator 3 template WhatsApp resmi (`src/services/whatsappService.ts`) mencakup Konfirmasi Booking, Pengingat Pengembalian, dan Ucapan Terima Kasih Pasca Sewa, dilengkapi live preview box, tombol 1-klik kirim ke WhatsApp, dan salin pesan ke clipboard.
* **Dependensi:** `TASK-014`
* **File:** `src/components/BookingDetailModal.tsx`, `src/services/whatsappService.ts`, `src/components/BookingsView.tsx`, `src/App.tsx`, `src/components/DigitalReceiptModal.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Modal detail booking menyajikan rincian lengkap 13-point dan tab khusus Quick Share.
  2. 3 template WhatsApp terformat rapi sesuai identitas Ryoko Rent.
  3. Tombol Quick Share disematkan pada setiap kartu booking dan kwitansi digital.
* **Test Case:** Quick Share link generator & clipboard copy test
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-016: Visual Analytics Tren 7 Hari (Recharts) & Laporan Okupansi Bulanan (`MonthlyReportView`)
* **Fase:** FASE 8
* **Deskripsi:** Mengintegrasikan pustaka Recharts untuk visualisasi tren omset dan intensitas permintaan unit 7 hari terakhir pada `DashboardView` (`src/components/RevenueTrendChart.tsx`), serta mengimplementasikan modul `src/components/MonthlyReportView.tsx` untuk menghitung total pendapatan, jumlah booking, biaya pemeliharaan, laba operasional, dan tingkat okupansi armada garasi bulanan (% Occupancy Rate) beserta grafik ComposedChart multi-bulan dan tombol salin memo eksekutif WhatsApp.
* **Dependensi:** `TASK-015`
* **File:** `src/components/RevenueTrendChart.tsx`, `src/components/MonthlyReportView.tsx`, `src/components/DashboardView.tsx`, `src/components/AndroidBottomNav.tsx`, `src/App.tsx`, `package.json`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Komponen `RevenueTrendChart` menampilkan kurva pendapatan dan grafik batang unit 7 hari terakhir.
  2. Komponen `MonthlyReportView` menyajikan kalkulasi okupansi armada, histori multi-bulan, dan distribusi model motor.
  3. Tab "Laporan" aktif di Android Bottom Navigation untuk peran Administrator/Owner.
* **Test Case:** Recharts rendering, occupancy rate calculation & monthly report audit
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-017: Fitur Log Operasional Harian & Catatan Insiden Lapangan di Dashboard LocalStorage
* **Fase:** FASE 8
* **Deskripsi:** Mengimplementasikan fitur pencatatan log harian dan insiden operasional lapangan (`src/components/DailyOperationalLogSection.tsx`) pada `DashboardView` yang tersimpan permanen dalam database LocalStorage, dilengkapi filter kategori (Serah Terima Shift, Insiden Lapangan, Lalu Lintas & Cuaca, Kondisi Armada, Instruksi Tim), filter prioritas (Normal, Penting, Darurat), pemilihan unit fisik garasi & lokasi kejadian, pencarian real-time, audit log, serta tombol cepat salin & kirim laporan via WhatsApp ke grup kurir/staf.
* **Dependensi:** `TASK-016`
* **File:** `src/types/ryoko.ts`, `src/data/seedData.ts`, `src/services/storageService.ts`, `src/components/DailyOperationalLogSection.tsx`, `src/components/DashboardView.tsx`, `src/App.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`, `README.md`, `CHANGELOG.md`
* **Acceptance Criteria:**
  1. Admin dan staf dapat menulis catatan harian, insiden lapangan, atau instruksi shift baru langsung dari Dashboard.
  2. Data log operasional tersimpan otomatis dan persisten ke dalam skema LocalStorage (`dailyOperationalLogs`).
  3. Tersedia indikator prioritas (Normal, Penting, Darurat dengan alert visual), filter kategori, dan pencarian teks.
  4. Tersedia tombol 1-klik untuk menyalin format teks WhatsApp dan membagikan laporan insiden ke tim lapangan.
* **Test Case:** Operational log creation, LocalStorage persistence & WhatsApp text generator
* **Metode Verifikasi:** Jalankan `npm run lint`, `npm run build`, dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-018: Integritas Waktu WIB & Parser WhatsApp Bebas Fallback
* **Fase:** FASE 9
* **Deskripsi:** Memperbaiki pergeseran zona waktu WIB (UTC offset bug) pada input datetime-local melalui `epochToWibInput` dan `parseWibToEpoch` eksplisit timezone Asia/Jakarta (+07:00). Menulis ulang parser WhatsApp agar memecah label hanya pada titik dua pertama (`splitLabel`), memvalidasi tanggal ISO/lokal nyata tanpa lolos tanggal mustahil, mendeteksi jam 24h & kata waktu (pagi/siang/sore/malam), menghapus seluruh fallback tanggal statis (24-25 Okt, Begawan, Scoopy), serta mengembalikan daftar `warnings` untuk field yang gagal terbaca.
* **Dependensi:** `TASK-017`
* **File:** `src/services/bookingEngine.ts`, `src/utils/whatsappChatParser.ts`, `src/components/NewBookingModal.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Input `datetime-local` di NewBookingModal menggunakan format WIB lokal tanpa tergeser 7 jam ke masa lalu.
  2. Parser WA tidak memotong jam bertitik dua `15:40` menjadi `40`.
  3. Parser menolak tanggal palsu (mis. 31/02) dan mengembalikan array warnings alih-alih mengisi nilai palsu bawaan.
  4. Jam `3.30 sore` atau `jam 3` dikonversi menjadi waktu 24 jam yang tepat (15:30 / 15:00).
* **Test Case:** WIB datetime roundtrip & WhatsApp text parsing verification
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-019: Mesin Transisi Status Guarded, Deteksi Bentrok & Kalkulasi Tarif Multi-Hari
* **Fase:** FASE 9
* **Deskripsi:** Mengimplementasikan mesin transisi status terproteksi (`checkTransition`) dengan matriks status valid (`NEXT`), proteksi double-booking (mencegah unit yang sedang disewa dipakai booking lain), validasi ketersediaan buffer 60 menit ulang saat persetujuan/serah terima, kalkulasi tarif multi-hari otomatis berdasarkan rentang tanggal aktual (`mulaiAt` s/d `selesaiAt`), perbaikan sinkronisasi state `selectedUnitId` pada form, tombol aksi status `ryokou_diservis`, dan validasi form HTML sebelum submit.
* **Dependensi:** `TASK-018`
* **File:** `src/services/bookingEngine.ts`, `src/components/NewBookingModal.tsx`, `src/components/BookingsView.tsx`, `src/components/BookingDetailModal.tsx`, `src/App.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Fungsi `checkTransition` memblokir transisi status yang tidak valid dan menolak unit yang sedang disewa.
  2. Booking multi-hari (mis. 4 hari) otomatis dikalikan tarif harian prorata secara dinamis.
  3. Dropdown unit pada form langsung sinkron dengan `selectedUnitId` dan dicek ulang ketersediaannya bila tanggal berubah.
  4. Tersedia jalur transisi masuk dan keluar untuk status `ryokou_diservis`.
  5. Tombol simpan form berada di dalam/terhubung dengan `<form>` sehingga validasi `required` aktif.
* **Test Case:** Guarded state machine, multi-day tariff calculation & double-booking prevention
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-020: Integritas Database ID, Kuota LocalStorage, Redaksi NIK & Keamanan Kunci
* **Fase:** FASE 9
* **Deskripsi:** Memperbaiki pembuatan nomor booking `generateBookingNumber` (`RYK-YYYYMMDD-XXX`) berbasis max sequence agar tidak duplikat saat ada entri yang dihapus, pembuatan ID `nextId` yang aman, penanganan `SaveResult` dengan deteksi `QuotaExceededError` di `saveDatabase`, sinkronisasi real-time multi-tab via event `storage`, redaksi NIK berbasis regex 16 digit (`redactNik`), dan pemisahan kredensial/token bot dalam ekspor backup JSON publik.
* **Dependensi:** `TASK-019`
* **File:** `src/services/storageService.ts`, `src/services/bookingEngine.ts`, `src/components/SettingsView.tsx`, `src/App.tsx`, `src/main.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Nomor booking tidak duplikat meskipun booking nomor sebelumnya dihapus.
  2. `saveDatabase` mengembalikan status `SaveResult` dan UI menampilkan alert jika kuota penyimpanan habis.
  3. Perubahan LocalStorage di tab lain tersinkronisasi otomatis via `window.addEventListener('storage')`.
  4. Teks NIK 16-digit tersensor menjadi `************XXXX` pada ekspor dan pesan keluar.
  5. Ekspor JSON default tidak menyertakan bot token Telegram dan URL webhook Sheets.
* **Test Case:** Booking ID sequence, Quota error handling & NIK redaction test
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-021: Keandalan Integrasi Telegram, Google Sheets, Rumus Denda & Normalisasi WA
* **Fase:** FASE 10
* **Deskripsi:** Memperbaiki integrasi Telegram dengan escaping karakter HTML (`escHtml`) dan mengganti tombol inline aksi menjadi 1-way action URL yang langsung dapat diklik, mengubah request Google Apps Script menjadi `Content-Type: text/plain;charset=utf-8` agar bebas gagal preflight CORS, membersihkan CSV cell dari formula injection (`'`, `+`, `-`, `@`, `=`), membetulkan kalkulasi denda agar tidak menghasilkan `NaN` dengan memprioritaskan `actualReturnEpoch` numerik, serta menyatukan normalisasi nomor WhatsApp dan jumlah helm di seluruh template.
* **Dependensi:** `TASK-020`
* **File:** `src/services/telegramBotService.ts`, `src/services/googleSheetsService.ts`, `src/services/whatsappService.ts`, `src/services/bookingEngine.ts`, `src/components/CountdownAlertBanner.tsx`, `src/components/BookingDetailModal.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Notifikasi Telegram lolos HTML escaping tanpa error karakter khusus `<>&`.
  2. Request Google Sheets berjalan tanpa penolakan CORS preflight dan CSV aman dari injeksi formula spreadsheet.
  3. Perhitungan denda keterlambatan tidak menghasilkan `RpNaN` dan menghitung kelebihan jam di atas toleransi dengan benar.
  4. Generator template WhatsApp menggunakan satu fungsi normalisasi nomor telepon dan jumlah helm sesuai pesanan (1 atau 2).
* **Test Case:** Telegram HTML escaping, Sheets CORS bypass, fine calculation & WhatsApp normalization
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`.

---

### TASK-022: Mobile PWA Viewport, Navigasi Sticky, Touch Target & Repo Hygiene
* **Fase:** FASE 10
* **Deskripsi:** Mengoptimalkan kenyamanan penggunaan mobile Android PWA dengan menjadikan `AndroidBottomNav` berposisi `sticky bottom-0 z-50` yang dilengkapi `env(safe-area-inset-bottom)`, penggunaan viewport dinamis `100dvh`, pengaktifan kembali `user-scalable=yes` pada `index.html` demi kepatuhan WCAG, perbesaran touch target tombol interaktif menjadi minimum 44px, pembersihan nama paket `package.json`, dan perapian data contoh booking agar bersih dari mock usang.
* **Dependensi:** `TASK-021`
* **File:** `src/components/AndroidBottomNav.tsx`, `src/App.tsx`, `index.html`, `package.json`, `SECURITY.md`, `src/data/seedData.ts`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`, `README.md`
* **Acceptance Criteria:**
  1. Bottom navigation tetap menempel di dasar layar perangkat Android (sticky bottom) saat konten di-scroll.
  2. Layar aplikasi mendukung viewport dinamis (`dvh`) dan zoom aksesibilitas aktif.
  3. Target sentuh tombol dan elemen navigasi memenuhi standar ergonomi minimal 44px.
  4. `package.json` dan data contoh fiktif bersih dan higienis.
* **Test Case:** Mobile viewport audit, touch target ergonomics & production build
* **Metode Verifikasi:** Jalankan `npm run lint`, `npm run build`, dan `python3 scripts/zlce/zlce-check.py .`.

