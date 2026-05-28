# Panduan Deployment Produksi HiTsBOT (Single Subdomain: ai.hitshare.web.id)

Panduan ini berisi langkah-demi-langkah (step-by-step) untuk mendeploy **HiTsBOT** ke VPS **Ubuntu 24.04 LTS** menggunakan satu subdomain terpadu: **`https://ai.hitshare.web.id`** untuk frontend maupun backend.

Jaringan akan menggunakan **Cloudflare Tunnel (cloudflared)** untuk meneruskan lalu lintas web publik ke port lokal VPS tanpa perlu membuka port firewall publik atau menggunakan konfigurasi Nginx manual.

---

## 🏗️ Peta Arsitektur Jaringan (Single Subdomain)
Lalu lintas masuk di bawah subdomain tunggal **`ai.hitshare.web.id`** akan diarahkan oleh Cloudflare Tunnel berdasarkan path:
1. **Lalu Lintas API (`/api/*`):** `https://ai.hitshare.web.id/api/...` ➔ Port Backend Core (`http://localhost:3001`).
2. **Lalu Lintas Web (Fallback):** `https://ai.hitshare.web.id/` ➔ Port Frontend Next.js (`http://localhost:3000`).

---

## 1. Prasyarat Sistem (Prerequisites)

SSH ke server VPS Ubuntu 24 Anda, lalu jalankan perintah-perintah berikut:

### A. Deteksi Struktur Workspace Monorepo
Sebelum memulai, gunakan perintah ini untuk mendeteksi letak tepat file `package.json` dan struktur folder dalam monorepo:
```bash
find . -name "package.json"
```
Ini akan memvalidasi bahwa Anda berada di root monorepo dan membantu memetakan lokasi folder `./apps/frontend` dan `./apps/backend-core`.

---

### B. Install Node.js (v20+) & NPM
Gunakan NodeSource PPA untuk menginstal Node.js versi LTS terbaru:

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Download & jalankan script instalasi NodeSource untuk Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js dan compiler pendukung native C++
sudo apt-get install -y nodejs build-essential
```

Verifikasi instalasi:
```bash
node -v  # Harus v20.x.x atau v22.x.x
npm -v   # Harus v10.x.x atau lebih tinggi
```

---

### C. Install & Konfigurasi MySQL Server
1. **Instalasi MySQL:**
   ```bash
   sudo apt install mysql-server -y
   ```
2. **Membuat Database dan User Baru:**
   Masuk ke shell MySQL sebagai root:
   ```bash
   sudo mysql
   ```
   Jalankan query SQL berikut untuk membuat database `hitsbot` dan user khusus:
   ```sql
   -- Buat database
   CREATE DATABASE hitsbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

   -- Buat user baru dengan password yang kuat
   CREATE USER 'hitsbot_user'@'localhost' IDENTIFIED BY 'PasswordKuatAnda123!';

   -- Berikan hak akses penuh ke database hitsbot
   GRANT ALL PRIVILEGES ON hitsbot.* TO 'hitsbot_user'@'localhost';

   -- Terapkan perubahan
   FLUSH PRIVILEGES;

   -- Keluar dari MySQL
   EXIT;
   ```

---

### D. Install & Konfigurasi Redis Server
Redis digunakan untuk antrean pesan keluar (**BullMQ**) dan penyimpanan context chat history.

1. **Instalasi Redis:**
   ```bash
   sudo apt install redis-server -y
   ```
2. **Konfigurasi Keamanan & Stabilitas:**
   Buka file konfigurasi Redis:
   ```bash
   sudo nano /etc/redis/redis.conf
   ```
   Cari opsi berikut dan sesuaikan:
   - **Supervised:** Ubah `supervised no` menjadi `supervised systemd`.
   - **Disk Full Protection (PENTING):** Secara default, Redis menolak semua aksi write jika background saving (BGSAVE) gagal (`stop-writes-on-bgsave-error yes`). Jika disk VPS sempat penuh atau memory berlebih, BullMQ akan macet permanen. Nonaktifkan proteksi ini dengan mengubahnya menjadi:
     ```text
     stop-writes-on-bgsave-error no
     ```
   Simpan file (`Ctrl+O`, `Enter`) dan keluar (`Ctrl+X`).

3. **Restart dan Aktifkan Redis:**
   ```bash
   sudo systemctl restart redis-server
   sudo systemctl enable redis-server
   ```

---

### E. Install PM2 (Process Manager) Secara Global
```bash
sudo npm install -g pm2
```

---

## 2. Setup Proyek, Environment, & Prisma

### A. Clone Repo dan Install Dependencies
Masuk ke direktori web server Anda (misal `/var/www/`):

```bash
cd /var/www
git clone <URL_REPOSITORI_ANDA> hitsbot
cd hitsbot

# Install dependencies di root monorepo
npm install

# Install dependencies untuk backend
cd apps/backend-core
npm install

# Install dependencies untuk frontend
cd ../frontend
npm install
```

---

### B. Setup Environment File (`.env`)

#### 1. Setup Backend `.env`
Buka file `.env` di folder `apps/backend-core/`:
```bash
cd /var/www/hitsbot/apps/backend-core
nano .env
```
Salin template berikut:
```env
PORT=3001
DATABASE_URL="mysql://hitsbot_user:PasswordKuatAnda123!@localhost:3306/hitsbot"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
```

#### 2. Setup Frontend `.env` (PENTING UNTUK BUILD NEXT.JS)
Buka file `.env` di folder `apps/frontend/`:
```bash
cd /var/www/hitsbot/apps/frontend
nano .env
```
Salin template berikut. **NEXT_PUBLIC_API_URL harus diarahkan ke subdomain tunggal tanpa sub-port**, karena browser client akan memanggil API melalui domain publik:
```env
NEXT_PUBLIC_API_URL="https://ai.hitshare.web.id"
```

---

### C. Jalankan Prisma Migration, Generate Client, & Seeder
Kembali ke folder `apps/backend-core/` untuk mempersiapkan database MySQL:

```bash
cd /var/www/hitsbot/apps/backend-core

# 1. Jalankan migrasi schema database
npx prisma migrate deploy

# 2. Generate Client Prisma yang kompatibel dengan driver adapter
npx prisma generate

# 3. Jalankan script seeder untuk membuat user default (admin / admin123)
npx prisma db seed

# 4. Build kode backend dari TypeScript ke Javascript
npm run build
```

---

### D. Build Frontend Next.js
Build frontend Next.js agar menghasilkan kode produksi statis yang teroptimasi:

```bash
cd /var/www/hitsbot/apps/frontend
npm run build
```

---

## 3. Konfigurasi PM2 Process Manager

Kita akan menjalankan aplikasi backend dan frontend secara bersamaan menggunakan file konfigurasi tunggal `ecosystem.config.cjs` di root proyek.

### A. Konfigurasi `ecosystem.config.cjs`
Buat file `ecosystem.config.cjs` di root direktori `/var/www/hitsbot/`:
```bash
cd /var/www/hitsbot
nano ecosystem.config.cjs
```
Pastikan kodenya adalah sebagai berikut:
```javascript
module.exports = {
  apps: [
    {
      name: 'hitsbot-backend',
      script: 'dist/index.js',
      cwd: './apps/backend-core',
      node_args: '--max-old-space-size=2048', // Batas memory heap Node.js agar hemat RAM
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      watch: false,
      ignore_watch: ['node_modules', 'sessions'], // Hindari restart saat file session WhatsApp berubah
      max_memory_restart: '2G',
      instances: 1, // Baileys WhatsApp MD WAJIB Fork Mode (1 instance) untuk mencegah sesi tabrakan
      exec_mode: 'fork',
    },
    {
      name: 'hitsbot-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './apps/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
};
```

---

### B. Menjalankan Aplikasi di PM2
Jalankan kedua proses secara bersamaan dari root direktori:

```bash
cd /var/www/hitsbot
pm2 start ecosystem.config.cjs
```

Periksa status proses PM2:
```bash
pm2 status
```

---

### C. Konfigurasi PM2 Auto-Start (VPS Reboot)
Agar aplikasi otomatis menyala saat server VPS melakukan restart/booting:

```bash
pm2 startup systemd
```
Terminal akan mencetak perintah `sudo env PATH=...`. **Salin dan jalankan perintah tersebut**.

Lalu simpan daftar proses PM2 Anda saat ini:
```bash
pm2 save
```

---

## 4. Panduan Integrasi Cloudflare Tunnel (`cloudflared`)

Cloudflare Tunnel digunakan untuk menghubungkan domain hitshare.web.id dari internet langsung ke localhost VPS secara aman.

### A. Install `cloudflared` di Ubuntu 24
Jalankan perintah berikut untuk menginstal package resmi `cloudflared` dari repository Cloudflare:

```bash
# Tambahkan GPG key Cloudflare
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

# Tambahkan repository Cloudflare ke sources list
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared general main' | sudo tee /etc/apt/sources.list.d/cloudflared.list

# Update package dan install cloudflared
sudo apt update
sudo apt install cloudflared -y
```

---

### B. Login & Autentikasi Tunnel
Lakukan login ke akun Cloudflare Anda:
```bash
cloudflared tunnel login
```
Terminal akan menampilkan sebuah tautan (URL). **Buka URL tersebut di browser Anda**, lalu pilih domain `hitshare.web.id` dan setujui otorisasi. File sertifikat autentikasi `cert.pem` otomatis diunduh dan dipasang di VPS Anda.

---

### C. Membuat Tunnel Baru
Buat sebuah tunnel baru bernama `hitsbot-tunnel`:
```bash
cloudflared tunnel create hitsbot-tunnel
```
Catat **Tunnel ID** (string UUID panjang) yang dicetak di terminal.

---

### D. Buat File Konfigurasi Tunnel (Path-Based Routing)
Buat file konfigurasi yaml untuk mendefinisikan rute lalu lintas jaringan ke port lokal:
```bash
mkdir -p ~/.cloudflare
nano ~/.cloudflare/config.yml
```
Salin dan lengkapi konfigurasi berikut. Bagian `ingress` menggunakan regex `^/api` untuk menangkap request backend, dan sisanya dilempar ke Next.js frontend (ganti `<TUNNEL_ID>` dengan UUID Tunnel Anda, dan `<USERNAME>` dengan nama user Ubuntu Anda):
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<USERNAME>/.cloudflare/<TUNNEL_ID>.json

ingress:
  # Rute 2: Request API (/api) diarahkan ke Backend (Port 3001)
  - hostname: ai.hitshare.web.id
    path: ^/api
    service: http://localhost:3001

  # Rute 1: Semua request lain diarahkan ke Frontend Next.js (Port 3000)
  - hostname: ai.hitshare.web.id
    service: http://localhost:3000

  # Fallback error jika hostname tidak cocok
  - service: http_status:404
```

---

### E. Melakukan Routing DNS Subdomain Tunggal
Koneksikan tunnel Anda dengan DNS record Cloudflare untuk subdomain `ai`:

```bash
# Daftarkan rute DNS untuk subdomain tunggal 'ai'
cloudflared tunnel route dns hitsbot-tunnel ai.hitshare.web.id
```

---

### F. Jalankan Cloudflare Tunnel sebagai Service Systemd
Agar tunnel otomatis berjalan saat server menyala tanpa perlu terminal terbuka:

```bash
# Daftarkan konfigurasi tunnel sebagai service systemd
sudo cloudflared --config /home/<USERNAME>/.cloudflare/config.yml service install

# Aktifkan dan jalankan service cloudflared
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

Periksa status tunnel:
```bash
sudo systemctl status cloudflared
```

---

## 5. Selesai & Pengujian
Sekarang, Anda dapat mengakses platform di **`https://ai.hitshare.web.id`**.
Semua interaksi client ke `https://ai.hitshare.web.id/api/...` akan secara otomatis dirutekan ke backend lokal port 3001, sedangkan loading halaman reguler masuk ke frontend lokal port 3000.
