// 🎴 ฉากเปิดซองสุ่ม: ซองพลาสติกฟอยล์ → ลากนิ้วตามรอยปะเพื่อฉีก → เห็นของจริงทันทีทีละชิ้น แตะเพื่อดูชิ้นถัดไป (SSR มีป้าย SSR + พลุ, ไม่มีแสงเรือง)
// ใช้: await blm48OpenPacks([{ cover, name, cards: [{ image, label, isSSR }] }, ...])  (หนึ่งซองต่อหนึ่งรายการสุ่ม)
// resolve เมื่อผู้ใช้เปิดครบทุกซอง หรือกด "ข้าม"
(function () {
  const TEAR_DONE = 0.62; // ลากเกินสัดส่วนนี้ของความกว้างซอง = ฉีกขาด

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function injectStyles() {
    if (document.getElementById('blm48-pack-style')) return;
    const st = document.createElement('style');
    st.id = 'blm48-pack-style';
    st.textContent = `
      .po-overlay { position: fixed; inset: 0; z-index: 20500; overflow: hidden; font-family: 'Quicksand', 'Kanit', sans-serif; color: #fff;
        background: radial-gradient(circle at 50% 38%, #f0454b 0%, #c8151d 55%, #8f0c12 100%); touch-action: none; user-select: none; -webkit-user-select: none;
        display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
      .po-overlay.show { opacity: 1; }
      .po-skip { position: absolute; top: calc(14px + env(safe-area-inset-top)); right: 14px; border: none; border-radius: 999px; padding: 8px 16px;
        background: rgba(255,255,255,0.12); color: #fff; font-family: inherit; font-size: 13px; cursor: pointer; z-index: 5; }
      .po-count { position: absolute; top: calc(22px + env(safe-area-inset-top)); left: 16px; font-size: 13px; color: rgba(255,255,255,0.7); }
      .po-stage { position: relative; width: min(64vw, 270px); aspect-ratio: 5 / 8; }

      /* ซองพลาสติก (ธีมแดงขาว: พื้นแดง ซองขาวมุก ลายแดง — ปุ่มคงสีเดิม) */
      .po-pack { position: absolute; inset: 0; z-index: 2; transition: transform 0.6s cubic-bezier(0.5,0,0.3,1), opacity 0.5s; }
      .po-pack.idle { animation: po-float 2.6s ease-in-out infinite; }
      @keyframes po-float { 0%,100% { transform: translateY(0) rotate(-1.2deg); } 50% { transform: translateY(-8px) rotate(1.2deg); } }
      .po-part { position: absolute; left: 0; right: 0; overflow: hidden;
        background: linear-gradient(135deg, #ffffff 0%, #ffe3e4 22%, #ffffff 40%, #ffd3d5 62%, #fff4f4 100%); }
      .po-top { top: 0; height: 16%; border-radius: 10px 10px 0 0; transform-origin: 100% 100%; z-index: 3; transition: transform 0.15s; }
      .po-body { top: 15.5%; bottom: 0; border-radius: 0 0 10px 10px; z-index: 2; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
      /* รอยหยักซีลซองด้านบน/ล่าง */
      .po-top::before, .po-body::after { content: ''; position: absolute; left: 0; right: 0; height: 9px;
        background: repeating-linear-gradient(90deg, rgba(200,21,29,0.35) 0 3px, rgba(255,255,255,0.5) 3px 6px); }
      .po-top::before { top: 0; } .po-body::after { bottom: 0; }
      .po-art { position: absolute; left: 8%; right: 8%; top: 8%; bottom: 20%; border-radius: 8px; overflow: hidden; background: #e8262e; }
      .po-art img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
      .po-name { position: absolute; left: 8%; right: 8%; bottom: 6%; text-align: center; color: #c8151d; font-weight: 700; font-size: 13px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .po-sheen { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen;
        background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 45%, transparent 60%); background-size: 250% 100%;
        animation: po-sheen 3.2s linear infinite; }
      @keyframes po-sheen { from { background-position: 150% 0; } to { background-position: -100% 0; } }
      .po-top .po-mini { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #c8151d; font-weight: 700; font-size: 11px; letter-spacing: 2px; }
      /* รอยปะ + มือชี้ */
      .po-guide { position: absolute; left: -4%; right: -4%; top: 15.6%; height: 2px; z-index: 4; pointer-events: none;
        background: repeating-linear-gradient(90deg, rgba(255,255,255,0.95) 0 8px, transparent 8px 14px); }
      .po-cut { position: absolute; left: 0; top: 15%; height: 6px; width: 0; z-index: 4; pointer-events: none;
        background: linear-gradient(#fff, #ffd0d2); border-radius: 3px; }
      .po-finger { position: absolute; top: calc(15.6% - 4px); left: 0; z-index: 6; font-size: 30px; pointer-events: none;
        animation: po-finger 1.6s ease-in-out infinite; text-shadow: 0 4px 10px rgba(0,0,0,0.4); }
      @keyframes po-finger { 0% { transform: translate(-10%, 0); opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translate(230px, 0); opacity: 0; } }
      .po-hint { margin-top: 30px; font-size: 14px; color: rgba(255,255,255,0.85); text-align: center; min-height: 20px; }

      /* ของที่ได้: แสดงรูปจริงตามรูปทรง (ไม่มีกรอบการ์ด ไม่ต้องพลิก) ทีละชิ้น */
      .po-cards { position: absolute; inset: 2% 2% 12%; z-index: 1; }
      .po-card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
        opacity: 0; transform: translateY(8%) scale(0.7); transition: transform 0.6s cubic-bezier(0.3,0.9,0.3,1), opacity 0.4s; pointer-events: none; }
      .po-card img { max-width: 100%; max-height: 82%; object-fit: contain; pointer-events: none;
        filter: drop-shadow(0 18px 24px rgba(0,0,0,0.5)); }
      .po-card .label { margin-top: 14px; font-size: 14px; font-weight: 600; color: #fff; text-align: center; max-width: 100%;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .po-card .ssr-badge { display: inline-block; margin-right: 6px; font-size: 11px; font-weight: 800; color: #3b2a00; vertical-align: 1px;
        background: linear-gradient(135deg,#fff1b8,#f3c548); border-radius: 999px; padding: 2px 9px; }
      .po-card.peek { opacity: 1; transform: translateY(-40%) scale(0.8); }
      .po-card.show { opacity: 1; transform: none; }
      .po-card.gone { opacity: 0; transform: translate(-120%, -6%) rotate(-16deg) scale(0.9); }

      /* สรุปของที่ได้: รูปตามสัดส่วนต้นฉบับ (ไม่ครอปใส่กรอบ ไม่มีพื้นหลัง/แสงเรือง) */
      .po-summary { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 70px 16px 30px; }
      .po-summary h3 { margin: 0 0 16px; font-size: 18px; }
      .po-grid { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-end; gap: 14px; width: 100%; max-width: 440px; max-height: 60vh; overflow-y: auto; }
      .po-grid div { display: flex; flex-direction: column; align-items: center; animation: po-pop 0.4s both; }
      .po-grid img { height: 120px; width: auto; max-width: 180px; object-fit: contain; filter: drop-shadow(0 8px 12px rgba(0,0,0,0.4)); }
      .po-grid .ssr-badge { margin-top: 6px; font-size: 10px; font-weight: 800; color: #3b2a00; background: linear-gradient(135deg,#fff1b8,#f3c548);
        border-radius: 999px; padding: 1px 8px; }
      @keyframes po-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .po-done { margin-top: 22px; border: none; border-radius: 999px; padding: 12px 34px; background: #ffd75e; color: #222; font-family: inherit;
        font-size: 15px; font-weight: 700; cursor: pointer; }
      .po-confetti { position: fixed; top: 45%; left: 50%; width: 9px; height: 9px; border-radius: 2px; z-index: 20600; pointer-events: none;
        animation: po-burst 1.4s ease-out forwards; }
      @keyframes po-burst { 0% { transform: translate(-50%,-50%) rotate(0); opacity: 1; }
        100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(0.4); opacity: 0; } }
    `;
    document.head.appendChild(st);
  }

  function confetti() {
    const colors = ['#ffffff', '#ffd0d2', '#ff6b70', '#ffffff', '#ffe3e4'];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement('div');
      p.className = 'po-confetti';
      const a = (Math.PI * 2 * i) / 46 + Math.random() * 0.4, d = 120 + Math.random() * 180;
      p.style.setProperty('--tx', Math.cos(a) * d + 'px');
      p.style.setProperty('--ty', Math.sin(a) * d - 40 + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }

  // ขอบล่างของแถบบนเป็นรอยฉีกหยักๆ
  function jaggedClip() {
    const pts = ['0% 0%', '100% 0%'];
    for (let x = 100; x >= 0; x -= 5) pts.push(`${x}% ${x % 10 === 0 ? 100 : 86}%`);
    return `polygon(${pts.join(',')})`;
  }

  window.blm48OpenPacks = function (packs) {
    packs = (packs || []).filter(p => p.cards && p.cards.length);
    if (!packs.length) return Promise.resolve();
    injectStyles();

    return new Promise((resolve) => {
      const o = document.createElement('div');
      o.className = 'po-overlay';
      o.innerHTML = `<div class="po-count"></div><button type="button" class="po-skip">Skip</button>
        <div class="po-stage"></div><div class="po-hint"></div>`;
      document.body.appendChild(o);
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(() => o.classList.add('show'));

      const stage = o.querySelector('.po-stage');
      const hint = o.querySelector('.po-hint');
      const countEl = o.querySelector('.po-count');
      const allCards = packs.flatMap(p => p.cards);
      let packIdx = 0, finished = false;

      function finish() {
        if (finished) return;
        finished = true;
        o.classList.remove('show');
        document.documentElement.style.overflow = '';
        setTimeout(() => { o.remove(); resolve(); }, 300);
      }

      function showSummary() {
        countEl.textContent = '';
        o.querySelector('.po-skip').style.display = 'none';
        stage.style.display = 'none';
        hint.textContent = '';
        const sum = document.createElement('div');
        sum.className = 'po-summary';
        sum.innerHTML = `<h3>You got ${allCards.length} item${allCards.length > 1 ? 's' : ''}</h3>
          <div class="po-grid">${allCards.map((c, i) => `<div style="animation-delay:${i * 0.05}s"><img src="${esc(c.image)}" alt="" draggable="false">${c.isSSR ? '<span class="ssr-badge">SSR</span>' : ''}</div>`).join('')}</div>
          <button type="button" class="po-done">Add to Inventory</button>`;
        o.appendChild(sum);
        sum.querySelector('.po-done').addEventListener('click', finish);
        if (allCards.some(c => c.isSSR)) confetti();
      }

      function openPack(pack) {
        countEl.textContent = packs.length > 1 ? `Pack ${packIdx + 1}/${packs.length}` : '';
        stage.innerHTML = `
          <div class="po-cards">${pack.cards.map((c, i) => `
            <div class="po-card${c.isSSR ? ' is-ssr' : ''}" data-i="${i}">
              <img src="${esc(c.image)}" alt="" draggable="false">
              <div class="label">${c.isSSR ? '<span class="ssr-badge">SSR</span>' : ''}${esc(c.label)}</div>
            </div>`).join('')}</div>
          <div class="po-pack idle">
            <div class="po-part po-top" style="clip-path:${jaggedClip()}"><div class="po-mini">BLM48</div><div class="po-sheen"></div></div>
            <div class="po-part po-body">
              <div class="po-art">${pack.cover ? `<img src="${esc(pack.cover)}" alt="" draggable="false">` : ''}</div>
              <div class="po-name">${esc(pack.name || 'BLM48 Random Pack')}</div>
              <div class="po-sheen"></div>
            </div>
          </div>
          <div class="po-guide"></div><div class="po-cut"></div><div class="po-finger">👆</div>`;
        hint.textContent = 'Swipe along the dotted line to tear open';

        const packEl = stage.querySelector('.po-pack');
        const topEl = stage.querySelector('.po-top');
        const cutEl = stage.querySelector('.po-cut');
        const fingerEl = stage.querySelector('.po-finger');
        const guideEl = stage.querySelector('.po-guide');
        const cards = [...stage.querySelectorAll('.po-card')];
        let startX = null, progress = 0, torn = false;

        function setProgress(p) {
          progress = Math.max(0, Math.min(1, p));
          cutEl.style.width = (progress * 100) + '%';
          topEl.style.transform = `rotate(${-progress * 10}deg) translateY(${-progress * 6}px)`;
        }

        function onDown(e) {
          if (torn) return;
          startX = e.clientX;
          packEl.classList.remove('idle');
          fingerEl.style.display = 'none';
          stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
        }
        function onMove(e) {
          if (torn || startX === null) return;
          setProgress(Math.abs(e.clientX - startX) / stage.offsetWidth);
          if (progress >= TEAR_DONE) tear();
        }
        function onUp() {
          if (torn || startX === null) return;
          startX = null;
          topEl.style.transition = 'transform 0.3s';
          setProgress(0);
          setTimeout(() => { topEl.style.transition = ''; }, 300);
          packEl.classList.add('idle');
          fingerEl.style.display = '';
        }
        stage.addEventListener('pointerdown', onDown);
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerup', onUp);
        stage.addEventListener('pointercancel', onUp);

        function tear() {
          torn = true;
          if (navigator.vibrate) navigator.vibrate(30);
          cutEl.style.width = '100%';
          topEl.style.transition = 'transform 0.6s cubic-bezier(0.3,0,0.6,1), opacity 0.6s';
          topEl.style.transform = 'translate(90px, -220px) rotate(-38deg)';
          topEl.style.opacity = '0';
          guideEl.style.opacity = '0';
          setTimeout(() => { cutEl.style.opacity = '0'; }, 250);
          hint.textContent = '';
          // ชิ้นแรกโผล่ขึ้นจากซอง แล้วซองตกลงหายไป เหลือของชิ้นแรกกลางจอ
          setTimeout(() => cards[0].classList.add('peek'), 250);
          setTimeout(() => { packEl.style.transform = 'translateY(120%)'; packEl.style.opacity = '0'; }, 750);
          setTimeout(() => {
            stage.removeEventListener('pointerdown', onDown);
            reveal(0);
            stage.addEventListener('click', onCardTap);
          }, 1150);
        }

        let cur = 0;
        // แสดงของชิ้นที่ i (SSR = แสงทอง + พลุ + สั่น)
        function reveal(i) {
          const data = pack.cards[i];
          cards[i].classList.remove('peek');
          cards[i].classList.add('show');
          if (data.isSSR) { confetti(); if (navigator.vibrate) navigator.vibrate([40, 40, 80]); }
          const counter = cards.length > 1 ? ` (${i + 1}/${cards.length})` : '';
          hint.textContent = (i < cards.length - 1 ? 'Tap for the next item' : (packIdx < packs.length - 1 ? 'Tap to open the next pack' : 'Tap to see all items')) + counter;
        }
        function onCardTap() {
          if (!cards[cur]) return;
          cards[cur].classList.remove('show');
          cards[cur].classList.add('gone');
          cur++;
          if (cur < cards.length) { reveal(cur); return; }
          stage.removeEventListener('click', onCardTap);
          stage.removeEventListener('pointermove', onMove);
          stage.removeEventListener('pointerup', onUp);
          stage.removeEventListener('pointercancel', onUp);
          setTimeout(() => {
            packIdx++;
            if (packIdx < packs.length) openPack(packs[packIdx]); else showSummary();
          }, 450);
        }
      }

      o.querySelector('.po-skip').addEventListener('click', showSummary);
      openPack(packs[0]);
    });
  };
})();
