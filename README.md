# Titip Video

Upload banyak video ke Google Drive lewat web, tanpa kompres. File dikirim langsung dari browser ke Google, jadi tidak kena batas ukuran Vercel.

## Setup Google (sekali saja)
1. console.cloud.google.com: buat project, aktifkan **Google Drive API**.
2. **OAuth consent screen**: tipe External, lalu set status **In production** (kalau tetap Testing, token mati tiap 7 hari).
3. **Credentials > Create OAuth client ID** (Web application). Tambahkan redirect URI `https://developers.google.com/oauthplayground`. Salin Client ID dan Secret.
4. Buka developers.google.com/oauthplayground, klik ikon gear, centang **Use your own OAuth credentials**, isi Client ID dan Secret. Di Step 1 masukkan scope `https://www.googleapis.com/auth/drive`, klik Authorize, login, lalu **Exchange authorization code**. Salin **Refresh token**.
5. Buat folder di Drive. ID folder ada di URL: `drive.google.com/drive/folders/<ID>`.

## Deploy
1. Upload folder ini ke GitHub, lalu import di Vercel.
2. Isi Environment Variables sesuai `.env.example`.
3. Deploy. Bagikan link dan password ke temanmu.

## Catatan iPhone
- Saat memilih video dari Photos, ketuk **Options** dan pilih format **Current/Original** kalau ada, supaya iOS tidak mengubah videonya.
- Biarkan layar menyala dan jangan pindah aplikasi selama upload.
