'use client';
import { useRef, useState } from 'react';

const CHUNK = 8 * 1024 * 1024; // kelipatan 256 KB, wajib untuk Drive
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (b) => (b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : (b / 1e6).toFixed(1) + ' MB');

function putChunk(url, blob, start, total, onLoaded) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', url);
    x.setRequestHeader('Content-Range', `bytes ${start}-${start + blob.size - 1}/${total}`);
    x.upload.onprogress = (e) => onLoaded(e.loaded);
    x.onload = () => ([200, 201, 308].includes(x.status) ? resolve() : reject(new Error('Upload ditolak (' + x.status + ')')));
    x.onerror = () => reject(new Error('Koneksi terputus'));
    x.send(blob);
  });
}

async function uploadFile(file, password, onPct) {
  const r = await fetch('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, type: file.type, size: file.size, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Gagal memulai upload');

  for (let start = 0; start < file.size; ) {
    const end = Math.min(start + CHUNK, file.size);
    for (let tries = 0; ; tries++) {
      try {
        await putChunk(data.url, file.slice(start, end), start, file.size, (n) => onPct((start + n) / file.size));
        break;
      } catch (e) {
        if (tries >= 2) throw e;
        await sleep(1500);
      }
    }
    start = end;
  }
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  const patch = (id, p) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...p } : i)));

  function pick(e) {
    const files = [...e.target.files].map((file) => ({
      id: crypto.randomUUID(), file, pct: 0, status: 'wait', error: '',
    }));
    setItems((all) => [...all, ...files]);
    e.target.value = '';
  }

  async function start() {
    setBusy(true);
    let lock;
    try { lock = await navigator.wakeLock?.request('screen'); } catch {}
    for (const it of items.filter((i) => i.status !== 'done')) {
      patch(it.id, { status: 'up', error: '' });
      try {
        await uploadFile(it.file, password, (pct) => patch(it.id, { pct }));
        patch(it.id, { status: 'done', pct: 1 });
      } catch (e) {
        patch(it.id, { status: 'err', error: e.message });
      }
    }
    try { await lock?.release(); } catch {}
    setBusy(false);
  }

  const pending = items.filter((i) => i.status !== 'done').length;

  return (
    <main className="wrap">
      <h1>Titip video</h1>
      <p className="sub">Kualitas asli, tanpa kompres. Bisa banyak video sekaligus.</p>

      <section className="pick">
        <p>Pilih video dari galeri atau file</p>
        <button className="round" onClick={() => input.current.click()} disabled={busy}>Pilih video</button>
        <input ref={input} type="file" accept="video/*" multiple hidden onChange={pick} />
      </section>

      <input
        className="pass"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {items.length > 0 && (
        <section className="list">
          {items.map((i) => (
            <div className="row" key={i.id}>
              <div className="meta">
                <span className="name">{i.file.name}</span>
                <span className="size">{fmt(i.file.size)}</span>
              </div>
              <div className="bar"><i style={{ width: i.pct * 100 + '%' }} /></div>
              <span className={'state ' + i.status}>
                {i.status === 'wait' && 'Menunggu'}
                {i.status === 'up' && Math.round(i.pct * 100) + '%'}
                {i.status === 'done' && 'Selesai'}
                {i.status === 'err' && i.error}
              </span>
            </div>
          ))}
        </section>
      )}

      <button className="go" onClick={start} disabled={busy || pending === 0 || !password}>
        {busy ? 'Mengupload, jangan tutup halaman' : `Upload ${pending || ''} video`}
      </button>
    </main>
  );
}
