# PANDUAN INTEGRASI & KOLABORASI GOOGLE SHEETS
**Proyek:** RyokoRent Android APK — Rental Sepeda Motor Malang & Batu  
**Modul:** `src/services/googleSheetsService.ts`  
**Tujuan:** Menyimpan data reservasi 13 field standar, melakukan review bersama admin/owner, memilih opsi tindak lanjut, dan mengeksekusi aksi operasional dari spreadsheet.

---

## 1. STRUKTUR KOLOM SPREADSHEET (26 KOLOM)

Spreadsheet Google Sheets dirancang memiliki 26 kolom yang mencakup 13 field form booking standar, detail keuangan, serta 3 kolom khusus kolaborasi (*Review, Opsi, Aksi*):

```text
Kolom A - C: [No Booking] | [Waktu Pemesanan] | [Status Sewa]
Kolom D - G: [Nama Penyewa] | [Nomor WhatsApp] | [No Telp Darurat] | [Alamat Sesuai KTP]
Kolom H - J: [ID Pendukung] | [Alamat Saat Ini (Kos/Hotel)] | [ID Sosial Media]
Kolom K - M: [Model Motor] | [Kode Unit Fisik] | [Jumlah Helm SNI]
Kolom N - P: [Durasi Sewa] | [Jadwal Mulai] | [Jadwal Selesai]
Kolom Q - S: [Lokasi Pengantaran] | [Lokasi Penjemputan] | [Kurir Penanggung Jawab]
Kolom T - V: [Total Biaya (Rp)] | [Denda (Rp)] | [Catatan Khusus]
Kolom W    : [STATUS REVIEW ADMIN]    -> PENDING_REVIEW | APPROVED | REJECTED | NEED_DOCS
Kolom X    : [OPSI TINDAK LANJUT]    -> Siapkan Unit | Tugaskan Kurir | Kirim Tagihan DP | Jadwal Servis | Selesai & Arsip
Kolom Y    : [AKSI TERAKHIR DISETUJUI]-> Catatan aksi yang dieksekusi setelah review
Kolom Z    : [Waktu Terakhir Sinkron]
```

---

## 2. KODE GOOGLE APPS SCRIPT (APPS SCRIPT WEB APP)

Salin kode JavaScript (Google Apps Script) berikut ke Spreadsheet Anda:

1. Buka spreadsheet baru di [Google Sheets](https://sheets.new).
2. Beri nama: `RyokoRent_Data_Operasional`.
3. Buka menu **Ekstensi** > **Apps Script**.
4. Ganti isi `Kode.gs` dengan kode berikut:

```javascript
/**
 * RyokoRent Apps Script Webhook Listener
 * Menerima data 13-field booking dari RyokoRent Android APK
 */

const SHEET_NAME = 'Data_Booking';

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ONLINE',
    app: 'RyokoRent Google Sheets Sync',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Inisialisasi sheet & header jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      const headers = [
        'No Booking', 'Waktu Pemesanan', 'Status Sewa', 'Nama Penyewa', 'Nomor WhatsApp',
        'Nomor Telp Darurat', 'Alamat Sesuai KTP', 'ID Pendukung', 'Alamat Saat Ini',
        'ID Sosial Media', 'Model Motor', 'Kode Unit Fisik', 'Jumlah Helm SNI', 'Durasi Sewa',
        'Jadwal Mulai', 'Jadwal Selesai', 'Lokasi Pengantaran', 'Lokasi Penjemputan',
        'Kurir Penanggung Jawab', 'Total Biaya Estimasi (Rp)', 'Denda (Rp)', 'Catatan Khusus',
        'Status Review Admin', 'Opsi Tindak Lanjut', 'Aksi Terakhir Disetujui', 'Waktu Terakhir Sinkron'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0284c7').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    if (postData.action === 'UPSERT_BOOKING') {
      const d = postData.data;
      const dataRange = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      // Cari apakah No Booking sudah ada di kolom A
      for (let i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] === d.noBooking) {
          rowIndex = i + 1; // 1-based index
          break;
        }
      }
      
      const rowValues = [
        d.noBooking, d.waktuPemesanan, d.statusSewa, d.namaPenyewa, d.nomorWa,
        d.noDarurat, d.alamatKtp, d.jenisIdPendukung, d.alamatSaatIni,
        d.idSosmed, d.modelMotor, d.kodeUnitFisik, d.jumlahHelm, d.durasiSewa,
        d.jadwalMulai, d.jadwalSelesai, d.lokasiAntar, d.lokasiJemput,
        d.kurirPengantar, d.totalEstimasiBiaya, d.dendaKeterlambatan, d.catatanKhusus,
        d.statusReviewAdmin, d.opsiTindakLanjut, d.aksiTerakhirDisetujui, new Date().toISOString()
      ];
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Baris booking berhasil diperbarui.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Aksi tidak dikenali.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

5. Klik tombol **Deploy** (Terapkan) > **Penerapan Baru (New Deployment)**.
6. Pilih jenis: **Aplikasi Web (Web App)**.
7. Setel *Jalankan sebagai (Execute as)*: **Saya (Akun Anda)**.
8. Setel *Siapa yang memiliki akses (Who has access)*: **Siapa saja (Anyone)**.
9. Salin URL Aplikasi Web yang diberikan (mis. `https://script.google.com/macros/s/.../exec`).
10. Tempelkan URL tersebut ke **Menu Pengaturan > Integrasi Google Sheets Webhook** pada aplikasi RyokoRent.

---

## 3. ALUR KERJA REVIEW, OPSI & AKSI DI GOOGLE SHEETS

1. **Simpan Data:** Setiap ada pesanan masuk di RyokoRent APK, data 13-field otomatis terkirim dan dicatat rapi ke Google Sheets.
2. **Review Admin:** Admin/Owner membuka spreadsheet pada smartphone atau laptop:
   - Kolom W (`Status Review Admin`) berisi dropdown pilihan: `PENDING_REVIEW`, `APPROVED`, `REJECTED`, atau `NEED_DOCS`.
3. **Pilihan Opsi Operasional:**
   - Kolom X (`Opsi Tindak Lanjut`): Admin memilih tindakan: `Siapkan Unit Garasi`, `Tugaskan Kurir Antar`, `Kirim Tagihan DP`, atau `Jadwalkan Servis Bengkel`.
4. **Eksekusi Aksi:**
   - Setelah review dan opsi disetujui, kolom Y mencatat hasil aksi final untuk koordinasi tim kurir dan operator front-desk.
