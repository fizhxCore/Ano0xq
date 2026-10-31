// Membuat sesi upload resumable ke Google Drive.
// File video TIDAK lewat server ini: browser mengirim langsung ke Google.
export async function POST(req) {
  const { name, type, size, password } = await req.json();

  if (password !== process.env.APP_PASSWORD) {
    return Response.json({ error: 'Password salah' }, { status: 401 });
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) {
    return Response.json({ error: 'Login Google gagal, cek kredensial di Vercel' }, { status: 500 });
  }

  const init = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': type || 'video/mp4',
        'X-Upload-Content-Length': String(size),
        Origin: req.headers.get('origin') || '',
      },
      body: JSON.stringify({ name, parents: [process.env.DRIVE_FOLDER_ID] }),
    }
  );

  const url = init.headers.get('location');
  if (!url) {
    return Response.json({ error: 'Drive menolak upload, cek ID folder' }, { status: 500 });
  }
  return Response.json({ url });
}
