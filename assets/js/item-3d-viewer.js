// 🔍 ดูสินค้าแบบ 3D: ลากหมุนการ์ด/สินค้าได้รอบทิศ + แสงโฮโลแกรมตามมุม · แตะสองครั้ง = พลิกดูด้านหลัง
// ใช้: blm48Open3DViewer({ image, label, isSSR })
(function () {
  const BACK_LOGO = 'https://lh3.googleusercontent.com/d/1p6lV8bD6VVjR-Ys2EnpcQH1AOsnahQSp=s300';

  function injectStyles() {
    if (document.getElementById('blm48-3d-style')) return;
    const st = document.createElement('style');
    st.id = 'blm48-3d-style';
    st.textContent = `
      .v3d-overlay { position: fixed; inset: 0; z-index: 21000; display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: radial-gradient(circle at 50% 40%, #f0454b 0%, #c8151d 55%, #8f0c12 100%); font-family: 'Quicksand', 'Kanit', sans-serif; color: #fff;
        touch-action: none; user-select: none; -webkit-user-select: none; opacity: 0; transition: opacity 0.25s; }
      .v3d-overlay.show { opacity: 1; }
      .v3d-close { position: absolute; top: calc(14px + env(safe-area-inset-top)); right: 14px; width: 40px; height: 40px; border-radius: 50%;
        border: none; background: rgba(255,255,255,0.12); color: #fff; font-size: 18px; cursor: pointer; }
      .v3d-title { position: absolute; top: calc(22px + env(safe-area-inset-top)); left: 16px; right: 64px; font-size: 15px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .v3d-title .ssr { display: inline-block; font-size: 11px; font-weight: 700; color: #3b2a00; background: linear-gradient(135deg,#ffe9a3,#f3c548);
        border-radius: 999px; padding: 2px 8px; margin-left: 6px; vertical-align: 1px; }
      .v3d-scene { perspective: 1100px; width: 100%; display: flex; justify-content: center; }
      .v3d-card { position: relative; width: min(68vw, 300px); transform-style: preserve-3d; cursor: grab; will-change: transform; }
      .v3d-card:active { cursor: grabbing; }
      .v3d-face { position: absolute; inset: 0; border-radius: 14px; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      /* เงาตามรูปทรงของจริง (ของทรงกลม/พื้นใส เช่น Coaster จะไม่เห็นกรอบสี่เหลี่ยม) */
      .v3d-front img { width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none; -webkit-touch-callout: none;
        filter: drop-shadow(0 22px 26px rgba(0,0,0,0.5)) brightness(var(--br, 1)) saturate(var(--sat, 1)); }
      .v3d-back { transform: rotateY(180deg); background: linear-gradient(135deg, #ffe680, #ffd23f); display: flex; align-items: center; justify-content: center;
        overflow: hidden; box-shadow: 0 24px 50px rgba(0,0,0,0.45); }
      .v3d-back img { width: 42%; border-radius: 22%; pointer-events: none; }
      .v3d-hint { margin-top: 34px; font-size: 12.5px; color: rgba(255,255,255,0.6); text-align: center; }
      .v3d-actions { margin-top: 14px; display: flex; gap: 10px; }
      .v3d-btn { border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); color: #fff; border-radius: 999px; padding: 8px 16px;
        font-family: inherit; font-size: 13px; cursor: pointer; }
    `;
    document.head.appendChild(st);
  }

  window.blm48Open3DViewer = function (opts) {
    injectStyles();
    const o = document.createElement('div');
    o.className = 'v3d-overlay';
    o.innerHTML = `
      <div class="v3d-title"></div>
      <button type="button" class="v3d-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="v3d-scene">
        <div class="v3d-card${opts.isSSR ? ' is-ssr' : ''}">
          <div class="v3d-face v3d-front"><img alt="" draggable="false"></div>
          <div class="v3d-face v3d-back"><img src="${BACK_LOGO}" alt="" draggable="false"></div>
        </div>
      </div>
      <div class="v3d-hint">Drag to rotate · Double-tap to flip</div>
      <div class="v3d-actions">
        <button type="button" class="v3d-btn" data-act="flip"><i class="fa-solid fa-rotate"></i> Flip</button>
        <button type="button" class="v3d-btn" data-act="reset"><i class="fa-solid fa-arrows-to-dot"></i> Reset</button>
      </div>`;
    const titleEl = o.querySelector('.v3d-title');
    titleEl.textContent = opts.label || '';
    if (opts.isSSR) titleEl.insertAdjacentHTML('beforeend', '<span class="ssr">SSR</span>');
    const card = o.querySelector('.v3d-card');
    const img = o.querySelector('.v3d-front img');
    card.style.aspectRatio = '5 / 7';
    img.onload = () => { if (img.naturalWidth && img.naturalHeight) card.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight; };
    img.src = opts.image || '';
    document.body.appendChild(o);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => o.classList.add('show'));

    let rx = -8, ry = -18;          // มุมปัจจุบัน
    let vx = 0, vy = 0;             // ความเร็วหลังปล่อยนิ้ว (เฉื่อย)
    let dragging = false, lastX = 0, lastY = 0, lastT = 0;
    let touched = false, idleT = 0, raf = 0, target = null;

    function apply() {
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      // แสงสะท้อนตามมุมเอียง (SSR วาวกว่า)
      const tilt = Math.sin(ry * Math.PI / 180) * 0.6 + Math.sin(rx * Math.PI / 180) * 0.4;
      card.style.setProperty('--br', (1 + tilt * (opts.isSSR ? 0.28 : 0.16)).toFixed(3));
      card.style.setProperty('--sat', (1 + Math.abs(tilt) * (opts.isSSR ? 0.5 : 0.15)).toFixed(3));
    }

    function loop(t) {
      if (target) { // หมุนไปมุมเป้าหมาย (พลิก / จัดตรง)
        rx += (target.rx - rx) * 0.14; ry += (target.ry - ry) * 0.14;
        if (Math.abs(target.rx - rx) < 0.2 && Math.abs(target.ry - ry) < 0.2) { rx = target.rx; ry = target.ry; target = null; }
      } else if (!dragging) {
        if (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02) { ry += vy; rx += vx; vx *= 0.94; vy *= 0.94; }
        else if (!touched) { idleT += 0.016; ry = -18 + Math.sin(idleT * 1.2) * 16; rx = -8 + Math.sin(idleT * 0.9) * 5; } // โยกเบาๆ ก่อนผู้ใช้แตะ
        rx = Math.max(-40, Math.min(40, rx));
      }
      apply();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    let lastTap = 0;
    function flip() { touched = true; vx = vy = 0; target = { rx: 0, ry: Math.round((ry + 180) / 180) * 180 }; }

    o.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const now = Date.now();
      if (now - lastTap < 300) { flip(); lastTap = 0; return; }
      lastTap = now;
      dragging = true; touched = true; target = null; vx = vy = 0;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
      o.setPointerCapture(e.pointerId);
    });
    o.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      ry += dx * 0.45; rx = Math.max(-40, Math.min(40, rx - dy * 0.35));
      const now = Date.now(), dt = Math.max(16, now - lastT);
      vy = dx * 0.45 * (16 / dt); vx = -dy * 0.35 * (16 / dt);
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    });
    const end = () => { dragging = false; };
    o.addEventListener('pointerup', end);
    o.addEventListener('pointercancel', end);

    o.querySelector('[data-act="flip"]').addEventListener('click', flip);
    o.querySelector('[data-act="reset"]').addEventListener('click', () => { touched = true; vx = vy = 0; target = { rx: 0, ry: Math.round(ry / 360) * 360 }; });

    function close() {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      o.classList.remove('show');
      document.documentElement.style.overflow = '';
      setTimeout(() => o.remove(), 250);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    o.querySelector('.v3d-close').addEventListener('click', close);
  };
})();
