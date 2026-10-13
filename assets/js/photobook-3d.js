// 📖 โฟโต้บุ๊ค 3D: หนังสือปกแข็งหมุนดูได้รอบเล่ม → แตะเพื่อเปิด → พลิกหน้ากระดาษตามนิ้ว (มีแสงเงา/เสียง/สั่น)
// ใช้: blm48OpenPhotobook3D({ title, cover, folder })
//   folder = โฟลเดอร์รูปใน Supabase Storage (bucket app-assets) เช่น "photobooks/GINO KAMI7 GE1"
//   ไฟล์ page_001 = ปกหน้า (ข้ามไป ใช้รูป cover ของไอเทมแทน), page_002... = หน้าด้านใน
// รูปหน้าต้นฉบับใหญ่มาก (3333x5000, ~1.5MB) จึงย่อเหลือกว้าง 1100px ในเครื่อง + เก็บแคชไว้ เปิดครั้งหน้าเร็วทันที
(function () {
  const BUCKET = 'app-assets';
  const ENDPAPER = 'https://lh3.googleusercontent.com/d/1LRRKV6c7W-bV-_0x5Uhd4CKUkxVNJ4u2=s1000'; // ลาย BLM48
  const LOGO = 'https://lh3.googleusercontent.com/d/1p6lV8bD6VVjR-Ys2EnpcQH1AOsnahQSp=s300';
  const PAGE_PX = 1100;
  const CACHE_NAME = 'blm48-photobook-v1';
  const OPEN_RX = 6;                 // มุมเอียงตอนกางอ่าน (มองจากด้านบนเล็กน้อย)
  const CLOSED_POSE = { rx: 12, ry: -28 };

  // ---------- โหลด + ย่อรูป (คิว, ทำทีละ 2) ----------
  const memo = new Map();            // url -> Promise<blobUrl>
  const queue = [];
  let running = 0;
  let priorityOf = () => 0;          // ยิ่งน้อยยิ่งด่วน (ระยะห่างจากหน้าที่เปิดอยู่)

  function pump() {
    while (running < 2 && queue.length) {
      queue.sort((a, b) => priorityOf(a.idx) - priorityOf(b.idx));
      const job = queue.shift();
      running++;
      fetchShrunk(job.url).then(job.resolve, job.reject).finally(() => { running--; pump(); });
    }
  }
  function loadPage(url, idx) {
    if (!memo.has(url)) memo.set(url, new Promise((resolve, reject) => { queue.push({ url, idx, resolve, reject }); pump(); }));
    return memo.get(url);
  }
  async function fetchShrunk(url) {
    const key = url + '#w' + PAGE_PX;
    let cache = null;
    try { if ('caches' in window) cache = await caches.open(CACHE_NAME); } catch (e) { cache = null; }
    if (cache) {
      try { const hit = await cache.match(key); if (hit) return URL.createObjectURL(await hit.blob()); } catch (e) { /* ไม่มีแคชก็โหลดใหม่ */ }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('page ' + res.status);
    const small = await shrink(await res.blob());
    if (cache) { try { await cache.put(key, new Response(small, { headers: { 'Content-Type': small.type || 'image/jpeg' } })); } catch (e) { /* แคชเต็มก็ข้าม */ } }
    return URL.createObjectURL(small);
  }
  async function shrink(blob) {
    let src = null, tmpUrl = '';
    try { if (window.createImageBitmap) src = await createImageBitmap(blob); } catch (e) { src = null; }
    if (!src) {
      tmpUrl = URL.createObjectURL(blob);
      src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = tmpUrl; });
    }
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    if (!w0 || w0 <= PAGE_PX) { if (src.close) src.close(); if (tmpUrl) URL.revokeObjectURL(tmpUrl); return blob; }
    const c = document.createElement('canvas');
    c.width = PAGE_PX; c.height = Math.round(h0 * PAGE_PX / w0);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, c.width, c.height);
    if (src.close) src.close();
    if (tmpUrl) URL.revokeObjectURL(tmpUrl);
    const out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    c.width = c.height = 0;
    return out || blob;
  }

  // supabase-client.js ประกาศ blm48Supabase เป็น const ระดับบนสุด (ไม่อยู่บน window)
  function sbClient() { return typeof blm48Supabase !== 'undefined' ? blm48Supabase : window.blm48Supabase; }

  async function listPages(folder) {
    const sb = sbClient();
    const { data, error } = await sb.storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    const files = (data || []).filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return files.filter(f => !/^page_0*1\.[a-z]+$/i.test(f.name)) // page_001 = ปกหน้า
      .map(f => sb.storage.from(BUCKET).getPublicUrl(folder + '/' + f.name).data.publicUrl);
  }

  // ---------- เสียงพลิกกระดาษ (สังเคราะห์ ไม่ต้องโหลดไฟล์) ----------
  let actx = null;
  let muted = false;
  try { muted = localStorage.getItem('blm48_pb_muted') === '1'; } catch (e) { muted = false; }
  function flipSound(vol) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const d = 0.34, sr = actx.sampleRate, n = Math.floor(sr * d);
      const buf = actx.createBuffer(1, n, sr), ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.6)), 2) * (1 - t);
        ch[i] = (Math.random() * 2 - 1) * env;
      }
      const src = actx.createBufferSource(); src.buffer = buf;
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7;
      const g = actx.createGain(); g.gain.value = 0.2 * (vol == null ? 1 : vol);
      src.connect(bp); bp.connect(g); g.connect(actx.destination);
      src.start();
    } catch (e) { /* เบราว์เซอร์ไม่รองรับเสียงก็ข้าม */ }
  }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* ไม่มีสั่นก็ข้าม */ } }

  // ---------- สไตล์ ----------
  function injectStyles() {
    if (document.getElementById('blm48-pb3d-style')) return;
    const st = document.createElement('style');
    st.id = 'blm48-pb3d-style';
    st.textContent = `
      .pb-overlay { position: fixed; inset: 0; z-index: 21000; overflow: hidden; color: #fff; font-family: 'Quicksand', 'Kanit', sans-serif;
        background: radial-gradient(circle at 50% 40%, #f0454b 0%, #c8151d 55%, #8f0c12 100%);
        touch-action: none; user-select: none; -webkit-user-select: none; opacity: 0; transition: opacity 0.25s; }
      .pb-overlay.show { opacity: 1; }
      .pb-top { position: absolute; top: 0; left: 0; right: 0; padding: calc(12px + env(safe-area-inset-top)) 12px 8px; display: flex; align-items: center; gap: 10px; z-index: 3; }
      .pb-title { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pb-title small { display: block; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.72); }
      .pb-icon-btn { flex: none; width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,0.14); color: #fff; font-size: 17px; cursor: pointer; }
      .pb-stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; perspective: 1800px; }
      .pb-floor { position: absolute; left: 50%; top: 50%; border-radius: 50%; pointer-events: none;
        background: radial-gradient(ellipse at center, rgba(60,0,0,0.55) 0%, rgba(60,0,0,0) 70%); }
      .pb-obj { position: relative; width: calc(var(--W) * 2); height: var(--H); transform-style: preserve-3d; will-change: transform; }
      .pb-leaf, .pb-board { position: absolute; top: 0; left: var(--W); width: var(--W); height: var(--H); transform-style: preserve-3d; transform-origin: left center; }
      .pb-face { position: absolute; inset: 0; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: #fbf8f3; }
      .pb-face.is-back { transform: rotateY(180deg); }
      .pb-img { position: absolute; inset: 0; background-size: cover; background-position: center; }
      .pb-face.is-cover, .pb-face.is-board { border-radius: 2px 6px 6px 2px; }
      .pb-face.is-back.is-cover, .pb-face.is-back.is-board { border-radius: 6px 2px 2px 6px; }
      .pb-face.is-endpaper .pb-img { opacity: 0.9; }
      .pb-gutter { position: absolute; inset: 0; pointer-events: none; }
      .pb-face:not(.is-back) .pb-gutter { background: linear-gradient(to right, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 4%, rgba(0,0,0,0) 12%); }
      .pb-face.is-back .pb-gutter { background: linear-gradient(to left, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 4%, rgba(0,0,0,0) 12%); }
      .pb-face.is-cover:not(.is-back) .pb-gutter { background: linear-gradient(to right, rgba(0,0,0,0.35) 0, rgba(255,255,255,0.18) 2.2%, rgba(0,0,0,0.18) 3.4%, rgba(0,0,0,0) 6%); }
      .pb-gloss { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.32) 48%, rgba(255,255,255,0) 60%);
        background-size: 260% 100%; mix-blend-mode: screen; }
      .pb-cast, .pb-shade { position: absolute; inset: 0; pointer-events: none; opacity: 0; }
      .pb-shade { background: #000; }
      .pb-face.is-loading::after { content: ''; position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%;
        border: 3px solid rgba(200,21,29,0.18); border-top-color: #c8151d; animation: pb-spin 0.8s linear infinite; }
      @keyframes pb-spin { to { transform: rotate(360deg); } }
      .pb-backcover { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #fff; text-align: center; padding: 14%; }
      .pb-backcover .bg { position: absolute; inset: -12px; background-size: cover; background-position: center; filter: blur(10px) brightness(0.72) saturate(1.1); }
      .pb-backcover img { position: relative; width: 30%; border-radius: 22%; }
      .pb-backcover span { position: relative; font-size: calc(var(--W) * 0.06); font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
      .pb-edge { position: absolute; pointer-events: none; }
      .pb-edge.fore, .pb-edge.spine { top: 0; width: var(--T); height: var(--H); }
      .pb-edge.fore { left: calc(var(--W) * 2 - var(--T) / 2); transform: translateZ(calc(var(--T) / 2)) rotateY(90deg);
        background: repeating-linear-gradient(to right, #f4efe6 0 1.2px, #ddd5c6 1.2px 2px); }
      .pb-edge.spine { left: calc(var(--W) - var(--T) / 2); transform: translateZ(calc(var(--T) / 2)) rotateY(-90deg); overflow: hidden;
        background-size: cover; background-position: left center; }
      .pb-edge.spine::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.45)); }
      .pb-edge.top, .pb-edge.bottom { left: var(--W); width: var(--W); height: var(--T);
        background: repeating-linear-gradient(to bottom, #f4efe6 0 1.2px, #ddd5c6 1.2px 2px); }
      .pb-edge.top { top: calc(var(--T) / -2); transform: translateZ(calc(var(--T) / 2)) rotateX(90deg); }
      .pb-edge.bottom { top: calc(var(--H) - var(--T) / 2); transform: translateZ(calc(var(--T) / 2)) rotateX(-90deg); }
      .pb-bottom { position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 12px calc(14px + env(safe-area-inset-bottom)); z-index: 3;
        display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .pb-hint { font-size: 12.5px; color: rgba(255,255,255,0.75); text-align: center; min-height: 18px; }
      .pb-row { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; max-width: 520px; }
      .pb-btn { border: 1px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.1); color: #fff; border-radius: 999px; padding: 9px 16px;
        font-family: inherit; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
      .pb-btn.primary { background: #fff; color: #c8151d; border-color: #fff; font-weight: 700; padding: 11px 26px; font-size: 15px;
        box-shadow: 0 8px 24px rgba(80,0,0,0.35); }
      .pb-btn:disabled { opacity: 0.35; cursor: default; }
      .pb-btn.round { width: 44px; height: 44px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; }
      .pb-btn.is-on { background: #fff; color: #c8151d; }
      .pb-scrub { width: 100%; max-width: 520px; display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: rgba(255,255,255,0.85); }
      .pb-scrub input { flex: 1; accent-color: #fff; }
      .pb-scrub span { min-width: 92px; text-align: right; }
      .pb-closed-ui, .pb-open-ui { display: none; flex-direction: column; align-items: center; gap: 10px; width: 100%; }
      .pb-overlay[data-mode="closed"] .pb-closed-ui, .pb-overlay[data-mode="open"] .pb-open-ui { display: flex; }
      .pb-msg { position: absolute; left: 24px; right: 24px; top: 50%; transform: translateY(-50%); text-align: center; font-size: 14px; line-height: 1.6; z-index: 4; }
      .pb-msg .pb-btn { margin-top: 14px; }
    `;
    document.head.appendChild(st);
  }

  // ---------- easing / tween ----------
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.blm48OpenPhotobook3D = function (opts) {
    injectStyles();
    const title = opts.title || 'PhotoBook';
    const coverUrl = opts.cover || '';

    const o = document.createElement('div');
    o.className = 'pb-overlay';
    o.dataset.mode = 'closed';
    o.innerHTML = `
      <div class="pb-stage"><div class="pb-floor"></div><div class="pb-obj"></div></div>
      <div class="pb-top">
        <div class="pb-title"></div>
        <button type="button" class="pb-icon-btn" data-act="sound" aria-label="Sound"></button>
        <button type="button" class="pb-icon-btn" data-act="close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="pb-bottom">
        <div class="pb-hint"></div>
        <div class="pb-closed-ui">
          <button type="button" class="pb-btn primary" data-act="open" disabled><i class="fa-solid fa-book-open"></i> เปิดอ่าน</button>
        </div>
        <div class="pb-open-ui">
          <div class="pb-scrub"><input type="range" min="1" max="1" step="1" value="1" aria-label="Page"><span></span></div>
          <div class="pb-row">
            <button type="button" class="pb-btn round" data-act="prev" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>
            <button type="button" class="pb-btn" data-act="zoom"><i class="fa-solid fa-magnifying-glass-plus"></i> ซูม</button>
            <button type="button" class="pb-btn" data-act="shut"><i class="fa-solid fa-book"></i> ปิดเล่ม</button>
            <button type="button" class="pb-btn round" data-act="next" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
      </div>`;
    o.querySelector('.pb-title').innerHTML = esc(title) + '<small>BLM48 PhotoBook</small>';
    const obj = o.querySelector('.pb-obj');
    const floor = o.querySelector('.pb-floor');
    const hint = o.querySelector('.pb-hint');
    const scrub = o.querySelector('.pb-scrub input');
    const scrubLabel = o.querySelector('.pb-scrub span');
    const soundBtn = o.querySelector('[data-act="sound"]');
    const openBtn = o.querySelector('[data-act="open"]');
    const zoomBtn = o.querySelector('[data-act="zoom"]');
    const prevBtn = o.querySelector('[data-act="prev"]');
    const nextBtn = o.querySelector('[data-act="next"]');
    function paintSound() { soundBtn.innerHTML = muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>'; }
    paintSound();

    document.body.appendChild(o);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => o.classList.add('show'));

    // ---------- สถานะ ----------
    let pages = [];       // URL หน้าด้านใน
    let leaves = [];      // { el, front, back, angle, frontPage, backPage }
    let board = null;
    let edges = [];
    let L = 0;            // จำนวนแผ่น (รวมปก)
    let t = 0;            // จำนวนแผ่นที่พลิกไปทางซ้ายแล้ว (0 = ยังปิดเล่ม)
    let W = 160, H = 240, T = 12, ratio = 1.5, sClosed = 1.3, zoomS = 2;
    const view = { rx: CLOSED_POSE.rx, ry: CLOSED_POSE.ry, open: 0, zoom: 1, camX: 0 };
    let mode = 'closed';  // closed | opening | open | closing
    let zoomSide = null;  // null | 'L' | 'R'
    let alive = true;
    let ready = false;

    const tweens = [];
    function tween(target, key, to, dur, delay, ease, done) {
      for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].target === target && tweens[i].key === key) tweens.splice(i, 1);
      tweens.push({ target, key, to, dur: Math.max(1, dur), start: performance.now() + (delay || 0), from: null, ease: ease || easeInOut, done });
    }
    function stepTweens(now) {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        if (now < tw.start) continue;
        if (tw.from == null) tw.from = tw.target[tw.key];
        const k = clamp((now - tw.start) / tw.dur, 0, 1);
        tw.target[tw.key] = tw.from + (tw.to - tw.from) * tw.ease(k);
        if (k >= 1) { tweens.splice(i, 1); needsRender = true; if (tw.done) tw.done(); }
      }
    }

    // ---------- ขนาดตามจอ ----------
    function layout() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const availW = vw - 24, availH = vh - 64 - 170;
      W = Math.floor(Math.max(90, Math.min(availW / 2, availH / ratio)));
      H = Math.round(W * ratio);
      T = clamp(Math.min(W * 0.085, 6 + L * 0.55), 6, 22);
      sClosed = clamp(Math.min((availW * 0.64) / W, (availH * 0.98) / H), 1, 2.2);
      zoomS = Math.max(1, Math.min((vw - 16) / W, (vh - 64 - 120) / H));
      obj.style.setProperty('--W', W + 'px');
      obj.style.setProperty('--H', H + 'px');
      obj.style.setProperty('--T', T + 'px');
      if (zoomSide) { view.zoom = zoomS; view.camX = zoomSide === 'R' ? -W / 2 * zoomS : W / 2 * zoomS; }
    }

    // ---------- สร้างเล่ม ----------
    function face(cls, inner) {
      const f = document.createElement('div');
      f.className = 'pb-face ' + cls;
      f.innerHTML = (inner || '<div class="pb-img"></div>') + '<div class="pb-gutter"></div><div class="pb-cast"></div><div class="pb-shade"></div>';
      f._shade = f.querySelector('.pb-shade');
      f._cast = f.querySelector('.pb-cast');
      return f;
    }
    function setImg(f, url) { const img = f.querySelector('.pb-img'); if (img) img.style.backgroundImage = url ? `url("${url}")` : ''; }

    function build() {
      const innerLeaves = Math.ceil(pages.length / 2);
      L = 1 + innerLeaves;
      obj.innerHTML = '';
      leaves = [];

      board = document.createElement('div');
      board.className = 'pb-board';
      const boardIn = face('is-board is-endpaper');
      setImg(boardIn, ENDPAPER);
      const boardOut = face('is-back is-board', `<div class="pb-backcover"><div class="bg"></div><img src="${LOGO}" alt="" draggable="false"><span>${esc(title)}</span></div>`);
      boardOut.querySelector('.bg').style.backgroundImage = coverUrl ? `url("${coverUrl}")` : '';
      board.appendChild(boardIn); board.appendChild(boardOut);
      obj.appendChild(board);
      board._in = boardIn;

      for (let i = 0; i < L; i++) {
        const el = document.createElement('div');
        el.className = 'pb-leaf';
        let front, back, frontPage = -1, backPage = -1;
        if (i === 0) {
          front = face('is-cover', '<div class="pb-img"></div><div class="pb-gloss"></div>');
          setImg(front, coverUrl);
          back = face('is-back is-cover is-endpaper');
          setImg(back, ENDPAPER);
        } else {
          frontPage = 2 * i - 2; backPage = 2 * i - 1;
          front = face('is-loading');
          back = backPage < pages.length ? face('is-back is-loading') : face('is-back is-endpaper');
          if (backPage >= pages.length) { setImg(back, ENDPAPER); backPage = -1; }
        }
        el.appendChild(front); el.appendChild(back);
        obj.appendChild(el);
        leaves.push({ el, front, back, angle: 0, frontPage, backPage, shown: { f: '', b: '' } });
      }

      edges = ['fore', 'spine', 'top', 'bottom'].map(k => {
        const e = document.createElement('div');
        e.className = 'pb-edge ' + k;
        if (k === 'spine' && coverUrl) e.style.backgroundImage = `url("${coverUrl}")`;
        obj.appendChild(e);
        return e;
      });
      scrub.max = String(L);
      layout();
    }

    // ---------- หน้าไหนควรโหลด/แสดง ----------
    const urlOf = new Map(); // page index -> blob url
    priorityOf = idx => Math.abs(idx - Math.max(0, 2 * t - 2.5));
    function want(idx) {
      if (idx < 0 || idx >= pages.length || urlOf.has(idx)) return;
      loadPage(pages[idx], idx).then(u => { if (!alive) return; urlOf.set(idx, u); refreshImages(); })
        .catch(() => { urlOf.set(idx, ''); refreshImages(); });
    }
    function refreshImages() {
      const lo = Math.max(1, t - 3), hi = Math.min(L - 1, t + 3);
      for (let i = 1; i < L; i++) {
        const lf = leaves[i];
        const inWin = i >= lo && i <= hi;
        [['f', lf.front, lf.frontPage], ['b', lf.back, lf.backPage]].forEach(([k, f, p]) => {
          if (p < 0) return;
          const u = inWin && urlOf.has(p) ? urlOf.get(p) : '';
          if (lf.shown[k] !== u) { setImg(f, u); lf.shown[k] = u; }
          f.classList.toggle('is-loading', inWin && !urlOf.has(p));
        });
      }
      // โหลดล่วงหน้า: หน้าที่เห็น → หน้าถัดไป → หน้าก่อนหน้า
      const base = Math.max(0, 2 * t - 3);
      for (let d = 0; d < 10; d++) want(base + d);
      want(base - 1); want(base - 2);
    }

    // ---------- วาดทุกเฟรม ----------
    function render() {
      const eps = T / Math.max(1, L);
      const S = (sClosed + (1 - sClosed) * view.open) * view.zoom;
      const c = (W / 2) * (1 - view.open);
      obj.style.transformOrigin = `${W}px ${H / 2}px`;
      obj.style.transform = `translateX(${view.camX}px) scale(${S}) rotateX(${view.rx}deg) rotateY(${view.ry}deg) translateX(${-c}px)`;
      // เงาบนพื้น
      const fw = (W * (1 + view.open)) * S * 1.05, fh = Math.max(24, H * 0.16 * S);
      floor.style.width = fw + 'px'; floor.style.height = fh + 'px';
      floor.style.transform = `translate(-50%, ${H * S / 2 - fh * 0.35}px)`;
      floor.style.opacity = String(view.zoom > 1.05 ? 0 : 1);

      edges.forEach(e => { e.style.opacity = String(clamp(1 - view.open * 1.6, 0, 1)); });
      board.style.transform = 'translateZ(0px)';

      let moving = -1;
      for (let i = 0; i < L; i++) {
        const lf = leaves[i];
        const p = clamp(-lf.angle / 180, 0, 1);
        const zUn = (L - i) * eps, zTu = -(i + 1) * eps;
        const z = zUn + (zTu - zUn) * p;
        // ยกขอบกระดาษขึ้นนิดๆ ตอนกำลังพลิก ให้ดูโค้งลอยจากเล่ม
        const lift = Math.sin(p * Math.PI) * (i === 0 ? 0 : W * 0.05);
        lf.el.style.transform = `rotateY(${lf.angle}deg) translateZ(${z + lift}px)`;
        lf.front._shade.style.opacity = (0.5 * p).toFixed(3);
        lf.back._shade.style.opacity = (0.5 * (1 - p)).toFixed(3);
        lf.front._cast.style.opacity = '0';
        lf.back._cast.style.opacity = '0';
        if (p > 0.001 && p < 0.999) moving = i;
      }
      board._in._cast.style.opacity = '0';
      // เงาของแผ่นที่กำลังพลิกตกลงบนหน้าใต้ (ขวา) และหน้าที่จะทับ (ซ้าย)
      if (moving >= 0) {
        const p = clamp(-leaves[moving].angle / 180, 0, 1);
        const a = Math.sin(p * Math.PI) * 0.55;
        const under = moving + 1 < L ? leaves[moving + 1].front : board._in;
        const cr = under._cast;
        const wR = Math.max(4, (1 - p) * 100);
        cr.style.background = `linear-gradient(to right, rgba(0,0,0,${(a * 0.9).toFixed(3)}) 0%, rgba(0,0,0,${(a * 0.35).toFixed(3)}) ${wR * 0.7}%, rgba(0,0,0,0) ${wR}%)`;
        cr.style.opacity = '1';
        if (moving - 1 >= 0) {
          const cl = leaves[moving - 1].back._cast;
          const wL = Math.max(4, p * 100);
          cl.style.background = `linear-gradient(to left, rgba(0,0,0,${(a * 0.9).toFixed(3)}) 0%, rgba(0,0,0,${(a * 0.35).toFixed(3)}) ${wL * 0.7}%, rgba(0,0,0,0) ${wL}%)`;
          cl.style.opacity = '1';
        }
      }
      // ประกายบนปกตามมุมหมุน
      const gloss = leaves[0] && leaves[0].front.querySelector('.pb-gloss');
      if (gloss) gloss.style.backgroundPosition = `${50 + (((view.ry % 360) + 540) % 360 - 180) * 0.9}% 0`;
    }

    // ---------- ตัวบอกหน้า / ปุ่ม ----------
    function pageLabel() {
      const nums = [2 * t - 3, 2 * t - 2].filter(p => p >= 0 && p < pages.length).map(p => p + 1);
      if (!nums.length) return t >= L ? 'จบเล่ม' : 'ปกใน';
      return 'หน้า ' + nums.join('–') + ' / ' + pages.length;
    }
    function syncUi() {
      o.dataset.mode = (mode === 'open' || mode === 'closing') ? 'open' : 'closed';
      scrub.value = String(Math.max(1, t));
      scrubLabel.textContent = pageLabel();
      prevBtn.disabled = t <= 1 && zoomSide !== 'R';
      nextBtn.disabled = t >= L && zoomSide !== 'L';
      zoomBtn.classList.toggle('is-on', !!zoomSide);
      zoomBtn.innerHTML = zoomSide ? '<i class="fa-solid fa-magnifying-glass-minus"></i> ย่อ' : '<i class="fa-solid fa-magnifying-glass-plus"></i> ซูม';
      if (mode === 'closed') hint.textContent = ready ? 'ลากเพื่อหมุนดูรอบเล่ม · แตะที่หนังสือเพื่อเปิดอ่าน' : 'กำลังเตรียมหนังสือ...';
      else if (mode === 'open') hint.textContent = zoomSide ? 'ปัดซ้าย-ขวาเพื่ออ่านทีละหน้า' : 'ลากมุมกระดาษหรือแตะซ้าย-ขวาเพื่อพลิกหน้า';
      openBtn.disabled = !ready;
    }

    // ---------- พลิกหน้า ----------
    const TURN_MS = 720;
    function turnLeaf(i, toTurned, dur, delay, vol) {
      tween(leaves[i], 'angle', toTurned ? -180 : 0, dur == null ? TURN_MS : dur, delay || 0, easeInOut);
      setTimeout(() => { if (alive) { flipSound(vol); if (vol == null || vol >= 1) buzz(); } }, (delay || 0) + 40);
    }
    function goTo(target) {
      target = clamp(Math.round(target), 1, L);
      if (target === t) return;
      const fwd = target > t;
      const list = [];
      if (fwd) for (let i = t; i < target; i++) list.push(i);
      else for (let i = t - 1; i >= target; i--) list.push(i);
      const many = list.length > 1;
      list.forEach((i, k) => turnLeaf(i, fwd, many ? 520 : TURN_MS, k * (many ? 55 : 0), many ? (k < 6 ? 0.55 : 0) : 1));
      t = target;
      refreshImages(); syncUi();
    }
    function next() {
      if (mode !== 'open') return;
      if (zoomSide === 'L') { setZoom('R'); return; }
      if (t >= L) return;
      goTo(t + 1);
      if (zoomSide === 'R') setZoom('L');
    }
    function prev() {
      if (mode !== 'open') return;
      if (zoomSide === 'R') { setZoom('L'); return; }
      if (t <= 1) return;
      goTo(t - 1);
      if (zoomSide === 'L') setZoom('R');
    }
    function setZoom(side) {
      zoomSide = side;
      const z = side ? zoomS : 1;
      tween(view, 'zoom', z, 520, 0, easeInOut);
      tween(view, 'camX', side === 'R' ? -W / 2 * z : side === 'L' ? W / 2 * z : 0, 520, 0, easeInOut);
      syncUi();
    }
    function toggleZoom() {
      if (mode !== 'open') return;
      if (zoomSide) { setZoom(null); return; }
      // ซูมหน้าที่มีรูปอยู่ (ขวาก่อน ถ้าไม่มีหน้าขวาค่อยซูมซ้าย)
      setZoom(2 * t - 2 < pages.length ? 'R' : 'L');
    }

    // ---------- เปิด / ปิดเล่ม ----------
    function openBook() {
      if (mode !== 'closed' || !ready) return;
      mode = 'opening'; touched = true; vel.x = vel.y = 0;
      const ryTarget = Math.round(view.ry / 360) * 360;
      tween(view, 'rx', OPEN_RX, 650, 0, easeInOut);
      tween(view, 'ry', ryTarget, 650, 0, easeInOut);
      tween(view, 'open', 1, 1100, 250, easeInOut);
      tween(leaves[0], 'angle', -180, 1100, 250, easeInOut, () => {
        view.ry = 0;
        mode = 'open'; syncUi();
      });
      setTimeout(() => { if (alive) { flipSound(1.2); buzz(); } }, 300);
      t = 1; refreshImages(); syncUi();
    }
    function shutBook() {
      if (mode !== 'open') return;
      mode = 'closing';
      if (zoomSide) setZoom(null);
      const back = t - 1;
      const delay = back > 0 ? Math.min(back, 12) * 55 + 480 : 0;
      for (let i = t - 1, k = 0; i >= 1; i--, k++) turnLeaf(i, false, 480, Math.min(k, 12) * 55, k < 6 ? 0.5 : 0);
      t = 1;
      setTimeout(() => {
        if (!alive) return;
        tween(leaves[0], 'angle', 0, 1000, 0, easeInOut);
        tween(view, 'open', 0, 1000, 0, easeInOut);
        tween(view, 'rx', CLOSED_POSE.rx, 1000, 300, easeInOut);
        tween(view, 'ry', CLOSED_POSE.ry, 1000, 300, easeInOut, () => { mode = 'closed'; t = 0; touched = false; idleT = 0; syncUi(); });
        flipSound(1.1);
      }, delay);
      syncUi();
    }

    // ---------- ลูป ----------
    let raf = 0, touched = false, idleT = 0, needsRender = true;
    const vel = { x: 0, y: 0 };
    let dragging = false;
    function loop(now) {
      stepTweens(now);
      if (mode === 'closed' && !dragging) {
        if (Math.abs(vel.x) > 0.02 || Math.abs(vel.y) > 0.02) { view.ry += vel.y; view.rx += vel.x; vel.x *= 0.94; vel.y *= 0.94; }
        else if (!touched) { idleT += 0.016; view.ry = CLOSED_POSE.ry + Math.sin(idleT * 1.1) * 14; view.rx = CLOSED_POSE.rx + Math.sin(idleT * 0.8) * 4; }
        view.rx = clamp(view.rx, -45, 45);
      }
      // วาดใหม่เฉพาะตอนมีอะไรขยับ (ตอนนิ่งอ่านอยู่ไม่กินแบต)
      if (leaves.length && (tweens.length || ptr || mode === 'closed' || needsRender)) { render(); needsRender = false; }
      raf = requestAnimationFrame(loop);
    }

    // ---------- นิ้ว / เมาส์ ----------
    let ptr = null; // { x, y, t, lastX, lastY, lastT, turning: {i, fwd}, axis }
    function stageRectSpineX() { const r = obj.getBoundingClientRect(); return r.left + r.width / 2; }

    o.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input')) return;
      if (!leaves.length) return;
      ptr = { x: e.clientX, y: e.clientY, t: performance.now(), lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), vx: 0, axis: null, turning: null };
      if (mode === 'closed') { dragging = true; touched = true; vel.x = vel.y = 0; tweens.length = 0; }
      try { o.setPointerCapture(e.pointerId); } catch (err) { /* บางเบราว์เซอร์ไม่รองรับ */ }
    });
    o.addEventListener('pointermove', (e) => {
      if (!ptr) return;
      const now = performance.now();
      const dx = e.clientX - ptr.lastX, dy = e.clientY - ptr.lastY, dt = Math.max(16, now - ptr.lastT);
      if (mode === 'closed') {
        view.ry += dx * 0.45; view.rx = clamp(view.rx - dy * 0.35, -45, 45);
        vel.y = dx * 0.45 * (16 / dt); vel.x = -dy * 0.35 * (16 / dt);
      } else if (mode === 'open' && !zoomSide) {
        const tx = e.clientX - ptr.x;
        if (!ptr.axis && Math.hypot(tx, e.clientY - ptr.y) > 8) ptr.axis = Math.abs(tx) > Math.abs(e.clientY - ptr.y) ? 'x' : 'y';
        if (ptr.axis === 'x') {
          if (!ptr.turning) {
            const fwd = tx < 0;
            const i = fwd ? t : t - 1;
            if ((fwd && i < L) || (!fwd && i >= 1)) {
              ptr.turning = { i, fwd };
              for (let k = tweens.length - 1; k >= 0; k--) if (tweens[k].target === leaves[i]) tweens.splice(k, 1);
              flipSound(0.8);
            }
          }
          if (ptr.turning) {
            const dist = W * (view.zoom * (sClosed + (1 - sClosed) * view.open)) * 1.7;
            const p = clamp(Math.abs(tx) / dist, 0, 1);
            leaves[ptr.turning.i].angle = ptr.turning.fwd ? -180 * p : -180 * (1 - p);
          }
        }
      }
      ptr.vx = dx / dt;
      ptr.lastX = e.clientX; ptr.lastY = e.clientY; ptr.lastT = now;
    });
    function endPointer(e) {
      if (!ptr) return;
      const tx = e.clientX - ptr.x, ty = e.clientY - ptr.y;
      const isTap = Math.hypot(tx, ty) < 8 && performance.now() - ptr.t < 350;
      if (mode === 'closed') {
        dragging = false;
        if (isTap) openBook();
      } else if (mode === 'open') {
        if (ptr.turning) {
          const lf = leaves[ptr.turning.i];
          const p = ptr.turning.fwd ? -lf.angle / 180 : 1 + lf.angle / 180;
          const flick = ptr.turning.fwd ? ptr.vx < -0.35 : ptr.vx > 0.35;
          const done = p > 0.4 || flick;
          const finalTurned = ptr.turning.fwd ? done : !done;
          const remain = done ? 1 - p : p;
          tween(lf, 'angle', finalTurned ? -180 : 0, Math.max(160, 560 * remain), 0, easeOut);
          if (done) { t = ptr.turning.fwd ? t + 1 : t - 1; buzz(); refreshImages(); syncUi(); }
        } else if (zoomSide) {
          if (Math.abs(tx) > 40 && Math.abs(tx) > Math.abs(ty)) { if (tx < 0) next(); else prev(); }
          else if (isTap) {
            const w = window.innerWidth;
            if (e.clientX > w * 0.66) next(); else if (e.clientX < w * 0.34) prev();
          }
        } else if (isTap) {
          if (e.clientX >= stageRectSpineX()) next(); else prev();
        }
      }
      ptr = null;
    }
    o.addEventListener('pointerup', endPointer);
    o.addEventListener('pointercancel', (e) => { if (ptr && ptr.turning) { endPointer(e); } else { ptr = null; dragging = false; } });

    // ---------- ปุ่ม ----------
    o.querySelector('[data-act="close"]').addEventListener('click', close);
    openBtn.addEventListener('click', openBook);
    o.querySelector('[data-act="shut"]').addEventListener('click', shutBook);
    nextBtn.addEventListener('click', next);
    prevBtn.addEventListener('click', prev);
    zoomBtn.addEventListener('click', toggleZoom);
    soundBtn.addEventListener('click', () => {
      muted = !muted; paintSound();
      try { localStorage.setItem('blm48_pb_muted', muted ? '1' : '0'); } catch (e) { /* ไม่มีที่เก็บก็ข้าม */ }
      if (!muted) flipSound(0.8);
    });
    scrub.addEventListener('input', () => { scrubLabel.textContent = labelFor(Number(scrub.value)); });
    scrub.addEventListener('change', () => { if (mode === 'open') { if (zoomSide) setZoom(null); goTo(Number(scrub.value)); } });
    function labelFor(tt) { const keep = t; t = tt; const s = pageLabel(); t = keep; return s; }

    function onKey(e) {
      if (e.key === 'Escape') { if (zoomSide) setZoom(null); else close(); }
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    }
    document.addEventListener('keydown', onKey);
    function onResize() { layout(); needsRender = true; }
    window.addEventListener('resize', onResize);

    function close() {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      queue.length = 0;
      o.classList.remove('show');
      document.documentElement.style.overflow = '';
      setTimeout(() => o.remove(), 250);
    }

    function showError(msg) {
      const box = document.createElement('div');
      box.className = 'pb-msg';
      box.innerHTML = `<div>${esc(msg)}</div><button type="button" class="pb-btn">ลองใหม่</button>`;
      box.querySelector('button').addEventListener('click', () => { box.remove(); start(); });
      o.appendChild(box);
      hint.textContent = '';
    }

    // ---------- เริ่ม ----------
    async function start() {
      try {
        if (!opts.folder || !sbClient()) throw new Error('no folder');
        pages = await listPages(opts.folder);
        if (!alive) return;
        if (!pages.length) { showError('ยังไม่มีหน้าในโฟโต้บุ๊คเล่มนี้ค่ะ'); return; }
        // สัดส่วนหน้า: ใช้จากรูปปก (หน้าในเป็นสัดส่วนเดียวกัน) จะได้ไม่ต้องรอโหลดหน้าใหญ่
        ratio = await new Promise(res => {
          if (!coverUrl) return res(1.5);
          const i = new Image();
          i.onload = () => res(i.naturalWidth ? clamp(i.naturalHeight / i.naturalWidth, 0.6, 2) : 1.5);
          i.onerror = () => res(1.5);
          i.src = coverUrl;
        });
        if (!alive) return;
        build();
        ready = true;
        refreshImages();
        syncUi();
      } catch (err) {
        console.error('photobook 3d error:', err);
        if (alive) showError('เปิดโฟโต้บุ๊คไม่สำเร็จ กรุณาลองใหม่อีกครั้งนะคะ');
      }
    }
    syncUi();
    raf = requestAnimationFrame(loop);
    start();
  };
})();
