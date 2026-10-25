# PANDUAN INTEGRASI BOT TELEGRAM ALERT PENGEMBALIAN & AKSI INTERAKTIF
**Proyek:** RyokoRent Android APK — Rental Sepeda Motor Malang & Batu  
**Modul:** `src/services/telegramBotService.ts`  
**Tujuan:** Mengirimkan peringatan jatuh tempo sewa (H-2 Jam, H-1 Jam, dan Keterlambatan) ke Telegram Admin, memberikan opsi review, dan mengeksekusi aksi setelah disetujui melalui tombol interaktif (*inline keyboard*).

---

## 1. CARA MEMBUAT BOT TELEGRAM DI BOTFATHER

1. Buka aplikasi Telegram dan cari **@BotFather** (akun resmi dengan centang biru).
2. Kirim pesan `/newbot`.
3. Masukkan nama bot, misalnya: `RyokoRent Alert Bot`.
4. Masukkan username bot (harus berakhiran `bot`), misalnya: `ryokourent_alert_bot`.
5. BotFather akan memberikan **HTTP API Bot Token** berupa string seperti:
   `7123456789:AAF_AbCdEf1234567890GhIjKlMnOpQrStU`
   *(Simpan token ini secara aman)*.

---

## 2. CARA MENDAPATKAN CHAT ID ADMIN TELEGRAM

1. Cari bot **@userinfobot** di Telegram.
2. Tekan **Start** atau kirim pesan apa saja.
3. Bot akan membalas dengan ID numerik Anda, misalnya: `123456789` (atau ID grup diawali tanda minus `-100...`).
4. Pastikan Anda telah menekan tombol **Start** pada bot yang baru Anda buat (`@ryokourent_alert_bot`) agar bot memiliki izin mengirim pesan ke akun Anda.

---

## 3. STRUKTUR NOTIFIKASI & TOMBOL AKSI INTERAKTIF

Setiap pesan alert jatuh tempo menyertakan data 13-field booking penyewa, nominal denda, serta 4 tombol tindakan:

```text
+--------------------------------------------------------------+
| 🔴 PERINGATAN SEWA TERLAMBAT / OVERDUE!                      |
|                                                              |
| 📋 No. Booking : RYK-20261024-005                           |
| 👤 Penyewa     : Ridho berkati                              |
| 📱 Kontak WA   : +6285845595139                             |
| 🛵 Unit Motor  : Honda Scoopy Prestige (SCP-01)              |
| 🪖 Kelengkapan : 2 Helm SNI                                  |
| ⏰ Tenggat     : 2026-10-25 15:00 WIB                       |
| 📍 Jemput      : Apartemen Begawan Malang                   |
| ⚠️ Denda Telat : Rp 25.000 (Terlambat 45 Menit)             |
+--------------------------------------------------------------+
| [ 🔍 1. Review Detail Booking ]                             |
+--------------------------------------------------------------+
| [ ✅ 2. Setujui Selesai (Unit Diterima di Pool) ]           |
+--------------------------------------------------------------+
| [ ⏳ 3. Perpanjang Waktu Sewa (Extend) ]                    |
+--------------------------------------------------------------+
| [ ⚠️ 4. Kenakan Denda Keterlambatan ]                       |
+--------------------------------------------------------------+
| [ 💬 Hubungi Tamu via WhatsApp ]                            |
+--------------------------------------------------------------+
```

---

## 4. PENJELASAN AKSI CALLBACK TOMBOL INTERAKTIF

| Tombol / Aksi | Data Callback | Dampak / Aksi Setelah Disetujui |
| :--- | :--- | :--- |
| **Review Detail** | `ryoko_rev:<bookingId>` | Menampilkan ringkasan audit unit fisik garasi, kelengkapan 2 helm, dan catatan khusus. |
| **Setujui Selesai** | `ryoko_act_finish:<bookingId>` | Mengubah status transaksi menjadi `ryokou_selesai`, mengembalikan motor ke pool parkir, dan mencatat waktu selesai. |
| **Perpanjang Sewa** | `ryoko_act_extend:<bookingId>` | Membuka dialog perpanjangan waktu tanpa mengubah unit fisik, menghitung ulang estimasi tarif. |
| **Kenakan Denda** | `ryoko_act_fine:<bookingId>` | Menambahkan denda nominal ke nota kasir digital dan kwitansi PDF secara transparan. |

---

## 5. PENGATURAN DI DALAM APLIKASI RYOKORENT

1. Masuk ke aplikasi RyokoRent sebagai **Administrator**.
2. Buka menu **Pengaturan (Settings)**.
3. Gulir ke bagian **Integrasi Kolaborasi: Google Sheets & Bot Telegram**.
4. Masukkan **Telegram Bot Token** dan **Admin Chat ID**.
5. Klik **"Uji Koneksi Bot Telegram"** untuk mengirim pesan verifikasi instan.
6. Simpan pengaturan. Peringatan jatuh tempo dapat dikirim langsung dari Banner Hitung Mundur (*Countdown Alert Banner*) atau Dashboard Kurir.
