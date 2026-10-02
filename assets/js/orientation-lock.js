// 📱 ใช้งานแนวตั้งเท่านั้น (มือถือ/แท็บเล็ต) ยกเว้นหน้า Admin
// เว็บบน iPhone/iPad ล็อกการหมุนจอจริงไม่ได้ (Safari ไม่รองรับ) เลยใช้วิธีมาตรฐาน:
// พอเครื่องหมุนเป็นแนวนอน จะขึ้นหน้าจอขาวเหลืองบังทั้งหน้า บอกให้หมุนกลับเป็นแนวตั้ง
// - เช็กทิศทางจาก "ตัวเครื่อง" (screen.orientation) ไม่ใช่สัดส่วนหน้าต่าง กันคีย์บอร์ดเด้งแล้วจอเตี้ยลงจนเข้าใจผิดว่าแนวนอน
// - ทำงานเฉพาะเครื่องจอสัมผัส (pointer: coarse) คอมพิวเตอร์ไม่โดนผล
// - Android ที่ติดตั้งเป็นแอปจะลองล็อกแนวตั้งจริงด้วย screen.orientation.lock (ถ้าไม่รองรับก็เงียบไป)
(function () {
  var page = (location.pathname.split('/').pop() || '').toLowerCase();
  if (page.indexOf('admin') === 0) return; // หน้า Admin หมุนแนวนอนได้ตามปกติ

  var isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!isTouch) return;

  function isLandscape() {
    if (screen.orientation && typeof screen.orientation.type === 'string') {
      return screen.orientation.type.indexOf('landscape') === 0;
    }
    if (typeof window.orientation === 'number') { // Safari รุ่นเก่า
      return Math.abs(window.orientation) === 90;
    }
    return window.innerWidth > window.innerHeight;
  }

  var style = document.createElement('style');
  style.textContent =
    '#blm48-rotate-lock{position:fixed;inset:0;z-index:2147483647;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;' +
    'background:linear-gradient(160deg,#fff9db 0%,#ffec99 60%,#ffe066 100%);color:#222;text-align:center;padding:24px;' +
    "font-family:'Quicksand','Kanit',sans-serif;}" +
    '#blm48-rotate-lock.show{display:flex;}' +
    '#blm48-rotate-lock .rl-icon{width:84px;height:84px;animation:blm48RotateHint 2.2s ease-in-out infinite;}' +
    '#blm48-rotate-lock .rl-title{font-size:20px;font-weight:700;}' +
    '#blm48-rotate-lock .rl-sub{font-size:14px;color:#6b5a1e;}' +
    'html.blm48-rotate-locked,html.blm48-rotate-locked body{overflow:hidden!important;}' +
    '@keyframes blm48RotateHint{0%,20%{transform:rotate(-90deg);}55%,100%{transform:rotate(0deg);}}';
  (document.head || document.documentElement).appendChild(style);

  var overlay = null;
  function ensureOverlay() {
    if (overlay || !document.body) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'blm48-rotate-lock';
    overlay.setAttribute('role', 'alert');
    overlay.innerHTML =
      '<svg class="rl-icon" viewBox="0 0 64 64" fill="none" stroke="#222" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="20" y="6" width="24" height="52" rx="5" fill="#fff"/><line x1="29" y1="51" x2="35" y2="51"/></svg>' +
      '<div class="rl-title">กรุณาหมุนหน้าจอเป็นแนวตั้ง</div>' +
      '<div class="rl-sub">BLM48 Membership ใช้งานได้เฉพาะแนวตั้งเท่านั้นค่ะ</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function update() {
    var landscape = isLandscape();
    var el = ensureOverlay();
    if (el) el.classList.toggle('show', landscape);
    document.documentElement.classList.toggle('blm48-rotate-locked', landscape);
  }

  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(function () {});
    }
  } catch (e) {}

  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', update);
  }
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }
})();
