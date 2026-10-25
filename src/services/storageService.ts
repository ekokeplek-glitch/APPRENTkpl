import { RyokoDatabase, AuditLogItem } from '../types/ryoko';
import { INITIAL_DATABASE } from '../data/seedData';

export const STORAGE_KEY = 'ryokourent_db_v1';

export type SaveResult = { ok: true } | { ok: false; message: string };

export function loadDatabase(): RyokoDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }
    const parsed = JSON.parse(raw) as RyokoDatabase;
    if (!parsed.motors || !parsed.units || !parsed.bookings) {
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }
    // Auto-migrate settings if missing
    if (!parsed.settings) {
      parsed.settings = { ...INITIAL_DATABASE.settings };
    } else {
      parsed.settings = { ...INITIAL_DATABASE.settings, ...parsed.settings };
    }
    // Auto-migrate serviceRecords if missing
    if (!parsed.serviceRecords) {
      parsed.serviceRecords = INITIAL_DATABASE.serviceRecords || [];
    }
    // Auto-migrate dailyOperationalLogs if missing
    if (!parsed.dailyOperationalLogs || !Array.isArray(parsed.dailyOperationalLogs)) {
      parsed.dailyOperationalLogs = INITIAL_DATABASE.dailyOperationalLogs || [];
    }
    // Auto-migrate users if missing
    if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
      parsed.users = INITIAL_DATABASE.users || [];
    }
    if (!parsed.currentUserId) {
      parsed.currentUserId = INITIAL_DATABASE.currentUserId || 'usr-admin';
    }
    // Ensure monthly price exists
    parsed.motors = parsed.motors.map(m => {
      if ((m as unknown as { harga2Minggu?: number }).harga2Minggu && !m.harga1Bulan) {
        m.harga1Bulan = Math.round((m.harga1Hari * 22) / 1000) * 1000;
      }
      return m;
    });

    return parsed;
  } catch (error) {
    console.error('Failed to load database from LocalStorage:', error);
    return INITIAL_DATABASE;
  }
}

/**
 * Menyimpan database ke LocalStorage dengan pelaporan status kuota (Snippet E - F-12)
 */
export function saveDatabase(db: RyokoDatabase): SaveResult {
  try {
    db.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return { ok: true };
  } catch (error) {
    const isQuota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22);
    const message = isQuota
      ? 'Kapasitas LocalStorage browser penuh. Segera ekspor backup JSON dan bersihkan riwayat log.'
      : 'Gagal menyimpan database ke LocalStorage.';
    console.error(message, error);
    return { ok: false, message };
  }
}

export function resetDatabaseToDefault(): RyokoDatabase {
  saveDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

/**
 * Ekspor database ke JSON dengan opsi menyembunyikan token rahasia (Snippet E - F-13)
 */
export function exportDatabaseJSON(includeSecrets = false): string {
  const db = loadDatabase();
  const { telegramBotToken, googleSheetsWebhookUrl, githubToken, ...safeSettings } = db.settings;
  const settings = includeSecrets
    ? db.settings
    : { ...safeSettings, telegramBotToken: '', googleSheetsWebhookUrl: '', githubToken: '' };
  return JSON.stringify({ ...db, settings }, null, 2);
}

/**
 * Impor database dari string JSON dengan validasi skema dasar dan merge settings (F-19)
 */
export function importDatabaseJSON(jsonStr: string): { success: boolean; message: string; db?: RyokoDatabase } {
  try {
    const parsed = JSON.parse(jsonStr) as RyokoDatabase;
    if (!parsed.motors || !Array.isArray(parsed.motors) || !parsed.units || !parsed.bookings) {
      return { success: false, message: 'Format file JSON tidak valid untuk database RyokoRent.' };
    }
    parsed.settings = { ...INITIAL_DATABASE.settings, ...(parsed.settings || {}) };
    parsed.lastUpdated = new Date().toISOString();
    const result = saveDatabase(parsed);
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, message: 'Database berhasil dipulihkan dari file cadangan.', db: parsed };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Kesalahan parsing JSON';
    return { success: false, message: `Gagal memulihkan database: ${errorMsg}` };
  }
}

export function getStorageUsage(): { bytes: number; kb: number; percentEstimate: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([raw]).size;
    const kb = Math.round((bytes / 1024) * 10) / 10;
    // Typical LocalStorage limit is 5MB
    const percentEstimate = Math.min(100, Math.round((bytes / (5 * 1024 * 1024)) * 1000) / 10);
    return { bytes, kb, percentEstimate };
  } catch {
    return { bytes: 0, kb: 0, percentEstimate: 0 };
  }
}

export function appendAuditLog(db: RyokoDatabase, aktivitas: string, detail: string): RyokoDatabase {
  const now = new Date();
  const timeStr =
    now.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }) +
    ' ' +
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
    ' WIB';

  const newLog: AuditLogItem = {
    id: `aud-${Date.now().toString(36)}`,
    waktu: timeStr,
    user: db.settings.operatorName || 'Operator Ryoko',
    aktivitas,
    detail,
  };

  const updatedLogs = [newLog, ...(db.settings.auditLogs || [])].slice(0, 100);
  return {
    ...db,
    settings: {
      ...db.settings,
      auditLogs: updatedLogs,
    },
  };
}
