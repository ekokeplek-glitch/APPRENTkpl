/**
 * Modul Normalisasi & Penanganan Nomor Telepon WhatsApp RyokoRent (S11)
 * Single Source of Truth untuk konversi nomor telepon ke format WhatsApp internasional (628xxx).
 * Menggantikan normalizer terfragmentasi dan menghapus fallback nomor dummy palsu.
 */

/**
 * Konversi nomor input mentah ke nomor WhatsApp internasional yang valid.
 * - Format yang valid: 628 diikuti 8 sampai 12 digit (total 11 - 15 digit).
 * - Menangani format: +62, 08, +6208, 8xxx, pemisah spasi, strip, tanda kurung.
 * - Mengembalikan null jika nomor kosong atau tidak valid (misal telepon rumah 0341).
 */
export function toWaNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  
  // Bersihkan karakter non-digit dan awalan '+'
  let d = raw.replace(/[^\d+]/g, '').replace(/^\+/, '');
  
  // Tangani kesalahan umum input: +62 08xxx -> 6208xxx -> 628xxx
  if (d.startsWith('620')) {
    d = '62' + d.slice(3);
  }
  
  // Tangani awalan lokal: 08xxx -> 628xxx
  if (d.startsWith('0')) {
    d = '62' + d.slice(1);
  } else if (d.startsWith('8')) {
    // Tangani input tanpa angka 0: 812xxx -> 62812xxx
    d = '62' + d;
  }
  
  // Validasi format nomor seluler Indonesia (628xxxxxxxx)
  // Nomor HP Indonesia: 628 + 8 s/d 12 digit
  if (/^628\d{8,12}$/.test(d)) {
    return d;
  }
  
  return null;
}

/**
 * Format nomor untuk tampilan manusia yang rapi (+62 8xx-xxxx-xxxx)
 */
export function formatPhoneDisplay(raw: string | undefined | null): string {
  if (!raw) return '-';
  const wa = toWaNumber(raw);
  if (!wa) return raw.trim() || '-';
  
  // Format: +62 812-3456-7890
  const rest = wa.slice(2); // '81234567890'
  if (rest.length <= 9) {
    return `+62 ${rest.slice(0, 3)}-${rest.slice(3)}`;
  }
  return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
}

/**
 * Buat tautan WhatsApp API resmi (https://api.whatsapp.com/send?phone=...&text=...)
 * Mengembalikan null jika nomor tidak valid, sehingga UI dapat menonaktifkan tombol atau menampilkan peringatan.
 */
export function formatWaLink(phone: string | undefined | null, text: string): string | null {
  const wa = toWaNumber(phone);
  if (!wa) return null;
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(wa)}&text=${encodeURIComponent(text)}`;
}
