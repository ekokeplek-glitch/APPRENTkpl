import React, { useState, useMemo } from 'react';
import {
  BookingRecord,
  RyokoDatabase,
  BookingStatus,
} from '../types/ryoko';
import { formatRupiah, calculateOvertimePenalty } from '../services/bookingEngine';
import {
  generateQuickShareConfirmationText,
  generateQuickShareReturnReminderText,
  generateQuickShareThankYouText,
  generateQuickShareConfirmationUrl,
  generateQuickShareReturnReminderUrl,
  generateQuickShareThankYouUrl,
  normalizeWhatsAppNumber,
} from '../services/whatsappService';
import { copyText } from '../utils/clipboard';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  Bike,
  Key,
  AlertTriangle,
  Send,
  Receipt,
  CheckCircle2,
  Calendar,
  Sparkles,
  Phone,
  FileText,
  HeartHandshake,
} from 'lucide-react';

export type QuickShareTab = 'confirmation' | 'reminder' | 'thankyou';

interface BookingDetailModalProps {
  booking: BookingRecord;
  db: RyokoDatabase;
  initialTab?: 'detail' | 'quick_share';
  initialQuickShareTab?: QuickShareTab;
  onClose: () => void;
  onOpenReceiptModal?: (booking: BookingRecord) => void;
  onOpenApproveModal?: (booking: BookingRecord) => void;
  onOpenHandoverModal?: (booking: BookingRecord) => void;
  onOpenExchangeModal?: (booking: BookingRecord) => void;
  onOpenFinishModal?: (booking: BookingRecord) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  db,
  initialTab = 'detail',
  initialQuickShareTab = 'confirmation',
  onClose,
  onOpenReceiptModal,
  onOpenApproveModal,
  onOpenHandoverModal,
  onOpenExchangeModal,
  onOpenFinishModal,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'detail' | 'quick_share'>(initialTab);
  const [activeShareTab, setActiveShareTab] = useState<QuickShareTab>(initialQuickShareTab);
  const [targetPhone, setTargetPhone] = useState<string>(() => booking.nomorWa || '');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const motor = db.motors.find(m => m.id === booking.motorId);
  const unit = db.units.find(u => u.id === booking.unitId);
  const currentEpoch = Math.floor(Date.now() / 1000);
  const penalty = motor
    ? calculateOvertimePenalty(booking, motor, currentEpoch)
    : { menitTelat: 0, nominalDenda: 0, dendaFormat: 'Rp 0', terlambat: false, keterangan: '' };

  const namaRental = db.settings.namaRental || 'Ryoko Rent Motor';

  // Status Badge Styling
  const statusConfig: Record<
    BookingStatus,
    { label: string; bg: string; text: string; border: string }
  > = {
    ryokou_booking: {
      label: '1. Booking Baru',
      bg: 'bg-amber-950/80',
      text: 'text-amber-300',
      border: 'border-amber-700/80',
    },
    ryokou_approved: {
      label: '2. Approve (Terkunci)',
      bg: 'bg-cyan-950/80',
      text: 'text-cyan-300',
      border: 'border-cyan-700/80',
    },
    ryokou_disewa: {
      label: '3. Sedang Disewa',
      bg: 'bg-blue-950/80',
      text: 'text-blue-300',
      border: 'border-blue-700/80',
    },
    ryokou_diservis: {
      label: 'Diservis',
      bg: 'bg-amber-950/80',
      text: 'text-amber-400',
      border: 'border-amber-700',
    },
    ryokou_selesai: {
      label: '5. Selesai',
      bg: 'bg-emerald-950/80',
      text: 'text-emerald-300',
      border: 'border-emerald-700/80',
    },
  };

  const statusInfo = statusConfig[booking.status] || statusConfig.ryokou_booking;

  // Generate Selected Quick Share Template Text
  const currentShareTemplateText = useMemo(() => {
    if (activeShareTab === 'confirmation') {
      return generateQuickShareConfirmationText(booking, namaRental);
    }
    if (activeShareTab === 'reminder') {
      return generateQuickShareReturnReminderText(booking, namaRental);
    }
    return generateQuickShareThankYouText(booking, namaRental);
  }, [activeShareTab, booking, namaRental]);

  // Generate Selected Quick Share URL
  const currentShareUrl = useMemo(() => {
    if (activeShareTab === 'confirmation') {
      return generateQuickShareConfirmationUrl(booking, namaRental, targetPhone);
    }
    if (activeShareTab === 'reminder') {
      return generateQuickShareReturnReminderUrl(booking, namaRental, targetPhone);
    }
    return generateQuickShareThankYouUrl(booking, namaRental, targetPhone);
  }, [activeShareTab, booking, namaRental, targetPhone]);

  const handleCopyText = async () => {
    const success = await copyText(currentShareTemplateText);
    if (success) {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2200);
    }
  };

  const handleSendWhatsApp = () => {
    window.open(currentShareUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-cyan-400 text-sm sm:text-base">
                  #{booking.noBooking}
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                >
                  {statusInfo.label}
                </span>
                {booking.tandaPelanggan === 'langganan' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                    ⭐ Langganan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {booking.nama} · {booking.snapshotNamaMotor}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (Detail Booking vs Quick Share WhatsApp) */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2">
          <button
            onClick={() => setActiveMainTab('detail')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeMainTab === 'detail'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Detail Transaksi</span>
          </button>

          <button
            onClick={() => setActiveMainTab('quick_share')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition relative ${
              activeMainTab === 'quick_share'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Quick Share WhatsApp</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              3 Template
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: DETAIL BOOKING */}
          {activeMainTab === 'detail' && (
            <div className="space-y-4 text-xs">
              {/* Quick Share Callout Banner */}
              <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/50 border border-emerald-800/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Quick Share WhatsApp Tersedia</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Kirim pesan template instan: Konfirmasi Booking, Pengingat Pengembalian, atau Ucapan Terima Kasih.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setActiveShareTab('confirmation');
                      setActiveMainTab('quick_share');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-xs"
                  >
                    Buka Quick Share
                  </button>
                </div>
              </div>

              {/* Data 13 Poin Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Section A: Identitas & Kontak Penyewa */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-800 pb-2">
                    <User className="w-4 h-4" />
                    <span>1. Identitas & Kontak Penyewa</span>
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nama Lengkap:</span>
                      <strong className="text-white text-right">{booking.nama}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">No. WhatsApp:</span>
                      <span className="font-mono text-cyan-300 font-semibold">{booking.nomorWa || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ID Pendukung:</span>
                      <span className="text-white">{booking.jenisIdPendukung || 'SIM C'}</span>
                    </div>
                    {booking.noTelpDarurat && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">No. Darurat:</span>
                        <span className="font-mono text-amber-300">{booking.noTelpDarurat}</span>
                      </div>
                    )}
                    {booking.idSosmed && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sosial Media:</span>
                        <span className="font-mono text-slate-300">{booking.idSosmed}</span>
                      </div>
                    )}
                    {booking.alamatKtp && (
                      <div className="pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500 block">Alamat KTP:</span>
                        <p className="text-slate-300 text-[11px]">{booking.alamatKtp}</p>
                      </div>
                    )}
                    {booking.alamatSaatIni && (
                      <div>
                        <span className="text-slate-500 block">Alamat Saat Ini:</span>
                        <p className="text-slate-300 text-[11px]">{booking.alamatSaatIni}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section B: Armada Motor & Unit Fisik */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
                    <Bike className="w-4 h-4" />
                    <span>2. Armada Motor & Unit Fisik</span>
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Model Motor:</span>
                      <strong className="text-white text-right">{booking.snapshotNamaMotor}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Unit Fisik Garasi:</span>
                      {booking.snapshotKodeUnit ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold">
                            {booking.snapshotKodeUnit}
                          </span>
                          {unit?.nomorPlat && (
                            <span className="text-slate-400 text-[11px]">({unit.nomorPlat})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-400 font-medium text-[11px]">
                          Belum dikunci unit fisik
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Paket Durasi:</span>
                      <strong className="text-emerald-300 font-semibold">{booking.labelDurasi}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Perlengkapan:</span>
                      <span className="text-white font-medium">
                        {booking.jumlahHelm || 2} Helm SNI + Jas Hujan
                      </span>
                    </div>
                    {booking.kurirPengantar && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kurir Pengantar:</span>
                        <span className="text-cyan-300 font-medium">{booking.kurirPengantar}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section C: Waktu & Lokasi */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-800 pb-2">
                    <Calendar className="w-4 h-4" />
                    <span>3. Jadwal & Lokasi Serah Terima</span>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Jadwal Mulai Sewa:</span>
                      <p className="font-mono text-white font-semibold">
                        {booking.jamTanggalMulai.replace('T', ' ')} WIB
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Tenggat Selesai Sewa:</span>
                      <p className="font-mono text-white font-semibold">
                        {booking.jamTanggalSelesai.replace('T', ' ')} WIB
                      </p>
                    </div>
                    <div className="pt-1 border-t border-slate-800">
                      <span className="text-slate-500 text-[11px] block">Lokasi Pengantaran:</span>
                      <p className="text-slate-200">
                        {booking.alamatPengantaran || (booking.pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Lokasi Penjemputan / Kembali:</span>
                      <p className="text-slate-200">
                        {booking.alamatPenjemputan || (booking.pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section D: Tarif & Pembayaran */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
                    <Receipt className="w-4 h-4" />
                    <span>4. Rincian Tarif & Denda Overtime</span>
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tarif Sewa Pokok:</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {formatRupiah(booking.totalHargaEstimasi)}
                      </span>
                    </div>

                    {booking.status === 'ryokou_disewa' && penalty.terlambat && (
                      <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-2 text-[11px] text-rose-300 space-y-0.5">
                        <div className="flex justify-between font-bold">
                          <span>Overtime ({penalty.menitTelat} menit):</span>
                          <span>+{penalty.dendaFormat}</span>
                        </div>
                        <p className="text-[10px] text-rose-400">{penalty.keterangan}</p>
                      </div>
                    )}

                    {booking.dendaNominal > 0 && (
                      <div className="flex justify-between items-center text-amber-400">
                        <span>Denda Dikenakan:</span>
                        <span className="font-bold font-mono">+{formatRupiah(booking.dendaNominal)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-white">Total Pembayaran:</span>
                      <span className="font-black font-mono text-sm sm:text-base text-cyan-400">
                        {formatRupiah(
                          booking.totalHargaEstimasi +
                            (booking.status === 'ryokou_selesai'
                              ? booking.dendaNominal || 0
                              : penalty.nominalDenda || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Riwayat Tukar Unit (D-19) */}
              {booking.riwayatTukarUnit && booking.riwayatTukarUnit.length > 0 && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <span className="font-bold text-amber-400 text-xs block">
                    Riwayat Tukar Unit Berkala (D-19):
                  </span>
                  <div className="space-y-1.5">
                    {booking.riwayatTukarUnit.map(log => (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex justify-between items-center"
                      >
                        <div>
                          <span className="text-slate-400">{log.waktu}: </span>
                          <span className="text-slate-300">
                            Unit <strong className="text-rose-300">{log.unitLamaKode}</strong> diganti ke{' '}
                            <strong className="text-emerald-300">{log.unitBaruKode}</strong>
                          </span>
                          <p className="text-[10px] text-slate-500">Alasan: {log.alasan}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{log.operator}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUICK SHARE WHATSAPP */}
          {activeMainTab === 'quick_share' && (
            <div className="space-y-4 text-xs">
              {/* Template Switcher Tabs */}
              <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveShareTab('confirmation')}
                  className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeShareTab === 'confirmation'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. Konfirmasi Booking</span>
                </button>

                <button
                  onClick={() => setActiveShareTab('reminder')}
                  className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeShareTab === 'reminder'
                      ? 'bg-amber-600 text-slate-950 shadow-md shadow-amber-950 font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>2. Pengingat Pengembalian</span>
                </button>

                <button
                  onClick={() => setActiveShareTab('thankyou')}
                  className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeShareTab === 'thankyou'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>3. Ucapan Terima Kasih</span>
                </button>
              </div>

              {/* Destination Phone Input */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Nomor Tujuan WhatsApp Penyewa:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Otomatis menggunakan nomor pemesan Kak {booking.nama}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={e => setTargetPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-500 outline-none w-full sm:w-48"
                  />
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    +({normalizeWhatsAppNumber(targetPhone)})
                  </span>
                </div>
              </div>

              {/* Template Description Banner */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {activeShareTab === 'confirmation'
                      ? '📝'
                      : activeShareTab === 'reminder'
                      ? '⏰'
                      : '🌟'}
                  </span>
                  <span>
                    {activeShareTab === 'confirmation' && (
                      <>
                        <strong>Template Konfirmasi:</strong> Memberitahukan rincian sewa motor, jadwal ambil, lokasi, dan persyaratan saat serah terima.
                      </>
                    )}
                    {activeShareTab === 'reminder' && (
                      <>
                        <strong>Template Pengingat:</strong> Mengingatkan waktu pengembalian unit, checklist kelengkapan STNK/helm/BBM, dan opsi perpanjangan sewa.
                      </>
                    )}
                    {activeShareTab === 'thankyou' && (
                      <>
                        <strong>Template Terima Kasih:</strong> Apresiasi pasca sewa selesai, ajakan review rating Google Maps, serta voucher diskon repeat order.
                      </>
                    )}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 shrink-0">Ryoko Rent Format</span>
              </div>

              {/* Live Preview Box with WhatsApp Style Styling */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Pratinjau Pesan WhatsApp</span>
                    <span className="text-emerald-400 text-xs">● Live Preview</span>
                  </span>

                  <span className="text-[10px] text-slate-500">
                    {currentShareTemplateText.length} karakter
                  </span>
                </div>

                <div className="bg-[#0b141a] border border-slate-800 rounded-2xl p-4 shadow-inner text-slate-100 font-sans text-xs whitespace-pre-line leading-relaxed max-h-[300px] overflow-y-auto select-text scrollbar-thin">
                  {currentShareTemplateText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Quick links */}
          <div className="flex items-center gap-2">
            {onOpenReceiptModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReceiptModal(booking);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Buka Kwitansi Paperless PDF"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Kwitansi PDF</span>
              </button>
            )}

            {activeMainTab === 'detail' && (
              <button
                onClick={() => setActiveMainTab('quick_share')}
                className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Buka Quick Share</span>
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeMainTab === 'quick_share' ? (
              <>
                {/* Salin Pesan */}
                <button
                  onClick={handleCopyText}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  title="Salin isi pesan template ke clipboard"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-black">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Salin Pesan</span>
                    </>
                  )}
                </button>

                {/* Kirim ke WhatsApp */}
                <button
                  onClick={handleSendWhatsApp}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition active:scale-95"
                  title="Buka WhatsApp langsung ke nomor penyewa dengan pesan template ini"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim ke WhatsApp</span>
                  <ExternalLink className="w-3 h-3 text-emerald-200" />
                </button>
              </>
            ) : (
              <>
                {booking.status === 'ryokou_booking' && onOpenApproveModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenApproveModal(booking);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Approve & Kunci</span>
                  </button>
                )}

                {booking.status === 'ryokou_approved' && onOpenHandoverModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenHandoverModal(booking);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Serah Terima</span>
                  </button>
                )}

                {booking.status === 'ryokou_disewa' && onOpenFinishModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenFinishModal(booking);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selesai & Denda</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Tutup
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
