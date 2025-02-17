# Tower Monitoring System

Sistem monitoring tower untuk Telkomsel Regional Jawa Barat. Aplikasi ini memungkinkan visualisasi dan manajemen data tower seluler termasuk sektor dan coverage area.

## Struktur Branch

Repository ini memiliki 3 branch utama:

1. `main` - Branch produksi, berisi kode yang sudah stabil dan siap production
2. `dev` - Branch pengembangan internal, untuk fitur-fitur yang sedang dikembangkan
3. `open` - Branch untuk kontribusi dari luar, tempat kolaborator eksternal dapat berkontribusi

### Workflow Kontribusi

#### Untuk Tim Internal:
1. Checkout dari branch `dev`
```bash
git checkout dev
git checkout -b feature/nama-fitur
```
2. Lakukan pengembangan
3. Push ke branch feature
4. Buat Pull Request ke `dev`

#### Untuk Kontributor Eksternal:
1. Fork repository ini
2. Checkout dari branch `open`
```bash
git checkout open
git checkout -b feature/nama-fitur
```
3. Lakukan pengembangan
4. Push ke branch feature di fork Anda
5. Buat Pull Request ke branch `open`

## Cara Menggunakan Aplikasi Ini

### Prerequisites (Yang Harus Disiapkan)
1. Node.js (versi 14 atau lebih baru)
2. MySQL (versi 5.7 atau lebih baru)
3. Git

### Langkah-langkah Instalasi

1. Clone repository ini:
```bash
git clone https://github.com/zenniova/Project-Towers_WestJava.git
cd Project-Towers_WestJava
```

2. Setup Database:
- Buat database MySQL baru dengan nama 'towerdb'
- Import file SQL yang ada di `backend/src/config/kabupaten.sql`

3. Setup Backend:
```bash
# Masuk ke direktori backend
cd backend

# Install dependencies
npm install

# Salin file .env.example ke .env
cp .env.example .env
```

4. Konfigurasi file `.env`:
```env
DB_HOST=localhost
DB_USER=root        # Sesuaikan dengan username MySQL Anda
DB_PASSWORD=        # Sesuaikan dengan password MySQL Anda
DB_NAME=towerdb
DB_PORT=3306
PORT=3000
```

5. Setup Frontend:
```bash
# Masuk ke direktori frontend
cd frontend

# Install dependencies
npm install
```

### Menjalankan Aplikasi

1. Jalankan Backend:
```bash
# Di direktori backend
npm start
```
Server akan berjalan di http://localhost:3000

2. Jalankan Frontend:
```bash
# Di direktori frontend
npm start
```
Aplikasi akan terbuka di browser di http://localhost:3001

### Penggunaan Dasar

1. Pilih Kota:
   - Gunakan dropdown "Pilih Kota" untuk memilih area
   - Peta akan otomatis zoom ke area yang dipilih

2. Cari Tower:
   - Gunakan search box untuk mencari tower berdasarkan Site ID
   - Format Site ID: BDG123, BDB001, dll

3. Lihat Detail Tower:
   - Klik marker tower di peta untuk melihat detail
   - Informasi yang ditampilkan: Site ID, lokasi, dan detail sektor

4. Visualisasi Sektor:
   - Gunakan tombol "Show/Hide Sectors" untuk menampilkan/menyembunyikan coverage area
   - Setiap sektor ditampilkan dengan warna berbeda sesuai teknologi

### Troubleshooting

1. Jika database tidak terkoneksi:
   - Pastikan MySQL server berjalan
   - Periksa kredensial di file .env
   - Pastikan database 'towerdb' sudah dibuat

2. Jika frontend tidak bisa akses backend:
   - Pastikan backend server berjalan di port 3000
   - Periksa console browser untuk error
   - Pastikan CORS sudah dikonfigurasi dengan benar

3. Masalah umum:
   - Hapus node_modules dan package-lock.json
   - Jalankan npm install ulang
   - Restart server backend dan frontend

## Struktur Proyek

```
project/
├── backend/         # Node.js + Express backend
│   ├── src/
│   │   ├── config/     # Konfigurasi database
│   │   ├── controllers/# Logic aplikasi
│   │   └── routes/     # API routes
│   └── .env.example    # Contoh environment variables
└── frontend/        # React frontend
    ├── src/
    │   ├── components/ # React components
    │   ├── contexts/   # React contexts
    │   ├── utils/      # Utility functions
    │   └── styles/     # CSS styles
    └── public/         # Static files
```

## API Documentation

### Tower Routes
- GET `/api/towers` - Mendapatkan semua tower
  ```json
  Response: [
    {
      "site_id": "BDG001",
      "location": {
        "latitude": -6.123,
        "longitude": 107.456,
        "kelurahan": "Example",
        "kecamatan": "Example",
        "kabupaten": "BANDUNG"
      }
    }
  ]
  ```

- GET `/api/towers/:site_id` - Mendapatkan detail tower spesifik
  ```json
  Response: {
    "site_id": "BDG001",
    "location": {...},
    "sectors": [
      {
        "number": 1,
        "azimuth": 120,
        "cells": [...]
      }
    ]
  }
  ```

## Kontribusi

1. Fork repository
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## Support

Jika Anda menemukan masalah atau memiliki pertanyaan:
1. Buat issue di GitHub repository
2. Jelaskan masalah dengan detail
3. Sertakan screenshot jika memungkinkan
4. Tambahkan langkah-langkah untuk mereproduksi masalah

## Lisensi

Distributed under the MIT License. See `LICENSE` for more information. 