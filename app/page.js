'use client';
import { useRef, useState } from 'react';

const CHUNK = 8 * 1024 * 1024; // kelipatan 256 KB, wajib untuk Drive
const TINTS = ['var(--mint)', 'var(--lilac)', 'var(--peach)'];
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

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const UP = 'M12 19V5M5 12l7-7 7 7';
const CHECK = 'M5 13l4 4L19 7';
const CLOSE = 'M6 6l12 12M18 6L6 18';
const LOCK = 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z';

export default function Home() {
  const [items, setItems] = useState([]);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef(null);

  const patch = (id, p) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...p } : i)));

  function add(list) {
    const files = [...list].map((file) => ({
      id: crypto.randomUUID(), file, url: URL.createObjectURL(file), pct: 0, status: 'wait', error: '',
    }));
    setItems((all) => [...all, ...files]);
  }

  function remove(id) {
    setItems((all) => {
      const it = all.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return all.filter((i) => i.id !== id);
    });
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
  const done = items.length - pending;
  const totalSize = items.reduce((s, i) => s + i.file.size, 0);
  const overall = totalSize ? items.reduce((s, i) => s + i.pct * i.file.size, 0) / totalSize : 0;

  let label = `Upload ${pending} video`;
  if (busy) label = `Mengupload ${Math.round(overall * 100)}%`;
  else if (items.length && pending === 0) label = 'Semua video sudah masuk';
  else if (!items.length) label = 'Pilih video dulu';

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Titip video</h1>
          <p className="sub">Kualitas asli, tanpa kompres. Banyak video sekaligus.</p>
        </div>
      </header>

      <section
        className={'hero' + (drag ? ' drag' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add([...e.dataTransfer.files].filter((f) => f.type.startsWith('video/'))); }}
      >
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
        <div className="bolt"><Icon d={UP} size={30} /></div>
        <p>Taruh video di sini, atau pilih dari galeri</p>
        <button className="round" onClick={() => input.current.click()} disabled={busy}>Pilih video</button>
        <input ref={input} type="file" accept="video/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </section>

      {items.length > 0 && (
        <div className="stats">
          <span style={{ background: 'var(--mint)' }}><b>{items.length}</b> video</span>
          <span style={{ background: 'var(--lilac)' }}><b>{fmt(totalSize)}</b></span>
          <span style={{ background: 'var(--peach)' }}><b>{done}</b> selesai</span>
        </div>
      )}

      <label className="pass">
        <Icon d={LOCK} size={18} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>

      <section className="list">
        {items.map((i, n) => (
          <div className={'card ' + i.status} key={i.id} style={{ background: TINTS[n % 3], animationDelay: n * 50 + 'ms' }}>
            <video className="thumb" src={i.url + '#t=0.1'} muted playsInline preload="metadata" />
            <div className="info">
              <span className="name">{i.file.name}</span>
              <span className="size">{i.status === 'err' ? i.error : fmt(i.file.size)}</span>
              <div className="bar"><i style={{ width: i.pct * 100 + '%' }} /></div>
            </div>
            <div className="side">
              {i.status === 'done' && <span className="tick"><Icon d={CHECK} size={18} /></span>}
              {i.status === 'up' && <b>{Math.round(i.pct * 100)}%</b>}
              {(i.status === 'wait' || i.status === 'err') && !busy && (
                <button className="x" onClick={() => remove(i.id)} aria-label="Hapus"><Icon d={CLOSE} size={16} /></button>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="dock">
        <button className="go" onClick={start} disabled={busy || pending === 0 || !password}>
          <i className="fill" style={{ width: overall * 100 + '%' }} />
          <span>{label}</span>
        </button>
        {!busy && items.length > 0 && pending > 0 && !password && <p className="hint">Isi password dulu</p>}
      </div>
    </main>
  );
}
