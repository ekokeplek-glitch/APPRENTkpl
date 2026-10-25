import React, { useState, useEffect, useMemo } from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  MotorModel,
} from '../types/ryoko';
import {
  computeBookingCountdown,
  CountdownInfo,
  CountdownUrgencyLevel,
} from '../utils/countdownHelper';
import { generateGradedDueReminderWhatsAppUrl } from '../services/whatsappService';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Flame,
  Hourglass,
  Bot,
} from 'lucide-react';
import { sendTelegramReturnAlert } from '../services/telegramBotService';

interface CountdownAlertBannerProps {
  db: RyokoDatabase;
  onSelectBooking?: (booking: BookingRecord) => void;
  compact?: boolean;
  filterCourierName?: string;
  title?: string;
}

export const CountdownAlertBanner: React.FC<CountdownAlertBannerProps> = ({
  db,
  onSelectBooking,
  compact = false,
  filterCourierName,
  title = 'Sistem Countdown Pengembalian Real-Time & Alert Jatuh Tempo (TASK-008)',
}) => {
  // Live ticking state (epoch in seconds)
  const [nowEpoch, setNowEpoch] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [filterUrgency, setFilterUrgency] = useState<'all' | CountdownUrgencyLevel>('all');
  const [telegramAlertMsg, setTelegramAlertMsg] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setNowEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter active rentals
  const activeRentals = useMemo(() => {
    let list = db.bookings.filter(b => b.status === 'ryokou_disewa');
    if (filterCourierName) {
      list = list.filter(b => b.kurirPengantar === filterCourierName);
    }
    return list;
  }, [db.bookings, filterCourierName]);

  // Compute countdown & urgency for each active booking
  const countdownList: Array<{ booking: BookingRecord; info: CountdownInfo }> = useMemo(() => {
    return activeRentals.map(booking => {
      const motor = db.motors.find(m => m.id === booking.motorId) || db.motors[0];
      const info = computeBookingCountdown(booking, motor, nowEpoch);
      return { booking, info };
    });
  }, [activeRentals, db.motors, nowEpoch]);

  // Categorize counts
  const counts = useMemo(() => {
    const overdue = countdownList.filter(item => item.info.urgency === 'overdue').length;
    const h1 = countdownList.filter(item => item.info.urgency === 'h_1_jam').length;
    const h2 = countdownList.filter(item => item.info.urgency === 'h_2_jam').length;
    const aman = countdownList.filter(item => item.info.urgency === 'aman').length;
    return { overdue, h1, h2, aman, total: countdownList.length };
  }, [countdownList]);

  // Sort: Overdue first, then H-1 Jam, then H-2 Jam, then Aman
  const sortedAndFilteredList = useMemo(() => {
    const urgencyWeight: Record<CountdownUrgencyLevel, number> = {
      overdue: 4,
      h_1_jam: 3,
      h_2_jam: 2,
      aman: 1,
    };

    let filtered = countdownList;
    if (filterUrgency !== 'all') {
      filtered = filtered.filter(item => item.info.urgency === filterUrgency);
    }

    return [...filtered].sort((a, b) => {
      const weightDiff = urgencyWeight[b.info.urgency] - urgencyWeight[a.info.urgency];
      if (weightDiff !== 0) return weightDiff;
      // If same urgency, sort by closest end epoch
      return a.info.diffSeconds - b.info.diffSeconds;
    });
  }, [countdownList, filterUrgency]);

  const handleSendWhatsAppReminder = (e: React.MouseEvent, booking: BookingRecord, info: CountdownInfo) => {
    e.stopPropagation();
    const penaltyInfo = info.isOverdue
      ? {
          nominalDenda: info.penalty.nominalDenda,
          dendaFormat: info.penalty.dendaFormat,
          menitTelat: info.penalty.menitTelat,
        }
      : undefined;

    const url = generateGradedDueReminderWhatsAppUrl(
      booking,
      info.urgency,
      info.humanText,
      penaltyInfo
    );
    window.open(url, '_blank');
  };

  const handleSendTelegramAlert = async (e: React.MouseEvent, booking: BookingRecord, info: CountdownInfo) => {
    e.stopPropagation();
    const motor = db.motors.find(m => m.id === booking.motorId) || db.motors[0];
    const res = await sendTelegramReturnAlert(
      booking,
      motor,
      info.urgency,
      db.settings.telegramBotToken,
      db.settings.telegramAdminChatId,
      info.penalty.nominalDenda
    );
    setTelegramAlertMsg(res.message);
    setTimeout(() => setTelegramAlertMsg(''), 5000);
  };

  if (activeRentals.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Tidak ada unit yang sedang disewa saat ini.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
      {/* Header & Urgency KPI Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {counts.overdue > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </>
              ) : counts.h1 > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              )}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
              <span>{title}</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pelacakan tenggat kembali detik-per-detik, klasifikasi urgensi (Aman, H-2 Jam, H-1 Jam, Overdue) & denda otomatis.
          </p>
        </div>

        {/* Urgency Counter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {counts.overdue > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
              <span>🚨 {counts.overdue} Overdue</span>
            </span>
          )}
          {counts.h1 > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-950 text-orange-300 border border-orange-700">
              <span>⚠️ {counts.h1} H-1 Jam</span>
            </span>
          )}
          {counts.h2 > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700">
              <span>⏳ {counts.h2} H-2 Jam</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <span>🟢 {counts.aman} Aman</span>
          </span>
        </div>
      </div>

      {/* Filter Tabs by Urgency */}
      <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
        <button
          onClick={() => setFilterUrgency('all')}
          className={`px-2.5 py-1 rounded-lg font-medium transition ${
            filterUrgency === 'all'
              ? 'bg-cyan-600 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Semua ({counts.total})
        </button>
        <button
          onClick={() => setFilterUrgency('overdue')}
          className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
            filterUrgency === 'overdue'
              ? 'bg-rose-600 text-white font-bold'
              : 'bg-slate-900 text-rose-300 hover:text-white border border-rose-900/60'
          }`}
        >
          <span>🚨 Overdue</span>
          <span className="font-mono">({counts.overdue})</span>
        </button>
        <button
          onClick={() => setFilterUrgency('h_1_jam')}
          className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
            filterUrgency === 'h_1_jam'
              ? 'bg-orange-600 text-white font-bold'
              : 'bg-slate-900 text-orange-300 hover:text-white border border-orange-900/60'
          }`}
        >
          <span>⚠️ H-1 Jam</span>
          <span className="font-mono">({counts.h1})</span>
        </button>
        <button
          onClick={() => setFilterUrgency('h_2_jam')}
          className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
            filterUrgency === 'h_2_jam'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-900 text-amber-300 hover:text-white border border-amber-900/60'
          }`}
        >
          <span>⏳ H-2 Jam</span>
          <span className="font-mono">({counts.h2})</span>
        </button>
        <button
          onClick={() => setFilterUrgency('aman')}
          className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
            filterUrgency === 'aman'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-slate-900 text-emerald-300 hover:text-white border border-emerald-900/60'
          }`}
        >
          <span>🟢 Aman</span>
          <span className="font-mono">({counts.aman})</span>
        </button>
      </div>

      {telegramAlertMsg && (
        <div className="p-3 rounded-xl bg-sky-950/80 border border-sky-700/80 text-sky-200 text-xs flex items-center gap-2 animate-fadeIn">
          <Bot className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{telegramAlertMsg}</span>
        </div>
      )}

      {/* Grid of countdown cards */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {sortedAndFilteredList.map(({ booking, info }) => {
          const badge = info.urgencyBadge;

          return (
            <div
              key={booking.id}
              onClick={() => onSelectBooking && onSelectBooking(booking)}
              className={`rounded-xl p-3.5 border transition cursor-pointer relative overflow-hidden bg-slate-950/80 shadow-md flex flex-col justify-between ${
                info.urgency === 'overdue'
                  ? 'border-rose-600 hover:border-rose-400'
                  : info.urgency === 'h_1_jam'
                  ? 'border-orange-500 hover:border-orange-400'
                  : info.urgency === 'h_2_jam'
                  ? 'border-amber-500/80 hover:border-amber-400'
                  : 'border-slate-800 hover:border-cyan-600/60'
              }`}
            >
              {/* Top Row: Unit, Customer, and Urgency Badge */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                      {booking.snapshotKodeUnit || 'UNIT'}
                    </span>
                    <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                      {booking.nama}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Sub details: Model & duration */}
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {booking.snapshotNamaMotor} · <span className="text-slate-300 font-medium">{booking.labelDurasi}</span>
                </p>

                {/* Digital Countdown Timer Block */}
                <div className={`mt-2.5 p-2 rounded-lg border flex items-center justify-between ${
                  info.urgency === 'overdue'
                    ? 'bg-rose-950/50 border-rose-800/80'
                    : info.urgency === 'h_1_jam'
                    ? 'bg-orange-950/50 border-orange-800/70'
                    : info.urgency === 'h_2_jam'
                    ? 'bg-amber-950/40 border-amber-800/60'
                    : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block font-semibold text-slate-400">
                      {info.isOverdue ? 'Terlambat / Overdue:' : 'Sisa Waktu Sewa:'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-200">
                      {info.humanText}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`font-mono text-base font-extrabold tracking-wider ${
                      info.urgency === 'overdue'
                        ? 'text-rose-400 animate-pulse'
                        : info.urgency === 'h_1_jam'
                        ? 'text-orange-400'
                        : info.urgency === 'h_2_jam'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {info.formattedCountdown}
                    </span>
                    <span className="text-[9px] block text-slate-400 font-mono">
                      Tenggat: {booking.jamTanggalSelesai.split('T')[1]?.slice(0, 5) || '?'} WIB
                    </span>
                  </div>
                </div>

                {/* Overdue Penalty Details (D-27) */}
                {info.isOverdue && (
                  <div className="mt-2 p-2 rounded-lg bg-rose-950/80 border border-rose-800 text-[10px] space-y-1">
                    <div className="flex justify-between items-center text-rose-300">
                      <span className="font-semibold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>Denda Berjalan (D-27):</span>
                      </span>
                      <strong className="font-mono text-xs text-rose-200 font-bold">
                        {info.penalty.dendaFormat}
                      </strong>
                    </div>
                    <p className="text-[9px] text-rose-300/80 italic leading-tight">
                      {info.penalty.keterangan}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSendWhatsAppReminder(e, booking, info)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-2.5 rounded-lg transition active:scale-95 shadow-sm ${
                    info.urgency === 'overdue'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : info.urgency === 'h_1_jam'
                      ? 'bg-orange-600 hover:bg-orange-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                  title="Kirim pengingat WhatsApp sesuai tingkat urgensi"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>
                    {info.urgency === 'overdue'
                      ? 'WA Overdue'
                      : info.urgency === 'h_1_jam'
                      ? 'WA H-1'
                      : 'WA Ingatkan'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSendTelegramAlert(e, booking, info)}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-700/80 text-sky-300 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                  title="Kirim alert jatuh tempo ke Telegram Admin dengan tombol review & aksi"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bot TG</span>
                </button>

                {onSelectBooking && (
                  <button
                    type="button"
                    onClick={() => onSelectBooking(booking)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs"
                    title="Buka rincian booking"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
