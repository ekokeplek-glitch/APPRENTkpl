import {
  BookingRecord,
  MotorModel,
  OvertimePenaltyResult,
  RyokoDatabase,
  PhysicalUnit,
  BookingStatus,
  TariffCategory,
  DurationOption,
} from '../types/ryoko';

export const TURNAROUND_BUFFER_SECONDS = 60 * 60; // 60 menit = 3600 detik (BR-04 revisi)

/**
 * Redaksi NIK 16 digit otomatis (Snippet F - F-14)
 * Menyamarkan NIK 16 digit menjadi ************XXXX tanpa merusak nomor HP atau string lain
 */
export const redactNik = (s: string): string => {
  if (!s) return '';
  return s.replace(/(?<!\d)(?:\d[ .-]?){15}\d(?!\d)/g, m => {
    const digits = m.replace(/\D/g, '');
    return '************' + digits.slice(-4);
  });
};

/**
 * Pembersih teks standar dengan redaksi NIK otomatis (F-14)
 */
export function sanitizeTextNoNik(text: string): string {
  if (!text) return '';
  return redactNik(text.trim());
}

/**
 * Deteksi pola NIK 16 digit
 */
export function containsNikPattern(text: string): boolean {
  if (!text) return false;
  return /(?<!\d)(?:\d[ .-]?){15}\d(?!\d)/.test(text);
}

/**
 * Format string tanggal ke Epoch detik WIB
 * Jika format adalah YYYY-MM-DDTHH:mm, tambahkan :00+07:00 agar waktu selalu WIB independen dari zona perangkat
 */
export function parseWibToEpoch(dateTimeStr: string): number {
  if (!dateTimeStr) return 0;
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTimeStr)
    ? `${dateTimeStr}:00+07:00`
    : dateTimeStr;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : Math.floor(t / 1000);
}

/**
 * Epoch -> nilai string input datetime-local dalam zona WIB (Asia/Jakarta)
 * Mencegah pergeseran 7 jam UTC pada perangkat pengguna
 */
export const epochToWibInput = (epoch: number): string => {
  if (!epoch) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(epoch * 1000).replace(' ', 'T');
};

/**
 * Format epoch detik ke tampilan tanggal WIB
 */
export function formatEpochToWib(epoch: number): string {
  if (!epoch) return '-';
  const d = new Date(epoch * 1000);
  return (
    d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    }) +
    ' WIB'
  );
}

/**
 * Periksa apakah jadwal berada di luar jam operasional (default 07:00 - 23:00 WIB) (D-06)
 */
export function isOutsideOperationalHours(
  dateTimeStr: string,
  settings?: { jamBuka?: number; jamTutup?: number }
): boolean {
  if (!dateTimeStr) return false;
  const epoch = parseWibToEpoch(dateTimeStr);
  if (!epoch) return false;
  const d = new Date(epoch * 1000);
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    hour12: false,
  }).format(d);
  const hours = parseInt(hourStr, 10);
  const open = settings?.jamBuka ?? 7;
  const close = settings?.jamTutup ?? 23;
  return hours < open || hours >= close;
}

/**
 * Generator Nomor Booking RYK-YYYYMMDD-XXX bebas tabrakan sequence (Snippet D - F-10)
 */
export function generateBookingNumber(
  dbOrBookings: RyokoDatabase | Array<{ noBooking?: string; nomorBooking?: string }>,
  now = new Date()
): string {
  const bookings = Array.isArray(dbOrBookings) ? dbOrBookings : dbOrBookings.bookings;
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .replaceAll('-', '');
  const prefix = `RYK-${ymd}-`;

  const maxSeq = bookings.reduce((mx, b) => {
    const code = ('noBooking' in b && b.noBooking) ? b.noBooking : ((b as { nomorBooking?: string }).nomorBooking || '');
    if (code && code.startsWith(prefix)) {
      const seq = parseInt(code.slice(prefix.length), 10) || 0;
      return Math.max(mx, seq);
    }
    return mx;
  }, 0);

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

/**
 * Generator ID numerik berikutnya yang aman dari tabrakan akibat penghapusan data (Snippet D)
 */
export const nextId = (rows: Array<{ id: number }>): number =>
  rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Kalkulator Denda Keterlambatan Cerdas (D-27 & BR-04/05 Revisi)
 * - Toleransi sewa harian/bulanan: 60 menit (BR-04).
 * - ShortRent (3j, 6j, 9j): Step-Up ke paket jam di atasnya jika keterlambatan >= 60 menit.
 * - ShortRent 12 Jam: Keterlambatan >= 60 menit dikenakan denda harian per jam.
 */
export function calculateOvertimePenalty(
  booking: BookingRecord,
  motor: MotorModel,
  actualReturnEpoch?: number
): OvertimePenaltyResult {
  const endEpoch = booking.endEpoch || parseWibToEpoch(booking.jamTanggalSelesai);
  let returnEpoch = actualReturnEpoch || booking.actualReturnEpoch;
  if (!returnEpoch && booking.selesaiAt) {
    const parsed = parseWibToEpoch(booking.selesaiAt);
    if (parsed > 0) returnEpoch = parsed;
  }
  if (!returnEpoch) {
    returnEpoch = Math.floor(Date.now() / 1000);
  }

  const dendaHarian = motor.dendaHarianPerJam || 20000;

  if (!endEpoch || returnEpoch <= endEpoch) {
    return {
      terlambat: false,
      menitTelat: 0,
      nominalDenda: 0,
      dendaFormat: 'Rp 0 (Tepat Waktu)',
      keterangan: 'Tepat waktu / belum melewati jadwal kembali.',
    };
  }

  const lateSeconds = returnEpoch - endEpoch;
  const lateMinutes = Math.floor(lateSeconds / 60);

  // KASUS A: Kategori ShortRent Jam (D-27)
  if (booking.kategoriTarif === 'jam' || ['3_jam', '6_jam', '9_jam', '12_jam'].includes(booking.pilihanDurasi)) {
    if (lateMinutes < 60) {
      return {
        terlambat: false,
        menitTelat: lateMinutes,
        nominalDenda: 0,
        dendaFormat: 'Rp 0 (Toleransi < 60 mnt)',
        keterangan: `Terlambat ${lateMinutes} menit (masih dalam toleransi < 60 menit ShortRent D-27).`,
      };
    }

    const p3 = motor.harga3Jam;
    const p6 = motor.harga6Jam;
    const p9 = motor.harga9Jam;
    const p12 = motor.harga12Jam;

    // ShortRent 12 Jam -> Denda sama dengan denda harian per jam
    if (booking.pilihanDurasi === '12_jam') {
      const lateHours = Math.ceil(lateMinutes / 60);
      const nominal = lateHours * dendaHarian;
      return {
        terlambat: true,
        menitTelat: lateMinutes,
        nominalDenda: nominal,
        dendaFormat: formatRupiah(nominal),
        keterangan: `ShortRent 12 Jam telat ${lateMinutes} mnt (${lateHours} jam) -> Dikenakan Denda Harian (${formatRupiah(dendaHarian)}/jam) [D-27].`,
      };
    }

    // ShortRent 3 Jam, 6 Jam, 9 Jam -> Step-Up ke paket jam di atasnya
    let baseHours = 3;
    let basePrice = p3;
    if (booking.pilihanDurasi === '6_jam') {
      baseHours = 6;
      basePrice = p6;
    } else if (booking.pilihanDurasi === '9_jam') {
      baseHours = 9;
      basePrice = p9;
    }

    const totalUsedMinutes = baseHours * 60 + lateMinutes;
    let targetTier = '';
    let nominal = 0;

    if (baseHours === 3 && totalUsedMinutes < 6 * 60 + 60) {
      targetTier = '6 Jam';
      nominal = Math.max(0, p6 - basePrice);
    } else if (baseHours <= 6 && totalUsedMinutes < 9 * 60 + 60) {
      targetTier = '9 Jam';
      nominal = Math.max(0, p9 - basePrice);
    } else if (totalUsedMinutes < 12 * 60 + 60) {
      targetTier = '12 Jam';
      nominal = Math.max(0, p12 - basePrice);
    } else {
      const extraMins = totalUsedMinutes - 12 * 60;
      const extraHours = Math.ceil(extraMins / 60);
      targetTier = `12 Jam + ${extraHours} Jam Denda Harian`;
      nominal = Math.max(0, p12 - basePrice) + extraHours * dendaHarian;
    }

    return {
      terlambat: true,
      menitTelat: lateMinutes,
      nominalDenda: nominal,
      dendaFormat: formatRupiah(nominal),
      keterangan: `ShortRent ${baseHours} Jam telat ${lateMinutes} mnt (>=60 mnt) -> Naik Kategori ke ${targetTier} [D-27].`,
    };
  }

  // KASUS B: Kategori Harian / Mingguan / Bulanan / Paket (Toleransi 60 Menit - BR-04 revisi)
  if (lateMinutes <= 60) {
    return {
      terlambat: false,
      menitTelat: lateMinutes,
      nominalDenda: 0,
      dendaFormat: 'Rp 0 (Toleransi <= 60 mnt)',
      keterangan: `Terlambat ${lateMinutes} menit (masih dalam batas toleransi 60 menit sewa harian/bulanan).`,
    };
  }

  const lateHours = Math.ceil(lateMinutes / 60);
  const nominal = lateHours * dendaHarian;

  return {
    terlambat: true,
    menitTelat: lateMinutes,
    nominalDenda: nominal,
    dendaFormat: formatRupiah(nominal),
    keterangan: `Sewa Harian/Bulanan telat ${lateMinutes} mnt (${lateHours} jam) x ${formatRupiah(dendaHarian)}/jam.`,
  };
}

/**
 * Cek Ketersediaan 1 Unit Fisik Tertentu pada Rentang Waktu (Buffer 60 Menit)
 */
export function isUnitAvailableForRange(
  unitId: number,
  reqStartEpoch: number,
  reqEndEpoch: number,
  db: RyokoDatabase,
  excludeBookingId?: number
): boolean {
  if (!unitId || reqEndEpoch <= reqStartEpoch) return false;

  const unit = db.units.find(u => u.id === unitId);
  if (!unit || unit.statusServis === 'servis') return false;

  // Cek tracking status
  const track = db.tracking.find(t => t.unitId === unitId);
  if (track && (track.statusPosisi === 'servis' || track.statusPosisi === 'kurir')) {
    // Unit sedang servis atau dipakai kurir
    return false;
  }

  const nowEpoch = Math.floor(Date.now() / 1000);

  // Periksa semua transaksi aktif yang mengunci unit ini
  const activeBookings = db.bookings.filter(
    b =>
      b.unitId === unitId &&
      (b.status === 'ryokou_approved' || b.status === 'ryokou_disewa' || b.status === 'ryokou_diservis') &&
      (!excludeBookingId || b.id !== excludeBookingId)
  );

  for (const b of activeBookings) {
    const bStart = b.startEpoch || parseWibToEpoch(b.jamTanggalMulai);
    const bEnd = b.endEpoch || parseWibToEpoch(b.jamTanggalSelesai);
    const effectiveEnd = b.status === 'ryokou_disewa' ? Math.max(bEnd, nowEpoch) : bEnd;

    const bufferedStart = bStart - TURNAROUND_BUFFER_SECONDS;
    const bufferedEnd = effectiveEnd + TURNAROUND_BUFFER_SECONDS;

    if (reqStartEpoch < bufferedEnd && reqEndEpoch > bufferedStart) {
      return false;
    }
  }

  return true;
}

/**
 * Ambil Daftar Seluruh Unit Fisik yang Tersedia Bebas Bentrok untuk Model Motor Tertentu (Buffer 60 Mnt)
 */
export function getAvailableUnitsForModel(
  motorId: number,
  startEpoch: number,
  endEpoch: number,
  db: RyokoDatabase,
  excludeBookingId?: number
): Array<{ unit: PhysicalUnit; label: string; pool: string }> {
  const modelUnits = db.units.filter(u => u.motorId === motorId && u.statusServis === 'aktif');

  const available: Array<{ unit: PhysicalUnit; label: string; pool: string }> = [];

  for (const u of modelUnits) {
    if (isUnitAvailableForRange(u.id, startEpoch, endEpoch, db, excludeBookingId)) {
      const track = db.tracking.find(t => t.unitId === u.id);
      const poolLabel = track?.poolParkir === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)';
      available.push({
        unit: u,
        label: `${u.kodeUnit} (${u.nomorPlat}) — Parkir di ${poolLabel}`,
        pool: track?.poolParkir || u.poolLokasi,
      });
    }
  }

  return available;
}

/**
 * Indikator Stok Biner Tegas Publik (D-05)
 */
export function getPublicStockIndicator(
  motorId: number,
  db: RyokoDatabase
): { status: 'tersedia' | 'habis'; label: string } {
  const nowEpoch = Math.floor(Date.now() / 1000);
  const oneHourLater = nowEpoch + 3600;

  const avail = getAvailableUnitsForModel(motorId, nowEpoch, oneHourLater, db);
  if (avail.length > 0) {
    return { status: 'tersedia', label: 'Tersedia' };
  }
  return { status: 'habis', label: 'Habis (Konfirmasi WA)' };
}

/**
 * Matriks Transisi Status Resmi RyokoRent (Snippet C - BR-02)
 */
export const NEXT_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  ryokou_booking: ['ryokou_approved'],
  ryokou_approved: ['ryokou_disewa', 'ryokou_booking'],
  ryokou_disewa: ['ryokou_selesai', 'ryokou_diservis'],
  ryokou_diservis: ['ryokou_disewa', 'ryokou_selesai'],
  ryokou_selesai: [],
};

/**
 * Validasi transisi status pemesanan dengan guard ketersediaan & kepemilikan unit (F-04, F-05, F-08)
 * Mengembalikan string pesan galat jika tidak sah, atau null bila transisi sah.
 */
export function checkTransition(
  booking: BookingRecord,
  to: BookingStatus,
  db: RyokoDatabase,
  unitId: number | null | undefined = booking.unitId
): string | null {
  const allowed = NEXT_STATUS_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(to)) {
    return `Transisi status '${booking.status}' ke '${to}' tidak diizinkan.`;
  }

  if (to === 'ryokou_approved' || to === 'ryokou_disewa') {
    if (!unitId) {
      return 'Unit fisik belum dipilih atau belum dialokasikan.';
    }
    // Periksa apakah unit sedang dibawa oleh booking lain yang berstatus disewa
    const heldByOther = db.bookings.some(
      o => o.id !== booking.id && o.unitId === unitId && o.status === 'ryokou_disewa'
    );
    if (heldByOther) {
      return 'Unit fisik ini saat ini masih dibawa oleh penyewa lain dan belum dikembalikan.';
    }
  }

  if (to === 'ryokou_approved') {
    const start = booking.startEpoch || parseWibToEpoch(booking.jamTanggalMulai);
    const end = booking.endEpoch || parseWibToEpoch(booking.jamTanggalSelesai);
    if (!isUnitAvailableForRange(unitId!, start, end, db, booking.id)) {
      return 'Unit fisik bentrok jadwal dengan transaksi sewa lain (buffer pemulihan 60 menit).';
    }
  }

  return null;
}

/**
 * Kalkulasi tarif sewa cerdas berdasarkan model motor, kategori tarif, durasi, dan rentang tanggal (F-03)
 * Mendukung sewa multi-hari (2-6 hari prorata, 7+ hari mingguan, 30+ hari bulanan)
 */
export function calculateDynamicRentalTariff(
  motor: MotorModel,
  kategoriTarif: TariffCategory,
  pilihanDurasi: DurationOption,
  startEpoch: number,
  endEpoch: number,
  selectedPackage?: { id: number; namaPaket: string; hargaPaket: number }
): { totalHarga: number; labelDurasi: string } {
  // Jika kategori paket wisata
  if (kategoriTarif === 'paket') {
    const harga = selectedPackage?.hargaPaket || 260000;
    const label = selectedPackage?.namaPaket || 'Paket Promo Wisata Bromo';
    return { totalHarga: harga, labelDurasi: label };
  }

  // Jika durasi jam (ShortRent)
  if (kategoriTarif === 'jam') {
    if (pilihanDurasi === '3_jam') return { totalHarga: motor.harga3Jam, labelDurasi: 'ShortRent 3 Jam' };
    if (pilihanDurasi === '6_jam') return { totalHarga: motor.harga6Jam, labelDurasi: 'ShortRent 6 Jam' };
    if (pilihanDurasi === '9_jam') return { totalHarga: motor.harga9Jam, labelDurasi: 'ShortRent 9 Jam' };
    if (pilihanDurasi === '12_jam') return { totalHarga: motor.harga12Jam, labelDurasi: 'ShortRent 12 Jam' };
  }

  // Kategori Harian / Mingguan / Bulanan dihitung dari selisih waktu aktual
  if (startEpoch && endEpoch && endEpoch > startEpoch) {
    const totalSeconds = endEpoch - startEpoch;
    const totalHours = totalSeconds / 3600;

    // Jika >= 28 hari (1 Bulan atau lebih)
    if (totalHours >= 28 * 24) {
      const months = Math.max(1, Math.round(totalHours / (30 * 24)));
      const totalHarga = (motor.harga1Bulan || 1750000) * months;
      return {
        totalHarga,
        labelDurasi: months > 1 ? `Sewa ${months} Bulan (${months * 30} Hari)` : 'Sewa 1 Bulan (30 Hari Penuh)',
      };
    }

    // Jika >= 7 hari
    if (totalHours >= 7 * 24) {
      const weeks = Math.floor(totalHours / (7 * 24));
      const extraHours = totalHours - weeks * 7 * 24;
      const extraDays = Math.ceil(extraHours / 24);
      const totalHarga = weeks * motor.harga1Minggu + extraDays * motor.harga1Hari;
      return {
        totalHarga,
        labelDurasi: extraDays > 0 ? `Sewa ${weeks} Minggu + ${extraDays} Hari` : `Sewa ${weeks} Minggu (7 Hari)`,
      };
    }

    // 1 sampai 6 hari (Multi-hari prorata harian)
    const days = Math.max(1, Math.ceil(totalHours / 24));
    return {
      totalHarga: days * motor.harga1Hari,
      labelDurasi: days === 1 ? '1 Hari (24 Jam)' : `Sewa ${days} Hari (${days * 24} Jam)`,
    };
  }

  // Fallback ke pilihanDurasi tombol jika tanggal belum lengkap
  if (pilihanDurasi === '1_bulan') return { totalHarga: motor.harga1Bulan || 1750000, labelDurasi: '1 Bulan (30 Hari)' };
  if (pilihanDurasi === '1_minggu') return { totalHarga: motor.harga1Minggu, labelDurasi: '1 Minggu (7 Hari)' };
  return { totalHarga: motor.harga1Hari, labelDurasi: '1 Hari (24 Jam)' };
}
