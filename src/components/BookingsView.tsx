import React, { useState, useMemo } from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  BookingStatus,
} from '../types/ryoko';
import {
  formatRupiah,
  calculateOvertimePenalty,
} from '../services/bookingEngine';
import {
  generateBookingConfirmationWhatsAppUrl,
  generateApprovalNoticeToCustomerWhatsAppUrl,
  generateHandoverNoticeToCustomerWhatsAppUrl,
  generateGradedDueReminderWhatsAppUrl,
} from '../services/whatsappService';
import { computeBookingCountdown } from '../utils/countdownHelper';
import {
  Search,
  Plus,
  Key,
  CheckCircle,
  Repeat,
  Trash2,
  MessageCircle,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Receipt,
  Share2,
  Info,
  Wrench,
} from 'lucide-react';
import { QuickShareTab } from './BookingDetailModal';

interface BookingsViewProps {
  db: RyokoDatabase;
  onOpenNewBooking: () => void;
  onOpenApproveModal: (booking: BookingRecord) => void;
  onOpenHandoverModal: (booking: BookingRecord) => void;
  onOpenExchangeModal: (booking: BookingRecord) => void;
  onOpenFinishModal: (booking: BookingRecord) => void;
  onCancelBooking: (bookingId: number) => void;
  onOpenReceiptModal?: (booking: BookingRecord) => void;
  onOpenDetailModal?: (booking: BookingRecord, initialTab?: 'detail' | 'quick_share', initialShareTab?: QuickShareTab) => void;
  onSendToService?: (bookingId: number, reason?: string) => void;
  onReturnFromService?: (bookingId: number, target: 'ryokou_disewa' | 'ryokou_selesai') => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  db,
  onOpenNewBooking,
  onOpenApproveModal,
  onOpenHandoverModal,
  onOpenExchangeModal,
  onOpenFinishModal,
  onCancelBooking,
  onOpenReceiptModal,
  onOpenDetailModal,
  onSendToService,
  onReturnFromService,
}) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [currentEpoch, setCurrentEpoch] = useState<number>(() => Math.floor(Date.now() / 1000));
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return db.bookings.filter(b => {
      // Status filter
      if (activeStatusFilter !== 'all' && b.status !== activeStatusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchNo = b.noBooking.toLowerCase().includes(q);
        const matchNama = b.nama.toLowerCase().includes(q);
        const matchWa = (b.nomorWa || '').toLowerCase().includes(q);
        const matchMotor = b.snapshotNamaMotor.toLowerCase().includes(q);
        const matchKode = (b.snapshotKodeUnit || '').toLowerCase().includes(q);
        if (!matchNo && !matchNama && !matchWa && !matchMotor && !matchKode) {
          return false;
        }
      }

      return true;
    });
  }, [db.bookings, activeStatusFilter, searchQuery]);

  // Status badges config
  const statusMeta: Record<
    BookingStatus,
    { label: string; badgeClass: string; stepNumber: string }
  > = {
    ryokou_booking: {
      label: '1. Booking Baru',
      stepNumber: '01',
      badgeClass: 'bg-amber-950/80 border-amber-700/70 text-amber-300',
    },
    ryokou_approved: {
      label: '2. Approve (Terkunci)',
      stepNumber: '02',
      badgeClass: 'bg-cyan-950/80 border-cyan-700/70 text-cyan-300',
    },
    ryokou_disewa: {
      label: '3. Sedang Disewa',
      stepNumber: '03',
      badgeClass: 'bg-blue-950/80 border-blue-700/70 text-blue-300',
    },
    ryokou_diservis: {
      label: 'Diservis (Bengkel)',
      stepNumber: '04',
      badgeClass: 'bg-amber-950/80 border-amber-600/70 text-amber-300',
    },
    ryokou_selesai: {
      label: '5. Selesai',
      stepNumber: '05',
      badgeClass: 'bg-slate-800/90 border-slate-700 text-slate-300',
    },
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Transaksi Penyewaan Motor</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredBookings.length} data
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            State Machine 4 Status resmi Ryoko Rent: Booking → Approve → Disewa → Selesai (D-04).
          </p>
        </div>

        <button
          onClick={onOpenNewBooking}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Booking Baru</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-2.5">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setActiveStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              activeStatusFilter === 'all'
                ? 'bg-cyan-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Semua ({db.bookings.length})
          </button>
          <button
            onClick={() => setActiveStatusFilter('ryokou_booking')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              activeStatusFilter === 'ryokou_booking'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            1. Booking Baru ({db.bookings.filter(b => b.status === 'ryokou_booking').length})
          </button>
          <button
            onClick={() => setActiveStatusFilter('ryokou_approved')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              activeStatusFilter === 'ryokou_approved'
                ? 'bg-cyan-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            2. Approve ({db.bookings.filter(b => b.status === 'ryokou_approved').length})
          </button>
          <button
            onClick={() => setActiveStatusFilter('ryokou_disewa')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              activeStatusFilter === 'ryokou_disewa'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            3. Disewa ({db.bookings.filter(b => b.status === 'ryokou_disewa').length})
          </button>
          <button
            onClick={() => setActiveStatusFilter('ryokou_selesai')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              activeStatusFilter === 'ryokou_selesai'
                ? 'bg-slate-700 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            4. Selesai ({db.bookings.filter(b => b.status === 'ryokou_selesai').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari No. Booking (RYK-...), nama penyewa, nomor WhatsApp, model, atau kode unit..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
          />
        </div>
      </div>

      {/* Bookings Card List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-200 text-sm">Tidak ada data penyewaan yang cocok</p>
          <p>Ubah filter status atau kata kunci pencarian di atas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map(b => {
            const meta = statusMeta[b.status] || statusMeta.ryokou_booking;
            const motor = db.motors.find(m => m.id === b.motorId) || db.motors[0];
            const penalty = calculateOvertimePenalty(b, motor, currentEpoch);
            const isOvertime = b.status === 'ryokou_disewa' && penalty.terlambat;

            return (
              <div
                key={b.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 transition"
              >
                {/* Top Row: Booking Number & Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenDetailModal && onOpenDetailModal(b, 'detail')}
                      className="text-sm font-black text-cyan-400 font-mono tracking-wide hover:underline cursor-pointer flex items-center gap-1"
                      title="Klik untuk melihat Detail Booking & Quick Share"
                    >
                      <span>{b.noBooking}</span>
                    </button>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                    {b.tandaPelanggan === 'langganan' && (
                      <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-blue-400" />
                        Langganan
                      </span>
                    )}
                    {b.luarJamOperasional && (
                      <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-md font-semibold">
                        ⚠️ Luar Jam Reguler
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenDetailModal && (
                      <button
                        onClick={() => onOpenDetailModal(b, 'detail')}
                        className="text-[11px] font-semibold text-slate-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800 transition"
                      >
                        <Info className="w-3 h-3 text-cyan-400" />
                        <span>Detail</span>
                      </button>
                    )}
                    <span className="text-xs text-slate-400 font-mono">{b.createdAt}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Customer Info */}
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Penyewa & Kontak</span>
                    <p className="font-bold text-white text-sm">{b.nama}</p>
                    <p className="text-slate-300 font-mono flex items-center gap-1 text-[11px]">
                      <span>📱 {b.nomorWa || '-'}</span>
                    </p>
                    {b.alamatSaatIni && (
                      <p className="text-[11px] text-cyan-300">
                        🏠 {b.alamatSaatIni}
                      </p>
                    )}
                    {b.idSosmed && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        Sosmed: {b.idSosmed}
                      </p>
                    )}
                    {b.noTelpDarurat && (
                      <p className="text-[10px] text-amber-400 font-mono">
                        Darurat: {b.noTelpDarurat}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      ID: <span className="text-slate-200 font-medium">{b.jenisIdPendukung}</span>
                    </p>
                  </div>

                  {/* Model & Unit */}
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Armada Motor</span>
                    <p className="font-bold text-white text-sm">{b.snapshotNamaMotor}</p>
                    {b.snapshotKodeUnit ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-md font-mono">
                          Unit: {b.snapshotKodeUnit}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-400 font-medium text-[11px]">
                        ⚠️ Belum dikunci unit fisik
                      </span>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Durasi: <strong className="text-emerald-400">{b.labelDurasi}</strong>
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Fasilitas: <span className="text-emerald-300 font-medium">{b.jumlahHelm || 2} Helm SNI</span> + Jas Hujan
                    </p>
                  </div>

                  {/* Schedule & Location */}
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Jadwal & Lokasi</span>
                    <p className="text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.jamTanggalMulai.replace('T', ' ')} s/d {b.jamTanggalSelesai.replace('T', ' ')} WIB</span>
                    </p>
                    <p className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Antar: {b.alamatPengantaran || (b.pool === 'batu' ? 'Pool Batu' : 'Pool Malang')}</span>
                    </p>
                    {b.alamatPenjemputan && (
                      <p className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Jemput: {b.alamatPenjemputan}</span>
                      </p>
                    )}
                  </div>

                  {/* Tariff & Overtime Denda (D-27) */}
                  <div className="space-y-1 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Tarif & Denda D-27</span>
                    <p className="text-emerald-400 font-bold font-mono text-sm">
                      {formatRupiah(b.totalHargaEstimasi)}
                    </p>
                    {isOvertime ? (
                      <div className="text-[11px] text-amber-300">
                        <strong className="block text-amber-400">Overtime {penalty.menitTelat} mnt:</strong>
                        <span className="font-mono font-bold">+{penalty.dendaFormat}</span>
                      </div>
                    ) : b.dendaNominal > 0 ? (
                      <div className="text-[11px] text-amber-400">
                        <span>Denda: {formatRupiah(b.dendaNominal)}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Tepat Waktu / Bebas Denda</span>
                    )}
                  </div>
                </div>

                {/* Real-Time Countdown Strip for Active Rentals (TASK-008) */}
                {b.status === 'ryokou_disewa' && (() => {
                  const info = computeBookingCountdown(b, motor, currentEpoch);
                  const badge = info.urgencyBadge;
                  return (
                    <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                      info.urgency === 'overdue'
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                        : info.urgency === 'h_1_jam'
                        ? 'bg-orange-950/40 border-orange-800/70 text-orange-300'
                        : info.urgency === 'h_2_jam'
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800 text-emerald-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.icon} {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          {info.isOverdue ? 'Terlewat: ' : 'Sisa waktu sewa: '}
                          <strong className="text-white">{info.humanText}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold tracking-wider">
                          {info.formattedCountdown}
                        </span>
                        {info.isOverdue && (
                          <span className="font-bold text-[10px] text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                            Denda: {info.penalty.dendaFormat}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* State Machine Action Strip */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  {/* Left: WhatsApp Dispatch */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const waUrl = generateBookingConfirmationWhatsAppUrl(b, db.settings.adminWhatsapp);
                        window.open(waUrl, '_blank');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition"
                      title="Buka pesan WhatsApp resmi transaksi ini"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WA Admin</span>
                    </button>

                    {b.nomorWa && (
                      <button
                        onClick={() => {
                          let waUrl = '';
                          if (b.status === 'ryokou_approved') {
                            waUrl = generateApprovalNoticeToCustomerWhatsAppUrl(b);
                          } else if (b.status === 'ryokou_disewa') {
                            const info = computeBookingCountdown(b, motor, currentEpoch);
                            const penaltyInfo = info.isOverdue
                              ? {
                                  nominalDenda: info.penalty.nominalDenda,
                                  dendaFormat: info.penalty.dendaFormat,
                                  menitTelat: info.penalty.menitTelat,
                                }
                              : undefined;
                            waUrl = generateGradedDueReminderWhatsAppUrl(b, info.urgency, info.humanText, penaltyInfo);
                          } else {
                            waUrl = generateBookingConfirmationWhatsAppUrl(b, b.nomorWa);
                          }
                          window.open(waUrl, '_blank');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                          b.status === 'ryokou_disewa'
                            ? 'bg-amber-950/80 hover:bg-amber-900/80 border border-amber-700/60 text-amber-300 font-semibold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                        title={b.status === 'ryokou_disewa' ? 'Kirim WhatsApp pengingat jatuh tempo / alert' : 'Kirim WhatsApp ke penyewa'}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{b.status === 'ryokou_disewa' ? 'WA Alert Jatuh Tempo' : 'WA Penyewa'}</span>
                      </button>
                    )}

                    {onOpenReceiptModal && (
                      <button
                        onClick={() => onOpenReceiptModal(b)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition"
                        title="Buka Kwitansi Digital, Simpan PDF & Salin Ringkasan Nota Cepat"
                      >
                        <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Kwitansi</span>
                      </button>
                    )}

                    {onOpenDetailModal && (
                      <button
                        onClick={() => {
                          const defaultShareTab: QuickShareTab =
                            b.status === 'ryokou_selesai'
                              ? 'thankyou'
                              : b.status === 'ryokou_disewa'
                              ? 'reminder'
                              : 'confirmation';
                          onOpenDetailModal(b, 'quick_share', defaultShareTab);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                        title="Quick Share WhatsApp (Konfirmasi, Pengingat, Terima Kasih)"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Quick Share</span>
                      </button>
                    )}
                  </div>

                  {/* Right: State Transition Buttons */}
                  <div className="flex items-center gap-2">
                    {/* STATUS 1: BOOKING BARU -> Approve & Kunci Unit */}
                    {b.status === 'ryokou_booking' && (
                      <>
                        <button
                          onClick={() => onCancelBooking(b.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/50 transition flex items-center gap-1"
                          title="Tolak / batalkan pesanan ini (D-20)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                        <button
                          onClick={() => onOpenApproveModal(b)}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 transition active:scale-95"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Approve & Kunci Unit</span>
                        </button>
                      </>
                    )}

                    {/* STATUS 2: APPROVED -> Serah Terima Unit */}
                    {b.status === 'ryokou_approved' && (
                      <button
                        onClick={() => onOpenHandoverModal(b)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition active:scale-95"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Serah Terima (Mulai Sewa)</span>
                      </button>
                    )}

                    {/* STATUS 3: SEDANG DISEWA -> Tukar Unit (D-19), Masuk Servis (F-08), ATAU Selesai (D-27) */}
                    {b.status === 'ryokou_disewa' && (
                      <>
                        <button
                          onClick={() => {
                            const reason = prompt('Alasan unit dialihkan ke servis (mis. ban bocor/kelistrikan):', 'Perawatan mekanis darurat');
                            if (reason !== null && onSendToService) {
                              onSendToService(b.id, reason);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-950/80 hover:bg-orange-900 border border-orange-700/60 text-orange-300 text-xs font-semibold flex items-center gap-1 transition"
                          title="Alihkan unit ke status Servis (F-08)"
                        >
                          <Wrench className="w-3.5 h-3.5 text-orange-400" />
                          <span>Diservis</span>
                        </button>
                        <button
                          onClick={() => onOpenExchangeModal(b)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Tukar unit motor untuk sewa berjalan atau perawatan di jalan (D-19)"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>Tukar Unit (D-19)</span>
                        </button>
                        <button
                          onClick={() => onOpenFinishModal(b)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition active:scale-95"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selesai & Denda (D-27)</span>
                        </button>
                      </>
                    )}

                    {/* STATUS 4: DISERVIS (F-08) */}
                    {b.status === 'ryokou_diservis' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onReturnFromService && onReturnFromService(b.id, 'ryokou_disewa')}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition"
                          title="Servis selesai, lanjutkan sewa penyewa"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Lanjut Sewa</span>
                        </button>
                        <button
                          onClick={() => onOpenFinishModal(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition"
                          title="Selesaikan kontrak sewa"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selesaikan Sewa</span>
                        </button>
                      </div>
                    )}

                    {/* STATUS 5: SELESAI */}
                    {b.status === 'ryokou_selesai' && (
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Transaksi Selesai</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
