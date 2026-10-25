import React, { useState, useMemo } from 'react';
import {
  RyokoDatabase,
  DailyOperationalLog,
  OperationalLogCategory,
  OperationalLogPriority,
  AppUser,
} from '../types/ryoko';
import {
  ClipboardList,
  PlusCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Truck,
  Wrench,
  CloudSun,
  MapPin,
  Search,
  Share2,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Bike,
  X,
  Send,
} from 'lucide-react';
import { copyText } from '../utils/clipboard';

interface DailyOperationalLogSectionProps {
  db: RyokoDatabase;
  activeUser?: AppUser;
  onUpdateDatabase: (updatedDb: RyokoDatabase, actionName: string, detail: string) => void;
}

export const DailyOperationalLogSection: React.FC<DailyOperationalLogSectionProps> = ({
  db,
  activeUser,
  onUpdateDatabase,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('semua');
  const [filterPriority, setFilterPriority] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [formJudul, setFormJudul] = useState('');
  const [formKategori, setFormKategori] = useState<OperationalLogCategory>('catatan_shift');
  const [formPrioritas, setFormPrioritas] = useState<OperationalLogPriority>('normal');
  const [formUnit, setFormUnit] = useState('');
  const [formLokasi, setFormLokasi] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formPenulis, setFormPenulis] = useState(activeUser?.nama || 'Admin Ryoko');

  const logs = useMemo(() => {
    return (db.dailyOperationalLogs || []).slice().sort((a, b) => {
      // Sort by createdAt descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [db.dailyOperationalLogs]);

  // Statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const logsTodayCount = logs.filter(l => l.tanggal === todayStr).length;
  const insidenCount = logs.filter(l => l.kategori === 'insiden_lapangan').length;
  const daruratCount = logs.filter(l => l.prioritas === 'darurat' || l.prioritas === 'penting').length;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterCategory !== 'semua' && log.kategori !== filterCategory) return false;
      if (filterPriority !== 'semua' && log.prioritas !== filterPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = log.judul.toLowerCase().includes(q);
        const matchCatatan = log.catatan.toLowerCase().includes(q);
        const matchUnit = (log.unitTerkait || '').toLowerCase().includes(q);
        const matchLokasi = (log.lokasi || '').toLowerCase().includes(q);
        const matchPenulis = log.penulis.toLowerCase().includes(q);
        if (!matchTitle && !matchCatatan && !matchUnit && !matchLokasi && !matchPenulis) {
          return false;
        }
      }
      return true;
    });
  }, [logs, filterCategory, filterPriority, searchQuery]);

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formCatatan.trim()) return;

    const now = new Date();
    const waktuWib = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

    const newLog: DailyOperationalLog = {
      id: `log-${Date.now().toString().slice(-6)}`,
      tanggal: now.toISOString().split('T')[0],
      waktu: waktuWib,
      kategori: formKategori,
      prioritas: formPrioritas,
      judul: formJudul.trim(),
      catatan: formCatatan.trim(),
      unitTerkait: formUnit.trim() || undefined,
      lokasi: formLokasi.trim() || undefined,
      penulis: formPenulis.trim() || (activeUser?.nama || 'Admin'),
      penulisRole: activeUser?.role ? activeUser.role.toUpperCase() : 'ADMIN',
      createdAt: now.toISOString(),
    };

    const updatedLogs = [newLog, ...(db.dailyOperationalLogs || [])];
    const updatedDb: RyokoDatabase = {
      ...db,
      dailyOperationalLogs: updatedLogs,
    };

    onUpdateDatabase(
      updatedDb,
      'Tambah Log Operasional',
      `[${newLog.prioritas.toUpperCase()}] ${newLog.judul} (${newLog.kategori}) oleh ${newLog.penulis}`
    );

    // Reset Form
    setFormJudul('');
    setFormCatatan('');
    setFormUnit('');
    setFormLokasi('');
    setFormPrioritas('normal');
    setFormKategori('catatan_shift');
    setIsFormOpen(false);
  };

  const handleDeleteLog = (logId: string, judul: string) => {
    if (!window.confirm(`Hapus catatan log: "${judul}"?`)) return;

    const updatedLogs = (db.dailyOperationalLogs || []).filter(l => l.id !== logId);
    const updatedDb: RyokoDatabase = {
      ...db,
      dailyOperationalLogs: updatedLogs,
    };

    onUpdateDatabase(
      updatedDb,
      'Hapus Log Operasional',
      `Menghapus catatan harian: ${judul} (ID: ${logId})`
    );
  };

  const handleShareLog = async (log: DailyOperationalLog) => {
    const priorityEmoji =
      log.prioritas === 'darurat' ? '🚨 [DARURAT]' : log.prioritas === 'penting' ? '⚠️ [PENTING]' : 'ℹ️ [INFO]';

    const text =
      `*LOG OPERASIONAL RYOKO RENT MALANG & BATU*\n` +
      `${priorityEmoji} *${log.judul}*\n\n` +
      `📅 *Waktu:* ${log.tanggal} · ${log.waktu}\n` +
      `🏷️ *Kategori:* ${getCategoryLabel(log.kategori)}\n` +
      (log.unitTerkait ? `🛵 *Unit Terkait:* ${log.unitTerkait}\n` : '') +
      (log.lokasi ? `📍 *Lokasi:* ${log.lokasi}\n` : '') +
      `👤 *Pelapor:* ${log.penulis} (${log.penulisRole})\n\n` +
      `📝 *Catatan / Kronologi:*\n${log.catatan}\n\n` +
      `_Sistem Operasional RyokoRent LocalStorage_`;

    await copyText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2500);

    // Also offer direct WhatsApp send to staff / admin WhatsApp
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const getCategoryLabel = (cat: OperationalLogCategory): string => {
    switch (cat) {
      case 'catatan_shift':
        return 'Serah Terima Shift';
      case 'insiden_lapangan':
        return 'Insiden Lapangan';
      case 'lalu_lintas_cuaca':
        return 'Lalu Lintas & Cuaca';
      case 'kondisi_armada':
        return 'Kondisi Armada';
      case 'instruksi_tim':
        return 'Instruksi Tim';
      default:
        return 'Catatan Umum';
    }
  };

  const getCategoryBadge = (cat: OperationalLogCategory) => {
    switch (cat) {
      case 'insiden_lapangan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-950/70 border border-red-700/60 text-red-300 text-[11px] font-semibold">
            <AlertOctagon className="w-3 h-3 text-red-400" />
            <span>Insiden Lapangan</span>
          </span>
        );
      case 'kondisi_armada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[11px] font-semibold">
            <Wrench className="w-3 h-3 text-amber-400" />
            <span>Kondisi Armada</span>
          </span>
        );
      case 'lalu_lintas_cuaca':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-950/70 border border-sky-700/60 text-sky-300 text-[11px] font-semibold">
            <CloudSun className="w-3 h-3 text-sky-400" />
            <span>Lalu Lintas & Cuaca</span>
          </span>
        );
      case 'instruksi_tim':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/70 border border-purple-700/60 text-purple-300 text-[11px] font-semibold">
            <Truck className="w-3 h-3 text-purple-400" />
            <span>Instruksi Tim</span>
          </span>
        );
      case 'catatan_shift':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 text-[11px] font-semibold">
            <ClipboardList className="w-3 h-3 text-cyan-400" />
            <span>Serah Terima Shift</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (p: OperationalLogPriority) => {
    switch (p) {
      case 'darurat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/90 border border-rose-600 text-rose-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Darurat</span>
          </span>
        );
      case 'penting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-600 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <span>Penting</span>
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">
            <span>Normal</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0 mt-0.5">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Log Operasional Harian & Insiden Lapangan
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 font-mono font-medium">
                LocalStorage Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Catatan serah terima shift, insiden di lapangan, arahan kurir, dan kondisi armada tersimpan permanen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md ${
              isFormOpen
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 shadow-cyan-950/50'
            }`}
          >
            {isFormOpen ? (
              <>
                <X className="w-4 h-4 text-slate-400" />
                <span>Tutup Form</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>Tulis Log Baru</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-xs">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Total Log</span>
            <span className="text-lg font-black text-white font-mono">{logs.length}</span>
          </div>
          <ClipboardList className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Hari Ini</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{logsTodayCount}</span>
          </div>
          <Calendar className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Insiden / Urgent</span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {daruratCount > 0 ? `${daruratCount} Prioritas` : '0 Aman'}
            </span>
          </div>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      {/* Expandable New Log Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveLog}
          className="bg-slate-950/95 border border-cyan-800/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl transition"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">
                Formulir Catatan Lapangan / Insiden
              </span>
              <span className="text-[10px] text-slate-400">({formPenulis})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Judul Catatan */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Judul Catatan / Kejadian <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Kemacetan Jalur Pujon, Kurir Alih Rute"
                value={formJudul}
                onChange={e => setFormJudul(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600"
              />
            </div>

            {/* Kategori Log */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Kategori</label>
              <select
                value={formKategori}
                onChange={e => setFormKategori(e.target.value as OperationalLogCategory)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="catatan_shift">Serah Terima Shift</option>
                <option value="insiden_lapangan">Insiden Lapangan</option>
                <option value="lalu_lintas_cuaca">Lalu Lintas & Cuaca</option>
                <option value="kondisi_armada">Kondisi Armada</option>
                <option value="instruksi_tim">Instruksi Tim</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Prioritas */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Prioritas</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormPrioritas('normal')}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    formPrioritas === 'normal'
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setFormPrioritas('penting')}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    formPrioritas === 'penting'
                      ? 'bg-amber-950 text-amber-300 border-amber-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Penting ⚠️
                </button>
                <button
                  type="button"
                  onClick={() => setFormPrioritas('darurat')}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    formPrioritas === 'darurat'
                      ? 'bg-rose-950 text-rose-300 border-rose-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Darurat 🚨
                </button>
              </div>
            </div>

            {/* Unit Terkait */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Unit Terkait <span className="text-slate-500 text-[10px]">(Opsional)</span>
              </label>
              <select
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="">-- Umum / Tanpa Unit Khusus --</option>
                {db.units.map(u => (
                  <option key={u.id} value={u.kodeUnit}>
                    {u.kodeUnit} · {u.nomorPlat} ({u.poolLokasi.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Lokasi Lapangan */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Lokasi / Titik <span className="text-slate-500 text-[10px]">(Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Pool Dinoyo, Alun-Alun Batu"
                value={formLokasi}
                onChange={e => setFormLokasi(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Isi Catatan */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Isi Catatan / Kronologi Lengkap <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Tuliskan detail kejadian, solusi yang diambil, atau instruksi serah terima shift secara jelas..."
              value={formCatatan}
              onChange={e => setFormCatatan(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl p-3 text-xs text-white outline-none placeholder:text-slate-600 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dicatat oleh: <strong>{formPenulis}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/60 active:scale-95 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan ke LocalStorage</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari catatan, unit, insiden, atau nama staf..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category & Priority Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none shrink-0"
          >
            <option value="semua">Semua Kategori</option>
            <option value="catatan_shift">Serah Terima Shift</option>
            <option value="insiden_lapangan">Insiden Lapangan</option>
            <option value="lalu_lintas_cuaca">Lalu Lintas & Cuaca</option>
            <option value="kondisi_armada">Kondisi Armada</option>
            <option value="instruksi_tim">Instruksi Tim</option>
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none shrink-0"
          >
            <option value="semua">Semua Prioritas</option>
            <option value="darurat">🚨 Darurat</option>
            <option value="penting">⚠️ Penting</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Log Items List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-6 text-center space-y-2">
          <Info className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">Tidak ada log catatan yang sesuai</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Gunakan tombol <strong>"Tulis Log Baru"</strong> untuk mendokumentasikan serah terima shift atau insiden di lapangan.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map(log => {
            const isDarurat = log.prioritas === 'darurat';
            const isPenting = log.prioritas === 'penting';

            return (
              <div
                key={log.id}
                className={`bg-slate-950/70 border rounded-2xl p-3.5 sm:p-4 transition space-y-2 relative overflow-hidden ${
                  isDarurat
                    ? 'border-rose-700/80 bg-rose-950/20'
                    : isPenting
                    ? 'border-amber-700/60 bg-amber-950/15'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getPriorityBadge(log.prioritas)}
                    {getCategoryBadge(log.kategori)}
                    {log.unitTerkait && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/90 text-cyan-300 border border-cyan-800/40 text-[11px] font-mono font-bold">
                        <Bike className="w-3 h-3 text-cyan-400" />
                        <span>{log.unitTerkait}</span>
                      </span>
                    )}
                    {log.lokasi && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/60 text-slate-300 text-[11px]">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{log.lokasi}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{log.tanggal} · {log.waktu}</span>
                  </div>
                </div>

                {/* Judul & Catatan */}
                <div className="space-y-1 pt-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
                    {log.judul}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60 font-sans">
                    {log.catatan}
                  </p>
                </div>

                {/* Bottom Actions & Author */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      Oleh: <strong className="text-slate-200">{log.penulis}</strong> ({log.penulisRole})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleShareLog(log)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition active:scale-95"
                      title="Salin dan kirim ringkasan log via WhatsApp"
                    >
                      {copiedId === log.id ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3 text-emerald-400" />
                          <span>Kirim WA</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteLog(log.id, log.judul)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                      title="Hapus catatan ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
