# Certificate PDF Microservice

Microservice Node.js untuk generate PDF sertifikat dari template DOCX. Mengambil data sertifikat dari API Laravel, mengisi template DOCX dengan data peserta/kegiatan, lalu mengkonversi ke PDF menggunakan LibreOffice headless.

## Arsitektur

```
┌─────────────┐     POST /generate-certificate     ┌─────────────────────┐
│   Frontend   │ ──────────────────────────────────► │  PDF Microservice   │
│  (Vue/React) │                                     │  (Express + Node)   │
└─────────────┘                                     └──────────┬──────────┘
                                                               │
                                                    GET /api/v1/sertifikat/{id}
                                                               │
                                                    ┌──────────▼──────────┐
                                                    │   Laravel API       │
                                                    │  (api-siamin.bpmpntb.id) │
                                                    └─────────────────────┘
```

**Alur kerja:**

1. Frontend mengirim `POST` dengan `id_sertifikat` ke microservice.
2. Microservice mengambil data sertifikat dari API Laravel (`/api/v1/sertifikat/{id}`).
3. Template DOCX di-download dari URL yang ada di data Laravel.
4. Placeholder diisi dengan data sertifikat (nama, instansi, kegiatan, dll).
5. DOCX dikonversi ke PDF menggunakan LibreOffice headless.
6. PDF dikirim ke frontend sebagai file download.
7. File sementara (template, DOCX, PDF) dihapus otomatis setelah response selesai.

## Struktur Project

```
project/
├── src/
│   ├── config/
│   │   └── index.js              # Konfigurasi (PORT, API URL, rate limit, path)
│   ├── controllers/
│   │   └── certificateController.js  # Handler untuk endpoint generate-certificate
│   ├── helpers/
│   │   ├── errors.js             # Class AppError (custom error dengan statusCode)
│   │   ├── fileHelper.js         # Utilitas hapus file & bersihkan temp directory
│   │   └── logger.js             # Logger sederhana (info, warn, error)
│   ├── middleware/
│   │   ├── errorHandler.js       # Global error handler & 404 handler
│   │   └── requestLogger.js      # Middleware logging setiap request
│   ├── routes/
│   │   └── certificateRoutes.js  # Definisi route POST /
│   ├── services/
│   │   ├── CertificateService.js # Orchestrator: fetch data → fill template → convert PDF
│   │   ├── LaravelApiService.js  # Client untuk API Laravel (fetch data sertifikat)
│   │   ├── PdfConverterService.js # Konversi DOCX → PDF via LibreOffice headless
│   │   └── TemplateService.js    # Download template DOCX & isi placeholder
│   └── app.js                    # Express app (middleware, CORS, rate limit, routes)
├── temp/                         # File sementara (auto-cleaned)
│   ├── templates/                # Template DOCX yang di-download
│   ├── docx/                     # DOCX yang sudah diisi data
│   └── pdf/                      # Hasil konversi PDF
├── .env                          # Environment variables (tidak di-commit)
├── .env.example                  # Contoh environment variables
├── .gitignore
├── install-libreoffice.sh        # Skrip instalasi LibreOffice di Ubuntu
├── install-ubuntu.sh             # Skrip instalasi Node.js 22 di Ubuntu
├── package.json
├── run-server.sh                 # Skrip jalankan server (npm install + npm start)
└── server.js                     # Entry point (load .env, start Express)
```

## Environment Variables

Salin `.env.example` ke `.env` dan sesuaikan:

```env
PORT=4000
LARAVEL_API_URL=https://api-siamin.bpmpntb.id/
LARAVEL_API_TOKEN=your_token_here
NODE_ENV=production
```

| Variable | Required | Default | Keterangan |
|----------|----------|---------|------------|
| `PORT` | Tidak | `4000` | Port server Express |
| `LARAVEL_API_URL` | **Ya** | - | Base URL API Laravel |
| `LARAVEL_API_TOKEN` | Tidak | - | Bearer token untuk autentikasi ke Laravel API |
| `NODE_ENV` | Tidak | `development` | `development` untuk stack trace di error response |

## Instalasi

### Prasyarat

- Node.js >= 22
- npm
- LibreOffice (untuk konversi DOCX → PDF)

### Ubuntu / VPS

```bash
# 1. Install Node.js 22
bash install-ubuntu.sh

# 2. Install LibreOffice
bash install-libreoffice.sh

# 3. Clone & jalankan
git clone https://github.com/gyot/docx-pdf-sertifikat.git
cd docx-pdf-sertifikat
cp .env.example .env
# Edit .env dengan nilai yang sesuai
nano .env
bash run-server.sh
```

### Windows (development lokal)

```powershell
# Install LibreOffice: https://www.libreoffice.org/download/download/
# Pastikan `libreoffice` ada di PATH

git clone https://github.com/gyot/docx-pdf-sertifikat.git
cd docx-pdf-sertifikat
copy .env.example .env
# Edit .env dengan nilai yang sesuai
npm install
npm start
```

## Deployment dengan PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start aplikasi
pm2 start server.js --name pdf-docx-sertifikat

# Simpan konfigurasi PM2 (auto-start setelah reboot)
pm2 save
pm2 startup

# Perintah berguna
pm2 status                  # Lihat status semua proses
pm2 restart 9               # Restart by ID
pm2 restart pdf-docx-sertifikat  # Restart by name
pm2 logs pdf-docx-sertifikat     # Lihat log
pm2 stop pdf-docx-sertifikat     # Stop
pm2 delete pdf-docx-sertifikat   # Hapus dari PM2
```

### Deploy update dari local ke VPS

```powershell
# 1. Commit & push dari local
git add -A
git commit -m "fix: deskripsi perubahan"
git push origin master

# 2. Pull & restart di VPS
ssh root@your-vps "cd /path/to/docx-pdf-sertifikat && git pull origin master && npm install && pm2 restart pdf-docx-sertifikat"
```

## API Documentation

**Base URL:** `https://pdf-docx.gdoank.my.id` (production) atau `http://localhost:4000` (development)

---

### POST `/generate-certificate`

Generate PDF sertifikat berdasarkan ID sertifikat dari database Laravel.

**Headers:**

| Key | Value |
|-----|-------|
| Content-Type | `application/json` |

**Body (JSON):**

| Field | Tipe | Required | Keterangan |
|-------|------|----------|------------|
| `id_sertifikat` | number | Ya | ID sertifikat dari database Laravel (angka positif) |

**Response sukses (200):**

| Header | Value |
|--------|-------|
| Content-Type | `application/pdf` |
| Content-Disposition | `attachment; filename="sertifikat.pdf"` |

Body: file PDF (binary)

**Response error:**

| Status | Kondisi | Pesan |
|--------|---------|-------|
| 400 | `id_sertifikat` tidak ada | `Field id_sertifikat is required` |
| 400 | `id_sertifikat` bukan angka positif | `Field id_sertifikat must be a positive number` |
| 404 | Sertifikat tidak ditemukan | `Certificate not found` |
| 429 | Rate limit terlampaui | Rate limit message (100 req / 15 menit) |
| 500 | Template URL kosong | `Template URL is missing from certificate data` |
| 500 | Gagal render DOCX | `Template render failed: ...` |
| 500 | Gagal konversi PDF | `PDF generation failed` |
| 502 | Gagal fetch data dari Laravel API | `Failed to fetch certificate from Laravel API` |
| 502 | Template DOCX tidak bisa di-download | `Failed to download template` |
| 504 | Request ke Laravel API timeout | `Laravel API request timed out` |

Format response error:

```json
{
  "status": "error",
  "message": "Pesan error"
}
```

---

### Data Sertifikat dari Laravel API

Microservice memanggil `GET {LARAVEL_API_URL}/api/v1/sertifikat/{id}` dan mengharapkan response dengan format:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "id_batch": 1,
      "id_peserta": 2864,
      "status": "terbit",
      "batch": {
        "id_batch": 1,
        "id_kegiatan": 65,
        "nomor_sertifikat": "hgfg",
        "tanggal_ttd": "2026-06-03",
        "template_file_url": "https://api.domainkamu.id/storage/template_sertifikat/xxx.docx",
        "kegiatan": {
          "nama_kegiatan": "Verifikasi Validasi Data Pokok Pendidikan Tahun 2026"
        },
        "penandatangan": {
          "nama": "Dedy Wahyuddin, M.T."
        }
      },
      "peserta": {
        "nama_lengkap": "Huryati, S.Pd",
        "nama_instansi": "PAUD Al Jihan",
        "jabatan": null,
        "nip": null
      }
    }
  ]
}
```

Field yang diambil microservice:

| Field | Sumber | Digunakan untuk |
|-------|--------|-----------------|
| `batch.template_file_url` | batch | Download template DOCX |
| `batch.nomor_sertifikat` | batch | Placeholder `${nomor_sertifikat}` |
| `batch.tanggal_ttd` | batch | Placeholder `${tanggal}` |
| `peserta.nama_lengkap` | peserta | Placeholder `${nama}` |
| `peserta.nama_instansi` | peserta | Placeholder `${instansi}` |
| `peserta.jabatan` | peserta | Placeholder `${jabatan}` |
| `peserta.nip` | peserta | Placeholder `${nip}` |
| `kegiatan.nama_kegiatan` | kegiatan | Placeholder `${kegiatan}` |
| `penandatangan.nama` | penandatangan | Logging |

### Format Template DOCX

Template DOCX menggunakan [docxtemplater](https://docxtemplater.com/) dengan delimiter `${...}`:

| Placeholder | Data |
|-------------|------|
| `${nomor_sertifikat}` | Nomor sertifikat |
| `${nama}` | Nama lengkap peserta |
| `${instansi}` | Nama instansi peserta |
| `${jabatan}` | Jabatan peserta |
| `${nip}` | NIP peserta |
| `${kegiatan}` | Nama kegiatan |
| `${tanggal}` | Tanggal tanda tangan |

---

## Contoh Penggunaan Frontend

### Fetch API (JavaScript)

```javascript
async function downloadCertificate(idSertifikat) {
  try {
    const response = await fetch('https://pdf-docx.gdoank.my.id/generate-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_sertifikat: idSertifikat })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sertifikat.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Gagal download sertifikat:', error.message);
  }
}

downloadCertificate(1);
```

### Axios

```javascript
async function downloadCertificate(idSertifikat) {
  try {
    const response = await axios.post(
      'https://pdf-docx.gdoank.my.id/generate-certificate',
      { id_sertifikat: idSertifikat },
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sertifikat.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error('Gagal download sertifikat:', message);
  }
}
```

### Vue 3 (Composition API)

```vue
<script setup>
import { ref } from 'vue';

const loading = ref(false);
const error = ref('');

async function downloadSertifikat(idSertifikat) {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch('https://pdf-docx.gdoank.my.id/generate-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_sertifikat: idSertifikat })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sertifikat.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <button @click="downloadSertifikat(1)" :disabled="loading">
    {{ loading ? 'Mengunduh...' : 'Download Sertifikat' }}
  </button>
  <p v-if="error" style="color: red">{{ error }}</p>
</template>
```

### React

```jsx
import { useState } from 'react';

function DownloadSertifikat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async (id) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://pdf-docx.gdoank.my.id/generate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_sertifikat: id })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sertifikat.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleDownload(1)} disabled={loading}>
        {loading ? 'Mengunduh...' : 'Download Sertifikat'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

---

## Troubleshooting

### 502 Bad Gateway

Proses Node.js di VPS tidak berjalan. Restart dengan PM2:

```bash
pm2 restart pdf-docx-sertifikat
pm2 logs pdf-docx-sertifikat --lines 50
```

### CORS Error

CORS error biasanya muncul karena server mengembalikan 502/500 (error page tanpa header CORS). Pastikan service berjalan terlebih dahulu. Konfigurasi CORS di `src/app.js` sudah mengizinkan semua origin (`cors()`).

### LibreOffice tidak ditemukan

```
Error: LibreOffice conversion failed
```

Pastikan LibreOffice terinstall dan bisa diakses dari PATH:

```bash
libreoffice --version
```

Jika tidak ditemukan, install dengan `bash install-libreoffice.sh`.

### Template DOCX gagal di-download

```
Failed to download template
```

Pastikan `template_file_url` dari Laravel API bisa diakses dari server VPS. Coba download manual:

```bash
curl -I "https://api.domainkamu.id/storage/template_sertifikat/xxx.docx"
```

### Timeout ke Laravel API

```
Laravel API request timed out
```

Default timeout 15 detik. Jika API lambat, sesuaikan di `src/services/LaravelApiService.js` (line `timeout: 15000`).

---

## Dependencies

| Package | Fungsi |
|---------|--------|
| express | HTTP server |
| cors | Cross-Origin Resource Sharing |
| helmet | Security headers |
| express-rate-limit | Rate limiting (100 req/15 menit) |
| axios | HTTP client untuk panggil Laravel API & download template |
| docxtemplater | Isi placeholder di template DOCX |
| pizzip | Baca/parse file DOCX (ZIP-based) |
| fs-extra | File system utilities |
| uuid | Generate nama file unik |
| dotenv | Load environment variables |

**System dependency:** LibreOffice (untuk konversi DOCX → PDF headless)

## License

MIT
