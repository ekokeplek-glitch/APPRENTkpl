# Panduan Integrasi & Sinkronisasi GitHub (RyokoRent)

Dokumen ini menjelaskan status keterhubungan repositori git, cabang (branch), serta tata cara sinkronisasi 2-arah antara Google AI Studio dan GitHub Repository.

---

## 1. Informasi Repositori

* **Nama Repositori:** `APPRENTkeplek`
* **Pemilik Akun GitHub:** `ekokeplek-glitch`
* **URL Web Repositori:** [https://github.com/ekokeplek-glitch/APPRENTkeplek](https://github.com/ekokeplek-glitch/APPRENTkeplek)
* **URL Clone Remote:** `https://github.com/ekokeplek-glitch/APPRENTkeplek.git`
* **Cabang Aktif (Default Branch):** `main`
* **Remote Name:** `origin`

---

## 2. Cara Kerja Sinkronisasi di Google AI Studio

Proyek di lingkungan AI Studio Build ini telah dikonfigurasi dengan remote `origin` mengarah langsung ke `https://github.com/ekokeplek-glitch/APPRENTkeplek.git`.

### Opsi A: Sinkronisasi 1-Klik Melalui UI Google AI Studio (Direkomendasikan)
1. Pada antarmuka Google AI Studio (di pojok kanan atas tampilan layar workspace AI Studio), temukan tombol **Export to GitHub** atau menu **GitHub Sync**.
2. Jika diminta menghubungkan akun GitHub, setujui otorisasi GitHub App Google AI Studio untuk akun `ekokeplek-glitch`.
3. Pilih repositori `ekokeplek-glitch/APPRENTkeplek` dan cabang `main`.
4. AI Studio akan secara otomatis menyinkronkan seluruh berkas, commit, dan riwayat revisi kode langsung ke repositori Anda.

---

### Opsi B: Sinkronisasi via Terminal Lokal (VS Code / Git Bash)
Jika Anda ingin mengunduh atau mengembangkan kode di laptop / komputer lokal:

```bash
# 1. Clone repositori ke komputer lokal
git clone https://github.com/ekokeplek-glitch/APPRENTkeplek.git

# 2. Masuk ke direktori
cd APPRENTkeplek

# 3. Tarik pembaruan commit terbaru dari AI Studio
git pull origin main

# 4. Jika ada perubahan lokal yang ingin didorong kembali ke GitHub:
git add .
git commit -m "feat: perubahan dari lokal"
git push origin main
```

---

### Opsi C: Mendorong (Push) dari Terminal Container AI Studio
Jika Anda menjalankan perintah `git push` langsung dari terminal AI Studio, GitHub membutuhkan autentikasi (Personal Access Token atau deploy key) karena terminal tidak memiliki prompt kata sandi interaktif:

```bash
# Format dengan Personal Access Token (PAT):
git remote set-url origin https://<TOKEN_PERSONAL_ACCESS_GITHUB>@github.com/ekokeplek-glitch/APPRENTkeplek.git
git push origin main
```

*(Catatan: Jangan pernah menyimpan token rahasia ke dalam berkas kode publik).*

---

## 3. Fitur di Panel Pengaturan Aplikasi (SettingsView)

Di dalam aplikasi RyokoRent:
* Buka tab **Pengaturan** (ikon gear ⚙️).
* Temukan kartu **Koneksi GitHub & Sinkronisasi Repositori**.
* Tersedia tombol langsung:
  * **Buka Repo di GitHub**: Menuju langsung ke halaman repo di browser.
  * **Salin URL Git**: Menyalin URL clone ke clipboard.
  * **Salin Perintah**: Menyalin baris perintah sinkronisasi CLI.
