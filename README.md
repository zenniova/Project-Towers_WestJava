# Tower Monitoring System

Sistem monitoring tower untuk Telkomsel Regional Jawa Barat. Aplikasi ini memungkinkan visualisasi dan manajemen data tower seluler termasuk sektor dan coverage area.

## Struktur Proyek

```
project/
├── backend/         # Node.js + Express backend
└── frontend/        # React frontend
```

## Teknologi yang Digunakan

### Backend
- Node.js
- Express
- MySQL
- Axios

### Frontend
- React
- Leaflet
- Context API
- Axios

## Fitur Utama

- Visualisasi tower pada peta
- Manajemen data tower dan sektor
- Pencarian tower berdasarkan Site ID
- Filtering tower berdasarkan kota
- Visualisasi coverage area sektor
- Informasi detail tower dan sektor

## Instalasi

### Backend

1. Masuk ke direktori backend:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Salin file .env.example ke .env dan sesuaikan konfigurasi:
```bash
cp .env.example .env
```

4. Jalankan server:
```bash
npm start
```

### Frontend

1. Masuk ke direktori frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Jalankan aplikasi:
```bash
npm start
```

## Penggunaan

1. Buka aplikasi di browser (default: http://localhost:3000)
2. Pilih kota untuk melihat tower di area tersebut
3. Gunakan fitur pencarian untuk menemukan tower spesifik
4. Klik tower untuk melihat detail
5. Toggle sector view untuk melihat coverage area

## API Endpoints

### Tower Routes
- GET `/api/towers` - Mendapatkan semua tower
- GET `/api/towers/:site_id` - Mendapatkan detail tower spesifik
- GET `/api/triangle-dimensions` - Mendapatkan dimensi triangle
- GET `/api/kabupaten` - Mendapatkan list kabupaten
- GET `/api/kabupaten/:kabupaten/towers` - Mendapatkan tower berdasarkan kabupaten

## Kontribusi

1. Fork repository
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## Lisensi

Distributed under the MIT License. See `LICENSE` for more information. 