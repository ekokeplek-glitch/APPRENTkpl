/**
 * Telegram Bot Return Alert & Interactive Action Service for RyokoRent
 * Mengirim notifikasi alert jatuh tempo (H-2, H-1, Overdue) langsung ke Telegram Admin,
 * menyajikan ringkasan review, opsi tombol interaktif (inline keyboard),
 * dan mengeksekusi aksi setelah disetujui.
 */

import { BookingRecord, MotorModel, RyokoDatabase } from '../types/ryoko';
import { CountdownUrgencyLevel } from '../utils/countdownHelper';

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramSendMessagePayload {
  chat_id: string;
  text: string;
  parse_mode: 'HTML' | 'MarkdownV2' | 'Markdown';
  reply_markup?: TelegramInlineKeyboardMarkup;
}

/**
 * Escape string untuk format parse_mode HTML Telegram (F-15)
 * Mencegah pesan gagal terkirim (400 Bad Request) akibat karakter <, >, & pada nama atau alamat
 */
export function escHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format pesan notifikasi pengembalian unit untuk Telegram Admin (HTML Safe - F-15)
 */
export function formatTelegramReturnAlertMessage(
  booking: BookingRecord,
  motor: MotorModel,
  urgency: CountdownUrgencyLevel,
  dendaEstimasi = 0
): string {
  const urgencyHeader: Record<CountdownUrgencyLevel, string> = {
    aman: '🟢 <b>STATUS SEWA AMAN (BERJALAN)</b>',
    h_2_jam: '🟡 <b>PERINGATAN H-2 JAM JATUH TEMPO PENGEMBALIAN!</b>',
    h_1_jam: '🟠 <b>PERINGATAN KRITIS H-1 JAM SEWA BERAKHIR!</b>',
    overdue: '🔴 <b>PERINGATAN SEWA TERLAMBAT / OVERDUE!</b>',
  };

  const formattedMulai = escHtml(booking.jamTanggalMulai.replace('T', ' '));
  const formattedSelesai = escHtml(booking.jamTanggalSelesai.replace('T', ' '));
  const dendaFormatted = dendaEstimasi > 0 
    ? `Rp ${dendaEstimasi.toLocaleString('id-ID')}` 
    : (booking.dendaNominal && booking.dendaNominal > 0 ? `Rp ${booking.dendaNominal.toLocaleString('id-ID')}` : 'Rp 0 (Tepat Waktu)');

  return `${urgencyHeader[urgency]}

📋 <b>No. Booking:</b> <code>${escHtml(booking.noBooking)}</code>
👤 <b>Penyewa:</b> ${escHtml(booking.nama)}
📱 <b>Kontak WhatsApp:</b> +${escHtml(booking.nomorWa)}
🆘 <b>Kontak Darurat:</b> ${escHtml(booking.noTelpDarurat || '-')}
📍 <b>Alamat Saat Ini:</b> ${escHtml(booking.alamatSaatIni || '-')}

🛵 <b>Unit Motor:</b> ${escHtml(booking.snapshotNamaMotor)}
🏷️ <b>Kode Fisik:</b> <b>${escHtml(booking.snapshotKodeUnit || 'Unit Garasi')}</b>
🪖 <b>Kelengkapan:</b> ${booking.jumlahHelm ?? 1} Helm SNI

⏰ <b>Jadwal Sewa:</b>
• Mulai: ${formattedMulai} WIB
• Tenggat Kembali: <b>${formattedSelesai} WIB</b>
📍 <b>Lokasi Penjemputan:</b> ${escHtml(booking.alamatPenjemputan)}
🛵 <b>Kurir Lapangan:</b> ${escHtml(booking.kurirPengantar || 'Belum Ditugaskan')}

💰 <b>Tarif Dasar:</b> Rp ${booking.totalHargaEstimasi.toLocaleString('id-ID')}
⚠️ <b>Estimasi Denda Telat:</b> <b>${dendaFormatted}</b>
${booking.dendaKeterangan ? `<i>(${escHtml(booking.dendaKeterangan)})</i>` : ''}

---------------------------------------
<b>AKSI OPERASIONAL 1-KLIK (AKSI LANGSUNG TELEGRAM):</b>
Klik opsi tombol di bawah untuk respon instan tanpa webhook server.`;
}

/**
 * Buat tombol inline keyboard interaktif Telegram (Actionable URLs F-15)
 * Karena SPA berjalan tanpa webhook server publik, tombol aksi langsung membuka tautan responsif (WA & Maps).
 */
export function createTelegramReturnActionButtons(booking: BookingRecord): TelegramInlineKeyboardMarkup {
  const cleanPhone = (booking.nomorWa || '').replace(/[^0-9]/g, '');
  const waTarget = cleanPhone.startsWith('08') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const waText = encodeURIComponent(
    `Halo Kak ${booking.nama}, kami dari Ryoko Rent mengingatkan jadwal pengembalian unit ${booking.snapshotNamaMotor} (${booking.snapshotKodeUnit || ''}) tenggat ${booking.jamTanggalSelesai.replace('T', ' ')} WIB. Mohon persiapkan unit sewa ya Kak.`
  );

  const mapsQuery = encodeURIComponent(booking.alamatPenjemputan || 'Malang, Jawa Timur');

  return {
    inline_keyboard: [
      [
        {
          text: '💬 1. Chat WhatsApp Tamu (Pengingat)',
          url: `https://wa.me/${waTarget}?text=${waText}`,
        },
      ],
      [
        {
          text: '📍 2. Buka Lokasi Jemput di Google Maps',
          url: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        },
      ],
      [
        {
          text: '🔍 3. Review Booking di Aplikasi',
          callback_data: `ryoko_rev:${booking.id}`,
        },
        {
          text: '✅ 4. Setujui Selesai',
          callback_data: `ryoko_act_finish:${booking.id}`,
        },
      ],
    ],
  };
}

/**
 * Kirim notifikasi pengembalian ke bot Telegram Admin
 */
export async function sendTelegramReturnAlert(
  booking: BookingRecord,
  motor: MotorModel,
  urgency: CountdownUrgencyLevel,
  botToken?: string,
  chatId?: string,
  dendaEstimasi = 0
): Promise<{ success: boolean; message: string }> {
  const token = botToken?.trim();
  const targetChatId = chatId?.trim();

  const messageText = formatTelegramReturnAlertMessage(booking, motor, urgency, dendaEstimasi);
  const replyMarkup = createTelegramReturnActionButtons(booking);

  // Jika bot token belum dikonfigurasi, jalankan mode simulasi lokal
  if (!token || !targetChatId) {
    return {
      success: true,
      message: `[Simulasi Sukses] Notifikasi alert pengembalian ${urgency.toUpperCase()} untuk booking ${booking.noBooking} berhasil disiapkan dengan 4 tombol opsi aksi. (Masukkan Bot Token & Chat ID di Pengaturan untuk kirim langsung ke Telegram).`,
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const payload: TelegramSendMessagePayload = {
      chat_id: targetChatId,
      text: messageText,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.ok) {
      return {
        success: false,
        message: `Telegram API Error: ${data.description || 'Gagal mengirim pesan'}`,
      };
    }

    return {
      success: true,
      message: `Notifikasi jatuh tempo ${booking.noBooking} berhasil dikirim ke Telegram Admin!`,
    };
  } catch (err) {
    const errText = err instanceof Error ? err.message : 'Koneksi gagal';
    return {
      success: false,
      message: `Gagal mengirim ke Telegram: ${errText}`,
    };
  }
}

/**
 * Uji koneksi Telegram Bot dengan mengirim pesan uji coba ke Admin Chat ID
 */
export async function testTelegramBotConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  if (!botToken.trim() || !chatId.trim()) {
    return {
      success: false,
      message: 'Token Bot Telegram dan Chat ID Admin wajib diisi.',
    };
  }

  const endpoint = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;

  const testPayload = {
    chat_id: chatId.trim(),
    text: `🚀 <b>Koneksi Bot Telegram RyokoRent Berhasil!</b>\n\nSistem notifikasi pengembalian armada motor wilayah Malang & Batu siap mengirimkan alert jatuh tempo H-2 Jam, H-1 Jam, dan keterlambatan unit sewa secara real-time.\n\n<i>Waktu Uji: ${new Date().toLocaleString('id-ID')} WIB</i>`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Konfirmasi Siap Operasional', callback_data: 'ryoko_test_ok' },
        ],
      ],
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const data = await res.json();

    if (data.ok) {
      return {
        success: true,
        message: 'Koneksi berhasil! Pesan uji coba terkirim ke Telegram Anda.',
      };
    } else {
      return {
        success: false,
        message: `Gagal (${data.error_code}): ${data.description}`,
      };
    }
  } catch (err) {
    const errText = err instanceof Error ? err.message : 'Koneksi terputus';
    return {
      success: false,
      message: `Gagal menghubungi server Telegram: ${errText}`,
    };
  }
}

/**
 * Eksekutor aksi callback dari Bot Telegram setelah admin memilih opsi
 */
export function executeTelegramActionCallback(
  callbackData: string,
  db: RyokoDatabase
): { success: boolean; message: string; updatedBooking?: BookingRecord } {
  const parts = callbackData.split(':');
  const actionPrefix = parts[0];
  const bookingId = parseInt(parts[1], 10);

  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) {
    return {
      success: false,
      message: `Booking dengan ID ${bookingId} tidak ditemukan di database lokal.`,
    };
  }

  if (actionPrefix === 'ryoko_act_finish') {
    // Aksi 2: Setujui selesai pengembalian
    booking.status = 'ryokou_selesai';
    booking.selesaiAt = new Date().toLocaleString('id-ID');
    return {
      success: true,
      message: `Aksi disetujui: Unit ${booking.snapshotKodeUnit || ''} milik ${booking.nama} resmi diselesaikan dan diterima di pool.`,
      updatedBooking: booking,
    };
  }

  if (actionPrefix === 'ryoko_act_fine') {
    // Aksi 4: Kenakan denda
    if (booking.dendaNominal === 0) {
      booking.dendaNominal = 25000;
      booking.dendaKeterangan = 'Denda keterlambatan disetujui via bot Telegram';
    }
    return {
      success: true,
      message: `Aksi disetujui: Denda sebesar Rp ${booking.dendaNominal.toLocaleString('id-ID')} dicatat pada nota sewa ${booking.noBooking}.`,
      updatedBooking: booking,
    };
  }

  if (actionPrefix === 'ryoko_act_extend') {
    // Aksi 3: Perpanjang sewa
    return {
      success: true,
      message: `Permintaan perpanjangan sewa untuk ${booking.nama} diterima. Silakan sesuaikan durasi sewa di menu Pemesanan.`,
      updatedBooking: booking,
    };
  }

  if (actionPrefix === 'ryoko_rev') {
    // Aksi 1: Review
    return {
      success: true,
      message: `Review booking ${booking.noBooking}: ${booking.nama} | Unit: ${booking.snapshotNamaMotor} (${booking.snapshotKodeUnit || '-'}) | Kurir: ${booking.kurirPengantar || '-'}`,
      updatedBooking: booking,
    };
  }

  return {
    success: false,
    message: `Aksi callback '${callbackData}' tidak dikenal.`,
  };
}
