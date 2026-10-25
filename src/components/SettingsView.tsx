import React, { useState } from 'react';
import {
  RyokoDatabase,
  RentalSettings,
  AppUser,
} from '../types/ryoko';
import {
  getStorageUsage,
  exportDatabaseJSON,
  importDatabaseJSON,
  resetDatabaseToDefault,
} from '../services/storageService';
import {
  sanitizeTextNoNik,
  containsNikPattern,
} from '../services/bookingEngine';
import {
  Settings,
  Phone,
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  History,
  Users,
  UserCheck,
  FileSpreadsheet,
  Send,
  Bot,
  Github,
  GitBranch,
  GitCommit,
  ExternalLink,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { copyText } from '../utils/clipboard';
import {
  downloadBookingsCSV,
  bulkSyncBookingsToGoogleSheets,
  getOfflineSheetsQueueCount,
} from '../services/googleSheetsService';
import {
  testTelegramBotConnection,
  sendTelegramReturnAlert,
} from '../services/telegramBotService';

interface SettingsViewProps {
  db: RyokoDatabase;
  activeUser?: AppUser;
  onUpdateSettings: (settings: RentalSettings) => void;
  onResetDatabase: () => void;
  onImportSuccess: (db: RyokoDatabase) => void;
  onOpenInstallGuide: () => void;
  onNavigateToUsers?: () => void;
  onOpenRecoveryWizard?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  activeUser,
  onUpdateSettings,
  onResetDatabase,
  onImportSuccess,
  onOpenInstallGuide,
  onNavigateToUsers,
  onOpenRecoveryWizard,
}) => {
  const [adminWa, setAdminWa] = useState(db.settings.adminWhatsapp || '6281234567890');
  const [operatorName, setOperatorName] = useState(db.settings.operatorName || 'Operator Ryoko');
  const [namaRental, setNamaRental] = useState(db.settings.namaRental || 'Ryoko Rent Motor Malang & Batu');
  const [poolMalang, setPoolMalang] = useState(db.settings.poolMalangAlamat || '');
  const [poolBatu, setPoolBatu] = useState(db.settings.poolBatuAlamat || '');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(db.settings.googleSheetsWebhookUrl || '');
  const [telegramToken, setTelegramToken] = useState(db.settings.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(db.settings.telegramAdminChatId || '');
  const [saveMsg, setSaveMsg] = useState('');
  const [integrationStatus, setIntegrationStatus] = useState<string>('');
  const [isTestingTg, setIsTestingTg] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [includeBackupSecrets, setIncludeBackupSecrets] = useState<boolean>(false);
  const [copiedRepoUrl, setCopiedRepoUrl] = useState<boolean>(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState<boolean>(false);

  const repoUrl = 'https://github.com/ekokeplek-glitch/APPRENTkeplek';
  const repoGitUrl = 'https://github.com/ekokeplek-glitch/APPRENTkeplek.git';
  const repoBranch = 'main';

  const handleCopyRepoUrl = async () => {
    const ok = await copyText(repoGitUrl);
    if (ok) {
      setCopiedRepoUrl(true);
      setTimeout(() => setCopiedRepoUrl(false), 2500);
    }
  };

  const handleCopyGitCmd = async () => {
    const cmd = `git remote set-url origin https://github.com/ekokeplek-glitch/APPRENTkeplek.git\ngit pull origin main\ngit push origin main`;
    const ok = await copyText(cmd);
    if (ok) {
      setCopiedGitCmd(true);
      setTimeout(() => setCopiedGitCmd(false), 2500);
    }
  };

  // Anti-NIK interactive tester
  const [testNikInput, setTestNikInput] = useState('Contoh NIK KTP: 3573011205980001');

  // Storage usage
  const storageInfo = getStorageUsage();

  const handleSaveOperationalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RentalSettings = {
      ...db.settings,
      adminWhatsapp: adminWa.trim(),
      operatorName: operatorName.trim(),
      namaRental: namaRental.trim(),
      poolMalangAlamat: poolMalang.trim(),
      poolBatuAlamat: poolBatu.trim(),
      googleSheetsWebhookUrl: googleSheetsUrl.trim(),
      telegramBotToken: telegramToken.trim(),
      telegramAdminChatId: telegramChatId.trim(),
    };
    onUpdateSettings(updated);
    setSaveMsg('Pengaturan operasional & integrasi berhasil disimpan ke LocalStorage!');
    setTimeout(() => setSaveMsg(''), 4000);
  };

  const handleDownloadCSV = () => {
    downloadBookingsCSV(db.bookings);
    setIntegrationStatus('Berkas CSV 13-Field berhasil diunduh untuk Google Sheets!');
    setTimeout(() => setIntegrationStatus(''), 4000);
  };

  const handleSyncGoogleSheets = async () => {
    setIsSyncingSheets(true);
    setIntegrationStatus('Menyinkronkan transaksi ke Google Sheets...');
    const res = await bulkSyncBookingsToGoogleSheets(db.bookings, googleSheetsUrl);
    setIsSyncingSheets(false);
    setIntegrationStatus(res.message);
    setTimeout(() => setIntegrationStatus(''), 6000);
  };

  const handleTestTelegram = async () => {
    setIsTestingTg(true);
    setIntegrationStatus('Menghubungi Telegram API...');
    const res = await testTelegramBotConnection(telegramToken, telegramChatId);
    setIsTestingTg(false);
    setIntegrationStatus(res.message);
    setTimeout(() => setIntegrationStatus(''), 6000);
  };

  const handleTestTelegramReturnAlert = async () => {
    const sampleBooking = db.bookings.find(b => b.status === 'ryokou_disewa' || b.status === 'ryokou_approved') || db.bookings[0];
    if (!sampleBooking) {
      setIntegrationStatus('Tidak ada data booking untuk simulasi alert.');
      return;
    }
    const motor = db.motors.find(m => m.id === sampleBooking.motorId) || db.motors[0];
    setIntegrationStatus('Mengirimkan notifikasi jatuh tempo contoh ke Telegram...');
    const res = await sendTelegramReturnAlert(
      sampleBooking,
      motor,
      'h_2_jam',
      telegramToken,
      telegramChatId,
      25000
    );
    setIntegrationStatus(res.message);
    setTimeout(() => setIntegrationStatus(''), 6000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJSON(includeBackupSecrets);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ryokourent_backup_${includeBackupSecrets ? 'full_' : 'sanitized_'}${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const res = importDatabaseJSON(content);
      if (res.success && res.db) {
        onImportSuccess(res.db);
        alert(res.message);
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    const ok = window.confirm(
      'Apakah Anda yakin ingin mereset seluruh database ke data awal standar Ryoko Rent (16 unit fisik garasi & 6 model)? Data perubahan akan diganti.'
    );
    if (ok) {
      onResetDatabase();
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span>Pengaturan Sistem & Database Lokal</span>
        </h2>
        <p className="text-xs text-slate-400">
          Kelola kontak WhatsApp admin, alamat pool, kepatuhan UU PDP, dan penyimpanan offline LocalStorage.
        </p>
      </div>

      {saveMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* Kartu Manajemen Pengguna & Hak Akses 4 Tingkat */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-800/40 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
            👥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Panel Manajemen Pengguna & Hak Akses</span>
              </h3>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                {db.users?.length || 0} Akun
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola 4 tingkatan peran: Administrator, Admin Custom, Operator, dan Kurir.
            </p>
          </div>
        </div>

        {onNavigateToUsers && (
          <button
            type="button"
            onClick={onNavigateToUsers}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-md shadow-indigo-950/40 shrink-0"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kelola Pengguna →</span>
          </button>
        )}
      </div>

      {/* 1. Pengaturan Operasional & WhatsApp */}
      <form
        onSubmit={handleSaveOperationalSettings}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs"
      >
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Nomor WhatsApp Admin & Identitas Rental (D-22 & D-23)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-300">
              Nomor WhatsApp Admin (Penerima Booking & Konfirmasi):
            </label>
            <input
              type="text"
              value={adminWa}
              onChange={e => setAdminWa(e.target.value)}
              placeholder="Contoh: 6281234567890"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Gunakan format internasional diawali 62 (misal 6281234567890).
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-300">
              Nama Operator yang Bertugas:
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              placeholder="Misal: Operator Ryoko / Rudi Hartono"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1 text-slate-300">Nama Rental Sepeda Motor:</label>
          <input
            type="text"
            value={namaRental}
            onChange={e => setNamaRental(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-300">Alamat Pool Malang (Dinoyo):</label>
            <textarea
              rows={2}
              value={poolMalang}
              onChange={e => setPoolMalang(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-300">Alamat Pool Batu (Diponegoro):</label>
            <textarea
              rows={2}
              value={poolBatu}
              onChange={e => setPoolBatu(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-md shadow-cyan-950 active:scale-95"
          >
            Simpan Pengaturan Operasional
          </button>
        </div>
      </form>

      {/* 2. Database LocalStorage & Cadangan Data */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Database Penyimpanan Offline LocalStorage</span>
        </h3>

        {/* Quota Gauge */}
        <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold">Penggunaan Memori LocalStorage:</span>
            <span className="font-mono text-cyan-400 font-bold">
              {storageInfo.kb} KB ({storageInfo.percentEstimate}% dari ~5MB)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.max(2, storageInfo.percentEstimate)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Database tersimpan 100% lokal di browser / APK Android tanpa perlu koneksi internet untuk mengelola transaksi.
          </p>
        </div>

        {/* Action Buttons: Export, Import, Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleDownloadBackup}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition flex items-center gap-2.5"
          >
            <Download className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <strong className="block text-white">Unduh Cadangan</strong>
              <span className="text-[11px] text-slate-400">
                {includeBackupSecrets ? 'Format JSON (Semua Data + Kredensial)' : 'Format JSON (Sanitasi Rahasia F-13)'}
              </span>
            </div>
          </button>

          <label className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition flex items-center gap-2.5 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="block text-white">Pulihkan Data</strong>
              <span className="text-[11px] text-slate-400">Impor dari file JSON</span>
            </div>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleFactoryReset}
            className="p-3 rounded-xl bg-red-950/40 hover:bg-red-950/60 border border-red-800/60 text-red-300 text-left transition flex items-center gap-2.5"
          >
            <RotateCcw className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <strong className="block text-red-200">Reset Pabrik</strong>
              <span className="text-[11px] text-red-300/80">Muat ulang data standar</span>
            </div>
          </button>
        </div>

        {/* Security Toggle: Include Secrets */}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
          <input
            type="checkbox"
            id="includeBackupSecretsToggle"
            checked={includeBackupSecrets}
            onChange={e => setIncludeBackupSecrets(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
          />
          <label htmlFor="includeBackupSecretsToggle" className="cursor-pointer select-none">
            Sertakan kredensial (Token Telegram & Webhook Sheets). <em>Default aman: tidak disertakan untuk mencegah kebocoran token (F-13).</em>
          </label>
        </div>
      </div>

      {/* Integrasi Kolaborasi: Google Sheets & Bot Telegram (TASK-013 & TASK-014) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <span>Integrasi Kolaborasi: Google Sheets & Bot Telegram (TASK-013 & TASK-014)</span>
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-300">
            Kolaborasi Aktif
          </span>
        </div>

        {integrationStatus && (
          <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{integrationStatus}</span>
          </div>
        )}

        {/* Sub-Card 1: Google Sheets Collaboration */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>1. Google Sheets: Simpan Data 13-Field, Review, Opsi & Aksi</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Antrean Offline: <strong className="text-emerald-400">{getOfflineSheetsQueueCount()}</strong>
            </span>
          </div>

          <p className="text-slate-400 text-[11px] leading-relaxed">
            Mengekspor seluruh 13 field data penyewa ke baris spreadsheet Google Sheets. Memungkinkan Owner/Admin mereview data (Status: Pending/Approved/Rejected), memilih opsi operasional (Siapkan Unit, Tugaskan Kurir, Kirim Tagihan), dan mencatat aksi yang disetujui.
          </p>

          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold text-[11px]">
              URL Webhook Google Apps Script (Opsional untuk Sinkronisasi Otomatis):
            </label>
            <input
              type="url"
              value={googleSheetsUrl}
              onChange={e => setGoogleSheetsUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500">
              Lihat panduan dan salin kode Apps Script di <code>docs/GOOGLE_SHEETS_INTEGRATION.md</code>.
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold transition flex items-center gap-1.5 border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV 13-Field (Siap Impor Sheets)</span>
            </button>

            <button
              type="button"
              onClick={handleSyncGoogleSheets}
              disabled={isSyncingSheets}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSyncingSheets ? 'Menyinkronkan...' : 'Sinkronkan ke Google Sheets'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Card 2: Telegram Bot Return Alert */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Bot className="w-4 h-4 text-sky-400" />
              <span>2. Bot Telegram: Alert Pengembalian & Tombol Aksi Interaktif</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-300">
              Inline Keyboard
            </span>
          </div>

          <p className="text-slate-400 text-[11px] leading-relaxed">
            Bot Telegram mengirimkan notifikasi jatuh tempo (H-2 Jam, H-1 Jam, Overdue) langsung ke Telegram Admin/Operator. Dilengkapi tombol inline review detail, setujui penyelesaian unit di pool, perpanjangan sewa, dan pengenaan denda keterlambatan.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold text-[11px]">
                Telegram Bot Token (@BotFather):
              </label>
              <input
                type="text"
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
                placeholder="7123456789:AAF_..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold text-[11px]">
                Chat ID Admin / Grup Telegram (@userinfobot):
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="Contoh: 123456789 atau -100..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTg}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold transition flex items-center gap-1.5 border border-slate-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTestingTg ? 'Menguji...' : 'Uji Koneksi Telegram'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestTelegramReturnAlert}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold transition flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Kirim Alert Jatuh Tempo Contoh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Integrasi GitHub & Sinkronisasi Repositori AI Studio */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-slate-800 text-white border border-slate-700">
              <Github className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Koneksi GitHub & Sinkronisasi Repositori</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Terhubung ke remote origin branch <code className="text-cyan-400">main</code>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Terkoneksi ke GitHub</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Repositori Aktif</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono break-all">
                  ekokeplek-glitch / APPRENTkeplek
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                  main
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition flex items-center gap-1.5 border border-slate-700 active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Repo di GitHub</span>
              </a>

              <button
                type="button"
                onClick={handleCopyRepoUrl}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition flex items-center gap-1.5 border border-slate-700 active:scale-95"
              >
                {copiedRepoUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedRepoUrl ? 'Tersalin!' : 'Salin URL Git'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Github className="w-3.5 h-3.5" />
                <span>Cara Sinkronisasi via Google AI Studio</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Di antarmuka Google AI Studio (pada menu bilah atas atau menu proyek di pojok kanan atas layar), klik <strong>&quot;Export to GitHub&quot;</strong> atau <strong>&quot;Sync to GitHub&quot;</strong>. AI Studio secara langsung mem-push seluruh revisi, kode, dan commit branch <code>main</code> ke repositori <code>ekokeplek-glitch/APPRENTkeplek</code>.
              </p>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Sinkronisasi Manual / Lokal (CLI)</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyGitCmd}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedGitCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedGitCmd ? 'Tersalin' : 'Salin Perintah'}</span>
                </button>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Untuk menyinkronkan ke komputer lokal Anda atau via terminal VS Code:
              </p>
              <pre className="p-2 bg-slate-950 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
git pull origin main{'\n'}git push origin main
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ⚡ ZLCE Studio - Snapshot Recovery & State Verifier */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="text-amber-300 text-base">⚡</span>
            <span>ZLCE Studio - Pemulihan Sesi & Snapshot Recovery</span>
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
            v3.2.2 Active
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Buka wizard pemulihan sesi untuk membuat snapshot git otomatis, menyalin bundel hand-over antar agen AI, atau mendiagnosis status pohon kerja (Kasus A, B, C, D).
        </p>

        {onOpenRecoveryWizard && (
          <button
            onClick={onOpenRecoveryWizard}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-slate-950 font-bold transition flex items-center gap-2 shadow-md shadow-cyan-950 active:scale-95"
          >
            <span className="text-slate-950 font-black">⚡</span>
            <span>Buka Wizard ⚡ ZLCE Studio</span>
          </button>
        )}
      </div>

      {/* 4. Uji Kepatuhan Anti-NIK UU PDP No. 27/2022 (D-21 & F-14) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Pengujian Kepatuhan UU PDP No. 27/2022 (Sensor Anti-NIK D-21 & F-14)</span>
        </h3>
        <p className="text-slate-400">
          Ryoko Rent mematuhi UU Perlindungan Data Pribadi No. 27/2022 dengan melarang penyimpanan 16 digit NIK. Setiap input 16 angka berurutan disensor otomatis menggunakan masking bintang (************XXXX) untuk menjamin privasi identitas penyewa.
        </p>

        <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <label className="block text-slate-300 font-semibold">Coba Ketik Teks Mengandung 16 Digit Angka:</label>
          <input
            type="text"
            value={testNikInput}
            onChange={e => setTestNikInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
          />

          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Hasil Sanitasi Sistem Otomatis:</span>
            <p className="font-mono text-cyan-300 font-bold bg-slate-900 p-2 rounded-lg mt-1 break-all">
              {sanitizeTextNoNik(testNikInput)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Panduan Pemasangan APK Android */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span>Panduan Pemasangan Aplikasi di HP Android (APK / PWA)</span>
        </h3>
        <p className="text-slate-300 leading-relaxed">
          Aplikasi ini dirancang sebagai <strong>Progressive Web App (PWA) Standalone APK</strong>. Anda dapat menginstalnya langsung di smartphone Android tanpa melalui Google Play Store:
        </p>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
            <li>
              Buka aplikasi ini di browser Chrome pada perangkat Android Anda.
            </li>
            <li>
              Klik tombol <strong>&quot;Pasang APK&quot;</strong> di pojok kanan atas, atau buka menu Chrome (titik tiga ⋮) lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> / <strong>&quot;Install App&quot;</strong>.
            </li>
            <li>
              Ikon <strong>RyokoRent</strong> akan muncul di daftar aplikasi Android Anda dan berjalan dalam mode layar penuh (standalone) seperti aplikasi APK native.
            </li>
            <li>
              Semua data booking, armada motor, dan pelacakan tetap tersimpan di memori perangkat secara offline.
            </li>
          </ol>
        </div>

        <button
          onClick={onOpenInstallGuide}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition flex items-center gap-1.5"
        >
          <Smartphone className="w-4 h-4" />
          <span>Buka Modal Instalasi Android</span>
        </button>
      </div>

      {/* 5. Riwayat Audit Log Sistem */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span>Catatan Aktivitas Operasional (Audit Log)</span>
        </h3>

        <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
          {db.settings.auditLogs?.map(log => (
            <div key={log.id} className="p-3 text-xs space-y-0.5">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-semibold text-white">{log.aktivitas}</span>
                <span className="text-[11px] font-mono">{log.waktu}</span>
              </div>
              <p className="text-slate-300 text-[11px]">{log.detail}</p>
              <span className="text-[10px] text-cyan-400">Oleh: {log.user}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
