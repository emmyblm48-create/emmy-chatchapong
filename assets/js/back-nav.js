// =========================================================================
// 🔙 BLM48 — ระบบปุ่มย้อนกลับกลางของทุกหน้า (โหลดใน <head> ทุกหน้า ก่อนสคริปต์อื่น)
//
// ปัญหาเดิม: ปุ่ม Back บางหน้าเป็นลิงก์ตรง (href="index") หรือใช้ location.href ไปหน้าก่อน
// ซึ่ง "เพิ่ม" ประวัติหน้าใหม่แทนการย้อน → ปัดย้อนกลับ/กด Back ของเครื่องแล้ววนหน้าเดิมไปมา
// (A → B → A → B ...) และบางครั้งย้อนแล้วเจอหน้าเดิมซ้ำ (เข้าหน้าเดียวกันซ้อนกันสองชั้น)
//
// วิธีแก้: จดลำดับหน้าที่เปิดในแท็บนี้ (sessionStorage) พร้อมประทับเลขตำแหน่งลงใน history.state
// ของแต่ละหน้า ปุ่ม Back จะ "ถอยในประวัติจริง" เสมอ ข้ามหน้าที่ซ้ำกับหน้าปัจจุบัน และถ้าไม่มีหน้า
// ก่อนหน้าในแอปเลย จะใช้ location.replace ไปหน้าสำรอง (ไม่สร้างประวัติใหม่ จึงไม่เกิดวงวน)
//
//   blm48Back(fallback, opts)  ย้อนไปหน้าก่อนหน้าจริง (ข้ามหน้าซ้ำ) ไม่มีก็ replace ไป fallback
//   blm48BackTo(url, opts)     ย้อนกลับไปหน้า url ถ้าอยู่ในประวัติ ไม่อยู่ก็ replace ไป url
//   blm48Replace(url)          location.replace ที่บอกระบบด้วยว่าหน้านี้ถูกแทนที่ (ใช้แทน location.replace ทุกที่)
//   opts.refresh = true        หน้าที่ย้อนไปถึงจะโหลดใหม่ถ้าถูกคืนจาก cache (เช่น ยอดเงินเปลี่ยนแล้ว)
//
// <a> ที่เป็นปุ่มย้อนกลับ (class nav-back-btn / back-btn / back-circle-btn / nav-back ...) ที่มี href
// จะถูกดักให้ทำงานแบบ blm48BackTo(href) อัตโนมัติ — ไม่ต้องแก้ทีละหน้า
// =========================================================================
(function () {
  if (window.blm48Back) return;

  var STACK_KEY = 'blm48_nav_stack';
  var IDX_KEY = 'blm48_nav_idx';
  var REPLACE_KEY = 'blm48_nav_replace';
  var REFRESH_KEY = 'blm48_nav_refresh';
  // หน้าที่ไม่ควรย้อนกลับไปหา (เจอแล้วให้ใช้หน้าสำรองแทน)
  var SKIP_PAGES = ['login'];
  var BACK_SELECTOR = '.nav-back-btn, .back-btn, .back-circle-btn, .nav-back, .nav-back-transparent, .top-bar-back-btn, .shop-nav-back, .pd-back-icon';

  function getItem(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function setItem(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function removeItem(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

  function readStack() {
    try { var s = JSON.parse(getItem(STACK_KEY)); return Array.isArray(s) ? s : []; } catch (e) { return []; }
  }

  // ชื่อหน้า+query แบบเดียวกันเสมอ (ไม่สน .html / / ท้าย เพราะ Vercel cleanUrls)
  function pageKey(url) {
    try {
      var u = new URL(url, location.href);
      var page = u.pathname.replace(/\/+$/, '').replace(/\.html$/, '').split('/').pop() || 'index';
      return page + u.search;
    } catch (e) { return String(url); }
  }
  function pageName(k) { return String(k).split('?')[0]; }

  function stateIdx() {
    var st = history.state;
    return (st && typeof st === 'object' && typeof st.blm48Idx === 'number') ? st.blm48Idx : null;
  }
  function stamp(idx) {
    try {
      var st = history.state;
      var obj = (st && typeof st === 'object') ? Object.assign({}, st) : {};
      obj.blm48Idx = idx;
      history.replaceState(obj, '');
    } catch (e) {}
  }

  // จดหน้าปัจจุบันลงลำดับประวัติ — เรียกตอนโหลดหน้า และตอนหน้าถูกคืนจาก back-forward cache
  function record() {
    var cur = pageKey(location.href);
    var stack = readStack();
    var idx = stateIdx();
    var isNew = idx === null;

    if (isNew) {
      var last = parseInt(getItem(IDX_KEY), 10);
      if (isNaN(last)) last = -1;
      var rep = null;
      try { rep = JSON.parse(getItem(REPLACE_KEY)); } catch (e) {}
      removeItem(REPLACE_KEY);
      var replaced = rep && typeof rep.t === 'number' && Date.now() - rep.t < 15000;
      idx = replaced ? Math.max(last, 0) : last + 1;
    }
    // กันเลขเพี้ยน (เช่น แท็บใหม่ที่ก๊อป sessionStorage มาจากแท็บเดิม) — ตำแหน่งต้องไม่เกินประวัติจริง
    if (idx > history.length - 1) idx = Math.max(history.length - 1, 0);
    if (isNew || stateIdx() !== idx) stamp(idx);

    if (isNew) stack = stack.slice(0, idx); // หน้าใหม่ = ประวัติที่เคย "ไปข้างหน้า" ถูกเบราว์เซอร์ทิ้งแล้ว
    while (stack.length < idx) stack.push(null); // ช่องที่ไม่รู้ว่าเป็นหน้าอะไร (เช่น เว็บข้างนอก)
    stack[idx] = cur;
    setItem(STACK_KEY, JSON.stringify(stack));
    setItem(IDX_KEY, String(idx));
  }

  function currentIdx() {
    var idx = stateIdx();
    if (idx !== null) return idx;
    var last = parseInt(getItem(IDX_KEY), 10);
    return isNaN(last) ? 0 : last;
  }

  function goToIdx(target, opts) {
    var n = currentIdx() - target;
    if (opts && opts.refresh) setItem(REFRESH_KEY, '1');
    if (n === 1) history.back(); else history.go(-n);
  }

  function replaceTo(url, opts) {
    if (opts && opts.refresh) removeItem(REFRESH_KEY); // replace = โหลดหน้าใหม่อยู่แล้ว
    setItem(REPLACE_KEY, JSON.stringify({ t: Date.now() }));
    location.replace(url);
  }

  window.blm48Replace = function (url) { replaceTo(url); };

  window.blm48Back = function (fallback, opts) {
    var stack = readStack();
    var idx = currentIdx();
    var cur = pageKey(location.href);
    for (var i = idx - 1; i >= 0; i--) {
      var k = stack[i];
      if (!k) break;                                   // ไม่รู้ว่าก่อนหน้าคือหน้าอะไร → ใช้หน้าสำรอง
      if (k === cur) continue;                         // หน้าเดียวกันซ้อนอยู่ → ข้ามไป ไม่ให้ย้อนแล้วเจอหน้าเดิม
      if (SKIP_PAGES.indexOf(pageName(k)) !== -1) break;
      goToIdx(i, opts);
      return;
    }
    replaceTo(fallback || 'index', opts);
  };

  window.blm48BackTo = function (url, opts) {
    var target = pageKey(url);
    var stack = readStack();
    var idx = currentIdx();
    for (var i = idx - 1; i >= 0; i--) {
      if (!stack[i]) break;
      if (stack[i] === target) { goToIdx(i, opts); return; }
    }
    replaceTo(url, opts);
  };

  record();

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) record();
    var needRefresh = getItem(REFRESH_KEY) === '1';
    removeItem(REFRESH_KEY);
    if (needRefresh && e.persisted) location.reload();
  });

  // ปุ่มย้อนกลับที่เป็นลิงก์ตรง (<a href="index" class="nav-back-btn">) → ย้อนในประวัติแทนการเปิดหน้าใหม่
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || !a.matches(BACK_SELECTOR)) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^javascript:/i.test(href)) return;
    if (a.target && a.target !== '_self') return;
    e.preventDefault();
    window.blm48BackTo(href);
  }, true);
})();
