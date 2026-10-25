# PANDUAN PENGUNGGAHAN BERKAS & PETUNJUK CODE REVIEW CLAUDE
**Proyek:** RyokoRent Android APK — Rental Sepeda Motor Malang & Batu  
**Target Model AI Reviewer:** Anthropic Claude (Claude 3.5 Sonnet / Claude 3.7 / Opus)  
**Dokumen Pendamping:** `docs/CLAUDE_PROMPT.md`

---

## 1. TUJUAN TINJAUAN KODE (CODE REVIEW)

Tinjauan kode oleh Claude ditujukan untuk mengaudit:
1. **Kepatuhan Form Template Standar 13-Field:** Memastikan seluruh data penyewa tersimpan utuh dan terformat seragam (Nama, Alamat KTP, ID Pendukung, Alamat Saat Ini, ID Sosmed, No Telp, No Darurat, Jadwal Mulai, Jadwal Selesai, Lokasi Antar, Lokasi Jemput, Model Unit, Jumlah Helm).
2. **Kekokohan State Machine & Logika Bisnis:** Alur 5 status (`ryokou_booking` → `ryokou_approved` → `ryokou_disewa` → `ryokou_diservis` → `ryokou_selesai`), proteksi penghapusan booking aktif (D-20), buffer jeda 60 menit (BR-04), dan perhitungan denda step-up (D-27).
3. **Privasi & Keamanan Data (Anti-NIK):** Penegakan kebijakan bahwa NIK tidak boleh terekspos atau diblokir secara tidak semestinya, serta keamanan penyimpanan LocalStorage.
4. **Kinerja PWA Offline & UI/UX Mobile:** Respon aplikasi pada peramban mobile Android Chrome, instalasi PWA Standalone, dan optimasi interaksi sentuhan.
5. **Kesiapan Integrasi Eksternal:** Generator pesan WhatsApp UTF-8, sinkronisasi Google Sheets, dan alert jatuh tempo Bot Telegram.

---

## 2. DAFTAR BERKAS YANG WAJIB DIUNGGAH KE CLAUDE

Untuk hasil review yang paling akurat dan efisien terhadap kuota token Claude (~35.000 tokens dari ~200.000 context window), unggah berkas sesuai prioritas tingkatan (tier) berikut:

### Tier 1: Berkas Spesifikasi & Definisi Inti (Wajib Diunggah)
| No | Nama Berkas | Path | Alasan Pengunggahan |
| :--- | :--- | :--- | :--- |
| 1 | `BLUEPRINT.md` | `/BLUEPRINT.md` | Sumber kebenaran arsitektur, aturan bisnis (BR-01 s/d BR-08), dan parameter proyek. |
| 2 | `SESSION_STATE.md` | `/SESSION_STATE.md` | Status pengerjaan, matriks task, dan audit log sesi. |
| 3 | `ryoko.ts` | `/src/types/ryoko.ts` | Definisi tipe TypeScript lengkap (13 field, unit tracking, RBAC, service record). |

### Tier 2: Logika Bisnis, Servis & Helper (Wajib Diunggah)
| No | Nama Berkas | Path | Alasan Pengunggahan |
| :--- | :--- | :--- | :--- |
| 4 | `bookingEngine.ts` | `/src/services/bookingEngine.ts` | Mesin validasi jadwal bentrok, buffer 60 menit, kalkulasi tarif multi-tier & denda. |
| 5 | `whatsappService.ts` | `/src/services/whatsappService.ts` | Template pesan konfirmasi sewa, tugas kurir, tagihan bulanan, dan reminder jatuh tempo. |
| 6 | `whatsappChatParser.ts`| `/src/utils/whatsappChatParser.ts` | Parser cerdas ekstraksi format chat WA booking tamu ke objek form 13 field. |
| 7 | `countdownHelper.ts` | `/src/utils/countdownHelper.ts` | Helper hitung mundur real-time, 4 tingkat urgensi sewa, dan denda live. |
| 8 | `storageService.ts` | `/src/services/storageService.ts` | Driver persistensi LocalStorage, export/import JSON, dan audit log. |

### Tier 3: Komponen Antarmuka Kunci (Sangat Direkomendasikan)
| No | Nama Berkas | Path | Alasan Pengunggahan |
| :--- | :--- | :--- | :--- |
| 9 | `NewBookingModal.tsx` | `/src/components/NewBookingModal.tsx` | Implementasi form modal input 13 field, parser chat WA, & tombol salin template kosong. |
| 10 | `DigitalReceiptModal.tsx` | `/src/components/DigitalReceiptModal.tsx` | Modal kwitansi paperless, ekspor PDF, BAST, dan salin ringkasan nota kasir 1-klik. |
| 11 | `CountdownAlertBanner.tsx`| `/src/components/CountdownAlertBanner.tsx` | Banner hitung mundur real-time dengan filter urgensi dan tombol WhatsApp alert. |
| 12 | `CourierDashboardView.tsx`| `/src/components/CourierDashboardView.tsx`| Portal khusus kurir untuk serah terima & penjemputan unit tanpa akses omset. |
| 13 | `BookingsView.tsx` | `/src/components/BookingsView.tsx` | Antarmuka manajemen sewa dengan 5 tab status, filter, tukar unit, dan modal. |

### Tier 4: Data Awal & Integrasi Eksternal (Opsional / Pelengkap)
| No | Nama Berkas | Path | Alasan Pengunggahan |
| :--- | :--- | :--- | :--- |
| 14 | `seedData.ts` | `/src/data/seedData.ts` | Data awal 16 unit garasi, 6 model motor, dan transaksi riil (termasuk contoh booking Ridho). |
| 15 | `googleSheetsService.ts` | `/src/services/googleSheetsService.ts` | Format row spreadsheet untuk 13 field dan sinkronisasi webhook. |
| 16 | `telegramBotService.ts` | `/src/services/telegramBotService.ts` | Pengiriman notifikasi alert pengembalian dan tombol inline action bot. |

---

## 3. CARA PENGUNGGAHAN KE CLAUDE

### Metode A: Claude Projects / Claude Chat Web (Paling Praktis)
1. Buka antarmuka chat Claude (https://claude.ai).
2. Buat percakapan baru atau buka Project khusus "RyokoRent Review".
3. Seret (*drag & drop*) atau klik ikon klip kertas (lampiran) untuk mengunggah 13-16 berkas di atas secara bersamaan.
4. Salin isi prompt dari berkas `docs/CLAUDE_PROMPT.md` dan tempelkan sebagai pesan pembuka.
5. Kirim pesan dan biarkan Claude menganalisis seluruh basis kode.

### Metode B: Claude Code CLI / Terminal
Jika menggunakan Claude Code CLI (`claude`):
```bash
claude "Lakukan audit komprehensif pada proyek RyokoRent berdasarkan docs/CLAUDE_PROMPT.md dengan memeriksa BLUEPRINT.md, src/types/ryoko.ts, src/services/bookingEngine.ts, src/components/NewBookingModal.tsx, dan src/services/whatsappService.ts"
```

---

## 4. DAFTAR CHECKLIST SEBELUM MEMINTA REVIEW
Sebelum mengirim berkas ke Claude, pastikan:
- [x] Kode lolos kompilasi TypeScript (`npm run lint` atau `npx tsc --noEmit` exit 0).
- [x] Skrip pemeriksa status ZLCE lolos (`python3 scripts/zlce/zlce-check.py . --no-git`).
- [x] Tidak ada data kredensial rahasia (seperti Token Bot Telegram pribadi atau password) yang tertulis keras (*hardcoded*) di dalam berkas.
