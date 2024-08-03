# GitHub Roasting

GitHub Roasting adalah aplikasi web yang menggunakan API GitHub dan Gemini AI untuk memberikan "roasting" humoris pada profil GitHub pengguna 😂🙏

## Fitur

- Mengambil data profil pengguna dari GitHub API
- Menggunakan Gemini AI untuk menghasilkan "roasting" berdasarkan data profil
- Mendukung bahasa Indonesia dan Inggris (berdasarkan lokasi pengguna)

## Teknologi yang Digunakan

- Backend: Node.js dengan Express
- Frontend: HTML, CSS, JavaScript
- API:
  - GitHub API: Untuk mengambil data profil pengguna
  - Gemini AI API: Untuk menghasilkan konten "roasting"

### Instalasi

1. Clone repositori
   ```
   git clone https://github.com/RobithYusuf/roast-github-backend.git
   cd roast-github-backend
   ```

2. Instal dependensi
   ```
   npm install
   ```

3. Salin file konfigurasi
   ```
   cp env.example .env
   ```

4. Atur variabel lingkungan
   Buka file `.env` dan isi:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   GITHUB_TOKEN=your_github_token
   ```

5. Jalankan aplikasi
   ```
   node index.js
   ```

## Penggunaan

1. Buka aplikasi di browser (biasanya di `http://localhost:3001`)
2. Masukkan username GitHub yang ingin di-"roast"
3. Klik tombol "Roast!" dan tunggu hasilnya

## Kontribusi

Kontribusi selalu diterima! Silakan buka issue atau submit pull request.

## Lisensi

[MIT License](LICENSE)

## Kontak

Robith Yusuf - [GitHub](https://github.com/RobithYusuf)