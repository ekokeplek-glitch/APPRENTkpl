import { RyokoDatabase } from '../types/ryoko';

export interface GithubRepoInfo {
  fullName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string;
  htmlUrl: string;
  pushedAt: string;
}

export interface GithubCommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GithubFileMeta {
  name: string;
  path: string;
  sha: string;
  size: number;
  htmlUrl: string;
  downloadUrl?: string;
  lastCommit?: GithubCommitInfo;
}

export interface GithubSyncResult<T = unknown> {
  ok: boolean;
  message: string;
  sha?: string;
  htmlUrl?: string;
  data?: T;
}

/**
 * Parsing URL atau slug repository GitHub menjadi owner dan repo
 * Contoh:
 * - "https://github.com/ekokeplek-glitch/APPRENTkeplek.git" -> { owner: "ekokeplek-glitch", repo: "APPRENTkeplek" }
 * - "ekokeplek-glitch/APPRENTkeplek" -> { owner: "ekokeplek-glitch", repo: "APPRENTkeplek" }
 */
export function parseRepoSlug(input: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== 'string') return null;
  let clean = input.trim();
  clean = clean.replace(/\.git$/, '');
  clean = clean.replace(/^https?:\/\/github\.com\//, '');
  clean = clean.replace(/^git@github\.com:/, '');
  clean = clean.replace(/^\/+|\/+$/g, '');

  const parts = clean.split('/');
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

function getHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  return headers;
}

/**
 * Encode string UTF-8 ke base64 (kompatibel penuh dengan browser & karakter unicode/emoji)
 */
function utf8ToBase64(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode base64 ke string UTF-8
 */
function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Menguji koneksi ke repositori GitHub dan memeriksa branch
 */
export async function testGithubConnection(
  repoInput: string,
  branch = 'main',
  token?: string
): Promise<GithubSyncResult<{ repo: GithubRepoInfo; latestCommit?: GithubCommitInfo }>> {
  const parsed = parseRepoSlug(repoInput);
  if (!parsed) {
    return {
      ok: false,
      message: 'Format repository tidak valid. Gunakan format "owner/repo" atau URL GitHub.',
    };
  }

  const { owner, repo } = parsed;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (res.status === 404) {
      return {
        ok: false,
        message: `Repository "${owner}/${repo}" tidak ditemukan atau bersifat privat (membutuhkan Token GitHub dengan akses repo).`,
      };
    }

    if (res.status === 401) {
      return {
        ok: false,
        message: 'Token GitHub tidak valid atau telah kedaluwarsa. Periksa kembali Personal Access Token Anda.',
      };
    }

    if (res.status === 403) {
      const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
      if (rateLimitRemaining === '0') {
        return {
          ok: false,
          message: 'Batas kuota panggilan GitHub API (Rate Limit) tercapai. Masukkan GitHub Token untuk menaikkan limit hingga 5.000 panggilan/jam.',
        };
      }
      return {
        ok: false,
        message: 'Akses ditolak (403). Pastikan Token GitHub memiliki izin "repo" atau "contents:write".',
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        message: `GitHub API mengembalikan status ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    const repoInfo: GithubRepoInfo = {
      fullName: data.full_name,
      owner: data.owner?.login || owner,
      repo: data.name || repo,
      defaultBranch: data.default_branch || 'main',
      isPrivate: !!data.private,
      description: data.description || 'Tidak ada deskripsi',
      htmlUrl: data.html_url,
      pushedAt: data.pushed_at,
    };

    // Ambil commit terakhir pada branch
    let latestCommit: GithubCommitInfo | undefined;
    const targetBranch = branch || repoInfo.defaultBranch;
    try {
      const commitRes = await fetch(`${apiUrl}/commits/${targetBranch}`, {
        method: 'GET',
        headers: getHeaders(token),
      });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        latestCommit = {
          sha: commitData.sha,
          shortSha: commitData.sha.substring(0, 7),
          message: commitData.commit?.message?.split('\n')[0] || 'No message',
          author: commitData.commit?.author?.name || commitData.author?.login || 'Unknown',
          date: commitData.commit?.author?.date || new Date().toISOString(),
          url: commitData.html_url,
        };
      }
    } catch {
      // Ignore commit fetch error, repo was already verified
    }

    return {
      ok: true,
      message: `Terhubung ke ${repoInfo.fullName} (${repoInfo.isPrivate ? 'Private' : 'Public'}) pada branch "${targetBranch}".`,
      data: { repo: repoInfo, latestCommit },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Gagal menghubungi server GitHub: ${msg}. Periksa koneksi internet Anda.`,
    };
  }
}

/**
 * Memeriksa metadata file backup yang ada di GitHub
 */
export async function getGithubFileMeta(
  repoInput: string,
  filePath = 'data/ryokourent_db.json',
  branch = 'main',
  token?: string
): Promise<GithubSyncResult<GithubFileMeta>> {
  const parsed = parseRepoSlug(repoInput);
  if (!parsed) {
    return { ok: false, message: 'Format repository tidak valid.' };
  }

  const { owner, repo } = parsed;
  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (res.status === 404) {
      return {
        ok: false,
        message: `File "${cleanPath}" belum ada di branch "${branch}". Akan dibuat baru saat push pertama.`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        message: `Gagal membaca file dari GitHub (${res.status}): ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      message: `File ${cleanPath} ditemukan di GitHub (${Math.round((data.size || 0) / 1024)} KB).`,
      sha: data.sha,
      htmlUrl: data.html_url,
      data: {
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        htmlUrl: data.html_url,
        downloadUrl: data.download_url,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Gagal mengakses metadata file: ${msg}` };
  }
}

/**
 * Push database state langsung ke repository GitHub melalui GitHub REST API
 */
export async function pushDatabaseToGithub(
  db: RyokoDatabase,
  options: {
    repoInput: string;
    branch?: string;
    filePath?: string;
    token: string;
    includeSecrets?: boolean;
    customMessage?: string;
  }
): Promise<GithubSyncResult<{ commitSha?: string; htmlUrl?: string }>> {
  const { repoInput, branch = 'main', filePath = 'data/ryokourent_db.json', token, includeSecrets = false, customMessage } = options;

  if (!token || !token.trim()) {
    return {
      ok: false,
      message: 'Token GitHub (Personal Access Token) diperlukan untuk melakukan commit & push ke repository.',
    };
  }

  const parsed = parseRepoSlug(repoInput);
  if (!parsed) {
    return { ok: false, message: 'Format repository GitHub tidak valid.' };
  }

  const { owner, repo } = parsed;
  const cleanPath = filePath.replace(/^\/+/, '');

  // 1. Dapatkan SHA file lama jika file sudah ada (wajib untuk operasi update di GitHub Contents API)
  let existingSha: string | undefined;
  const metaRes = await getGithubFileMeta(repoInput, cleanPath, branch, token);
  if (metaRes.ok && metaRes.sha) {
    existingSha = metaRes.sha;
  }

  // 2. Siapkan konten database JSON (opsional masking kredensial sesuai F-13)
  const dbToExport = JSON.parse(JSON.stringify(db)) as RyokoDatabase;
  if (!includeSecrets) {
    dbToExport.settings = {
      ...dbToExport.settings,
      telegramBotToken: '',
      googleSheetsWebhookUrl: '',
      githubToken: '',
    };
  }
  dbToExport.lastUpdated = new Date().toISOString();
  const jsonContent = JSON.stringify(dbToExport, null, 2);
  const base64Content = utf8ToBase64(jsonContent);

  // 3. Susun commit payload
  const nowStr = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const commitMessage =
    customMessage?.trim() ||
    `chore(backup): sinkronisasi database RyokoRent - ${nowStr} WIB [${db.bookings.length} booking, ${db.units.length} unit]`;

  const payload: Record<string, unknown> = {
    message: commitMessage,
    content: base64Content,
    branch: branch,
  };
  if (existingSha) {
    payload.sha = existingSha;
  }

  // 4. Eksekusi PUT ke GitHub Contents API
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;

  try {
    const res = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        ...getHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      return {
        ok: false,
        message: 'Token GitHub tidak valid. Pastikan token memiliki izin cakupan "repo" atau "contents:write".',
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        message: 'Akses ditolak (403). Token GitHub Anda tidak memiliki izin untuk menulis (write) ke repository ini.',
      };
    }

    if (res.status === 409) {
      return {
        ok: false,
        message: 'Konflik commit (409 Conflict). Berkas di GitHub telah diubah dari tempat lain. Lakukan "Tarik dari GitHub" terlebih dahulu.',
      };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.message || res.statusText;
      return {
        ok: false,
        message: `Gagal melakukan push ke GitHub (${res.status}): ${detail}`,
      };
    }

    const resData = await res.json();
    const commitSha = resData.commit?.sha?.substring(0, 7);
    const htmlUrl = resData.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${cleanPath}`;

    return {
      ok: true,
      message: `Berhasil sinkronisasi & push database ke GitHub (${commitSha ? `Commit: ${commitSha}` : 'Berhasil'})!`,
      sha: resData.commit?.sha,
      htmlUrl,
      data: { commitSha: resData.commit?.sha, htmlUrl },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Gagal mengirim data ke GitHub: ${msg}`,
    };
  }
}

/**
 * Menarik (Pull) database cadangan dari repository GitHub dan memparsingnya
 */
export async function pullDatabaseFromGithub(options: {
  repoInput: string;
  branch?: string;
  filePath?: string;
  token?: string;
}): Promise<GithubSyncResult<RyokoDatabase>> {
  const { repoInput, branch = 'main', filePath = 'data/ryokourent_db.json', token } = options;

  const parsed = parseRepoSlug(repoInput);
  if (!parsed) {
    return { ok: false, message: 'Format repository GitHub tidak valid.' };
  }

  const { owner, repo } = parsed;
  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (res.status === 404) {
      return {
        ok: false,
        message: `File cadangan "${cleanPath}" tidak ditemukan di cabang "${branch}" pada repository ${owner}/${repo}.`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        message: `Gagal mengambil cadangan dari GitHub (${res.status}): ${res.statusText}`,
      };
    }

    const data = await res.json();
    if (!data.content) {
      return {
        ok: false,
        message: 'Konten file tidak ditemukan pada respon GitHub API.',
      };
    }

    // Decode base64 UTF-8
    const jsonStr = base64ToUtf8(data.content);
    const parsedDb = JSON.parse(jsonStr) as RyokoDatabase;

    if (!parsedDb.motors || !Array.isArray(parsedDb.motors) || !parsedDb.units || !parsedDb.bookings) {
      return {
        ok: false,
        message: 'File di GitHub bukan cadangan database RyokoRent yang valid (struktur data tidak cocok).',
      };
    }

    return {
      ok: true,
      message: `Cadangan berhasil ditarik dari GitHub! Berisi ${parsedDb.bookings.length} booking dan ${parsedDb.units.length} unit.`,
      sha: data.sha,
      htmlUrl: data.html_url,
      data: parsedDb,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Gagal mengimpor cadangan dari GitHub: ${msg}`,
    };
  }
}
