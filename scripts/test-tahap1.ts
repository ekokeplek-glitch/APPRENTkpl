/**
 * Skrip Uji Karakterisasi ZLCE Tahap 1
 * Menguji toWaNumber (S11), redactNik (S12-A6), dan parseWhatsAppBookingChat (S10: P1-P6).
 */

import { toWaNumber } from '../src/utils/phone';
import { redactNik, isPlausibleNik } from '../src/services/bookingEngine';
import {
  extractDate,
  extractTime,
  parseWhatsAppBookingChat,
  splitLabel,
} from '../src/utils/whatsappChatParser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, actual?: any, expected?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (actual !== undefined || expected !== undefined) {
      console.error(`     Actual:   ${JSON.stringify(actual)}`);
      console.error(`     Expected: ${JSON.stringify(expected)}`);
    }
    failed++;
  }
}

console.log('=== TEST SUITE TAHAP 1: FUNGSI MURNI, NORMALIZER & PARSER ===\n');

// 1. UJI S11: toWaNumber (N1, N2)
console.log('--- 1. Uji Normalisasi Nomor WhatsApp (toWaNumber) ---');
assert(toWaNumber('') === null, 'Nomor kosong menghasilkan null', toWaNumber(''), null);
assert(toWaNumber(null) === null, 'Nomor null menghasilkan null', toWaNumber(null), null);
assert(
  toWaNumber('+62 0812-3456-7890') === '6281234567890',
  'Format +62 0812... dinormalisasi ke 6281234567890',
  toWaNumber('+62 0812-3456-7890'),
  '6281234567890'
);
assert(
  toWaNumber('0812 3456 7890') === '6281234567890',
  'Format 0812... dinormalisasi ke 6281234567890',
  toWaNumber('0812 3456 7890'),
  '6281234567890'
);
assert(
  toWaNumber('812345678') === '62812345678',
  'Format 812... dinormalisasi ke 62812345678',
  toWaNumber('812345678'),
  '62812345678'
);
assert(
  toWaNumber('(0341) 123456') === null,
  'Telepon rumah (0341) ditolak menghasilkan null (bukan nomor HP WA)',
  toWaNumber('(0341) 123456'),
  null
);

// 2. UJI S12-A6: redactNik (False positive kontak darurat)
console.log('\n--- 2. Uji Redaksi NIK Ketat (redactNik & isPlausibleNik) ---');
const emergencyText = 'darurat 081234567890 0819';
assert(
  redactNik(emergencyText) === emergencyText,
  'Pasangan nomor telepon darurat TIDAK terpotong (A6 false positive fix)',
  redactNik(emergencyText),
  emergencyText
);

const validNik = 'NIK 3573011205980001';
assert(
  redactNik(validNik) === 'NIK ************0001',
  'NIK valid 16 digit Malang tersensor ************0001',
  redactNik(validNik),
  'NIK ************0001'
);

const spacedNik = '3573 0112 0598 0001';
assert(
  redactNik(spacedNik) === '************0001',
  'NIK berformat 4-4-4-4 tersensor ************0001',
  redactNik(spacedNik),
  '************0001'
);

const nonNik1 = '6281234567890123';
assert(
  redactNik(nonNik1) === nonNik1,
  '16 digit acak tanpa kode provinsi/tanggal lahir valid tidak disensor',
  redactNik(nonNik1),
  nonNik1
);

const nonNik2 = '1234567890123456';
assert(
  redactNik(nonNik2) === nonNik2,
  '1234567890123456 tidak lolos struktur NIK plausibility',
  redactNik(nonNik2),
  nonNik2
);

// 3. UJI S10: WhatsApp Chat Parser (P1-P6)
console.log('\n--- 3. Uji Parser Chat WhatsApp (P1 s/d P6) ---');

// P1: "12 malam" -> 00:00
assert(extractTime('jam 12 malam') === '00:00', 'P1: "jam 12 malam" menghasilkan 00:00', extractTime('jam 12 malam'), '00:00');
assert(extractTime('12.00 malam') === '00:00', 'P1: "12.00 malam" menghasilkan 00:00', extractTime('12.00 malam'), '00:00');
assert(extractTime('12 siang') === '12:00', '12 siang tetap 12:00', extractTime('12 siang'), '12:00');

// P2: Angka tanggal tidak dianggap jam tanpa kata jam/pukul
assert(
  extractTime('5 November') === null,
  'P2: "5 November" TIDAK diekstrak sebagai 17:00 (menghasilkan null)',
  extractTime('5 November'),
  null
);
assert(
  extractTime('2 Nov 2026') === null,
  'P2: "2 Nov 2026" TIDAK diekstrak sebagai 14:00 (menghasilkan null)',
  extractTime('2 Nov 2026'),
  null
);

// P3: "Jam pengembalian 3" (tanpa titik dua)
const splitP3 = splitLabel('Jam pengembalian 3');
assert(
  splitP3 !== null && splitP3.label.includes('pengembalian') && splitP3.value === '3',
  'P3: splitLabel menangani "Jam pengembalian 3" tanpa titik dua',
  splitP3
);
assert(
  extractTime('jam 3') === '15:00',
  'P3: "jam 3" sore diekstrak sebagai 15:00',
  extractTime('jam 3'),
  '15:00'
);

// P5: Tanggal bertitik 24.10.2026 15.40
const dateP5 = extractDate('24.10.2026 15.40');
assert(
  dateP5 !== null && dateP5.ymd === '2026-10-24',
  'P5: extractDate membaca format titik "24.10.2026"',
  dateP5?.ymd,
  '2026-10-24'
);
assert(
  extractTime('15.40') === '15:40',
  'P5: extractTime membaca format titik "15.40"',
  extractTime('15.40'),
  '15:40'
);

// P4 & P6: Parse chat lengkap
console.log('\n--- 4. Uji Parse Chat Utuh (P4: Nama vs Darurat, P6: Lokasi Sama) ---');
const sampleChat = `*FORM PEMESANAN SEWA MOTOR RYOKO RENT*
1. Nama : Andi Pratama
2. Alamat sesuai KTP : Jl. Soekarno Hatta No. 12, Malang
3. Id pendukung : SIM C
4. Alamat saat ini : Hotel Grand Mercure Malang
5. Id sosmed : @andipratama
6. No telp : 081234567890
7. Nama kontak darurat: Ibu Andi (081987654321)
8. Jadwal mulai : 24.10.2026 15.40
9. Jadwal selesai : 25.10.2026 15.40
10. Lokasi pengantaran : Stasiun Kotabaru Malang
11. Lokasi penjemputan : sama
12. Model unit : Vario 125
13. Jumlah helm : 2`;

const parsed = parseWhatsAppBookingChat(sampleChat);
assert(
  parsed.nama === 'Andi Pratama',
  'P4: Nama penyewa tetap "Andi Pratama" (tidak tertimpa oleh nama kontak darurat "Ibu Andi")',
  parsed.nama,
  'Andi Pratama'
);
assert(
  parsed.teleponDarurat.includes('Ibu Andi'),
  'P4: Kontak darurat tercatat pada field teleponDarurat',
  parsed.teleponDarurat
);
assert(
  parsed.jamTanggalMulai === '2026-10-24T15:40',
  'P5: Jadwal mulai ter-parse presisi "2026-10-24T15:40"',
  parsed.jamTanggalMulai,
  '2026-10-24T15:40'
);
assert(
  parsed.jamTanggalSelesai === '2026-10-25T15:40',
  'P5: Jadwal selesai ter-parse presisi "2026-10-25T15:40"',
  parsed.jamTanggalSelesai,
  '2026-10-25T15:40'
);
assert(
  parsed.lokasiPengembalian === 'Stasiun Kotabaru Malang',
  'P6: Lokasi penjemputan "sama" otomatis menyalin lokasi delivery "Stasiun Kotabaru Malang"',
  parsed.lokasiPengembalian,
  'Stasiun Kotabaru Malang'
);
assert(
  parsed.nomorWa === '6281234567890',
  'S11: Nomor WhatsApp penyewa dinormalisasi ke format internasional 6281234567890',
  parsed.nomorWa,
  '6281234567890'
);

// Uji kasus khusus P2 dalam parseWhatsAppBookingChat: "5 November" tanpa jam
const chatDateWithoutTime = `1. Nama: Budi
6. No telp: 085812345678
8. Jadwal mulai: 5 November
9. Jadwal selesai: 6 November
12. Model unit: Scoopy`;
const parsedNoTime = parseWhatsAppBookingChat(chatDateWithoutTime);
assert(
  parsedNoTime.jamTanggalMulai.endsWith('T09:00'),
  'P2: Tanggal "5 November" tanpa jam diset ke standar 09:00 (bukan 17:00)',
  parsedNoTime.jamTanggalMulai
);

console.log(`\n========================================`);
console.log(`HASIL AKHIR: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
