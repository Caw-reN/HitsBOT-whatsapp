# Panduan Deployment Produksi HiTsBOT (Cloudflare Tunnel + PM2)

Panduan ini berisi langkah-demi-langkah (step-by-step) untuk mendeploy **HiTsBOT** ke VPS **Ubuntu 24.04 LTS**. 

Untuk alasan keamanan dan kesederhanaan, aplikasi akan dijalankan secara lokal di VPS (`localhost`), lalu dihubungkan ke internet menggunakan **Cloudflare Tunnel (cloudflared)**. Anda tidak perlu membuka port publik (seperti 3000, 3001, atau 3306) di firewall, dan tidak perlu mengonfigurasi Nginx secara manual.

---

## 🏗️ Peta Arsitektur Jaringan
* **Domain Utama:** `https://hitshare.web.id` ➔ Diarahkan oleh Cloudflare Tunnel ke Frontend Next.js (`http://localhost:3000`).
* **Subdomain API:** `https://api.hitshare.web.id` ➔ Diarahkan oleh Cloudflare Tunnel ke Backend Core (`http://localhost:3001`).

---

## 1. Prasyarat Sistem (Prerequisites)

SSH ke server VPS Ubuntu 24 Anda, lalu jalankan perintah-perintah berikut:

### A. Install Node.js (v20+) & NPM
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

### B. Install & Konfigurasi MySQL Server
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

### C. Install & Konfigurasi Redis Server
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

### D. Install PM2 (Process Manager) Secara Global
PM2 digunakan untuk menjaga aplikasi backend dan frontend tetap berjalan di background secara terus-menerus.
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

# Install dependencies di tingkat root monorepo
npm install

# Masuk ke folder backend dan install dependencies backend
cd apps/backend-core
npm install

# Masuk ke folder frontend dan install dependencies frontend
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
Salin template berikut. **Harap gunakan URL subdomain API publik Anda** agar browser klien dapat melakukan fetch ke backend:
```env
NEXT_PUBLIC_API_URL="https://api.hitshare.web.id"
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

### D. Buat File Konfigurasi Tunnel
Buat file konfigurasi yaml untuk mendefinisikan rute lalu lintas jaringan ke port lokal:
```bash
mkdir -p ~/.cloudflare
nano ~/.cloudflare/config.yml
```
Salin dan lengkapi konfigurasi berikut (ganti `<TUNNEL_ID>` dengan UUID Tunnel Anda, dan `<USERNAME>` dengan nama user Ubuntu Anda):
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<USERNAME>/.cloudflare/<TUNNEL_ID>.json

ingress:
  # Rute domain utama ke Frontend Next.js (Port 3000)
  - hostname: hitshare.web.id
    service: http://localhost:3000

  # Rute subdomain ke Backend API Express (Port 3001)
  - hostname: api.hitshare.web.id
    service: http://localhost:3001

  # Rute fallback jika tidak ada hostname yang cocok (Error 404)
  - service: http_status:404
```

---

### E. Melakukan Routing DNS
Koneksikan tunnel Anda dengan DNS record Cloudflare:

```bash
# Rute untuk domain utama
cloudflared tunnel route dns hitsbot-tunnel hitshare.web.id

# Rute untuk subdomain API
cloudflared tunnel route dns hitsbot-tunnel api.hitshare.web.id
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

## 5. Manajemen Sesi Baileys (PENTING)

Baileys WhatsApp MD menyimpan token dan kunci enkripsi sesi Anda di folder `apps/backend-core/sessions/`.

1. **Abaikan Watch PM2:**
   Pastikan di dalam `ecosystem.config.cjs` tertulis `watch: false` dan `ignore_watch: ['node_modules', 'sessions']`. Jika tidak diatur, PM2 akan mendeteksi penulisan file baru di folder `sessions/` saat proses autentikasi QR Code dan langsung merestart aplikasi, menyebabkan loop crash (koneksi terputus-putus).
2. **Hak Akses Folder (Permissions):**
   Pastikan user Linux yang menjalankan PM2 memiliki hak akses tulis/baca penuh pada folder tersebut:
   ```bash
   sudo chown -R ubuntu:ubuntu /var/www/hitsbot/apps/backend-core/sessions
   ```
3. **Backup folder Sesi:**
   Jangan hapus atau bersihkan folder `sessions/` ini saat melakukan update kode Git di VPS. Backup folder ini secara berkala agar Anda tidak perlu memindai ulang QR Code WhatsApp.

---

## 6. Troubleshooting Ringkas

* **Cek Log PM2 (Real-time):**
  ```bash
  pm2 logs
  ```
* **Cek Status Proses:**
  ```bash
  pm2 status
  ```
* **Restart Layanan Aplikasi:**
  ```bash
  pm2 restart all
  ```
* **Restart Redis / MySQL Service:**
  ```bash
  sudo systemctl restart redis-server
  sudo systemctl restart mysql
  ```
* **Cek Status Cloudflare Tunnel:**
  ```bash
  sudo systemctl status cloudflared
  ```
