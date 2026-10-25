import React, { useState } from 'react';
import {
  BookingRecord,
  RyokoDatabase,
} from '../types/ryoko';
import { formatRupiah, calculateOvertimePenalty } from '../services/bookingEngine';
import { copyText } from '../utils/clipboard';
import {
  FileText,
  Copy,
  Check,
  Download,
  Share2,
  X,
  Bike,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
} from 'lucide-react';

interface DigitalReceiptModalProps {
  booking: BookingRecord;
  db: RyokoDatabase;
  onClose: () => void;
  onOpenQuickShare?: (booking: BookingRecord) => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  booking,
  db,
  onClose,
  onOpenQuickShare,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const currentEpoch = Math.floor(Date.now() / 1000);

  const motor = db.motors.find(m => m.id === booking.motorId);
  const unit = db.units.find(u => u.id === booking.unitId);

  // Compute overtime penalty if booking is ongoing or overdue
  const penalty = motor
    ? calculateOvertimePenalty(booking, motor, currentEpoch)
    : { menitTelat: 0, nominalDenda: 0, dendaFormat: 'Rp 0', terlambat: false, keterangan: '' };

  const dendaDikenakan = booking.status === 'ryokou_selesai'
    ? (booking.dendaNominal || 0)
    : (penalty.nominalDenda || 0);

  const totalTagihan = booking.totalHargaEstimasi + dendaDikenakan;

  const formatTanggalIndo = (dateTimeStr: string) => {
    if (!dateTimeStr) return '-';
    const [tgl, jam] = dateTimeStr.split('T');
    return `${tgl} · ${jam || '00:00'} WIB`;
  };

  // Generate clean text for fast chat / WhatsApp
  const generateReceiptText = (): string => {
    const lines = [
      `🧾 *NOTA DIGITAL - ${db.settings.namaRental || 'RYOKO RENT MOTOR'}*`,
      `*No. Invoice:* INV-RYK-${booking.noBooking}`,
      `*Tanggal:* ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
      `---------------------------------------`,
      `👤 *Data Penyewa:*`,
      `Nama: ${booking.nama}`,
      `Alamat KTP: ${booking.alamatKtp || '-'}`,
      `ID Pendukung: ${booking.jenisIdPendukung || 'SIM C'}`,
      `Alamat Saat Ini: ${booking.alamatSaatIni || booking.alamatPengantaran || '-'}`,
      `ID Sosmed: ${booking.idSosmed || '-'}`,
      `WhatsApp: ${booking.nomorWa || '-'}`,
      `Kontak Darurat: ${booking.noTelpDarurat || '-'}`,
      `---------------------------------------`,
      `🛵 *Rincian Kendaraan:*`,
      `Motor: ${booking.snapshotNamaMotor}`,
      `Kode Unit: ${booking.snapshotKodeUnit || unit?.kodeUnit || 'Belum ditetapkan'}`,
      `Nomor Plat: ${unit?.nomorPlat || 'N/A'}`,
      `Kelengkapan: ${booking.jumlahHelm || 2} Helm SNI + 2 Jas Hujan + STNK`,
      `---------------------------------------`,
      `⏱️ *Durasi & Jadwal Sewa:*`,
      `Paket: ${booking.labelDurasi}`,
      `Ambil: ${formatTanggalIndo(booking.jamTanggalMulai)}`,
      `Kembali: ${formatTanggalIndo(booking.jamTanggalSelesai)}`,
      `Lokasi Antar: ${booking.alamatPengantaran || (booking.pool === 'batu' ? 'Pool Batu' : 'Pool Malang')}`,
      `Lokasi Jemput: ${booking.alamatPenjemputan || (booking.pool === 'batu' ? 'Pool Batu' : 'Pool Malang')}`,
      `---------------------------------------`,
      `💰 *Rincian Biaya:*`,
      `Tarif Sewa Pokok: ${formatRupiah(booking.totalHargaEstimasi)}`,
    ];

    if (dendaDikenakan > 0) {
      lines.push(`Denda Overtime (${penalty.menitTelat || 0} mnt): ${formatRupiah(dendaDikenakan)}`);
    }

    lines.push(
      `*TOTAL PEMBAYARAN: ${formatRupiah(totalTagihan)}*`,
      `Status: LUNAS [Lunas Saat Serah Terima]`,
      `---------------------------------------`,
      `Terima kasih telah mempercayakan perjalanan Anda di Malang & Batu kepada Ryoko Rent!`,
      `Bantuan 24 Jam: wa.me/${(db.settings.adminWhatsapp || '6281234567890').replace(/\D/g, '')}`
    );

    return lines.join('\n');
  };

  const handleCopyReceiptText = async () => {
    const text = generateReceiptText();
    const success = await copyText(text);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleSavePDF = () => {
    // Open system print dialog configured for clean paperless PDF saving
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = generateReceiptText();
    const cleanPhone = (booking.nomorWa || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const url = `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Kwitansi & Invoice Digital</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                  Paperless PDF
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Bukti pembayaran sah & Berita Acara Serah Terima (BAST) unit resmi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body (Target for PDF / Print) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40 space-y-4">
          <div
            id="digital-receipt-printable"
            className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-200 font-sans space-y-4 text-xs"
          >
            {/* Receipt Header */}
            <div className="border-b border-dashed border-slate-300 pb-3 flex flex-col sm:flex-row justify-between sm:items-start gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🛵</span>
                  <h1 className="text-base font-black tracking-tight text-slate-900">
                    {db.settings.namaRental || 'RYOKO RENT MOTOR'}
                  </h1>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Rental Motor Terpercaya Malang & Batu · Pool Dinoyo & Diponegoro
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  WA: +{db.settings.adminWhatsapp || '6281234567890'}
                </p>
              </div>

              <div className="sm:text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  LUNAS / SELESAI
                </span>
                <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">
                  INV-RYK-{booking.noBooking}
                </p>
                <p className="text-[10px] text-slate-500">
                  {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Penyewa & Armada Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Informasi Penyewa (13 Poin)
                </span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{booking.nama}</p>
                <p className="text-slate-600 font-mono text-[11px]">{booking.nomorWa || '-'}</p>
                {booking.alamatKtp && (
                  <p className="text-[10px] text-slate-500">
                    KTP: <span className="font-medium text-slate-700">{booking.alamatKtp}</span>
                  </p>
                )}
                {booking.alamatSaatIni && (
                  <p className="text-[10px] text-slate-500">
                    Domisili: <span className="font-medium text-slate-700">{booking.alamatSaatIni}</span>
                  </p>
                )}
                {booking.idSosmed && (
                  <p className="text-[10px] text-cyan-700 font-mono">
                    Sosmed: {booking.idSosmed}
                  </p>
                )}
                {booking.noTelpDarurat && (
                  <p className="text-[10px] text-amber-700 font-mono">
                    Darurat: {booking.noTelpDarurat}
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  Antar: <span className="font-medium text-slate-700">{booking.alamatPengantaran || (booking.pool === 'batu' ? 'Pool Batu' : 'Pool Malang')}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Jemput: <span className="font-medium text-slate-700">{booking.alamatPenjemputan || (booking.pool === 'batu' ? 'Pool Batu' : 'Pool Malang')}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Kendaraan & Unit Fisik
                </span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{booking.snapshotNamaMotor}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-bold text-[10px]">
                    {booking.snapshotKodeUnit || unit?.kodeUnit || 'Unit Garasi'}
                  </span>
                  <span className="font-mono text-slate-700 text-[11px] font-semibold">
                    {unit?.nomorPlat || 'Plat N'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Paket: <span className="font-semibold text-slate-800">{booking.labelDurasi}</span>
                </p>
                {booking.kurirPengantar && (
                  <p className="text-[10px] text-cyan-800 font-medium">
                    Kurir: {booking.kurirPengantar}
                  </p>
                )}
              </div>
            </div>

            {/* Jadwal Sewa */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Periode & Jadwal Waktu
              </span>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">Mulai Sewa:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatTanggalIndo(booking.jamTanggalMulai)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">Selesai / Tenggat:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatTanggalIndo(booking.jamTanggalSelesai)}
                </span>
              </div>
            </div>

            {/* BAST (Berita Acara Serah Terima) Checklist */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Berita Acara Serah Terima (BAST)
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Kondisi Lengkap</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>2x Helm SNI Ryoko</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>2x Jas Hujan Poncho</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>STNK Asli Kendaraan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Kunci Kontak + Gantungan</span>
                </div>
              </div>
            </div>

            {/* Tabel Tagihan Biaya */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>Biaya Sewa Pokok ({booking.labelDurasi}):</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatRupiah(booking.totalHargaEstimasi)}
                </span>
              </div>

              {dendaDikenakan > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-medium">
                  <span>Denda Keterlambatan ({penalty.menitTelat || 0} menit):</span>
                  <span className="font-bold font-mono">+{formatRupiah(dendaDikenakan)}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">TOTAL TAGIHAN:</span>
                <span className="font-black text-base font-mono text-cyan-800">
                  {formatRupiah(totalTagihan)}
                </span>
              </div>
            </div>

            {/* Syarat & Ketentuan Singkat */}
            <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-400 space-y-0.5">
              <p>• BBM dikembalikan sesuai posisi semula saat serah terima.</p>
              <p>• Kehilangan kunci / helm / jas hujan dikenakan biaya penggantian resmi.</p>
              <p>• Denda keterlambatan dihitung otomatis sesuai toleransi 60 menit (D-27).</p>
            </div>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-400">
            Pilihan paperless: Simpan langsung sebagai file PDF atau salin teks ringkasan.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Quick Text Button */}
            <button
              onClick={handleCopyReceiptText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
              title="Salin teks ringkasan nota kasir untuk chat cepat WhatsApp"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Salin Teks Nota</span>
                </>
              )}
            </button>

            {/* Send WhatsApp Button */}
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition active:scale-95"
              title="Kirim kwitansi langsung ke WhatsApp penyewa"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim Nota ke WA</span>
            </button>

            {/* Quick Share WhatsApp Button */}
            {onOpenQuickShare && (
              <button
                onClick={() => {
                  onClose();
                  onOpenQuickShare(booking);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 transition active:scale-95 shadow-xs"
                title="Buka 3 Template WhatsApp (Konfirmasi, Pengingat, Terima Kasih)"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick Share WA</span>
              </button>
            )}

            {/* Save PDF Button */}
            <button
              onClick={handleSavePDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950 transition active:scale-95"
              title="Simpan sebagai file PDF (Paperless)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
