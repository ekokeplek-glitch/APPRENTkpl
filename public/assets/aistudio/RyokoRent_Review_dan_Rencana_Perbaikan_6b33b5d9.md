# RyokoRent Android APK (APPRENT-main) — Catatan Review & Rencana Perbaikan

Tanggal review: 2026-10-25 · Basis: arsip `APPRENT-main.zip` · Bahasa: Indonesia

---

## 0. Cakupan, Metode, dan Batas

**Dibaca:** `bookingEngine.ts`, `storageService.ts`, `whatsappChatParser.ts`, `whatsappService.ts`, `telegramBotService.ts`, `googleSheetsService.ts`, `types/ryoko.ts`, `userPermissions.ts`, `vite.config.ts`, `App.tsx` (handler bisnis, state, user), `NewBookingModal.tsx` (logika submit), potongan `ActionModals`, `CountdownAlertBanner`, `BLUEPRINT.md`, `SECURITY.md`.

**Diuji dengan skrip** (fungsi murni dijalankan langsung): denda keterlambatan, tarif dinamis, parser chat WA, normalisasi nomor, redaksi NIK. Temuan berlabel **(U)** = direproduksi lewat skrip.

**Tidak dilakukan:**
- `npm install` diblokir jaringan sandbox, jadi `tsc` dan `vite build` **tidak** dijalankan. Review ini tidak menjamin proyek ter-build.
- Komponen UI (FleetView, MonthlyReportView, SettingsView, dll.) dibaca per bagian, bukan seluruhnya. Temuan R1 di bawah perlu diverifikasi penuh sebelum perubahan.
- BR-07 (tarif massal) tidak ditinjau.

**Skor: 66/100** — Logika domain 72 · Integritas data 55 · Keamanan/privasi 50 · Kesiapan multi-orang 45 · PWA/mobile 75.

---

## 1. Prinsip Agar Perbaikan Tidak Melahirkan Masalah Baru

Setiap solusi di dokumen ini mengikuti aturan berikut. Jika sebuah perbaikan melanggar salah satunya, ia dianggap belum tuntas.

1. **Uji karakterisasi dulu.** Sebelum mengubah fungsi murni (tarif, denda, parser, normalizer), tulis tes yang mengunci perilaku saat ini lalu ubah tes hanya pada kasus yang memang salah (daftar kasus di Bagian 6).
2. **Satu perubahan = satu commit = satu rollback.** Jangan menggabungkan perbaikan lintas modul.
3. **Migrasi data bersifat aditif dan idempoten.** Tambah `schemaVersion` di `RyokoDatabase`. Migrasi tidak boleh menghapus data, selalu membuat salinan `ryokourent_db_v1__prev` sebelum jalan, dan aman dijalankan dua kali.
4. **Pakai kompiler sebagai jaring pengaman.** `NEXT_STATUS_TRANSITIONS` bertipe `Record<BookingStatus,…>`; menambah status memaksa semua tempat yang eksplisit gagal-compile sampai ditangani. Untuk perbandingan string literal, lakukan grep manual (daftar di S1).
5. **Jangan ubah angka historis.** `totalHargaEstimasi` tersimpan per booking, jadi koreksi tarif hanya berlaku untuk booking baru. Booking lama tidak dihitung ulang.
6. **Setiap perubahan perilaku yang terlihat pemilik (omzet, denda, tarif) diputuskan pemilik dulu** (Bagian 5).
7. **Koreksi atas saran saya sebelumnya:** pada laporan awal saya menyarankan "jangan `setDb` bila simpan gagal". Itu justru bisa membuat aksi operator lenyap bersamaan dengan tertutupnya modal. Solusi yang benar ada di S5.

---

## 2. Register Temuan

Keparahan: **P0** integritas data/kalkulasi · **P1** operasional · **P2** kenyamanan.

| ID | P | Temuan | Lokasi | Bukti |
|---|---|---|---|---|
| F1 | P0 | Batal = hapus permanen; D-20 hanya blok `disewa`. `diservis` & `selesai` bisa dihapus, omzet & riwayat hilang | `App.tsx` `handleCancelBooking` | Dibaca |
| F2 | P0 | Pembatalan mereset tracking unit tanpa cek `bookingId` → tracking unit yang sedang disewa booking lain jadi `parkir` | `App.tsx` `handleCancelBooking` | Dibaca |
| F3 | P0 | Handover tidak cek servis; hanya `heldByOther` | `bookingEngine.ts` `checkTransition` | Dibaca |
| F4 | P0 | Dua jalur approve beda state: jalur "kunci langsung" set tracking `disewa` saat status masih `approved` | `App.tsx` `handleCreateBooking` vs `handleConfirmApprove` | Dibaca |
| F5 | P0 | Simpan gagal (kuota) → UI tetap menampilkan data tak tersimpan, hilang saat reload | `App.tsx` `updateDatabaseState` | Dibaca |
| F6 | P0 | `JSON.parse` gagal → fallback seed, simpan berikutnya menimpa data mentah | `storageService.ts` `loadDatabase` | Dibaca |
| F7 | P1 | Impor JSON: validasi dangkal, tanpa backup otomatis, token kosong menimpa konfigurasi | `storageService.ts` `importDatabaseJSON` | Dibaca |
| F8 | P1 | Booking `approved` tanpa kedaluwarsa/no-show | state machine | Dibaca |
| F9 | P1 | Update tracking manual bisa menyimpang dari booking; `kurir` tanpa nama diterima | `ActionModals.tsx` `UpdateTrackingModal` | Dibaca |
| F10 | P2 | Pemuatan pertama memasukkan data seed demo (booking, user) ke DB produksi | `storageService.ts`, `seedData.ts` | Dibaca |
| A1 | P0* | Data per-perangkat; tidak ada sumber kebenaran bersama → double-booking lintas HP tak terelakkan | arsitektur | Dibaca |
| A2 | P1 | Ganti role tanpa PIN; izin hanya di UI | `App.tsx` `handleSwitchUser` | Dibaca |
| A3 | P1 | Token Telegram plaintext di `localStorage`, dipakai dari klien | `SettingsView`, `telegramBotService` | Dibaca |
| A4 | P1 | Callback inline keyboard Telegram tidak punya penerima; fungsi eksekutor melewati `checkTransition` | `telegramBotService.ts` | Grep: tanpa pemanggil/`getUpdates` |
| A5 | P1 | `redactNik` hanya dipakai di kotak uji; klaim UI "disensor otomatis" tidak benar; BLUEPRINT BR-06 bilang nonaktif | `SettingsView`, `BLUEPRINT.md` | Grep |
| A6 | P1 | `redactNik` saat ini merusak pasangan nomor telepon (false positive) | `bookingEngine.ts` | **(U)** `darurat 081234567890 0819` → `darurat ************0819` |
| R1 | P0 | Laporan omzet menjumlah `totalHargaEstimasi + dendaNominal` dari booking **tanpa filter status** pada bagian yang saya baca | `DashboardView` ~116, `MonthlyReportView` ~122, `RevenueTrendChart` ~94 | Dibaca sebagian; **verifikasi penuh** |
| K1 | P0 | Tarif non-monoton & bocor: 27 hari Rp 2.040.000 > 28 hari Rp 1.750.000; 29–44 hari semuanya Rp 1.750.000 | `calculateDynamicRentalTariff` | **(U)** |
| K2 | P0 | Paket jam tidak divalidasi terhadap rentang tanggal (3 jam untuk 3 hari = Rp 35.000) | `NewBookingModal.handleSubmit` | Dibaca |
| K3 | P1 | Tebing denda: telat 60 mnt Rp 0 → 61 mnt Rp 40.000 (2 jam) | `calculateOvertimePenalty` | **(U)** (sesuai teks BR-05) |
| K4 | P2 | 24 jam + 1 menit ditagih 2 hari; tak ada grace padahal denda punya toleransi | tarif | **(U)** Rp 170.000 |
| T1 | P0 | Booking `selesai` tanpa `actualReturnEpoch` menghitung denda terhadap `Date.now()`; `selesaiAt` format lokal tidak ter-parse | `calculateOvertimePenalty`, jalur Telegram | Dibaca |
| P1 | P0 | "12 malam" → 12:00 | `extractTime` | **(U)** |
| P2 | P0 | Tanggal tanpa jam: "5 November" → 17:00, "2 Nov 2026" → 14:00, tanpa peringatan | `parseWhatsAppBookingChat` | **(U)** |
| P3 | P1 | "Jam pengembalian 3" (tanpa titik dua) dilewati → default 09:00 | parser | **(U)** |
| P4 | P0 | "Nama kontak darurat: …" menimpa nama penyewa | parser | **(U)** `nama: "Ibu Andi"` |
| P5 | P1 | Tanggal bertitik `24.10.2026 15.40` gagal total; nilai di baris berikutnya & tanggal relatif tak didukung | parser | **(U)** |
| P6 | P1 | "sama" disalin literal; ID tak terdeteksi/"KTP" → `SIM_C` diam-diam | parser | **(U)** |
| N1 | P0 | Nomor kosong → `6281234567890` (nomor palsu) pada tautan WA | `normalizeWhatsAppNumber` | **(U)** |
| N2 | P0 | Tiga normalizer berbeda; `+62 0812…` → `62081234567890`; nomor manual disimpan mentah; Telegram mencetak `+0812…` | `whatsappService`, parser, Telegram | **(U)** |
| N3 | P2 | Default helm tidak seragam (`?? 1` vs `|| 2`) | WA / Sheets / template | Dibaca |

\* A1 adalah masalah arsitektur: tidak bisa "diperbaiki" dengan patch, hanya dikelola (S10).

---

## 3. Solusi Tuntas per Temuan

Format tiap solusi: **Rancangan → File terdampak → Risiko efek samping & mitigasi → Migrasi data lama → Kriteria lolos.**

### S1 — Batal lunak (F1, F2, F8) + pelepasan tracking aman

**Rancangan.** Tambah status terminal `ryokou_batal` (alasan: kompiler memaksa semua konsumen ditangani; flag `cancelledAt` saja akan tetap terhitung di setiap filter status yang ada). Transisi: `ryokou_booking → ryokou_batal`, `ryokou_approved → ryokou_batal`. Booking `disewa` / `diservis` / `selesai` **tidak** bisa dibatalkan (untuk `diservis`, pulihkan dulu lewat alur servis). Simpan `cancelledAt`, `cancelReason`, `cancelledBy`. Hapus permanen hanya tersisa untuk record `ryokou_batal` oleh administrator (opsional), tidak lagi untuk status lain. Pelepasan tracking: hanya jika `t.unitId === b.unitId && t.bookingId === b.id`.

**File terdampak (hasil grep konsumen status):**
`types/ryoko.ts` (union + field) · `bookingEngine.ts` (`NEXT_STATUS_TRANSITIONS`) · `App.tsx` (`handleCancelBooking`) · `BookingsView.tsx` (`statusMeta`, tab filter, hitungan, tombol aksi per status) · `DashboardView.tsx`, `MonthlyReportView.tsx`, `RevenueTrendChart.tsx` (kecualikan `batal` dari omzet) · `googleSheetsService.ts` (`formatBookingToSheetsRow`: cabang `else` default akan salah memberi `PENDING_REVIEW`; tambah `REJECTED` + aksi "Dibatalkan") · `telegramBotService.ts`, `DigitalReceiptModal.tsx`, `BookingDetailModal.tsx` (tampilan status) · `seedData.ts` (tak perlu).

**Efek samping & mitigasi.**
- Nomor booking tidak lagi dipakai ulang setelah pembatalan (sekarang `max+1` memakai ulang nomor booking yang dihapus): sekaligus memperbaiki masalah kecil duplikasi nomor.
- `isUnitAvailableForRange` hanya mengunci `approved/disewa/diservis`, sehingga `batal` otomatis membebaskan unit. Tidak perlu kode tambahan.
- Hitungan tab "Booking Baru/Approve/…" tidak boleh menyertakan `batal`; tambah tab "Batal" terpisah.

**Migrasi.** Tidak ada: data lama tidak memiliki status `batal`. Impor backup lama tetap valid.

**Lolos jika:** (a) membatalkan booking B (unit X) saat booking A (unit X) `disewa` tidak mengubah tracking X; (b) `selesai`/`diservis` tidak bisa dibatalkan; (c) omzet bulan berjalan tidak berubah akibat pembatalan booking yang belum selesai; (d) baris Sheets booking batal berstatus `REJECTED`; (e) `tsc --noEmit` bersih.

### S2 — Satu sumber kebenaran untuk status unit (F4, F9)

**Rancangan.** Tracking `disewa` **hanya** diset saat handover (`ryokou_disewa`). Booking yang baru dibuat dengan "kunci unit" cukup berstatus `approved` dengan `unitId`; `handleCreateBooking` tidak lagi mengubah tracking. Tampilan armada menurunkan chip "Terkunci untuk booking X (tanggal)" dari data booking (fungsi turunan `getLockInfo(unitId, db)`), bukan dari tracking. `UpdateTrackingModal`: tolak mengubah ke `parkir/servis/kurir` bila ada booking `disewa` pada unit itu (pesan: selesaikan atau alihkan lewat booking); wajibkan nama kurir bila posisi `kurir`; wajibkan nama bengkel bila `servis`.

**Efek samping & mitigasi.** Layar yang saat ini menampilkan "disewa" dari tracking untuk booking `approved` (FleetView, TrackingView, CourierDashboardView) akan menampilkan `parkir` + chip kunci. Itu perilaku yang benar tetapi terlihat berbeda: pastikan ketiga layar dicek visual. Kurir yang mengantar unit memakai status `kurir` (bukan `disewa`), tidak berubah.

**Migrasi (`reconcileTracking`, idempoten, mode dry-run lebih dulu).** Untuk tiap tracking `disewa`: jika tidak ada booking berstatus `disewa` dengan `id === t.bookingId` → ubah ke `parkir`, kosongkan `bookingId/noBooking/namaPenyewa/tenggatKembali`, catat satu baris audit. Jangan menyentuh `servis`/`kurir`. Tampilkan hasil dry-run di tab Recovery dan jalankan hanya setelah operator menyetujui.

**Lolos jika:** unit dengan booking `approved` mendatang tampil `parkir` + chip kunci; handover mengubahnya menjadi `disewa`; `reconcileTracking` dijalankan dua kali menghasilkan hasil yang sama.

### S3 — Guard handover (F3)

**Rancangan.** Di `checkTransition` untuk `ryokou_disewa` dan juga untuk `ryokou_diservis → ryokou_disewa`:

```ts
const unit  = db.units.find(u => u.id === unitId);
const track = db.tracking.find(t => t.unitId === unitId);
if (!unit) return 'Unit fisik tidak ditemukan.';
if (unit.statusServis === 'servis' || track?.statusPosisi === 'servis')
  return 'Unit sedang servis; ubah posisi unit lebih dulu sebelum serah terima.';
// Status 'kurir' SENGAJA tidak diblok: kurir memang membawa unit ke penyewa.
```

**Efek samping & mitigasi.** Pengecualian `kurir` penting: memblokirnya akan melumpuhkan alur antar. Pengecualian untuk transisi `diservis → disewa`: pada jalur ini tracking memang `servis`, jadi untuk jalur itu hanya cek `unit.statusServis`, lalu tracking diubah ke `disewa` oleh `handleReturnFromService`. Tulis tes untuk kedua jalur.

**Lolos jika:** unit `servis` ditolak saat handover dari `approved`, tetapi `diservis → disewa` tetap bekerja.

### S4 — Mesin ketersediaan: `servis`/`kurir` terikat waktu (turunan F3/F8)

Saat ini tracking `servis`/`kurir` memblokir **semua** tanggal, termasuk booking berminggu-minggu ke depan. **Rancangan:** blok hanya jika rentang yang diminta mulai sebelum `estimasiSelesai` (servis) atau sebelum `now + 24 jam` (kurir, dapat diatur). Bila `estimasiSelesai` kosong, pertahankan perilaku lama (blok) agar tidak memunculkan double-booking baru; tampilkan peringatan "isi estimasi selesai servis".

**Lolos jika:** unit servis dengan estimasi selesai 27 Okt bisa dipesan untuk 5 Nov, tetapi tidak untuk 26 Okt; unit servis tanpa estimasi tetap terblok.

### S5 — Kegagalan simpan tanpa kehilangan aksi (F5)

**Rancangan.** Pertahankan `setDb` (aksi operator tidak hilang). Tambah state `persistFailed` dan **banner permanen** "Data belum tersimpan permanen" dengan tombol "Unduh backup sekarang" (ekspor dari state memori, bukan dari `localStorage`) dan "Coba simpan lagi". Selama `persistFailed`, tampilkan penghitung jumlah perubahan belum tersimpan. Setelah simpan berhasil, banner hilang. Opsi pemangkasan: potong `auditLogs` dan `dailyOperationalLogs` lama setelah mengunduh backup.

**Efek samping.** Backup dari memori bisa berisi PII penuh: unduhan memakai opsi `includeSecrets=false` secara default.

**Lolos jika:** dengan `localStorage.setItem` dipaksa melempar `QuotaExceededError`, aksi tetap tampil, banner muncul, backup berisi aksi tersebut.

### S6 — Muat & impor yang aman (F6, F7, F10)

- **Muat.** Pada `JSON.parse` gagal: salin string mentah ke `ryokourent_db_v1__corrupt_<timestamp>` (abaikan jika kuota penuh), **jangan** memanggil `saveDatabase`, tampilkan layar pemulihan (impor backup / coba perbaiki / mulai kosong). Pemuatan pertama (tidak ada data) tetap membuat DB, tetapi tawarkan "Mulai kosong" vs "Muat data contoh" (F10).
- **Impor.** Validator skema: semua koleksi wajib `Array.isArray`, setiap `booking.unitId` mengacu unit yang ada atau `null`, `motorId` valid, status ∈ union, `schemaVersion` dikenal. Sebelum menimpa, salin DB saat ini ke `ryokourent_db_v1__prev` (satu generasi). Saat merge pengaturan: bila `telegramBotToken`/`googleSheetsWebhookUrl` pada file kosong, **pertahankan nilai yang ada**.
- **Efek samping.** Satu salinan `__prev` menambah pemakaian kuota ±2×; tampilkan di panel penyimpanan dan hapus otomatis setelah 7 hari/impor berikutnya.

**Lolos jika:** string rusak di `localStorage` tidak lagi tertimpa seed, dan impor file dengan `tracking` bukan array ditolak dengan pesan jelas tanpa mengubah data.

### S7 — Laporan omzet (R1) — *butuh keputusan pemilik*

**Rancangan.** Definisikan dua angka: **Omzet terealisasi** = `totalHargaEstimasi + dendaNominal` hanya untuk `ryokou_selesai`; **Pipeline** = `approved + disewa + diservis` ditampilkan terpisah. `batal` tidak masuk keduanya. Satukan fungsi: `computeRevenue(bookings, range)` di satu modul, dipakai Dashboard, Laporan Bulanan, dan Tren Omzet, agar angka ketiganya tidak bisa berbeda. Perbaiki pengelompokan tanggal: gunakan `startEpoch` (bukan `startsWith` pada string tanggal berformat campur).

**Efek samping.** Angka omzet bulan berjalan akan **turun** dibanding tampilan sekarang (karena booking belum selesai tidak lagi terhitung). Sampaikan ini kepada pemilik sebelum rilis dan tampilkan baris pipeline supaya tidak terasa ada uang yang hilang.

**Lolos jika:** tiga layar menampilkan angka yang sama untuk periode yang sama; booking `batal` tidak mengubah angka apa pun.

### S8 — Tarif (K1, K2, K4) — *K4 butuh keputusan pemilik*

**Rancangan K1.** Hitung per hari, lalu tutup dengan paket yang lebih besar bila lebih murah (monoton non-menurun):

```ts
const dayCount = Math.max(1, Math.ceil(totalHours / 24));
const months   = Math.floor(dayCount / 30);
const rest     = dayCount % 30;
const restCost = Math.min(
  Math.floor(rest / 7) * motor.harga1Minggu +
    Math.min((rest % 7) * motor.harga1Hari, motor.harga1Minggu),
  motor.harga1Bulan
);
const total = months * motor.harga1Bulan + restCost;
```
Hasil uji mental (Vario seed): 6 hr Rp 510.000 · 8 hr Rp 595.000 · 27 hr Rp 1.750.000 · 28–30 hr Rp 1.750.000 · 44 hr Rp 2.770.000 · 45 hr Rp 2.855.000 (Rp 1.750.000 + 15 hr = 2 mgg + 1 hr). **Verifikasi angka ini dengan tes sebelum merge.** Label durasi: "Sewa N Hari" dengan rincian bulan/minggu/hari di `labelDurasi`.

**Rancangan K2.** Untuk `kategoriTarif === 'jam'`, validasi `(end − start) ≤ jamPaket × 3600 + 60 menit`; bila lebih, tolak submit dengan saran memilih paket harian, atau otomatis ganti kategori (pilih satu, jangan keduanya). Sinkronkan `handleDurationChange` yang sudah mengatur ulang tanggal selesai.

**K4.** Opsi: tambah grace 60 menit pada tarif harian (24 jam 59 menit tetap 1 hari). Ini mengubah pendapatan; jadikan pengaturan `graceTarifMenit` (default 0 = perilaku sekarang).

**Efek samping.** Booking lama tidak berubah (harga sudah tersimpan). Hati-hati dengan fungsi yang menghitung ulang harga saat edit booking (jika ada): jangan menimpa `totalHargaEstimasi` booking lama tanpa konfirmasi.

**Lolos jika:** tes properti "harga tidak turun ketika durasi naik" lulus untuk 1–120 hari pada semua tarif seed.

### S9 — Denda (K3, T1) — *K3 butuh keputusan pemilik*

**T1.** Wajibkan `actualReturnEpoch` pada setiap transisi menuju `selesai` (termasuk jalur Telegram, `handleReturnFromService`, dan impor). Di `calculateOvertimePenalty`, untuk booking berstatus `selesai` tanpa `actualReturnEpoch`, **jangan** jatuh ke `Date.now()`: pakai `booking.dendaNominal` yang tersimpan. Migrasi: untuk booking `selesai` lama tanpa epoch, isi `actualReturnEpoch` dari `selesaiAt` bila ter-parse, selain itu biarkan kosong dan tandai "denda tersimpan".

**K3.** Pilih satu kebijakan dan tuliskan di BLUEPRINT BR-05:
- (A) pertahankan (sesuai teks sekarang): telat >60 mnt → `ceil(telat/60)` jam;
- (B) tebing dihaluskan: `ceil((telat − 60)/60)` jam setelah toleransi (61 mnt = 1 jam).
Implementasikan sebagai satu fungsi `lateBillableHours(lateMinutes, policy)` sehingga ShortRent 12 jam dan harian memakai logika sama.

**Efek samping.** Denda yang sudah dikirim ke penyewa lewat WA tidak boleh berubah diam-diam; terapkan kebijakan baru hanya pada transaksi yang berakhir setelah tanggal rilis.

### S10 — Parser chat WA (P1–P6)

Perbaikan dikerjakan sebagai urutan kecil, masing-masing dengan tes:

1. **P4 (nama).** Periksa label "darurat/emergency" **sebelum** label nama. Normalisasi label: `const key = label.replace(/^\d+\s*[.)-]\s*/, '')`. Nama harus cocok persis (`/^nama( lengkap| penyewa)?$/`) dan `nama ||= value` (first-wins).
2. **P1 ("12 malam").** `if (suffix === 'malam' && h === 12) h = 0;`
3. **P2 (angka tanggal jadi jam).** Panggil `extractTime` hanya pada `rest` (teks setelah tanggal dipotong) dan terima angka tunggal hanya bila didahului `jam|pukul`. Aturan lama "angka 1–6 = sore" tetap berlaku **hanya** untuk bentuk `jam N`.
4. **P3 ("Jam pengembalian 3").** Tambah pola fallback tanpa titik dua: `/^[^\p{L}]*jam\s+(ambil|pengembalian|kembali)\s*:?\s*(.+)$/iu`.
5. **P5.** `extractDate` menerima pemisah `.` selain `/` dan `-`; dan baca nilai pada baris berikutnya bila nilai kosong dan baris berikut tidak mengandung label.
6. **P6.** Nilai "sama/sama dengan di atas" → salin `lokasiDelivery`. ID tak terdeteksi → biarkan `null` dan beri peringatan (jangan default `SIM_C`); form booking mewajibkan operator memilih. Kata "KTP" tetap ditolak sebagai ID pendukung (peringatan sudah ada) tetapi tanpa dipetakan ke `SIM_C`.

**Efek samping & mitigasi.** Perubahan P6 membuat `idPendukung` bisa kosong → `SupportIdType | null` menjalar ke `NewBookingModal`, `BookingDetailModal`, template WA, Sheets. Tangani lewat pemeriksaan tipe (kompiler akan menunjukkan semua tempat). Selain itu, tampilkan semua `warnings` parser dalam panel merah **sebelum** tombol simpan aktif, dan jangan menerapkan default jam 09:00 secara diam-diam: tandai field jadwal sebagai "perlu dikonfirmasi".

### S11 — Nomor telepon satu pintu (N1, N2)

**Rancangan.** Satu fungsi di `utils/phone.ts`, dipakai oleh parser, form, WA service, Telegram, Sheets:

```ts
export function toWaNumber(raw: string): string | null {
  let d = (raw || '').replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^620/, '62');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^628\d{8,12}$/.test(d) ? d : null;
}
```
- Hasil `null` → tombol WA dinonaktifkan dengan pesan "nomor tidak valid"; **tidak ada nomor cadangan**. Hapus fallback `6281234567890` di `whatsappService.ts` dan `DigitalReceiptModal.tsx` (ada fallback serupa untuk nomor admin).
- Form booking: normalisasi saat blur dan saat submit; simpan angka ternormalisasi, simpan input asli di catatan bila berbeda.
- Telepon rumah (`0341…`) menghasilkan `null`; mereka tetap boleh disimpan di field telepon, hanya tidak bisa dipakai untuk WA. Mintalah operator memasukkan nomor WA terpisah.

**Migrasi.** Satu kali, pada booking lama: jalankan `toWaNumber`; bila valid, tulis ulang `nomorWa`; bila tidak, biarkan dan beri tanda `nomorWaTidakValid`. Jangan menghapus data.

**Lolos jika:** tabel uji (`""`, `+62 0812…`, `0812 3456 7890`, `812345678`, `(0341) 123456`) menghasilkan `null/6281…` sesuai harapan di semua pemanggil.

### S12 — Kebijakan NIK (A5, A6) — *butuh keputusan pemilik*

**Keputusan yang diperlukan:** BLUEPRINT BR-06 ("tidak meminta NIK, filter nonaktif") versus teks UI Pengaturan ("disensor otomatis, UU PDP"). Rekomendasi: **masking tidak-memblokir** di batas simpan, sehingga pengguna tidak pernah ditolak.

**Perbaikan A6 lebih dulu** (jika tidak, masking akan merusak data nomor telepon): ganti regex dengan pola ketat yang hanya mencocokkan 16 digit berurutan atau pengelompokan 4-4-4-4 / 6-6-4, plus pemeriksaan struktur NIK (provinsi 11–96, tanggal lahir 01–31 atau +40 untuk perempuan, bulan 01–12):

```ts
const NIK = /(?<!\d)(?:\d{16}|\d{6}[ .-]\d{6}[ .-]\d{4}|\d{4}[ .-]\d{4}[ .-]\d{4}[ .-]\d{4})(?!\d)/g;
const plausible = (d: string) => {
  const prov = +d.slice(0, 2), day = +d.slice(6, 8) % 40, mon = +d.slice(8, 10);
  return prov >= 11 && prov <= 96 && day >= 1 && day <= 31 && mon >= 1 && mon <= 12;
};
export const redactNik = (s: string) =>
  s.replace(NIK, m => { const d = m.replace(/\D/g, ''); return plausible(d) ? '************' + d.slice(-4) : m; });
```
Hasil uji (U): `darurat 081234567890 0819` **tidak** berubah; `NIK 3573011205980001` → `NIK ************0001`; `3573 0112 0598 0001` → `************0001`; `6281234567890123` dan `1234567890123456` tidak berubah (tidak lolos struktur).

**Penerapan.** `sanitizeFreeText` pada `alamatKtp`, `alamatSaatIni`, `idSosmed`, `catatanKhusus`, `alamatPengantaran/Penjemputan`, `noTelpDarurat`, dan nilai hasil parser, **di satu titik** (pembuatan/edit booking dan impor). Tampilkan toast "NIK disamarkan"; jangan menolak. Perbarui teks BLUEPRINT BR-06 dan teks Pengaturan agar sama.

**Efek samping.** NIK asli tidak bisa dipulihkan setelah disamarkan: itu tujuannya, tetapi beri tahu operator. Pada data lama, jalankan masking hanya lewat tombol manual "Samarkan NIK pada data lama" dengan pratinjau jumlah yang berubah.

### S13 — Telegram (A3, A4)

**Sekarang (aman dan murah):** hapus dua tombol `callback_data` (`ryoko_rev`, `ryoko_act_finish`) dari keyboard dan tandai `executeTelegramActionCallback` sebagai tidak dipakai (komentar + hapus dari ekspor publik) agar tak terhubung tanpa guard. Tombol URL (WA dan Maps) tetap. Ganti normalisasi nomor di tombol WA dengan `toWaNumber` (S11) dan jangan mencetak `+` di depan nomor mentah.

**Nanti (bila callback ingin dihidupkan):** perlu server kecil (webhook). Handler callback **harus** memanggil fungsi domain yang sama dengan UI (`finishBooking()` yang memanggil `checkTransition` dan mengisi `actualReturnEpoch`), idempoten (`callback_query.id` dicatat), dan hanya menerima `chat_id` admin.

**Token.** Pindahkan pengiriman ke proxy (Apps Script atau Cloudflare Worker) yang menyimpan token; klien hanya memegang URL proxy dan rahasia bersama. Sementara belum, gunakan bot khusus yang hanya mengirim ke satu chat dan siap dicabut di BotFather bila HP hilang.

### S14 — PIN & peran (A2)

**Rancangan.** PIN per pengguna (hash PBKDF2 via WebCrypto, `salt` per pengguna disimpan di DB) untuk: ganti ke peran `administrator`/`admin_custom`, membuka Pengaturan/Recovery/ekspor backup. Ganti peran ke `kurir` tidak perlu PIN.

**Batas yang harus diakui:** ini hanya menghalangi penggunaan iseng. Siapa pun yang bisa membuka DevTools atau berkas storage perangkat tetap bisa mengubah data. Otorisasi sungguhan baru ada setelah backend (S15).

**Efek samping.** Lupa PIN = terkunci. Sediakan jalur pemulihan: impor backup (S6) atau "reset PIN" dengan frasa pemilik yang dibuat saat setup. Hash masuk ke backup, tetapi PIN tidak.

### S15 — Arsitektur multi-perangkat (A1)

Ini proyek tersendiri (TASK baru), jangan digabung dengan perbaikan di atas.

**Sementara (murah, kerjakan sekarang):**
1. Pengaturan "Perangkat utama": hanya satu perangkat boleh membuat/menyetujui booking; perangkat lain (kurir) hanya melihat tugas dari Sheets/WA.
2. Banner kuning di perangkat non-utama pada layar booking.
3. Sinkron CSV/Sheets tetap satu arah.

**Tuntas:** backend dengan database transaksional. Pencegahan double-booking dipindah ke database, misalnya PostgreSQL:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT no_unit_overlap
  EXCLUDE USING gist (
    unit_id WITH =,
    tstzrange(start_at - interval '60 minutes', end_at + interval '60 minutes') WITH &&
  ) WHERE (status IN ('ryokou_approved','ryokou_disewa','ryokou_diservis'));
```
Klien lokal tetap sebagai cache offline dengan antrean perubahan (outbox) dan kolom `version` untuk deteksi konflik; konflik ditampilkan ke operator, tidak ditimpa diam-diam. Migrasi: impor sekali dari perangkat utama lalu nonaktifkan penulisan lokal di perangkat lain. Pertahankan ekspor JSON sebagai jalur keluar.

**Efek samping.** Aplikasi tidak lagi sepenuhnya offline-mandiri (BR-06 menyebut "offline mandiri"); perlu keputusan pemilik tentang biaya, kebutuhan internet di lokasi pool, dan siapa yang mengelola server.

### S16 — Konsistensi kecil (N3, UI)

- Satu konstanta `DEFAULT_HELM = 2` untuk WA, Sheets, kwitansi, dan template resmi.
- Teks `text-[9–11px]` pada konten utama → minimal 12px (±350 kemunculan; kerjakan bertahap per layar, mulai dari Booking & Kurir).
- Mode "simulasi HP" (`max-w-md`) jangan aktif otomatis di ≥1024px pada perangkat sentuh.
- Konfirmasi dua langkah pada "Selesai" dan "Batal".

---

## 4. Urutan Pengerjaan (dengan ketergantungan)

| Tahap | Isi | Alasan urutan |
|---|---|---|
| 0 | Tes karakterisasi untuk `bookingEngine`, parser, normalizer (Bagian 6) + CI `tsc --noEmit` | Jaring pengaman untuk semua tahap |
| 1 | S11 (telepon), S12-A6 (regex NIK), S10 (parser) | Fungsi murni, risiko rendah, memperbaiki nilai salah diam-diam |
| 2 | S5, S6 (kegagalan simpan, muat/impor aman) | Melindungi data sebelum migrasi apa pun |
| 3 | S1, S2, S3, S4 | Satu paket state machine; jalankan `reconcileTracking` dry-run dulu |
| 4 | S8, S9, S7 | Setelah pemilik memutuskan K3, K4, R1 |
| 5 | S12 (penerapan masking), S13, S14 | Privasi dan keamanan |
| 6 | S15 | Proyek terpisah |

Gerbang setiap tahap: semua tes hijau, `tsc --noEmit` bersih, uji manual alur (booking → approve → handover → selesai, dan batal), backup/restore diuji di salinan data asli.

---

## 5. Keputusan yang Dibutuhkan dari Pemilik

1. **Denda (K3):** tebing 60→61 menit (Rp 0 → 2 jam) dipertahankan atau dihaluskan?
2. **Grace tarif (K4):** 24 jam 1 menit tetap ditagih 2 hari, atau ada grace?
3. **Definisi omzet (R1):** setujui "terealisasi (selesai)" + "pipeline" terpisah.
4. **Status batal (S1):** setujui penambahan `ryokou_batal` (mengubah spesifikasi 5 status menjadi 5 + 1 terminal).
5. **Kebijakan NIK (S12):** masking tidak-memblokir, dan selaraskan BR-06.
6. **Multi-perangkat (S15):** mau tetap satu perangkat utama, atau membangun backend?
7. **Tarif bulanan:** setelah 30 hari, sisa dihitung dengan tarif mingguan/harian (rancangan S8); konfirmasi sesuai praktik Ryoko Rent.

---

## 6. Kasus Uji Penerimaan (Dikunci Sebagai Tes Otomatis)

**Denda** (Vario seed: 3j Rp 35.000 · 6j Rp 45.000 · 9j Rp 55.000 · 12j Rp 65.000 · denda Rp 20.000/jam)

| Paket | Telat (mnt) | Hasil sekarang (U) |
|---|---|---|
| 3j | 59 / 60 / 421 | 0 / 10.000 / 30.000 |
| 6j | 60 / 420 / 430 | 10.000 / 40.000 / 60.000 |
| 12j | 59 / 60 / 61 | 0 / 20.000 / 40.000 |
| harian | 60 / 61 / 121 | 0 / 40.000 / 60.000 |

**Tarif (Vario, harian Rp 85.000):** 1 hr 85.000 · 6 hr 510.000 · 7 hr 510.000 · 8 hr 595.000 · **27 hr 2.040.000 (salah)** · 28 hr 1.750.000 · **44 hr 1.750.000 (salah)** · 45 hr 3.500.000 (setelah S8 menjadi 2.855.000, lihat catatan verifikasi).

**Parser** — harus lulus setelah S10:
- `Nama kontak darurat: Ibu Andi` di bawah `Nama lengkap: Andi` → nama tetap "Andi".
- `Jadwal mulai : 5 November` → jam kosong + peringatan (bukan 17:00).
- `jam 12 malam` → `00:00`.
- `Jam pengembalian 3` (tanpa titik dua) → `15:00`.
- `24.10.2026 15.40` → `2026-10-24T15:40`.
- `Lokasi penjemputan: sama` → sama dengan lokasi pengantaran.

**Nomor:** `""`→`null` · `+62 0812-3456-7890`→`6281234567890` · `0812 3456 7890`→`6281234567890` · `812345678`→`62812345678` · `(0341) 123456`→`null`.

**State machine:** (1) batal B tidak mengubah tracking unit milik A yang `disewa`; (2) handover unit `servis` ditolak, `diservis→disewa` tetap bisa; (3) `reconcileTracking` dua kali = hasil sama; (4) simpan gagal → banner + backup memuat aksi; (5) JSON korup tidak tertimpa seed; (6) omzet identik di Dashboard, Bulanan, Tren.

---

## 7. Matriks Kepatuhan Aturan Bisnis

| Aturan | Status | Rujukan |
|---|---|---|
| BR-01 Tarif multi-tier + 1 Bulan | Sebagian | K1, K2 → S8 |
| BR-02 State machine 5 status | Sebagian | F1–F4 → S1–S3 |
| BR-03 Posisi unit | Sebagian | F4, F9 → S2, S4 |
| BR-04 Buffer 60 menit | Sesuai (satu perangkat) | A1 → S15 |
| BR-05 Denda | Sesuai teks | K3, T1 → S9 |
| BR-06 NIK | Tidak konsisten dokumen vs UI | A5, A6 → S12 |
| BR-07 Tarif massal | Tidak ditinjau | — |
| BR-08 7 kategori servis | Sesuai | — |
| 13 field (ada/tidak) | Lengkap di form, WA, kwitansi, Sheets | ketepatan nilai: P1–P6, N1–N3 |

---

## 8. Catatan Keterbatasan

- Angka hasil rancangan S8 (mis. 45 hari = Rp 2.855.000) adalah hitungan mental; jalankan tes sebelum dipakai.
- Tidak ada pengujian `tsc`/build/UI visual pada Android 360–412px.
- R1 perlu dibaca penuh pada ketiga komponen sebelum S7 dikerjakan, karena filter status bisa ada di bagian yang tidak saya baca.
- Skor 66/100 adalah penilaian subjektif berdasarkan cakupan di atas.
