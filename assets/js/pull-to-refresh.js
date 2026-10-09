// =========================================================================
// 🔄 [ลากจอลงเพื่อรีเฟรช] Pull-to-refresh ทุกหน้า
// ลากจอลงตอนอยู่บนสุดของหน้า → วงกลมหมุนเลื่อนลงมาจากด้านบน → ปล่อยเมื่อเลยระยะ = รีโหลดหน้า
// โหลดอัตโนมัติจาก common.js; หน้าที่ไม่ได้ใช้ common.js (login / ticket / chamgift) ใส่ <script> ตรงๆ
// ไม่ทำงานเมื่อ: กำลังเปิด popup (SweetAlert / modal ที่เป็น position:fixed), กำลังพิมพ์อยู่,
// ใช้สองนิ้ว, หรือกล่องที่เลื่อนได้ข้างใน (เช่นรายการคอมเมนต์) ยังไม่ได้เลื่อนขึ้นถึงบนสุด
// =========================================================================
(function initPullToRefresh() {
  if (window.__blmPullToRefresh) return; // กันโหลดซ้ำ
  window.__blmPullToRefresh = true;

  const THRESHOLD_PX = 70;   // ระยะ (หลังหน่วง) ที่ต้องลากถึงถึงจะรีเฟรช
  const MAX_PULL_PX = 110;   // วงกลมเลื่อนลงได้ไกลสุดเท่านี้
  const RESISTANCE = 0.5;    // หน่วงให้ลากหนืดๆ เหมือน iOS/Android
  const START_OFFSET = -48;  // ตำแหน่งวงกลมตอนซ่อน (อยู่เหนือขอบจอ)

  // กัน native pull-to-refresh ของ Chrome Android ซ้อนกับของเรา (จะได้ไม่รีเฟรชสองรอบ)
  const st = document.createElement('style');
  st.textContent =
    'html, body { overscroll-behavior-y: contain; }' +
    '#blm-ptr { position: fixed; left: 50%; top: 0; width: 40px; height: 40px; margin-left: -20px;' +
    ' border-radius: 50%; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.15);' +
    ' display: flex; align-items: center; justify-content: center; z-index: 2147483000;' +
    ' pointer-events: none; opacity: 0; transform: translateY(' + START_OFFSET + 'px); will-change: transform, opacity; }' +
    '#blm-ptr.ptr-anim { transition: transform .25s ease, opacity .25s ease; }' +
    '#blm-ptr svg { width: 22px; height: 22px; }' +
    '#blm-ptr.ptr-loading svg { animation: blm-ptr-spin .7s linear infinite; }' +
    '@keyframes blm-ptr-spin { to { transform: rotate(360deg); } }';
  (document.head || document.documentElement).appendChild(st);

  let indicator = null;
  let icon = null;
  function ensureIndicator() {
    if (indicator) return indicator;
    indicator = document.createElement('div');
    indicator.id = 'blm-ptr';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="#ff8fab" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>';
    document.body.appendChild(indicator);
    icon = indicator.querySelector('svg');
    return indicator;
  }

  function isPopupOpen() {
    const b = document.body;
    if (!b) return true;
    if (b.classList.contains('swal2-shown')) return true;
    return false;
  }

  // ไล่จาก element ที่แตะขึ้นไป: ถ้าเจอกล่องเลื่อนได้ที่ยังไม่อยู่บนสุด หรืออยู่ใน popup/แผ่นที่ fixed → ไม่ให้รีเฟรช
  function blockedByAncestor(el) {
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (node.nodeType !== 1) continue;
      if (node.scrollTop > 0) return true;
      const cs = getComputedStyle(node);
      if (cs.position === 'fixed') {
        // เมนู/แถบที่ fixed ด้านบน-ล่างสูงไม่เกินครึ่งจอให้ผ่าน (เช่น header) ส่วน modal/overlay ใหญ่ไม่ให้ผ่าน
        if (node.getBoundingClientRect().height > window.innerHeight * 0.5) return true;
      }
    }
    return false;
  }

  function pageScrollTop() {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  let startY = 0;
  let startX = 0;
  let pulling = false;   // นิ้วแตะในสภาพที่อาจจะรีเฟรชได้
  let engaged = false;   // ยืนยันแล้วว่ากำลังลากลง (แนวตั้ง)
  let distance = 0;
  let refreshing = false;

  function setPull(d) {
    ensureIndicator();
    const y = START_OFFSET + Math.min(d, MAX_PULL_PX) + 12;
    indicator.style.opacity = String(Math.min(1, d / THRESHOLD_PX));
    indicator.style.transform = 'translateY(' + y + 'px)';
    icon.style.transform = 'rotate(' + (d / THRESHOLD_PX) * 270 + 'deg)';
    icon.style.opacity = d >= THRESHOLD_PX ? '1' : '0.55';
  }

  function reset() {
    if (!indicator) return;
    indicator.classList.add('ptr-anim');
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(' + START_OFFSET + 'px)';
    setTimeout(function () { if (indicator) indicator.classList.remove('ptr-anim'); }, 260);
  }

  document.addEventListener('touchstart', function (e) {
    pulling = false; engaged = false; distance = 0;
    if (refreshing || !e.touches || e.touches.length !== 1) return;
    if (pageScrollTop() > 0 || isPopupOpen()) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    if (blockedByAncestor(e.target)) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    pulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!pulling) return;
    if (!e.touches || e.touches.length !== 1) { pulling = false; if (engaged) reset(); return; }
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;
    if (!engaged) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      // ปัดขึ้น หรือปัดแนวนอน (เช่นแถวการ์ดเลื่อนข้าง / ปัดย้อนกลับ) = ไม่ใช่การดึงรีเฟรช
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || pageScrollTop() > 0) { pulling = false; return; }
      engaged = true;
      ensureIndicator().classList.remove('ptr-anim');
    }
    distance = Math.max(0, dy * RESISTANCE);
    if (e.cancelable) e.preventDefault(); // กันจอเด้ง (rubber-band) ของ iOS ระหว่างลาก
    setPull(distance);
  }, { passive: false });

  function finish() {
    if (!pulling) return;
    pulling = false;
    if (!engaged) return;
    engaged = false;
    if (distance >= THRESHOLD_PX) {
      refreshing = true;
      indicator.classList.add('ptr-anim', 'ptr-loading');
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(' + (START_OFFSET + THRESHOLD_PX + 12) + 'px)';
      icon.style.transform = '';
      icon.style.opacity = '1';
      setTimeout(function () { location.reload(); }, 250);
    } else {
      reset();
    }
  }
  document.addEventListener('touchend', finish, { passive: true });
  document.addEventListener('touchcancel', finish, { passive: true });
})();
