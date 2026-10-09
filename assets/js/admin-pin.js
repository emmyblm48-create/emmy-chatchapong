// 🔒 หน้าจอใส่ PIN 6 หลักสำหรับหน้า Admin ที่ต้องล็อก (หน้าตาแบบแอปธนาคาร: จุด 6 จุด + ปุ่มตัวเลขวงกลม)
// ใช้: await blm48RequireAdminPin(user, { page: 'admin_votes', cancelUrl: 'admin' }) แล้วค่อยแสดงเนื้อหาหน้า
// หน้าฝั่งผู้ใช้: { page: 'majorvote', cancelUrl: 'index', mode: 'user' } (ทุกบัญชี, PIN ชุดเดียวกับหลังบ้าน)
// - แอดมินแต่ละคนมี PIN ของตัวเอง (ครั้งแรกให้ตั้ง PIN + ยืนยันอีกรอบ)
// - ตรวจ PIN ที่เซิร์ฟเวอร์ (เก็บแบบ hash) ผิด 5 ครั้งล็อก 15 นาที และบันทึกประวัติการเข้าหน้าทุกครั้ง
// - หน้า Admin: ถาม PIN ทุกครั้งที่เข้าหน้า (ไม่จำการปลดล็อก)
// - หน้า Major Vote (mode 'user'): ปลดล็อกแล้วเข้าได้ 10 นาทีโดยไม่ต้องใส่ซ้ำ (ต่อเวลาทุกครั้งที่เปิดหน้า) แยกจากหน้า Admin
(function () {
  const USER_UNLOCK_KEY = 'blm48_majorvote_pin_unlock';
  const UNLOCK_MS = 10 * 60 * 1000;
  const PIN_LENGTH = 6;
  // ล้างสถานะปลดล็อกแบบเก่า (เคยใช้ร่วมกันระหว่างหน้า Admin กับ Major Vote)
  try { sessionStorage.removeItem('blm48_admin_pin_unlock'); } catch (e) { /* ไม่มี storage */ }

  function readUnlock() {
    try { return JSON.parse(sessionStorage.getItem(USER_UNLOCK_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeUnlock(username) {
    try { sessionStorage.setItem(USER_UNLOCK_KEY, JSON.stringify({ username, until: Date.now() + UNLOCK_MS })); } catch (e) { /* ไม่มี storage = ถาม PIN ทุกครั้ง */ }
  }

  // อุปกรณ์แบบสั้นๆ ไว้ดูในประวัติ เช่น "iPhone · Safari"
  function deviceLabel() {
    const ua = navigator.userAgent || '';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
      : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : 'อุปกรณ์อื่น';
    const br = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox'
      : /Line\//.test(ua) ? 'LINE' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    return os + ' · ' + br;
  }

  function injectStyles() {
    if (document.getElementById('blm48-pin-style')) return;
    const st = document.createElement('style');
    st.id = 'blm48-pin-style';
    st.textContent = `
      .pin-screen { position: fixed; inset: 0; z-index: 5000; background: #fff; display: flex; flex-direction: column; align-items: center;
        font-family: 'Quicksand', 'Kanit', sans-serif; color: #222; padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom); }
      .pin-cancel { position: absolute; top: calc(14px + env(safe-area-inset-top)); right: 16px; background: none; border: none;
        color: #999; font-family: inherit; font-size: 17px; cursor: pointer; padding: 8px; }
      .pin-body { margin: auto 0; display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 320px; }
      .pin-title { font-size: 17px; font-weight: 500; margin-bottom: 4px; text-align: center; }
      .pin-sub { font-size: 12.5px; color: #999; min-height: 18px; text-align: center; margin-bottom: 18px; }
      .pin-sub.error { color: #ff4d6d; }
      .pin-dots { display: flex; gap: 14px; margin-bottom: 30px; }
      .pin-dot { width: 17px; height: 17px; border-radius: 50%; border: 1.5px solid #222; transition: background 0.1s; }
      .pin-dot.filled { background: #222; }
      .pin-dots.shake { animation: pin-shake 0.35s; }
      @keyframes pin-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-9px); } 40%,80% { transform: translateX(9px); } }
      .pin-pad { display: grid; grid-template-columns: repeat(3, 76px); gap: 18px 30px; justify-content: center; }
      .pin-key { width: 76px; height: 76px; border-radius: 50%; border: 1.5px solid #222; background: #fff; color: #222;
        font-family: 'Quicksand', sans-serif; font-size: 30px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center;
        -webkit-tap-highlight-color: transparent; transition: background 0.1s; }
      .pin-key:active { background: #f1f1f1; }
      .pin-key.blank { visibility: hidden; }
      .pin-key.back { font-size: 22px; }
      .pin-pad.disabled .pin-key { opacity: 0.35; pointer-events: none; }
      @media (max-height: 640px) { .pin-pad { grid-template-columns: repeat(3, 64px); gap: 12px 26px; } .pin-key { width: 64px; height: 64px; font-size: 26px; } .pin-dots { margin-bottom: 20px; } }
    `;
    document.head.appendChild(st);
  }

  window.blm48RequireAdminPin = function (user, opts) {
    const page = (opts && opts.page) || location.pathname.replace(/^\//, '').replace(/\.html$/, '');
    const cancelUrl = (opts && opts.cancelUrl) || 'admin';
    // mode 'user' = หน้าฝั่งผู้ใช้ (Major Vote): ทุกบัญชีใช้ได้ ส่วนค่าเริ่มต้นเป็นหน้าแอดมิน (เช็กสิทธิ์แอดมินที่เซิร์ฟเวอร์)
    const isUser = opts && opts.mode === 'user';
    const pinStatus = isUser ? blm48UserPinStatus : blm48AdminPinStatus;
    const setPin = isUser ? blm48UserSetPin : blm48AdminSetPin;
    const verifyPin = isUser ? blm48UserVerifyPin : blm48AdminVerifyPin;

    const unlock = isUser ? readUnlock() : null; // หน้า Admin ไม่ข้าม PIN เลย
    if (unlock && unlock.username === user.username && unlock.until > Date.now()) {
      writeUnlock(user.username); // ต่อเวลา
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      injectStyles();
      const screen = document.createElement('div');
      screen.className = 'pin-screen';
      screen.innerHTML = `
        <button type="button" class="pin-cancel">Cancel</button>
        <div class="pin-body">
          <div class="pin-title">Please Enter Your PIN</div>
          <div class="pin-sub"></div>
          <div class="pin-dots">${'<span class="pin-dot"></span>'.repeat(PIN_LENGTH)}</div>
          <div class="pin-pad disabled">
            ${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" class="pin-key" data-k="${n}">${n}</button>`).join('')}
            <span class="pin-key blank"></span>
            <button type="button" class="pin-key" data-k="0">0</button>
            <button type="button" class="pin-key back" data-k="back" aria-label="ลบ"><i class="fa-solid fa-delete-left"></i></button>
          </div>
        </div>`;
      document.body.appendChild(screen);
      document.documentElement.style.overflow = 'hidden';

      const titleEl = screen.querySelector('.pin-title');
      const subEl = screen.querySelector('.pin-sub');
      const dotsEl = screen.querySelector('.pin-dots');
      const padEl = screen.querySelector('.pin-pad');
      let mode = 'enter';     // 'enter' | 'create' | 'confirm'
      let entered = '';
      let firstPin = '';
      let busy = true;

      function setSub(text, isError) { subEl.textContent = text || ''; subEl.classList.toggle('error', !!isError); }
      function renderDots() { dotsEl.querySelectorAll('.pin-dot').forEach((d, i) => d.classList.toggle('filled', i < entered.length)); }
      function shake() { dotsEl.classList.remove('shake'); void dotsEl.offsetWidth; dotsEl.classList.add('shake'); }
      function setMode(m) {
        mode = m; entered = ''; renderDots();
        titleEl.textContent = m === 'create' ? 'Create Your PIN' : m === 'confirm' ? 'Confirm Your PIN' : 'Please Enter Your PIN';
      }
      function setBusy(b) { busy = b; padEl.classList.toggle('disabled', b); }
      function lockedMessage(until) {
        const t = new Date(until);
        return 'ใส่ PIN ผิดหลายครั้ง ลองใหม่ได้เวลา ' + t.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) + ' น.';
      }

      function finish() {
        if (isUser) writeUnlock(user.username); // จำการปลดล็อกเฉพาะหน้า Major Vote
        document.removeEventListener('keydown', onKey);
        document.documentElement.style.overflow = '';
        screen.remove();
        resolve();
      }

      async function submit() {
        const pin = entered;
        if (mode === 'create') { firstPin = pin; setMode('confirm'); setSub('ใส่ PIN เดิมอีกครั้งเพื่อยืนยัน'); return; }
        if (mode === 'confirm') {
          if (pin !== firstPin) { shake(); setMode('create'); setSub('PIN ไม่ตรงกัน กรุณาตั้งใหม่อีกครั้ง', true); return; }
          setBusy(true);
          try {
            const res = await setPin(user.username, pin, page, deviceLabel());
            if (res && res.status === 'success') return finish();
            setMode('create'); setSub((res && res.message) || 'ตั้ง PIN ไม่สำเร็จ', true);
          } catch (e) { setMode('create'); setSub('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', true); }
          setBusy(false);
          return;
        }
        setBusy(true);
        try {
          const res = await verifyPin(user.username, pin, page, deviceLabel());
          if (res && res.status === 'success') return finish();
          shake(); setMode('enter');
          if (res && res.code === 'locked') { setSub(lockedMessage(res.lockedUntil), true); return; } // ปุ่มกดยังปิดอยู่
          if (res && res.code === 'no_pin') { setMode('create'); setSub('ตั้ง PIN 6 หลักสำหรับเข้าหน้านี้'); }
          else setSub((res && res.message) || 'PIN ไม่ถูกต้อง', true);
        } catch (e) { setMode('enter'); setSub('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', true); }
        setBusy(false);
      }

      function press(k) {
        if (busy) return;
        if (k === 'back') { entered = entered.slice(0, -1); renderDots(); return; }
        if (entered.length >= PIN_LENGTH) return;
        entered += k; renderDots();
        if (entered.length === PIN_LENGTH) setTimeout(submit, 120); // ให้เห็นจุดที่ 6 เต็มก่อน
      }

      function onKey(e) {
        if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
        else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
      }

      padEl.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
      screen.querySelector('.pin-cancel').addEventListener('click', () => { window.location.href = cancelUrl; });
      document.addEventListener('keydown', onKey);

      (async () => {
        try {
          const st = await pinStatus(user.username);
          if (!st || st.status !== 'success') { setSub((st && st.message) || 'ตรวจสอบสิทธิ์ไม่สำเร็จ', true); return; }
          if (!st.hasPin) { setMode('create'); setSub('ครั้งแรก: ตั้ง PIN 6 หลักสำหรับเข้าหน้านี้'); setBusy(false); return; }
          setMode('enter');
          if (st.lockedUntil) { setSub(lockedMessage(st.lockedUntil), true); return; }
          setBusy(false);
        } catch (e) { setSub('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', true); }
      })();
    });
  };
})();
