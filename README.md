# Certificate PDF Microservice

Microservice Node.js untuk generate PDF sertifikat dari template DOCX.

## Struktur Project

```
project/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── helpers/
│   ├── middleware/
│   ├── config/
│   └── app.js
├── temp/
│   ├── templates/
│   ├── docx/
│   └── pdf/
├── package.json
├── .env.example
└── server.js
```

## Environment

Salin `.env.example` ke `.env` dan atur `LARAVEL_API_URL`.

```
PORT=4000
LARAVEL_API_URL=https://laravel.example.com
NODE_ENV=development
```

## Install dependencies

```bash
cd project
npm install
```

## Install pada Ubuntu

```bash
sudo apt update
sudo apt install -y nodejs npm
```

## Install LibreOffice pada Ubuntu

```bash
sudo apt update
sudo apt install -y libreoffice-core libreoffice-writer libreoffice-common libreoffice-java-common
```

## Skrip instalasi

- `install-ubuntu.sh` untuk menginstal Node.js dan npm di Ubuntu.
- `install-libreoffice.sh` untuk menginstal LibreOffice.
- `run-server.sh` untuk menjalankan server dari folder project.

## Menjalankan server

```bash
cd project
npm start
```

Atau gunakan skrip shell:

```bash
bash install-ubuntu.sh
bash install-libreoffice.sh
bash run-server.sh
```

Untuk development dengan auto-reload (jika terpasang nodemon):

```bash
npm run dev
```

---

## API Documentation (untuk Frontend)

Base URL: `http://localhost:4000`

---

### Generate Certificate

Mengenerate PDF sertifikat berdasarkan ID sertifikat dari database Laravel.

**Endpoint:** `POST /generate-certificate`

**Headers:**

| Key | Value |
|-----|-------|
| Content-Type | `application/json` |

**Body (JSON):**

| Field | Tipe | Required | Keterangan |
|-------|------|----------|------------|
| `id_sertifikat` | number | Ya | ID sertifikat dari database (harus angka positif) |

**Response sukses (200):**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="sertifikat.pdf"`
- Body: file PDF (binary)

**Response error:**

| Status | Kondisi | Contoh pesan |
|--------|---------|--------------|
| 400 | `id_sertifikat` tidak ada | `Field id_sertifikat is required` |
| 400 | `id_sertifikat` bukan angka | `Field id_sertifikat must be a positive number` |
| 404 | Sertifikat tidak ditemukan di Laravel API | `Certificate not found` |
| 429 | Rate limit terlampaui (100 request / 15 menit) | Rate limit message |
| 502 | Gagal mengambil data dari Laravel API | `Failed to fetch certificate from Laravel API` |
| 504 | Request ke Laravel API timeout | `Laravel API request timed out` |
| 500 | Gagal generate PDF / konversi DOCX | `PDF generation failed` |

Format response error:

```json
{
  "status": "error",
  "message": "Pesan error"
}
```

---

### Contoh Penggunaan Frontend

#### Fetch API (JavaScript)

```javascript
async function downloadCertificate(idSertifikat) {
  try {
    const response = await fetch('http://localhost:4000/generate-certificate', {
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

// Penggunaan
downloadCertificate(1);
```

#### Axios

```javascript
async function downloadCertificate(idSertifikat) {
  try {
    const response = await axios.post(
      'http://localhost:4000/generate-certificate',
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

#### React Contoh

```jsx
import { useState } from 'react';

function DownloadSertifikat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async (id) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/generate-certificate', {
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

### Alur Kerja

1. Frontend mengirim `POST` dengan `id_sertifikat` ke microservice.
2. Microservice mengambil data sertifikat dari API Laravel.
3. Template DOCX di-download, placeholder diisi dengan data sertifikat.
4. DOCX dikonversi ke PDF menggunakan LibreOffice headless.
5. PDF dikirim ke frontend sebagai file download.
6. File sementara dihapus otomatis setelah response selesai.
