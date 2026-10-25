/**
 * Parser cerdas untuk teks format chat pemesanan WhatsApp Ryoko Rent Malang & Batu
 * Disesuaikan dengan 13 Template Baku:
 * 1. Nama
 * 2. Alamat sesuai ktp
 * 3. Id pendukung (SIM C / KTM / NPWP / Paspor / BPJS / Kartu Pegawai)
 * 4. Alamat saat ini : alamat rumah/kos/hotel
 * 5. Id sosmed
 * 6. No telp
 * 7. No telp darurat
 * 8. Jadwal mulai
 * 9. Jadwal selesai
 * 10. Lokasi pengantaran
 * 11. Lokasi penjemputan
 * 12. Model unit
 * 13. Jumlah helm
 *
 * Menerapkan spesifikasi S10 & S11 perbaikan audit:
 * - P1: "12 malam" -> 00:00 (bukan 12:00 siang)
 * - P2: Angka tanggal (mis. "5 November") tidak diekstrak sebagai jam tanpa kata jam/pukul
 * - P3: Dukungan format tanpa titik dua ("Jam pengembalian 3" -> 15:00)
 * - P4: Kontak darurat dicek sebelum nama; nama darurat tidak menimpa nama penyewa
 * - P5: Dukungan tanggal bertitik (24.10.2026 15.40) & pembacaan baris berikutnya (multiline)
 * - P6: Nilai "sama" pada penjemputan otomatis menyalin lokasi pengantaran
 * - N1 & N2: Terintegrasi dengan utils/phone.ts (toWaNumber) tanpa fallback nomor palsu
 */

import { SupportIdType } from '../types/ryoko';
import { toWaNumber } from './phone';

export interface ParsedBookingChat {
  nama: string;
  alamatKtp: string;
  idPendukung: SupportIdType;
  alamatSaatIni: string;
  idSosmed: string;
  nomorWa: string;
  teleponDarurat: string;
  jamTanggalMulai: string; // Format: YYYY-MM-DDTHH:mm atau '' jika gagal
  jamTanggalSelesai: string; // Format: YYYY-MM-DDTHH:mm atau '' jika gagal
  lokasiDelivery: string;
  lokasiPengembalian: string;
  jenisMotorKeyword: string;
  jumlahHelm: number;
  catatanRapi: string;
  warnings: string[];
}

export const STANDARD_BOOKING_TEMPLATE_TEXT = `*FORM PEMESANAN SEWA MOTOR RYOKO RENT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Silakan salin & lengkapi data pemesanan di bawah ini:

1. Nama :
2. Alamat sesuai KTP :
3. Id pendukung (SIM C/KTM/KTP/Paspor/NPWP/BPJS) :
4. Alamat saat ini (Rumah/Kos/Hotel) :
5. Id sosmed (Instagram/TikTok/FB) :
6. No telp :
7. No telp darurat :
8. Jadwal mulai (Tgl & Jam Mulai) :
9. Jadwal selesai (Tgl & Jam Pengembalian) :
10. Lokasi pengantaran :
11. Lokasi penjemputan :
12. Model unit :
13. Jumlah helm (1 / 2 Helm) :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Kirimkan format yang sudah diisi ke nomor admin Ryoko Rent_`;

/**
 * Normalisasi nomor telepon ke format internasional 628... (S11)
 * Menggunakan Single Source of Truth toWaNumber dari phone.ts
 */
export function normalizePhoneNumber(phone: string): string {
  return toWaNumber(phone) || '';
}

/**
 * Pemisahan label pada titik dua pertama atau penanda baris jadwal (Snippet B / S10 P3)
 * Mencegah pemotongan nilai waktu seperti "15:40" dan menangani baris tanpa titik dua
 */
export function splitLabel(line: string): { label: string; value: string } | null {
  const i = line.indexOf(':');
  if (i >= 0) {
    const rawLabel = line.slice(0, i);
    const cleanLabel = rawLabel
      .replace(/^[^\p{L}0-9]+/u, '')
      .replace(/^\d+\s*[.)-]\s*/, '')
      .trim()
      .toLowerCase();
    return {
      label: cleanLabel,
      value: line.slice(i + 1).trim(),
    };
  }

  // Fallback untuk baris tanpa titik dua (P3), contoh: "Jam pengembalian 3", "↙️ Jam pengembalian 3", "Jam ambil 15.00"
  const noColonMatch = line.match(/^[^\p{L}\d]*(jam\s+(?:ambil|pengembalian|kembali)|jadwal\s+(?:mulai|selesai))\s+(.+)$/iu);
  if (noColonMatch) {
    return {
      label: noColonMatch[1].trim().toLowerCase(),
      value: noColonMatch[2].trim(),
    };
  }

  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, ags: 8, agustus: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  des: 12, desember: 12,
};

const cut = (t: string, m: RegExpMatchArray) =>
  t.slice(0, m.index) + ' ' + t.slice((m.index ?? 0) + m[0].length);

/**
 * Validasi kalender nyata (mencegah 31/02 atau bulan > 12)
 */
export function validYmd(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Ekstraksi tanggal dengan prioritas ISO (YYYY-MM-DD), slash/dash/dot (DD/MM/YYYY, DD.MM.YYYY), dan nama bulan
 * P5: Mendukung pemisah titik (misal 24.10.2026)
 */
export function extractDate(
  text: string,
  nowYear = new Date().getFullYear()
): { ymd: string; rest: string } | null {
  if (!text) return null;

  // 1. Format ISO: 2026-10-24
  let m = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const ymd = validYmd(+m[1], +m[2], +m[3]);
    if (ymd) return { ymd, rest: cut(text, m) };
  }

  // 2. Format DD/MM/YYYY atau DD-MM-YYYY atau DD.MM.YYYY atau DD/MM atau DD.MM (P5)
  m = text.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (m) {
    const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : nowYear;
    const ymd = validYmd(y, +m[2], +m[1]);
    if (ymd) return { ymd, rest: cut(text, m) };
  }

  // 3. Format nama bulan Indonesia: "24 Oktober 2026" atau "24 okt" atau "5 November"
  m = text.toLowerCase().match(/\b(\d{1,2})\s+([a-z]{3,10})\.?(?:\s+(\d{4}))?\b/);
  if (m) {
    const monthKey = m[2].slice(0, 3);
    const mo = MONTHS[monthKey] || MONTHS[m[2]];
    if (mo) {
      const y = m[3] ? +m[3] : nowYear;
      const ymd = validYmd(y, mo, +m[1]);
      if (ymd) return { ymd, rest: cut(text, m) };
    }
  }

  return null;
}

/**
 * Ekstraksi waktu jam dan menit 24 jam (S10 P1 & P2)
 * P1: "12 malam" diekstrak menjadi 00:00 (bukan 12:00)
 * P2: Angka tanggal seperti "5" pada "5 November" tidak dianggap jam
 */
export function extractTime(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  let h: number;
  let min = 0;
  let suffix: string | undefined;
  let bare = false;

  // 1. Format dengan menit: 15:40, 15.40, 09.30 malam, dll.
  let m = t.match(/\b(\d{1,2})[.:](\d{2})\s*(pagi|siang|sore|malam|am|pm)?\b/);
  if (m) {
    h = +m[1];
    min = +m[2];
    suffix = m[3];
  } else {
    // 2. Format dengan kata eksplisit 'jam' atau 'pukul': "jam 3", "pukul 15", "jam 12 malam"
    m = t.match(/\b(?:jam|pukul)\s*(\d{1,2})\s*(pagi|siang|sore|malam|am|pm)?\b/);
    if (m) {
      h = +m[1];
      suffix = m[2];
      bare = true;
    } else {
      // 3. Format angka dengan penanda waktu: "3 sore", "12 malam", "8 pagi"
      m = t.match(/\b(\d{1,2})\s*(pagi|siang|sore|malam|am|pm)\b/);
      if (m) {
        h = +m[1];
        suffix = m[2];
        bare = true;
      } else {
        return null; // Angka biasa tanpa penanda jam TIDAK diekstrak sebagai waktu (P2)
      }
    }
  }

  // P1: Penanganan "12 malam" -> 00:00 (tengah malam)
  if (suffix === 'malam' && h === 12) {
    h = 0;
  } else if ((suffix === 'sore' || suffix === 'malam' || suffix === 'pm') && h < 12) {
    h += 12;
  }
  
  if (suffix === 'am' && h === 12) {
    h = 0;
  }
  
  // Standar rental: angka tunggal 1..6 jika didahului 'jam' tanpa suffix diasumsikan sore (e.g. "jam 3" -> 15:00)
  if (bare && !suffix && h >= 1 && h <= 6) {
    h += 12;
  }

  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function parseIndonesianDate(text: string, defaultYear = new Date().getFullYear()): string {
  const res = extractDate(text, defaultYear);
  return res ? res.ymd : '';
}

export function parseTime(text: string): string {
  return extractTime(text) || '';
}

/**
 * Parser Utama Chat WhatsApp Bebas Nilai Bawaan (S10)
 */
export function parseWhatsAppBookingChat(rawText: string): ParsedBookingChat {
  const rawLines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const warnings: string[] = [];

  let nama = '';
  let alamatKtp = '';
  let idPendukung: SupportIdType = 'SIM_C';
  let idPendukungDetected = false;
  let alamatSaatIni = '';
  let idSosmed = '';
  let nomorWa = '';
  let teleponDarurat = '';

  let startDateRaw = '';
  let startTimeRaw = '';
  let lokasiDelivery = '';

  let endDateRaw = '';
  let endTimeRaw = '';
  let lokasiPengembalian = '';

  let jenisMotorKeyword = '';
  let jumlahHelm = 2;
  let jumlahHelmExplicit = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const parsedLine = splitLabel(line);
    const label = parsedLine?.label || '';
    let value = parsedLine?.value || '';

    // P5: Dukungan nilai di baris berikutnya jika baris label bernilai kosong
    if (label && !value && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      if (!splitLabel(nextLine)) {
        value = nextLine.trim();
        i++; // lewati baris nilai yang telah diambil
      }
    }

    if (label && value) {
      // 1. P4: Periksa label darurat / emergency TERLEBIH DAHULU agar tidak tertimpa ke nama penyewa
      if (label.includes('darurat') || label.includes('emergency')) {
        teleponDarurat = value;
        continue;
      }

      // 2. P4: Nama penyewa (nama darurat telah tersaring di atas; first-wins)
      if (
        (label === 'nama' ||
          label === 'nama lengkap' ||
          label === 'nama penyewa' ||
          label === 'nama pemesan' ||
          label.startsWith('nama ') ||
          label.endsWith(' nama')) &&
        !label.includes('motor')
      ) {
        if (!nama) nama = value;
        continue;
      }

      // 3. Alamat sesuai KTP
      if (label.includes('alamat sesuai ktp') || label.includes('alamat ktp')) {
        alamatKtp = value;
        continue;
      }

      // 4. ID Pendukung (P6)
      if (label.includes('id pendukung') || label.includes('identitas') || label.startsWith('3.') || label === 'id') {
        const valUpper = value.toUpperCase();
        if (valUpper.includes('KTM')) {
          idPendukung = 'KTM';
          idPendukungDetected = true;
        } else if (valUpper.includes('PASPOR')) {
          idPendukung = 'Paspor';
          idPendukungDetected = true;
        } else if (valUpper.includes('NPWP')) {
          idPendukung = 'NPWP';
          idPendukungDetected = true;
        } else if (valUpper.includes('BPJS')) {
          idPendukung = 'BPJS';
          idPendukungDetected = true;
        } else if (valUpper.includes('PEGAWAI') || valUpper.includes('KARYAWAN')) {
          idPendukung = 'Kartu_Pegawai';
          idPendukungDetected = true;
        } else if (valUpper.includes('SIM')) {
          idPendukung = 'SIM_C';
          idPendukungDetected = true;
        } else if (valUpper.includes('KTP')) {
          idPendukung = 'SIM_C';
          idPendukungDetected = true;
          warnings.push('ID Pendukung tertulis KTP; telah dialihkan ke SIM C (KTP merupakan identitas utama wajib).');
        } else {
          idPendukungDetected = true;
        }
        continue;
      }

      // 5. Alamat saat ini (rumah/kos/hotel)
      if (
        label.includes('alamat saat ini') ||
        label.includes('rumah/kos/hotel') ||
        label.includes('tempat tinggal')
      ) {
        alamatSaatIni = value;
        continue;
      }

      // 6. ID Sosmed
      if (
        label.includes('id sosmed') ||
        label.includes('sosmed') ||
        label.includes('instagram') ||
        label.includes('tiktok')
      ) {
        idSosmed = value;
        continue;
      }

      // 7. No telp utama
      if (
        label.includes('no telp') ||
        label.includes('nomor telepon') ||
        label.includes('no wa') ||
        label.includes('telepon') ||
        label === 'hp'
      ) {
        nomorWa = value;
        continue;
      }

      // 8. Jadwal mulai
      if (
        label.includes('jadwal mulai') ||
        label.includes('mulai sewa') ||
        label.includes('tgl/bln (mulai') ||
        label.includes('hari/tgl/bln (mulai')
      ) {
        startDateRaw = value;
        const timeFound = extractTime(value);
        if (timeFound) startTimeRaw = timeFound;
        continue;
      }

      if (label.includes('jam ambil') || (line.includes('↗️') && label.includes('jam'))) {
        startTimeRaw = value;
        continue;
      }

      // 9. Jadwal selesai
      if (
        label.includes('jadwal selesai') ||
        label.includes('pengembalian') ||
        label.includes('tgl/bln (pengembalian') ||
        label.includes('hari/tgl/bln (pengembalian')
      ) {
        endDateRaw = value;
        const timeFound = extractTime(value);
        if (timeFound) endTimeRaw = timeFound;
        continue;
      }

      if (label.includes('jam pengembalian') || (line.includes('↙️') && label.includes('jam'))) {
        endTimeRaw = value;
        continue;
      }

      // 10. Lokasi delivery / pengantaran
      if (label.includes('lokasi pengantaran') || label.includes('lokasi delivery') || label.includes('antar')) {
        lokasiDelivery = value;
        continue;
      }

      // 11. Lokasi penjemputan (P6: nilai 'sama' menyalin lokasi pengantaran)
      if (label.includes('lokasi penjemputan') || label.includes('lokasi pengembalian') || label.includes('jemput')) {
        const lowerVal = value.trim().toLowerCase();
        if (/^(sama|sama\s+dengan\s+.*|sda|s\.d\.a|seperti\s+di\s+atas)$/i.test(lowerVal)) {
          lokasiPengembalian = lokasiDelivery || value;
        } else {
          lokasiPengembalian = value;
        }
        continue;
      }

      // 12. Model unit
      if (
        label.includes('model unit') ||
        label.includes('type unit') ||
        label.includes('tipe motor') ||
        label.includes('jenis motor')
      ) {
        jenisMotorKeyword = value;
        continue;
      }

      // 13. Jumlah helm
      if (label.includes('jumlah helm') || label.includes('helm')) {
        const count = parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(count) && count > 0) {
          jumlahHelm = Math.min(count, 2);
          jumlahHelmExplicit = true;
          if (count > 2) {
            warnings.push('Permintaan helm > 2 disesuaikan ke standar maks 2 Helm SNI.');
          }
        }
        continue;
      }
    }
  }

  // Ekstraksi Jadwal Mulai
  const currentYear = new Date().getFullYear();
  let jamTanggalMulai = '';
  const startDateExtracted = extractDate(startDateRaw, currentYear);
  const startTimeExtracted = extractTime(startTimeRaw || (startDateExtracted ? startDateExtracted.rest : startDateRaw));

  if (startDateExtracted && startTimeExtracted) {
    jamTanggalMulai = `${startDateExtracted.ymd}T${startTimeExtracted}`;
  } else if (startDateExtracted) {
    jamTanggalMulai = `${startDateExtracted.ymd}T09:00`;
    warnings.push(`Jam ambil tidak tertera pada chat; diset ke standar 09:00 WIB.`);
  } else {
    warnings.push('Jadwal mulai sewa tidak dapat dibaca dari teks chat; mohon tentukan manual.');
  }

  // Ekstraksi Jadwal Selesai
  let jamTanggalSelesai = '';
  const endDateExtracted = extractDate(endDateRaw, currentYear);
  const endTimeExtracted = extractTime(endTimeRaw || (endDateExtracted ? endDateExtracted.rest : endDateRaw));

  if (endDateExtracted && endTimeExtracted) {
    jamTanggalSelesai = `${endDateExtracted.ymd}T${endTimeExtracted}`;
  } else if (endDateExtracted) {
    jamTanggalSelesai = `${endDateExtracted.ymd}T09:00`;
    warnings.push(`Jam selesai tidak tertera pada chat; diset ke standar 09:00 WIB.`);
  } else {
    warnings.push('Jadwal pengembalian sewa tidak dapat dibaca dari teks chat; mohon tentukan manual.');
  }

  // Verifikasi Urutan Waktu
  if (jamTanggalMulai && jamTanggalSelesai) {
    if (jamTanggalSelesai <= jamTanggalMulai) {
      warnings.push('Peringatan: Jadwal selesai sama atau mendahului jadwal mulai.');
    }
  }

  if (!nama) {
    warnings.push('Nama penyewa belum terdeteksi dari chat.');
  }
  if (!nomorWa) {
    warnings.push('Nomor WhatsApp belum terdeteksi dari chat.');
  }
  if (!jenisMotorKeyword) {
    warnings.push('Model unit motor belum terdeteksi dari chat.');
  }

  const catatanRapi = [
    `Penyewa: ${nama || '-'}`,
    `WA: ${toWaNumber(nomorWa) || nomorWa || '-'}`,
    `ID Pendukung: ${idPendukungDetected ? idPendukung : 'SIM C (Belum terverifikasi)'}`,
    `Mulai: ${jamTanggalMulai ? jamTanggalMulai.replace('T', ' ') + ' WIB' : 'Perlu diatur'}`,
    `Selesai: ${jamTanggalSelesai ? jamTanggalSelesai.replace('T', ' ') + ' WIB' : 'Perlu diatur'}`,
    `Unit Motor: ${jenisMotorKeyword || 'Belum dipilih'}`,
    `Helm: ${jumlahHelm} Helm`,
    `Antar: ${lokasiDelivery || 'Ambil di Pool'}`,
    `Jemput: ${lokasiPengembalian || 'Kembali di Pool'}`,
  ].join(' | ');

  return {
    nama,
    alamatKtp,
    idPendukung,
    alamatSaatIni,
    idSosmed,
    nomorWa: toWaNumber(nomorWa) || nomorWa,
    teleponDarurat,
    jamTanggalMulai,
    jamTanggalSelesai,
    lokasiDelivery,
    lokasiPengembalian,
    jenisMotorKeyword,
    jumlahHelm,
    catatanRapi,
    warnings,
  };
}
