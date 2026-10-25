/**
 * Google Sheets Collaboration & Sync Service for RyokoRent
 * Mendukung ekspor CSV instan, sinkronisasi dua arah via Webhook Google Apps Script,
 * antrean offline, serta pemetaan 13 field booking standar ditambah kolom Review, Opsi, dan Aksi.
 */

import { BookingRecord, RyokoDatabase } from '../types/ryoko';

export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEED_DOCS';
export type OperationalOption =
  | 'Siapkan Unit Garasi'
  | 'Tugaskan Kurir Antar'
  | 'Kirim Tagihan DP'
  | 'Jadwalkan Servis Bengkel'
  | 'Selesai & Arsip';

export interface GoogleSheetsRowData {
  noBooking: string;
  waktuPemesanan: string;
  statusSewa: string;
  namaPenyewa: string;
  nomorWa: string;
  noDarurat: string;
  alamatKtp: string;
  jenisIdPendukung: string;
  alamatSaatIni: string;
  idSosmed: string;
  modelMotor: string;
  kodeUnitFisik: string;
  jumlahHelm: number;
  durasiSewa: string;
  jadwalMulai: string;
  jadwalSelesai: string;
  lokasiAntar: string;
  lokasiJemput: string;
  kurirPengantar: string;
  totalEstimasiBiaya: number;
  dendaKeterlambatan: number;
  catatanKhusus: string;
  // Kolom Kolaborasi: Review, Opsi, Aksi
  statusReviewAdmin: ReviewStatus;
  opsiTindakLanjut: OperationalOption;
  aksiTerakhirDisetujui: string;
  timestampSync: string;
}

export const SHEETS_HEADER_COLUMNS: string[] = [
  'No Booking',
  'Waktu Pemesanan',
  'Status Sewa',
  'Nama Penyewa',
  'Nomor WhatsApp',
  'Nomor Telp Darurat',
  'Alamat Sesuai KTP',
  'ID Pendukung',
  'Alamat Saat Ini (Kos/Hotel)',
  'ID Sosial Media (IG/FB)',
  'Model Motor',
  'Kode Unit Fisik',
  'Jumlah Helm SNI',
  'Durasi Sewa',
  'Jadwal Mulai',
  'Jadwal Selesai',
  'Lokasi Pengantaran',
  'Lokasi Penjemputan',
  'Kurir Penanggung Jawab',
  'Total Biaya Estimasi (Rp)',
  'Denda (Rp)',
  'Catatan Khusus',
  'Status Review Admin',
  'Opsi Tindak Lanjut',
  'Aksi Terakhir Disetujui',
  'Waktu Terakhir Sinkron',
];

const OFFLINE_QUEUE_KEY = 'ryoko_sheets_offline_queue';

/**
 * Petakan BookingRecord ke objek baris Google Sheets (termasuk 13 field + review + opsi + aksi)
 */
export function formatBookingToSheetsRow(booking: BookingRecord): GoogleSheetsRowData {
  // Tentukan default review status berdasarkan status transaksi
  let reviewStatus: ReviewStatus = 'PENDING_REVIEW';
  let opsi: OperationalOption = 'Siapkan Unit Garasi';
  let aksi = 'Menunggu Verifikasi Admin';

  if (booking.status === 'ryokou_approved') {
    reviewStatus = 'APPROVED';
    opsi = 'Tugaskan Kurir Antar';
    aksi = `Unit ${booking.snapshotKodeUnit || 'Garasi'} Disetujui & Dikunci`;
  } else if (booking.status === 'ryokou_disewa') {
    reviewStatus = 'APPROVED';
    opsi = 'Tugaskan Kurir Antar';
    aksi = `Unit Sedang Dibawa Tamu (${booking.kurirPengantar || 'Kurir Standby'})`;
  } else if (booking.status === 'ryokou_diservis') {
    reviewStatus = 'NEED_DOCS';
    opsi = 'Jadwalkan Servis Bengkel';
    aksi = 'Unit Dialihkan ke Bengkel Rekanan';
  } else if (booking.status === 'ryokou_selesai') {
    reviewStatus = 'APPROVED';
    opsi = 'Selesai & Arsip';
    aksi = `Unit Selesai & Diterima Kembali (Denda: Rp ${booking.dendaNominal?.toLocaleString('id-ID') || 0})`;
  }

  return {
    noBooking: booking.noBooking,
    waktuPemesanan: booking.createdAt,
    statusSewa: booking.status,
    namaPenyewa: booking.nama,
    nomorWa: booking.nomorWa,
    noDarurat: booking.noTelpDarurat || '-',
    alamatKtp: booking.alamatKtp || '-',
    jenisIdPendukung: booking.jenisIdPendukung,
    alamatSaatIni: booking.alamatSaatIni || '-',
    idSosmed: booking.idSosmed || '-',
    modelMotor: booking.snapshotNamaMotor,
    kodeUnitFisik: booking.snapshotKodeUnit || 'Belum Ditentukan',
    jumlahHelm: booking.jumlahHelm || 2,
    durasiSewa: booking.labelDurasi || booking.pilihanDurasi,
    jadwalMulai: booking.jamTanggalMulai,
    jadwalSelesai: booking.jamTanggalSelesai,
    lokasiAntar: booking.alamatPengantaran,
    lokasiJemput: booking.alamatPenjemputan,
    kurirPengantar: booking.kurirPengantar || 'Belum Ada Kurir',
    totalEstimasiBiaya: booking.totalHargaEstimasi,
    dendaKeterlambatan: booking.dendaNominal || 0,
    catatanKhusus: booking.catatanKhusus || '-',
    statusReviewAdmin: reviewStatus,
    opsiTindakLanjut: opsi,
    aksiTerakhirDisetujui: aksi,
    timestampSync: new Date().toISOString(),
  };
}

/**
 * Sanitasi sel CSV dengan pencegahan Formula Injection (=, +, -, @) (F-16)
 */
export function csvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Netralkan formula injection pada spreadsheet
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Ekspor seluruh data booking ke format CSV yang kompatibel 100% dengan Google Sheets & Excel.
 */
export function generateBookingsCSV(bookings: BookingRecord[]): string {
  const headerRow = SHEETS_HEADER_COLUMNS.map(csvCell).join(',');
  const dataRows = bookings.map(b => {
    const row = formatBookingToSheetsRow(b);
    return [
      csvCell(row.noBooking),
      csvCell(row.waktuPemesanan),
      csvCell(row.statusSewa),
      csvCell(row.namaPenyewa),
      csvCell(row.nomorWa),
      csvCell(row.noDarurat),
      csvCell(row.alamatKtp),
      csvCell(row.jenisIdPendukung),
      csvCell(row.alamatSaatIni),
      csvCell(row.idSosmed),
      csvCell(row.modelMotor),
      csvCell(row.kodeUnitFisik),
      csvCell(row.jumlahHelm),
      csvCell(row.durasiSewa),
      csvCell(row.jadwalMulai),
      csvCell(row.jadwalSelesai),
      csvCell(row.lokasiAntar),
      csvCell(row.lokasiJemput),
      csvCell(row.kurirPengantar),
      csvCell(row.totalEstimasiBiaya),
      csvCell(row.dendaKeterlambatan),
      csvCell(row.catatanKhusus),
      csvCell(row.statusReviewAdmin),
      csvCell(row.opsiTindakLanjut),
      csvCell(row.aksiTerakhirDisetujui),
      csvCell(row.timestampSync),
    ].join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Unduh langsung file CSV untuk diimpor ke Google Sheets
 */
export function downloadBookingsCSV(bookings: BookingRecord[], filenamePrefix = 'ryokourent_sheet_sync'): void {
  const csvContent = '\uFEFF' + generateBookingsCSV(bookings); // UTF-8 BOM agar rapi di Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenamePrefix}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Simpan payload ke antrean lokal bila sedang offline
 */
export function enqueueOfflineSheetsSync(row: GoogleSheetsRowData): void {
  try {
    const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: GoogleSheetsRowData[] = existing ? JSON.parse(existing) : [];
    queue.push(row);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch (err) {
    console.warn('Gagal menyimpan ke antrean offline Google Sheets:', err);
  }
}

/**
 * Dapatkan jumlah antrean offline
 */
export function getOfflineSheetsQueueCount(): number {
  try {
    const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!existing) return 0;
    const queue = JSON.parse(existing);
    return Array.isArray(queue) ? queue.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Kirim satu data pemesanan ke Webhook Google Apps Script
 */
export async function syncBookingToGoogleSheets(
  booking: BookingRecord,
  webhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const row = formatBookingToSheetsRow(booking);

  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    // Mode simulasi/lokal jika URL webhook belum dikonfigurasi
    enqueueOfflineSheetsSync(row);
    return {
      success: true,
      message: `Data ${booking.noBooking} berhasil disiapkan dalam format baris 13-Field Google Sheets (Mode Offline / Antrean Lokal).`,
    };
  }

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'UPSERT_BOOKING',
        data: row,
      }),
    });

    if (!res.ok) {
      enqueueOfflineSheetsSync(row);
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal sinkron ke Google Sheets. Disimpan ke antrean offline.`,
      };
    }

    return {
      success: true,
      message: `Data ${booking.noBooking} berhasil disinkronkan ke Google Sheets!`,
    };
  } catch (err) {
    enqueueOfflineSheetsSync(row);
    const errText = err instanceof Error ? err.message : 'Koneksi gagal';
    return {
      success: false,
      message: `Koneksi ke Google Sheets gagal (${errText}). Data disimpan ke antrean offline.`,
    };
  }
}

/**
 * Sinkronisasi massal seluruh data booking ke Google Sheets
 */
export async function bulkSyncBookingsToGoogleSheets(
  bookings: BookingRecord[],
  webhookUrl?: string
): Promise<{ success: boolean; message: string; count: number }> {
  const rows = bookings.map(formatBookingToSheetsRow);

  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    rows.forEach(r => enqueueOfflineSheetsSync(r));
    return {
      success: true,
      count: rows.length,
      message: `${rows.length} transaksi booking 13-field berhasil disiapkan dan dicadangkan secara lokal. Konfigurasikan Webhook URL di Pengaturan untuk sinkronisasi otomatis ke Google Cloud.`,
    };
  }

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'BULK_UPSERT',
        count: rows.length,
        rows,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        count: 0,
        message: `Server Google Apps Script merespon dengan status ${res.status}.`,
      };
    }

    return {
      success: true,
      count: rows.length,
      message: `Berhasil menyinkronkan ${rows.length} data pemesanan ke Google Sheets!`,
    };
  } catch (err) {
    const errText = err instanceof Error ? err.message : 'Koneksi gagal';
    return {
      success: false,
      count: 0,
      message: `Gagal menghubungi Google Sheets API: ${errText}`,
    };
  }
}
