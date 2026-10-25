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
 * Menerapkan spesifikasi Snippet B audit @kepek:
 * - Pemecahan label hanya pada titik dua pertama (splitLabel)
 * - Ekstraksi tanggal ISO dan teks lokal Indonesia dengan validasi kalender nyata (validYmd)
 * - Ekstraksi waktu 24-jam akurat (extractTime)
 * - Menghilangkan 100% fallback statis/palsu (bebas hardcoded 24-25 Okt, Begawan, Scoopy)
 * - Mengembalikan daftar `warnings` untuk field yang gagal terbaca
 */

import { SupportIdType } from '../types/ryoko';

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
 * Normalisasi nomor telepon ke format internasional 628... (F-21)
 * Menangani +62, 08, dan salah input +62 08...
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.trim().replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);
  if (clean.startsWith('6208')) {
    clean = '628' + clean.slice(4);
  } else if (clean.startsWith('08')) {
    clean = '628' + clean.slice(2);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  }
  return clean;
}

/**
 * Pemisahan label hanya pada titik dua pertama (Snippet B)
 * Mencegah pemotongan nilai waktu seperti "15:40"
 */
export function splitLabel(line: string): { label: string; value: string } | null {
  const i = line.indexOf(':');
  if (i < 0) return null;
  return {
    label: line
      .slice(0, i)
      .replace(/^[^\p{L}0-9]+/u, '')
      .trim()
      .toLowerCase(),
    value: line.slice(i + 1).trim(),
  };
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
 * Ekstraksi tanggal dengan prioritas ISO (YYYY-MM-DD), slash/dash (DD/MM/YYYY), dan nama bulan
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

  // 2. Format DD/MM/YYYY atau DD-MM-YYYY atau DD/MM
  m = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (m) {
    const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : nowYear;
    const ymd = validYmd(y, +m[2], +m[1]);
    if (ymd) return { ymd, rest: cut(text, m) };
  }

  // 3. Format nama bulan Indonesia: "24 Oktober 2026" atau "24 okt"
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
 * Ekstraksi waktu jam dan menit 24 jam (mendukung 15:40, 15.40, 3 sore, jam 3)
 */
export function extractTime(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  let h: number;
  let min = 0;
  let suffix: string | undefined;
  let bare = false;

  let m = t.match(/\b(\d{1,2})[.:](\d{2})\s*(pagi|siang|sore|malam|am|pm)?\b/);
  if (m) {
    h = +m[1];
    min = +m[2];
    suffix = m[3];
  } else {
    m = t.match(/\b(?:jam\s*)?(\d{1,2})\s*(pagi|siang|sore|malam|am|pm)?\b/);
    if (!m) return null;
    h = +m[1];
    suffix = m[2];
    bare = true;
  }

  if ((suffix === 'sore' || suffix === 'malam' || suffix === 'pm') && h < 12) {
    h += 12;
  }
  if (suffix === 'am' && h === 12) {
    h = 0;
  }
  // Standar rental: angka tunggal 1..6 tanpa suffix diasumsikan sore (e.g. "jam 3" -> 15:00)
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
 * Parser Utama Chat WhatsApp Bebas Nilai Bawaan (Snippet B)
 */
export function parseWhatsAppBookingChat(rawText: string): ParsedBookingChat {
  const lines = rawText
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

  for (const line of lines) {
    const parsedLine = splitLabel(line);
    const label = parsedLine?.label || '';
    const value = parsedLine?.value || '';

    // Jika line memiliki format label : value
    if (parsedLine && value) {
      // 1. Nama
      if (label.includes('nama') && !label.includes('motor')) {
        nama = value;
        continue;
      }

      // 2. Alamat sesuai KTP
      if (label.includes('alamat sesuai ktp') || label.includes('alamat ktp')) {
        alamatKtp = value;
        continue;
      }

      // 3. ID Pendukung
      if (label.includes('id pendukung') || label.includes('identitas') || label.startsWith('3.')) {
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
          warnings.push('ID Pendukung tertulis KTP; gunakan kartu sekunder (SIM C/KTM/NPWP/BPJS).');
        } else {
          idPendukungDetected = true;
        }
        continue;
      }

      // 4. Alamat saat ini (rumah/kos/hotel)
      if (
        label.includes('alamat saat ini') ||
        label.includes('rumah/kos/hotel') ||
        label.includes('tempat tinggal')
      ) {
        alamatSaatIni = value;
        continue;
      }

      // 5. ID Sosmed
      if (
        label.includes('id sosmed') ||
        label.includes('sosmed') ||
        label.includes('instagram') ||
        label.includes('tiktok')
      ) {
        idSosmed = value;
        continue;
      }

      // 6. No telp utama
      if (
        (label.includes('no telp') ||
          label.includes('nomor telepon') ||
          label.includes('no wa') ||
          label.includes('telepon')) &&
        !label.includes('darurat')
      ) {
        nomorWa = value;
        continue;
      }

      // 7. No telp darurat
      if (label.includes('darurat') || label.includes('emergency')) {
        teleponDarurat = value;
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

      // 11. Lokasi penjemputan
      if (label.includes('lokasi penjemputan') || label.includes('lokasi pengembalian') || label.includes('jemput')) {
        lokasiPengembalian = value;
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
    warnings.push('Tipe model unit motor belum terdeteksi dari chat.');
  }

  // Catatan rapi
  const noteParts: string[] = [];
  if (alamatKtp) noteParts.push(`KTP: ${alamatKtp}`);
  if (alamatSaatIni) noteParts.push(`Alamat Saat Ini: ${alamatSaatIni}`);
  if (idSosmed && idSosmed !== '-') noteParts.push(`Sosmed: ${idSosmed}`);
  if (teleponDarurat) noteParts.push(`Kontak Darurat: ${teleponDarurat}`);
  noteParts.push(`${jumlahHelm} Helm SNI`);

  return {
    nama: nama.trim(),
    alamatKtp: alamatKtp.trim(),
    idPendukung,
    alamatSaatIni: alamatSaatIni.trim(),
    idSosmed: idSosmed.trim(),
    nomorWa: normalizePhoneNumber(nomorWa),
    teleponDarurat: teleponDarurat.trim(),
    jamTanggalMulai,
    jamTanggalSelesai,
    lokasiDelivery: lokasiDelivery.trim(),
    lokasiPengembalian: lokasiPengembalian.trim() || lokasiDelivery.trim(),
    jenisMotorKeyword: jenisMotorKeyword.trim(),
    jumlahHelm,
    catatanRapi: noteParts.join(' | '),
    warnings,
  };
}

/**
 * Format teks resmi WhatsApp untuk konfirmasi order / serah terima berbasis 13 field
 */
export function formatOfficialBookingResponse(booking: {
  noBooking: string;
  nama: string;
  alamatKtp?: string;
  idPendukung?: string;
  alamatSaatIni?: string;
  idSosmed?: string;
  nomorWa: string;
  noTelpDarurat?: string;
  motorNama: string;
  kodeUnit?: string;
  tglMulai: string;
  jamMulai: string;
  tglSelesai: string;
  jamSelesai: string;
  lokasiAntar: string;
  lokasiJemput: string;
  totalHarga: number;
  jumlahHelm?: number;
}): string {
  const helm = booking.jumlahHelm || 2;
  const unitInfo = booking.kodeUnit
    ? `${booking.motorNama} [${booking.kodeUnit}]`
    : booking.motorNama;

  return `🛵 *KONFIRMASI BOOKING RYOKO RENT MOTOR MALANG & BATU* 🛵
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Halo Kak *${booking.nama}*, terima kasih telah memesan di Ryoko Rent!
Berikut rekap rincian pemesanan resmi Anda:

📋 *DETAIL PEMESANAN (13 POIN BAKU):*
1. Nama              : *${booking.nama}*
2. Alamat KTP        : ${booking.alamatKtp || '-'}
3. ID Pendukung      : ${booking.idPendukung || 'SIM C'}
4. Alamat Saat Ini   : 🏠 *${booking.alamatSaatIni || booking.lokasiAntar}*
5. ID Sosmed         : ${booking.idSosmed || '-'}
6. No. Telp / WA     : *${booking.nomorWa}*
7. No. Telp Darurat  : ${booking.noTelpDarurat || '-'}
8. Jadwal Mulai      : ↗️ *${booking.tglMulai}*, Pukul *${booking.jamMulai} WIB*
9. Jadwal Selesai    : ↙️ *${booking.tglSelesai}*, Pukul *${booking.jamSelesai} WIB*
10. Lokasi Antar     : 📍 *${booking.lokasiAntar}*
11. Lokasi Jemput    : 📍 *${booking.lokasiJemput}*
12. Model Unit       : 🏍️ *${unitInfo}*
13. Jumlah Helm      : 🪖 *${helm} Helm SNI* (+ Jas Hujan & Phone Holder)

💰 *RINCIAN BIAYA & STATUS:*
• Total Biaya : *Rp ${booking.totalHarga.toLocaleString('id-ID')}*
• Status Sewa : *TERJADWAL / SIAP ANTAR*

⚠️ *KETENTUAN:*
• Tunjukkan E-KTP asli & dokumen pendukung saat kurir menyerahkan unit di lokasi.
• Terima kasih dan selamat beraktivitas di Malang & Batu bersama Ryoko Rent! 🌟`;
}
