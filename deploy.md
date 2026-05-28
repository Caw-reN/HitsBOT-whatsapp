# Panduan Deployment Produksi HiTsBOT

Dokumen ini berisi panduan langkah-demi-langkah (step-by-step) untuk mendeploy backend **HiTsBOT** ke server produksi VPS (Ubuntu Server). 

---

## 1. Prasyarat Sistem (Prerequisites)

Masuk ke server VPS Ubuntu Anda menggunakan SSH, lalu jalankan langkah-langkah berikut:

### A. Install Node.js (v20+) & NPM
Gunakan NodeSource PPA untuk menginstal Node.js versi LTS terbaru (v20):

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Download & jalankan script instalasi NodeSource untuk Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js dan build-essential (untuk modul native C++ compile)
sudo apt-get install -y nodejs build-essential
```

Verifikasi instalasi dengan memeriksa versi:
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
2. **Amankan MySQL (Opsional namun direkomendasikan):**
   ```bash
   sudo mysql_secure_installation
   ```
3. **Membuat Database dan User Baru:**
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
Redis digunakan untuk antrean pesan keluar (**BullMQ**) dan penyimpanan context chat chat history.

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
   - **Supervised:** Ubah `supervised no` menjadi `supervised systemd` agar terintegrasi dengan systemd Ubuntu.
   - **Disk Full Protection (PENTING):** Secara default, Redis akan menolak semua aksi write jika background saving (BGSAVE) gagal (`stop-writes-on-bgsave-error yes`). Jika disk VPS sempat penuh atau memory berlebih, BullMQ akan macet permanen. Nonaktifkan proteksi ini dengan mengubahnya menjadi:
     ```text
     stop-writes-on-bgsave-error no
     ```
   Simpan file (`Ctrl+O`, `Enter`) dan keluar (`Ctrl+X`).

3. **Restart dan Aktifkan Redis:**
   ```bash
   sudo systemctl restart redis-server
   sudo systemctl enable redis-server
   ```
4. **Verifikasi Redis:**
   ```bash
   redis-cli ping  # Harus merespons dengan "PONG"
   ```

---

### D. Install PM2 (Process Manager) Secara Global
PM2 digunakan untuk menjaga aplikasi backend tetap berjalan terus-menerus di background dan auto-restart jika crash.
```bash
sudo npm install -g pm2
```

---

## 2. Setup Proyek & Environment

### A. Clone Repo dan Install Dependencies
Masuk ke direktori web server Anda (misal `/var/www/` atau home directory user Anda):

```bash
cd /var/www
# Clone repositori proyek Anda
git clone <URL_REPOSITORI_ANDA> hitsbot

cd hitsbot/apps/backend-core
# Install dependencies khusus untuk backend-core
npm install
```

---

### B. Konfigurasi File `.env` Produksi
Buat file `.env` di dalam folder `apps/backend-core/`:
```bash
nano .env
```

Salin contoh template berikut dan sesuaikan nilainya:
```env
# Port aplikasi backend
PORT=3001

# MySQL Connection String (Format: mysql://user:password@host:port/database)
DATABASE_URL="mysql://hitsbot_user:PasswordKuatAnda123!@localhost:3306/hitsbot"

# Konfigurasi Redis
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379

# Kunci API Google Gemini (Dapatkan dari Google AI Studio)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```
Simpan dan keluar dari editor.

---

### C. Jalankan Prisma Migration & Generate Client
Sinkronisasikan skema Prisma ke database MySQL produksi dan generate Prisma Client JavaScript runtime:

```bash
# Jalankan migrasi database di production (tanpa reset data)
npx prisma migrate deploy

# Generate Prisma Client baru dengan database adapter
npx prisma generate

# Build TypeScript proyek menjadi Javascript murni
npm run build
```

---

## 3. Konfigurasi PM2 Process Manager

File konfigurasi PM2 telah disediakan di `apps/backend-core/ecosystem.config.cjs`. File ini dikonfigurasi khusus menggunakan extensi `.cjs` untuk kompatibilitas penuh dengan sistem ES Modules di Node.js.

### Review File `ecosystem.config.cjs`
```javascript
module.exports = {
  apps: [
    {
      name: 'hitsbot-backend',
      script: 'dist/index.js',
      node_args: '--max-old-space-size=4096', // Alokasikan memori Node hingga 4GB untuk mencegah Out-Of-Memory
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      ignore_watch: ['node_modules', 'sessions'], // Cegah PM2 merestart aplikasi saat session whatsapp diperbarui
      max_memory_restart: '4G',
      instances: 1, // PENTING: Baileys WHATSAPP MD wajib dijalankan 1 INSTANCE (Fork Mode) untuk mencegah konflik multi-login session
      exec_mode: 'fork',
    }
  ]
};
```

### Cara Menjalankan Backend dengan PM2
Dari folder `apps/backend-core/`, jalankan aplikasi menggunakan konfigurasi PM2:

```bash
pm2 start ecosystem.config.cjs
```

### Konfigurasi PM2 Startup (Auto-Run saat VPS Restart)
Agar backend HiTsBOT otomatis menyala ketika server VPS melakukan reboot:

```bash
# Generate startup script
pm2 startup systemd
```
Terminal akan mencetak sebuah perintah panjang (yang dimulai dengan `sudo env PATH=...`). **Salin dan jalankan perintah tersebut** di terminal Anda.

Setelah itu, simpan daftar proses aktif PM2 saat ini:
```bash
pm2 save
```

---

## 4. Manajemen Sesi Baileys (PENTING)

Baileys WhatsApp MD menyimpan kredensial autentikasi (token enkripsi, session keys, dll.) di dalam folder lokal `apps/backend-core/sessions/`. 

Agar sesi WhatsApp tidak terputus atau meminta scan ulang secara berkala:

1. **Abaikan Watch PM2:**
   Secara default, perubahan file di dalam folder `sessions/` dapat menyebabkan PM2 melakukan restart proses secara otomatis (jika fitur `watch: true` diaktifkan). Oleh karena itu, pastikan file `ecosystem.config.cjs` telah memiliki konfigurasi `ignore_watch: ['node_modules', 'sessions']` dan `watch: false`.

2. **Hak Akses Folder (Permissions):**
   Pastikan user Linux yang menjalankan PM2 memiliki hak akses tulis/baca (write/read) penuh terhadap folder `sessions/`:
   ```bash
   # Berikan hak kepemilikan direktori ke user Anda (misal user: ubuntu)
   sudo chown -R ubuntu:ubuntu /var/www/hitsbot/apps/backend-core/sessions
   ```

3. **Backup Folder Sesi:**
   Sebelum melakukan pembersihan kode (`git clean` atau penulisan ulang deployment), **pastikan untuk membackup** folder `sessions/` ini. Kehilangan folder ini berarti Anda harus memindai ulang QR Code dari aplikasi WhatsApp ponsel Anda.

---

## 5. Troubleshooting Ringkas

### A. Memantau Log Aplikasi (Real-time Logs)
Untuk memantau log aktivitas backend dan melacak kesalahan (misal: API key salah, koneksi database gagal, dsb.):
```bash
pm2 logs hitsbot-backend
```
Gunakan parameter `--lines` untuk melihat histori log sebelumnya:
```bash
pm2 logs hitsbot-backend --lines 100
```

---

### B. Mengatasi Error Redis: `OOM command not allowed when used memory > 'maxmemory'`
Jika server kehabisan memori RAM, Redis akan menolak penulisan data BullMQ.
1. Bebaskan memori server VPS Anda.
2. Nonaktifkan sementara proteksi bgsave secara dinamis (tanpa restart Redis) menggunakan perintah ini:
   ```bash
   redis-cli CONFIG SET stop-writes-on-bgsave-error no
   ```

---

### C. Merestart Layanan Utama VPS
Jika salah satu layanan utama mengalami kendala koneksi, Anda dapat melakukan restart melalui systemd:

- **Restart Backend:**
  ```bash
  pm2 restart hitsbot-backend
  ```
- **Restart Redis:**
  ```bash
  sudo systemctl restart redis-server
  ```
- **Restart MySQL:**
  ```bash
  sudo systemctl restart mysql
  ```

---

### D. Memeriksa Status Layanan
```bash
pm2 status                  # Cek status proses PM2
sudo systemctl status redis # Cek status Redis Server
sudo systemctl status mysql # Cek status MySQL Server
```
