import { BookingRecord, MotorModel, OvertimePenaltyResult } from '../types/ryoko';
import { parseWibToEpoch, calculateOvertimePenalty } from '../services/bookingEngine';

export type CountdownUrgencyLevel = 'aman' | 'h_2_jam' | 'h_1_jam' | 'overdue';

export interface CountdownInfo {
  bookingId: number;
  urgency: CountdownUrgencyLevel;
  diffSeconds: number; // positive = time remaining, negative = overdue
  isOverdue: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  formattedCountdown: string; // e.g. "01:24:05" or "+00:45:12"
  humanText: string; // e.g. "1j 24m tersisa" or "45m lewat"
  penalty: OvertimePenaltyResult;
  urgencyBadge: {
    bg: string;
    border: string;
    text: string;
    dotColor: string;
    label: string;
    icon: string;
  };
}

export function computeBookingCountdown(
  booking: BookingRecord,
  motor: MotorModel,
  nowEpoch: number
): CountdownInfo {
  const endEpoch = booking.endEpoch || parseWibToEpoch(booking.jamTanggalSelesai);
  const diffSeconds = endEpoch - nowEpoch;
  const isOverdue = diffSeconds <= 0;
  const penalty = calculateOvertimePenalty(booking, motor, nowEpoch);

  let urgency: CountdownUrgencyLevel = 'aman';
  if (isOverdue) {
    urgency = 'overdue';
  } else if (diffSeconds <= 3600) {
    urgency = 'h_1_jam';
  } else if (diffSeconds <= 7200) {
    urgency = 'h_2_jam';
  } else {
    urgency = 'aman';
  }

  const absDiff = Math.abs(diffSeconds);
  const hours = Math.floor(absDiff / 3600);
  const minutes = Math.floor((absDiff % 3600) / 60);
  const seconds = absDiff % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedCountdown = `${isOverdue ? '+' : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  let humanText = '';
  if (isOverdue) {
    if (hours > 0) {
      humanText = `${hours}j ${minutes}m lewat`;
    } else {
      humanText = `${minutes}m lewat`;
    }
  } else {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      humanText = `${days}h ${remHours}j tersisa`;
    } else if (hours > 0) {
      humanText = `${hours}j ${minutes}m tersisa`;
    } else {
      humanText = `${minutes}m ${seconds}s tersisa`;
    }
  }

  const urgencyBadge = {
    aman: {
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-600/60',
      text: 'text-emerald-300',
      dotColor: 'bg-emerald-400',
      label: 'Aman',
      icon: '🟢',
    },
    h_2_jam: {
      bg: 'bg-amber-950/80',
      border: 'border-amber-500/70',
      text: 'text-amber-300',
      dotColor: 'bg-amber-400',
      label: 'H-2 Jam',
      icon: '⏳',
    },
    h_1_jam: {
      bg: 'bg-orange-950/90',
      border: 'border-orange-500',
      text: 'text-orange-300',
      dotColor: 'bg-orange-400',
      label: 'H-1 Jam (< 60m)',
      icon: '⚠️',
    },
    overdue: {
      bg: 'bg-rose-950/90',
      border: 'border-rose-600',
      text: 'text-rose-200',
      dotColor: 'bg-rose-500',
      label: 'Overdue (Denda)',
      icon: '🚨',
    },
  }[urgency];

  return {
    bookingId: booking.id,
    urgency,
    diffSeconds,
    isOverdue,
    hours,
    minutes,
    seconds,
    formattedCountdown,
    humanText,
    penalty,
    urgencyBadge,
  };
}
