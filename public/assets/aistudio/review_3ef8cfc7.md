# Review Kode & Arsitektur RyokoRent APK

Oct 25, 2026 · @kepek

RyokoRent bernilai 58/100: model domain dan mesin bentrok jadwal sudah rapi, tetapi sejumlah bug di jalur input booking, transisi status, dan penyimpanan dapat merusak jadwal, tarif, atau data pada pemakaian harian. Temuan di bawah diverifikasi dengan membaca kode dan menjalankan fungsi intinya.

## 1. Ringkasan Eksekutif

Skor keseluruhan 58/100. Fondasinya baik (tipe data, fungsi murni di `bookingEngine.ts`, rumus denda sesuai BR-05), tetapi lapisan di sekitarnya belum menjaga invarian bisnis: UI, parser, dan handler `App.tsx` melewati mesin bentrok jadwal, dan penyimpanan tidak melaporkan kegagalan.

| Dimensi | Skor | Alasan singkat |
| --- | --- | --- |
| Model domain dan struktur kode | 78 | Tipe jelas, snapshot nama motor dan kode unit, logika terpisah dari UI |
| Logika bisnis (bentrok, denda) | 65 | Rumus benar, tetapi penerapannya bocor dan ada kasus NaN |
| Integritas data dan state machine | 47 | Tanpa tabel transisi, `diservis` tidak bisa dicapai, hapus permanen |
| Keamanan dan privasi | 50 | Klaim sensor NIK di UI tidak benar, token ikut backup, peran hanya kosmetik |
| Parser chat WhatsApp dan form input | 45 | Jam `15:40` hilang, tanggal bawaan hard-coded, tarif tidak ikut tanggal |
| PWA dan mobile | 63 | Lebar 360 sampai 412 px aman, tetapi nav bawah tidak menempel dan zoom dikunci |
| Integrasi WA, Sheets, Telegram | 55 | URL WA benar, Sheets dan tombol Telegram belum berfungsi end-to-end |

Lima temuan yang paling mendesak:

1. Jadwal default dan jadwal selesai otomatis bergeser 7 jam di perangkat WIB karena `toISOString()` memakai UTC.
2. Parser membuang jam berformat `15:40` dan diam-diam mengisi tanggal bawaan 24 sampai 25 Oktober.
3. Unit yang tampak terpilih di form booking tidak ikut terkunci; sebaliknya unit yang sudah tidak bebas bisa terkunci setelah tanggal diubah.
4. Serah terima dan selesai tidak memeriksa status maupun ketersediaan, sehingga unit yang masih dibawa penyewa sebelumnya bisa ditimpa.
5. Gagal simpan ke LocalStorage tidak dilaporkan, dan UI Pengaturan menyatakan sensor 16 digit NIK aktif padahal tidak ada.

## 2. Kelebihan Arsitektur (Patut Dipertahankan)

- **Model data tegas.** `types/ryoko.ts` memisahkan `MotorModel`, `PhysicalUnit`, `UnitTracking`, dan `BookingRecord`. Booking menyimpan `snapshotNamaMotor` dan `snapshotKodeUnit`, jadi riwayat tidak berubah ketika master model diedit.
- **Mesin bisnis berupa fungsi murni.** `bookingEngine.ts` tidak menyentuh React atau LocalStorage, sehingga mudah diuji. Saya menjalankannya langsung di Node tanpa mengubah logikanya.
- **Rumus bentrok jadwal benar.** `reqStart < bufferedEnd && reqEnd > bufferedStart` memberi jeda 60 menit di kedua sisi, dan booking `ryokou_disewa` diperpanjang sampai `max(selesai, sekarang)` sehingga unit yang telat tidak dianggap kosong.
- **Denda sesuai BR-05.** Sembilan kasus uji (3j, 6j, 9j, 12j, harian, di sekitar batas 59, 60, dan 61 menit) menghasilkan nominal dan tier yang sesuai aturan.
- **Parser cukup toleran.** Bullet emoji, template bernomor, bulan bahasa Indonesia, jam bertitik (`15.40`), dan kata kunci alternatif seperti `Type unit` dan `Jam Ambil` terbaca.
- **URL WhatsApp konsisten di-encode.** Semua tautan `api.whatsapp.com/send` memakai `encodeURIComponent` untuk nomor dan teks.
- **Kerangka PWA dan UI.** Service worker meng-cache aset, kontainer `max-w-md` pas untuk lebar 360 sampai 412 px, modal punya footer terpisah, dan navigasi menyesuaikan peran.
- **Kebijakan NIK sederhana.** Tidak ada field NIK di model, sehingga tidak ada NIK yang tersimpan secara terstruktur.
- **Jejak operasional.** Audit log, meter pemakaian storage, ekspor dan impor JSON, serta dokumen ZLCE memudahkan serah terima kerja.

## 3. Temuan Kritis dan Potensi Bug

Sebanyak 23 temuan, diurutkan dari yang paling merusak. Kolom terakhir: **Diuji** berarti saya menjalankan fungsinya dan melihat hasilnya; **Kode** berarti disimpulkan dari membaca kode, belum dijalankan di perangkat.

| ID | Tingkat | Temuan dan dampak | Bukti | Verifikasi |
| --- | --- | --- | --- | --- |
| F-01 | Kritis | Jadwal default dan jam selesai otomatis bergeser 7 jam di perangkat WIB: `toISOString().slice(0,16)` memakai UTC. Pada zona Asia/Jakarta, default 09:00 tampil 02:00, dan durasi 3 jam dari 09:00 menghasilkan jam selesai 05:00 (sebelum mulai), sehingga daftar unit kosong. | NewBookingModal.tsx:62-65, 193-194 | Diuji |
| F-02 | Kritis | Parser membuang jam berformat titik dua. Pemecahan dengan alternatif `:\s*` memotong `15:40` hingga tersisa `40`, lalu tanggal jatuh ke nilai bawaan hard-coded: 24 dan 25 Oktober, jam 15:40 dan 15:00, motor `scoopy`, lokasi `Apartemen Begawan Malang`. Input 28 Oktober 2026 15:40 menjadi 24 Oktober 15:40 tanpa peringatan. | whatsappChatParser.ts:228, 246, 293-297, 322-324 | Diuji |
| F-03 | Kritis | Tarif tidak mengikuti rentang tanggal: harga hanya dari `pilihanDurasi`. Parser mengisi tanggal tetapi bukan durasi, sehingga sewa 4 hari tetap ditagih 1 hari. Paket wisata: semua opsi bernilai `paket_promo` dan harga dipatok 260000, sedangkan label menampilkan `hargaPaket`. | NewBookingModal.tsx:141-168, 758-761 | Kode |
| F-04 | Kritis | Pemilihan unit tidak konsisten. Select menampilkan unit pertama, tetapi `selectedUnitId` tetap 0 sehingga booking tersimpan tanpa unit walau tampak terkunci. Sebaliknya, `selectedUnitId` lama tidak dicek ulang setelah tanggal berubah dan handler tidak memanggil `isUnitAvailableForRange`, jadi unit yang bentrok bisa terkunci (celah double-booking). | NewBookingModal.tsx:215, 827; App.tsx:196-229 | Kode |
| F-05 | Kritis | Transisi status tanpa guard. Serah terima tidak memeriksa status `approved` maupun ketersediaan, dan menimpa `tracking` unit walau penyewa sebelumnya belum mengembalikan. Selesai bisa dijalankan pada status apa pun, termasuk dua kali. Approve dan tukar unit hanya mengandalkan filter di modal. | App.tsx:232, 274, 330, 414 | Kode |
| F-06 | Tinggi | Parser lain: tanggal ISO `2026-10-24` terbaca `2024-10-26`; `31/02` dan bulan 13 lolos; `3.30 sore` menjadi 03:30; `KTP` jatuh diam-diam ke SIM C; jumlah helm 5 diterima; tidak ada daftar peringatan untuk field yang gagal terbaca. | whatsappChatParser.ts:86-144, 191-201, 282-288 | Diuji |
| F-07 | Tinggi | Validasi form tidak berjalan. Tombol simpan bertipe `button` di luar `<form>`, sehingga `required` pada nomor WA dan tanggal tidak dipakai; hanya nama yang dicek, dan `selesai > mulai` tidak diperiksa. Nomor kosong membuat tautan WA ke nomor placeholder `6281234567890`. | NewBookingModal.tsx:199, 869-871; whatsappService.ts:13, 20 | Kode |
| F-08 | Tinggi | Status `ryokou_diservis` tidak punya jalur masuk; hanya muncul di tampilan dan di `isUnitAvailableForRange`. | BookingsView, BookingDetailModal, bookingEngine.ts:243 | Kode |
| F-09 | Tinggi | D-20 hanya melindungi `disewa`, dan pembatalan adalah hapus permanen tanpa status batal atau arsip. Pelepasan unit memaksa `tracking` ke parkir selama bukan `servis`, walau unit sedang dipakai booking lain. | App.tsx:485, 495-516 | Kode |
| F-10 | Tinggi | Nomor booking = jumlah booking hari itu + 1, sehingga duplikat setelah ada yang dihapus (diuji: setelah menghapus 001, nomor berikutnya 002 yang sudah ada). ID unit `100 + jumlah + 1` dan ID servis `jumlah + 1` berisiko sama. | bookingEngine.ts:74-76; App.tsx:578 dan handleAddPhysicalUnit | Diuji |
| F-11 | Tinggi | Catat servis mengubah unit menjadi `servis` apa pun tanggal catatannya dan apa pun status sebelumnya, menimpa `tracking` unit yang sedang `disewa`, dan mengeluarkan unit dari ketersediaan tanpa peringatan untuk booking mendatang. | App.tsx:594-616; bookingEngine.ts:228, 273 | Kode |
| F-12 | Tinggi | Persistensi: `saveDatabase` menelan error kuota sementara state React tetap berubah, jadi data hilang saat reload tanpa pemberitahuan. Tidak ada `navigator.storage.persist()` maupun listener `storage`, dan seluruh dokumen ditimpa setiap simpan (dua tab atau perangkat saling menimpa). `loadDatabase` menyuntik ulang booking seed yang sudah dihapus. | storageService.ts:40-47, 55-62; App.tsx:116-123 | Kode |
| F-13 | Tinggi | Rahasia ikut backup dan bundle: token bot Telegram dan URL webhook berada di `settings` yang diekspor sebagai JSON polos. `SESSION_STATE.md` ikut terkemas ke bundle produksi lewat `?raw`. | types/ryoko.ts:199-203; storageService.ts:69-72; App.tsx:33 | Kode |
| F-14 | Tinggi | Klaim sensor NIK di Pengaturan tidak benar. `sanitizeTextNoNik` hanya `trim()` dan `containsNikPattern` tidak dipakai di jalur input atau ekspor. Catatan bebas dan alamat tetap bisa memuat NIK, lalu diteruskan ke WA, CSV, Sheets, dan Telegram. | SettingsView.tsx:552-575; bookingEngine.ts:14-25 | Kode |
| F-15 | Tinggi | Telegram: tombol inline tidak punya penerima callback. `executeTelegramActionCallback` tidak dipanggil di mana pun dan aplikasi statis tidak bisa menerima webhook. Jika kelak dihubungkan, fungsi itu mengubah objek `db` langsung tanpa simpan, tanpa membebaskan unit, tanpa otorisasi `chat_id`, dengan denda tetap Rp 25.000. Pesan memakai `parse_mode: HTML` tanpa escape, sehingga nama berisi `<` atau `&` ditolak API. | telegramBotService.ts:44-70, 241-297 | Kode |
| F-16 | Tinggi | Google Sheets: `Content-Type: application/json` ke Apps Script memicu preflight CORS yang tidak dijawab Apps Script, jadi POST dari browser umumnya gagal. Antrean offline hanya diisi dan tidak pernah dikirim ulang, mode simulasi mengembalikan `success: true`, dan antrean dipotong ke 50 entri. CSV rentan injeksi rumus (`=`, `+`, `-`, `@` di nama atau catatan). | googleSheetsService.ts:139-144, 201-210, 235-249 | Kode |
| F-17 | Sedang | Denda: `selesaiAt` disimpan sebagai teks locale `id-ID`, sehingga `parseWibToEpoch` menghasilkan NaN dan denda tampil `RpNaN` pada booking yang diselesaikan lewat jalur Telegram atau data tanpa `actualReturnEpoch`. Parameter `actualReturnEpoch` diprioritaskan atas nilai tersimpan, jadi pemanggil yang mengirim waktu sekarang membuat denda booking selesai terus bertambah. Pada sewa harian, 60 menit gratis tetapi 61 menit langsung ditagih 2 jam (Rp 40.000): toleransi tidak dikurangkan. | bookingEngine.ts:101-105, 193-204; telegramBotService.ts:260; BookingDetailModal.tsx:76-80 | Diuji |
| F-18 | Sedang | Zona waktu implisit: `parseWibToEpoch` memakai zona perangkat dan label "WIB" ditempel tanpa `timeZone`. Jam operasional 07-23 dan buffer 60 menit ditulis langsung di kode; `jamBuka`, `jamTutup`, dan `turnaroundBufferMinutes` di Pengaturan tidak pernah dibaca. | bookingEngine.ts:9, 30-62; types/ryoko.ts:194-196 | Kode |
| F-19 | Sedang | Impor backup hanya mengecek tiga properti, tidak menjalankan migrasi, dan menimpa tanpa salinan otomatis; JSON tanpa `settings` membuat aplikasi error di `db.settings.operatorName`. | storageService.ts:74-87, 113 | Kode |
| F-20 | Sedang | Peran tidak mengamankan apa pun: `handleSwitchUser` mengganti pengguna aktif tanpa PIN dan semua data berada di LocalStorage perangkat. Wajar untuk satu perangkat, tetapi bukan kontrol akses. | App.tsx:778-793 | Kode |
| F-21 | Sedang | WhatsApp: dua fungsi normalisasi nomor berbeda (`normalizePhoneNumber` dan `normalizeWhatsAppNumber`); format `+62 0812...` menghasilkan `620812...`. Template serah terima dan surat tugas kurir menulis "2 Helm SNI" tetap walau pelanggan memesan 1. | whatsappChatParser.ts:74-84; whatsappService.ts:12-21, 131, 230 | Kode |
| F-22 | Sedang | PWA dan mobile: `user-scalable=no` mengunci zoom; `viewport-fit=cover` tanpa `env(safe-area-inset-*)`; tinggi memakai `min-h-screen` dan `max-h-[94vh]` bukan `dvh`; bottom nav bukan `fixed`, jadi ikut tergulung ke dasar halaman dan bukan di jangkauan jempol; 167 teks berukuran 9 atau 10 px dan banyak tombol `py-0.5` atau `py-1.5` di bawah target sentuh 44 sampai 48 px. | index.html:5; App.tsx:877-880; AndroidBottomNav.tsx:154 | Kode |
| F-23 | Rendah | Higiene repo: `package.json` bernama `zlce-studio` dengan dependensi `express`, `@google/genai`, `dotenv` yang tidak dipakai di `src`; `SECURITY.md` membahas ZLCE Studio, bukan RyokoRent; judul halaman `RyokouAppcass` berbeda dari nama manifest; contoh yang tampak seperti data pelanggan nyata (nama, nomor HP, alamat) tertanam di contoh form. | package.json; SECURITY.md; index.html:8; NewBookingModal.tsx:338-351 | Kode |

## 4. Matriks Kepatuhan Aturan Bisnis

Semua 13 field sudah ada di form, parser, pesan WhatsApp admin, dan nota digital. Masalahnya ada pada ketepatan hasil parser dan validasi, bukan pada kelengkapan field.

**Aturan bisnis**

| Aturan | Status | Catatan |
| --- | --- | --- |
| BR-01 Katalog multi-tier, 1 bulan | Sebagian | Tarif dan migrasi 2 minggu ke 1 bulan berjalan (`storageService.ts:34-39`), tetapi harga tidak mengikuti tanggal (F-03) dan tidak ada tarif 2 sampai 6 hari |
| BR-02 State machine 5 status | Sebagian | Lima status terdefinisi; tidak ada tabel transisi (F-05) dan `diservis` tidak dapat dicapai (F-08) |
| BR-03 Posisi unit (parkir, kurir, disewa, servis) | Sebagian | Empat posisi dan nama kurir ada; servis menimpa `tracking` (F-11); unit berstatus `kurir` diblokir untuk semua rentang waktu, bukan hanya saat itu (`bookingEngine.ts:232-235`) |
| BR-04 Buffer 60 menit | Benar di mesin, bocor di sekitarnya | Rumus overlap benar; konstanta di-hard-code (F-18); dilewati handler (F-04, F-05); rawan timpa lintas tab (F-12) |
| BR-05 Denda keterlambatan | Sesuai, dengan cacat tepi | Sembilan kasus tier lulus; NaN dan perilaku 61 menit di F-17 |
| BR-06 Tanpa NIK | Model sesuai, klaim UI keliru | Tidak ada field NIK, tetapi UI menyatakan sensor aktif (F-14) |
| BR-07 Penyesuaian tarif massal | Berfungsi | Pembulatan ribuan berjalan; handler tidak memvalidasi rentang -50% sampai +200% dan tidak menyesuaikan `dendaHarianPerJam` |
| BR-08 Servis 7 kategori | Sesuai di model | Tujuh kategori ada di `ServiceCategory`; efek samping ke ketersediaan di F-11 |
| D-20 Anti-hapus | Sebagian | Hanya `disewa` yang dilindungi, hapus bersifat permanen (F-09) |
| D-06 Jam operasional | Peringatan saja | Tidak memblokir dan tidak membaca pengaturan (F-18) |

**13 field booking**

| No | Field | Form | Parser | Pesan WA | Nota | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Nama | Ya, wajib | Ya | Ya | Ya |  |
| 2 | Alamat KTP | Ya | Ya | Ya | Ya | Diteruskan apa adanya ke WA, CSV, Sheets |
| 3 | ID pendukung | Ya, 6 jenis | Sebagian | Ya | Ya | Hanya jenis, bukan nomor; `KTP` di template jatuh ke SIM C, BPJS tidak ada di template |
| 4 | Alamat saat ini | Ya | Ya | Ya | Ya |  |
| 5 | ID sosmed | Ya | Ya | Ya | Ya | Tanpa validasi format |
| 6 | No telp | Ya, `required` tidak berlaku | Ya | Ya | Ya | Dua normalisasi berbeda (F-21) |
| 7 | No telp darurat | Ya | Ya | Ya | Ya | Tidak dinormalisasi |
| 8 | Jadwal mulai | Ya, bergeser UTC | Sebagian | Ya | Ya | F-01, F-02, F-06 |
| 9 | Jadwal selesai | Ya, bergeser UTC | Sebagian | Ya | Ya | F-01, F-02, F-06 |
| 10 | Lokasi pengantaran | Ya | Ya | Ya | Ya | Diganti `Apartemen Begawan Malang` bila kosong di parser |
| 11 | Lokasi penjemputan | Ya | Ya | Ya | Ya | Bawaan mengikuti lokasi antar |
| 12 | Model unit | Ya | Sebagian | Ya | Ya | Pencocokan substring; bawaan `scoopy` |
| 13 | Jumlah helm | Ya, 1 atau 2 | Sebagian | Ya | Ya | Parser menerima angka berapa pun; template serah terima dan kurir menulis 2 tetap |

## 5. Rekomendasi Terprioritas

**P0: kritis, kerjakan lebih dulu (integritas data dan kalkulasi)**

1. Perbaiki konversi waktu `datetime-local` dan tetapkan WIB secara eksplisit (F-01, F-18). Cuplikan A.
2. Tulis ulang pemisahan label di parser: pecah hanya pada titik dua pertama, kenali tanggal ISO lebih dulu, validasi tanggal, hapus semua nilai bawaan hard-coded, dan kembalikan daftar field yang gagal terbaca alih-alih mengisi diam-diam (F-02, F-06). Cuplikan B.
3. Hitung tarif dari rentang tanggal atau simpulkan `pilihanDurasi` dari tanggal, dan pakai ID paket yang dipilih (F-03).
4. Satukan semua perubahan status di satu modul dengan tabel transisi dan pemeriksaan ketersediaan ulang di dalam handler, bukan hanya di modal (F-04, F-05, F-08). Cuplikan C.
5. Ganti hapus permanen dengan status atau penanda batal, perbaiki pembuatan nomor booking dan ID (F-09, F-10). Cuplikan D.
6. Buat `saveDatabase` melaporkan kegagalan ke UI, minta `navigator.storage.persist()`, dan keluarkan token dari ekspor (F-12, F-13). Cuplikan E.
7. Hapus kalimat sensor NIK di Pengaturan atau implementasikan redaksi non-blocking pada ekspor (F-14). Cuplikan F.

**P1: penting, keandalan alur operasional**

- Pindahkan tombol simpan ke dalam `<form>` atau validasi manual: nomor WA wajib, `selesai > mulai`, dan tolak simpan bila nomor kosong (F-07).
- Catat servis dengan tanggal dan konfirmasi; jangan menimpa unit `disewa`; tampilkan booking mendatang yang terdampak (F-11). Terapkan blokir `kurir` dan `servis` per rentang waktu, memakai `estimasiSelesai`.
- Telegram: pilih satu. Pasang penerima webhook kecil (Cloudflare Worker atau Apps Script) yang memanggil logika yang sama, atau ganti tombol callback dengan tautan WA. Escape HTML pada nama dan alamat (F-15).
- Sheets: kirim sebagai `text/plain`, kirim ulang antrean saat online, dan jangan melaporkan sukses pada mode simulasi. Netralkan sel CSV yang diawali `=`, `+`, `-`, `@` (F-16). Cuplikan F.
- Penyimpanan: pindah ke IndexedDB, atau minimal tambahkan nomor revisi, `BroadcastChannel`, validasi skema (mis. zod) saat impor, dan salinan otomatis sebelum menimpa (F-12, F-19).
- Denda: simpan epoch pengembalian sebagai angka, dahulukan `booking.actualReturnEpoch` yang tersimpan, dan putuskan secara bisnis apakah toleransi 60 menit dikurangkan (F-17). Hubungkan `jamBuka`, `jamTutup`, `turnaroundBufferMinutes` ke mesin (F-18).
- Satukan normalisasi nomor telepon dan gunakan `jumlahHelm` di semua template (F-21).
- Tambahkan tes unit (Vitest) untuk `bookingEngine` dan parser; kasus uji dari review ini bisa langsung dijadikan fixture.
- Tambahkan PIN per pengguna bila perangkat dipakai bergantian (F-20).

**P2: penyempurnaan UX dan kebersihan**

- Jadikan bottom nav `sticky bottom-0` dengan `padding-bottom: env(safe-area-inset-bottom)`, pakai `100dvh`, izinkan zoom, naikkan teks minimal ke 12 px, dan perbesar target sentuh ke 44 px atau lebih (F-22).
- Sembunyikan status bar dan toggle tampilan simulasi saat `display-mode: standalone`. Komponen `AndroidStatusBar` bersifat simulasi dan isinya tidak saya baca.
- Setelah parser berjalan, tampilkan pratinjau dengan field yang tidak yakin ditandai kuning sebelum diterapkan ke form.
- Ganti `registerType: 'autoUpdate'` dengan prompt pembaruan agar halaman tidak dimuat ulang saat form terisi; lengkapi manifest dengan `lang`, `categories`, dan `shortcuts`.
- Ganti `alert` dan `confirm` dengan toast yang bisa dibatalkan.
- Pisahkan perkakas ZLCE dari bundle produksi, hapus dependensi tak terpakai, samakan nama (Ryoko, Ryokou, Ryokourent), dan ganti data contoh dengan data fiktif (F-13, F-23).

## 6. Cuplikan Kode Rekomendasi

Cuplikan A, B, D, dan F saya jalankan dengan zona waktu perangkat diset ke America/New\_York untuk membuktikan hasilnya tidak bergantung pada perangkat. Cuplikan C dan E belum dijalankan karena memerlukan aplikasi utuh.

**A. Waktu WIB yang konsisten (F-01, F-18)**

```ts
// bookingEngine.ts: ganti parseWibToEpoch
export function parseWibToEpoch(s: string): number {
  if (!s) return 0;
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? `${s}:00+07:00` : s;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : Math.floor(t / 1000);
}

// Epoch -> nilai input datetime-local dalam WIB (bukan toISOString yang UTC)
export const epochToWibInput = (epoch: number): string =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(epoch * 1000).replace(' ', 'T');

// NewBookingModal.handleDurationChange
const end = parseWibToEpoch(jamTanggalMulai) + hoursToAdd * 3600;
setJamTanggalSelesai(epochToWibInput(end));
```

**B. Parser: pecah label di titik dua pertama, tanggal dan jam divalidasi, tanpa nilai bawaan (F-02, F-06)**

```ts
export function splitLabel(line: string) {
  const i = line.indexOf(':');
  if (i < 0) return null;
  return {
    label: line.slice(0, i).replace(/^[^\p{L}]+/u, '').trim().toLowerCase(),
    value: line.slice(i + 1).trim(),
  };
}

const MONTHS: Record<string, number> = { jan:1, feb:2, mar:3, apr:4, mei:5, jun:6, jul:7, agu:8, ags:8, sep:9, okt:10, nov:11, des:12 };
const cut = (t: string, m: RegExpMatchArray) => t.slice(0, m.index) + ' ' + t.slice((m.index ?? 0) + m[0].length);

function validYmd(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function extractDate(text: string, nowYear: number) {
  let m = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);                    // ISO lebih dulu
  if (m) { const ymd = validYmd(+m[1], +m[2], +m[3]); return ymd ? { ymd, rest: cut(text, m) } : null; }
  m = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (m) {
    const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : nowYear;
    const ymd = validYmd(y, +m[2], +m[1]);
    return ymd ? { ymd, rest: cut(text, m) } : null;
  }
  m = text.toLowerCase().match(/\b(\d{1,2})\s+([a-z]{3,9})\.?(?:\s+(\d{4}))?\b/);
  if (m && MONTHS[m[2].slice(0, 3)]) {
    const ymd = validYmd(m[3] ? +m[3] : nowYear, MONTHS[m[2].slice(0, 3)], +m[1]);
    return ymd ? { ymd, rest: cut(text, m) } : null;
  }
  return null;
}

export function extractTime(text: string): string | null {
  const t = text.toLowerCase();
  let h: number, min = 0, suffix: string | undefined, bare = false;
  let m = t.match(/\b(\d{1,2})[.:](\d{2})\s*(pagi|siang|sore|malam|am|pm)?\b/);
  if (m) { h = +m[1]; min = +m[2]; suffix = m[3]; }
  else {
    m = t.match(/\b(?:jam\s*)?(\d{1,2})\s*(pagi|siang|sore|malam|am|pm)?\b/);
    if (!m) return null;
    h = +m[1]; suffix = m[2]; bare = true;
  }
  if ((suffix === 'sore' || suffix === 'malam' || suffix === 'pm') && h < 12) h += 12;
  if (suffix === 'am' && h === 12) h = 0;
  if (bare && !suffix && h >= 1 && h <= 6) h += 12;          // "jam 3" = 15:00
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Pemakaian: kalau gagal, kosongkan field dan tambahkan peringatan, jangan mengisi default.
const d = extractDate(value, new Date().getFullYear());
const time = extractTime(d ? d.rest : value);
if (!d || !time) warnings.push('Jadwal mulai tidak terbaca, isi manual.');
```

Hasil uji: `28 Oktober 2026 15:40` menjadi 2026-10-28 15:40; `2026-10-24 3.30 sore` menjadi 15:30; `31/02/2026` ditolak; `jam 3` menjadi 15:00.

**C. Tabel transisi dan pemeriksaan ulang di handler (F-04, F-05, F-08)**

```ts
const NEXT: Record<BookingStatus, BookingStatus[]> = {
  ryokou_booking:  ['ryokou_approved'],
  ryokou_approved: ['ryokou_disewa', 'ryokou_booking'],
  ryokou_disewa:   ['ryokou_selesai', 'ryokou_diservis'],   // sesuaikan arti diservis
  ryokou_diservis: ['ryokou_disewa', 'ryokou_selesai'],
  ryokou_selesai:  [],
};

/** Mengembalikan pesan galat, atau null bila transisi sah. */
export function checkTransition(
  b: BookingRecord, to: BookingStatus, db: RyokoDatabase, unitId = b.unitId,
): string | null {
  if (!NEXT[b.status].includes(to)) return `Transisi ${b.status} ke ${to} tidak diizinkan.`;
  if (to === 'ryokou_approved' || to === 'ryokou_disewa') {
    if (!unitId) return 'Unit fisik belum dipilih.';
    const heldByOther = db.bookings.some(
      o => o.id !== b.id && o.unitId === unitId && o.status === 'ryokou_disewa');
    if (heldByOther) return 'Unit masih dibawa penyewa lain.';
  }
  if (to === 'ryokou_approved' && !isUnitAvailableForRange(unitId!, b.startEpoch, b.endEpoch, db, b.id))
    return 'Unit bentrok jadwal (buffer 60 menit).';
  return null;
}

// App.tsx, awal setiap handler (approve, handover, finish, exchange) dan handleCreateBooking:
const err = checkTransition(target, 'ryokou_disewa', db);
if (err) { alert(err); return; }
```

**D. Nomor booking dan ID yang tidak bisa duplikat (F-10)**

```ts
export function generateBookingNumber(bookings: { noBooking?: string }[], now = new Date()): string {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now).replaceAll('-', '');
  const prefix = `RYK-${ymd}-`;
  const maxSeq = bookings.reduce((mx, b) =>
    b.noBooking?.startsWith(prefix) ? Math.max(mx, parseInt(b.noBooking.slice(prefix.length), 10) || 0) : mx, 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}
export const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
```

Setelah booking 001 dihapus dan 002 tersisa, versi lama menghasilkan 002 lagi; versi ini menghasilkan 003. Dengan status batal (bukan hapus), urutan tetap aman.

**E. Simpan yang jujur dan backup tanpa rahasia (F-12, F-13)**

```ts
export type SaveResult = { ok: true } | { ok: false; message: string };

export function saveDatabase(db: RyokoDatabase): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...db, lastUpdated: new Date().toISOString() }));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, message: quota ? 'Penyimpanan penuh. Unduh backup sekarang.' : 'Gagal menyimpan data.' };
  }
}

// App.tsx updateDatabaseState: tampilkan banner bila !result.ok
// main.tsx: minta penyimpanan permanen dan sinkronkan antar tab
navigator.storage?.persist?.();
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) setDb(loadDatabase()); });

export function exportDatabaseJSON(db: RyokoDatabase, includeSecrets = false): string {
  const { telegramBotToken, googleSheetsWebhookUrl, ...safe } = db.settings;
  const settings = includeSecrets ? db.settings : safe;
  return JSON.stringify({ ...db, settings }, null, 2);
}
```

**F. Sanitasi keluaran: CSV, Telegram, Apps Script, NIK (F-14, F-15, F-16)**

```ts
// CSV: netralkan rumus untuk kolom teks (jangan untuk kolom angka)
export const csvCell = (v: unknown): string => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

// Telegram parse_mode HTML
export const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Apps Script: request sederhana tanpa preflight
await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });

// NIK: tidak memblokir, hanya menyamarkan di ekspor dan pesan keluar
export const redactNik = (s: string) =>
  s.replace(/(?<!\d)(?:\d[ .-]?){15}\d(?!\d)/g, m => '************' + m.replace(/\D/g, '').slice(-4));
```

Hasil uji: `=HYPERLINK("x")` menjadi sel teks aman, `A <b> & C` menjadi `A &lt;b&gt; &amp; C`, dan `NIK 3573011205980001` menjadi `NIK ************0001` tanpa menyentuh nomor HP 13 digit.

## 7. Metode, Batasan, dan Keputusan yang Perlu Anda Ambil

**Yang saya periksa.** Dibaca penuh atau hampir penuh: `bookingEngine.ts`, `types/ryoko.ts`, `whatsappChatParser.ts`, `storageService.ts`, `telegramBotService.ts`, `googleSheetsService.ts`, `NewBookingModal.tsx`, handler dan tata letak di `App.tsx`, `vite.config.ts`, `index.html`, `package.json`, dan `BLUEPRINT.md`. Dibaca sebagian: `whatsappService.ts` (240 baris pertama dari 535, sisanya lewat pencarian), `BookingsView`, `BookingDetailModal`, `DigitalReceiptModal`, `SettingsView`, `AndroidBottomNav`. Tidak dibaca isinya: `FleetView`, `ServiceLogsView`, `MonthlyReportView`, `DashboardView`, `CourierDashboardView`, `UserManagementView`, `RecoveryTab`, dan utilitas ZLCE.

**Yang saya jalankan.** Parser, rumus denda, pembuat nomor booking, dan konversi waktu dijalankan di Node 22 dengan zona Asia/Jakarta, tanpa mengubah logikanya. Temuan bertanda Kode belum dijalankan di perangkat.

**Yang belum dilakukan.** `npm run lint` dan `npm run build`, uji di perangkat Android, uji nyata ke Telegram dan Apps Script, serta uji beban LocalStorage. Skor adalah penilaian saya atas bobot dimensi di Bagian 1, bukan metrik otomatis.

**Keputusan bisnis yang menentukan perbaikan:**

1. Tarif sewa 2 sampai 6 hari: N kali tarif harian, atau tarif tersendiri? (menentukan perbaikan F-03)
2. Toleransi 60 menit pada sewa harian: tetap gratis lalu tagih penuh dari menit pertama (perilaku sekarang), atau hanya menagih kelebihannya? (F-17)
3. Kapan booking masuk `ryokou_diservis`, misalnya unit rusak saat disewa, dan ke status apa ia kembali? (F-08)
4. Apakah ID pendukung cukup jenisnya saja, atau nomornya perlu dicatat? Saat ini hanya jenis yang tersimpan.
5. Apakah tombol Telegram benar-benar perlu dua arah? Jika tidak, tautan WhatsApp dan notifikasi satu arah sudah cukup (F-15).
