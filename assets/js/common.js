// =========================================================================
// BLM48 Membership — Shared utilities used across every page.
// Loaded via <script src="assets/js/common.js"></script>.
// Function names match what each page already called, so no call sites
// need to change — only the duplicated function bodies are removed per page.
// =========================================================================

// ปิดการซูม/ขยายหน้าเว็บทุกหน้า (pinch-zoom, double-tap zoom, ctrl+scroll zoom)
(function preventPageZoom() {
  document.addEventListener('touchmove', function(e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = Date.now();
    // กันซูมด้วยการแตะสองครั้ง - แต่ไม่ยกเลิกการแตะปุ่ม/ลิงก์/ช่องพิมพ์ (เดิมแตะหัวใจเร็วๆ ติดกันแล้วแตะหลังโดนกลืนหาย)
    // ปุ่มพวกนี้กันซูมด้วย touch-action: manipulation แทน (ดูสไตล์ด้านล่าง)
    const onControl = e.target && e.target.closest && e.target.closest('button, a, input, textarea, select, [onclick]');
    if (now - lastTouchEnd <= 300 && !onControl) e.preventDefault();
    lastTouchEnd = now;
  }, false);
  (function () {
    const st = document.createElement('style');
    st.textContent = 'button, a, input, textarea, select, [onclick] { touch-action: manipulation; }';
    (document.head || document.documentElement).appendChild(st);
  })();
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });
  document.addEventListener('dblclick', function(e) { e.preventDefault(); }, { passive: false });
})();

// 🐛 [แก้บัค iOS] เมนูล่าง (.bottom-tab-bar) ลอยค้างกลางจอ: หลังคีย์บอร์ดหุบ (เช่นพิมพ์จำนวน Customize)
// iOS ไม่คืนขนาด layout viewport ทำให้ fixed bottom:0 ไปยึดขอบล่างที่หดลงเท่าความสูงคีย์บอร์ด
// วัดช่องว่างระหว่างขอบล่างจอจริง (visualViewport) กับขอบล่าง layout แล้วเลื่อนเมนูลงไปเท่านั้น
// ปกติช่องว่าง = 0 จึงไม่มีผลอะไร / ตอนคีย์บอร์ดเปิดอยู่ (ช่องว่างติดลบ) ปล่อยเมนูไว้ที่เดิม
(function fixBottomTabBarAfterKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  let frame = 0;
  function apply() {
    frame = 0;
    const bar = document.querySelector('.bottom-tab-bar');
    if (!bar) return;
    const gap = Math.round(vv.offsetTop + vv.height - window.innerHeight);
    bar.style.bottom = gap > 1 ? (-gap) + 'px' : '';
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(apply); }
  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  document.addEventListener('focusout', () => setTimeout(schedule, 300)); // รอคีย์บอร์ดหุบเสร็จ
  document.addEventListener('DOMContentLoaded', schedule);

  // iOS บางรุ่นไม่ส่งตัวเลขที่ผิดมาให้วัด (gap = 0) แต่ layout viewport ยังค้างเลื่อนขึ้นไปหลังคีย์บอร์ดหุบ:
  // เมนูล่างลอยค้างกลางจอและแถบ Discover ด้านบนหายไป จนกว่าจะเลื่อนขึ้นไปบนสุด
  // สะกิดตำแหน่ง scroll 1px แล้วกลับที่เดิม ให้ Safari คำนวณ viewport ใหม่ (ผู้ใช้มองไม่เห็นการขยับ)
  function resyncViewport() {
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return; // คีย์บอร์ดยังเปิดอยู่
    const x = window.scrollX, y = window.scrollY;
    window.scrollTo(x, y + 1);
    window.scrollTo(x, y);
    schedule();
  }
  // ทำเฉพาะหลังคีย์บอร์ดเพิ่งหุบ (ไม่ทำระหว่างเลื่อนจอปกติ เพราะ scrollTo จะหยุดการเลื่อนแบบมีแรงเหวี่ยงของ iOS)
  let fullHeight = vv.height, keyboardOpen = false;
  document.addEventListener('focusout', (e) => {
    if (!e.target || !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; // เฉพาะช่องพิมพ์ที่เปิดคีย์บอร์ด
    setTimeout(resyncViewport, 350);
    setTimeout(resyncViewport, 800);
  });
  vv.addEventListener('resize', () => {
    if (vv.height < fullHeight - 150) keyboardOpen = true;
    else if (keyboardOpen && vv.height > fullHeight - 50) { keyboardOpen = false; setTimeout(resyncViewport, 100); }
    if (!keyboardOpen) fullHeight = Math.max(fullHeight, vv.height);
  });
})();

// 👈 [ปัดย้อนกลับ] หน้าที่ไม่มี bottom-tab-bar (เมนูหลักด้านล่าง) ปัดจากขอบซ้ายสุดของจอไปทางขวาเพื่อ
// ย้อนกลับไปหน้าก่อนหน้าได้ เหมือน edge-swipe มาตรฐานของ iOS — เช็คจาก DOM ว่ามี .bottom-tab-bar
// อยู่จริงไหม (ไม่ใช่เช็คจากชื่อไฟล์) กันหลุดถ้าโครงสร้างหน้าเปลี่ยนในอนาคต ต้องรอ DOMContentLoaded
// ก่อนเช็ค เพราะ common.js โหลดใน <head> ตั้งแต่ก่อน body (รวมถึง .bottom-tab-bar) จะถูกสร้างขึ้น
document.addEventListener('DOMContentLoaded', function initSwipeBackGesture() {
  if (document.querySelector('.bottom-tab-bar')) return; // หน้านี้มีเมนูหลักด้านล่างอยู่แล้ว ไม่ต้องมีปัดย้อนกลับซ้อน

  const EDGE_ZONE_PX = 28;          // ต้องเริ่มปัดจากขอบซ้ายสุดของจอ (แบบเดียวกับ iOS edge-swipe)
  const MIN_DISTANCE_PX = 70;       // ระยะปัดขั้นต่ำถึงจะถือว่าตั้งใจปัดย้อนกลับจริงๆ ไม่ใช่กดพลาด
  const MAX_VERTICAL_DRIFT_PX = 60; // ปัดเฉียงขึ้น/ลงเกินนี้ถือว่าแค่กำลังเลื่อนจอ ไม่ใช่ปัดย้อนกลับ

  let startX = 0;
  let startY = 0;
  let tracking = false;

  document.addEventListener('touchstart', function(e) {
    if (!e.touches || e.touches.length !== 1) { tracking = false; return; }
    const touch = e.touches[0];
    tracking = touch.clientX <= EDGE_ZONE_PX;
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!tracking) return;
    tracking = false;
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX;
    const deltaY = Math.abs(touch.clientY - startY);
    if (deltaX >= MIN_DISTANCE_PX && deltaY <= MAX_VERTICAL_DRIFT_PX) {
      // ใช้ปุ่มย้อนกลับของหน้านั้นเอง (แต่ละหน้ามีปลายทางสำรองของตัวเอง) ไม่มีปุ่มก็ใช้ระบบย้อนกลับกลาง (back-nav.js)
      const backBtn = document.querySelector('.nav-back-btn, .back-btn, .back-circle-btn, .nav-back, .nav-back-transparent, .top-bar-back-btn, .shop-nav-back, .pd-back-icon, .back-icon');
      if (backBtn) backBtn.click();
      else if (window.blm48Back) window.blm48Back('index');
      else window.history.back();
    }
  }, { passive: true });
});

// 🛡️ กันกดรูปค้าง (long-press) แล้วเซฟรูป / คลิกขวา Save Image As ทุกหน้า ยกเว้นหน้า inventory และ admin
// (หน้า inventory ต้องการให้ผู้ใช้เซฟรูปไอเทมที่ซื้อไว้ได้ตามปกติ, หน้า admin ต้องการให้แอดมินเซฟรูปสลิปโอนเงินได้)
// ใช้ delegated event ที่ document แทนการเซ็ต attribute ทีละรูป เพื่อให้ครอบคลุมรูปที่ยังไม่ถูกสร้าง
// ตอนนี้ด้วย (โพสต์/แกลเลอรีที่โหลดทีหลังผ่าน JS) โดยไม่ต้องใช้ MutationObserver
(function preventImageSaving() {
  const currentPage = window.location.pathname.replace(/\/+$/, '').split('/').pop() || '';
  const excludedPages = ['inventory', 'inventory.html', 'admin', 'admin.html'];
  if (excludedPages.includes(currentPage)) return;

  // คลิกขวา (เดสก์ท็อป) / long-press ที่ยิง contextmenu (บางเบราว์เซอร์บนมือถือ) บนรูปภาพ
  document.addEventListener('contextmenu', function(e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });

  // ลากรูปออกไปวางที่อื่นเพื่อเซฟ (เดสก์ท็อป)
  document.addEventListener('dragstart', function(e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });

  // -webkit-touch-callout ปิดเมนู "บันทึกรูปภาพ" ตอนกดค้างบน iOS Safari โดยเฉพาะ (เบราว์เซอร์อื่นไม่รองรับ
  // property นี้ก็ไม่เป็นไร ยังมี contextmenu preventDefault ด้านบนช่วยกันซ้ำอีกชั้น)
  // pointer-events: none คือตัวที่กันเมนู "ดาวน์โหลดรูปภาพ" ของ Android Chrome ตอนกดค้างได้จริง (Android ไม่สนใจ
  // -webkit-touch-callout และบางรุ่นก็ไม่ยิง contextmenu event ให้ preventDefault ทัน) - ทำให้รูปไม่รับอีเวนต์การกด
  // เลยแทน ยกเว้นรูปที่มี onclick ของตัวเอง (เช่น รูปโพสต์ที่กดเพื่อเปิดดูเต็มจอ) และรูปโปรไฟล์ที่กดเปิดโปรไฟล์ได้
  // (data-fan / data-member เช่น รูปคนคอมเมนต์) ที่ยังต้องคลิกได้ปกติ
  const style = document.createElement('style');
  style.textContent = `
    img {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    img:not([onclick]):not([data-fan]):not([data-member]) {
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
})();

// 🪙 ไอคอนเหรียญ Token / GE Token ของวง (รูป token.png / getoken.png แทน fa-coins / fa-gem ทุกหน้า)
(function loadTokenIcons() {
  if (document.querySelector('link[href*="token-icons.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'assets/css/token-icons.css';
  document.head.appendChild(link);
})();

// ✏️ ไอคอนเส้นบางโปร่งทั้งแอป (Font Awesome -> Phosphor Light) — รายละเอียดใน assets/css/thin-icons.css
(function loadThinIcons() {
  if (document.querySelector('link[href*="thin-icons.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'assets/css/thin-icons.css';
  document.head.appendChild(link);
})();

// 🔄 ลากจอลงเพื่อรีเฟรชหน้า (ทุกหน้า) — ตัวโค้ดอยู่ใน assets/js/pull-to-refresh.js
(function loadPullToRefresh() {
  if (document.querySelector('script[src*="pull-to-refresh.js"]')) return;
  const s = document.createElement('script');
  s.src = 'assets/js/pull-to-refresh.js';
  document.head.appendChild(s);
})();

// 📱 [เปิดโพสต์เต็มจอ] กดที่พื้นที่ว่างของการ์ดโพสต์ (index.html/member.html) เพื่อไปหน้า postdetail
// แบบเต็มจอโพสต์เดียว กดย้อนกลับได้ - ไม่ทำงานถ้าคลิกโดนปุ่ม/ลิงก์/รูป/ช่องคอมเมนต์ที่มี action ของตัวเองอยู่แล้ว
// (เช็คจาก tagName ของปุ่ม/ลิงก์/อินพุตมาตรฐาน บวกกับ attribute onclick ที่ผูกไว้ตรงๆ เช่นรูปโปรไฟล์/ชื่อผู้โพส)
// ข้ามหน้า postdetail เองไปเลย กันกดซ้ำแล้ว reload หน้าเดิมทิ้งเปล่าๆ
(function initPostCardFullViewNavigation() {
  const currentPage = window.location.pathname.replace(/\/+$/, '').split('/').pop() || '';
  if (currentPage === 'postdetail' || currentPage === 'postdetail.html') return;

  document.addEventListener('click', function(e) {
    const card = e.target.closest('.post-card');
    if (!card) return;

    const interactiveEl = e.target.closest(
      'a, button, input, textarea, img, svg, [onclick], [id^="comment-section-"]'
    );
    if (interactiveEl && card.contains(interactiveEl)) return;

    const postId = card.id ? card.id.replace(/^post-/, '') : '';
    if (!postId) return;
    window.location.href = `postdetail?id=${encodeURIComponent(postId)}`;
  });
})();

// อัปเดตตัวเลขคุกกี้สะสมของโพสต์บนจอทันที (real-time หลังกดใจ/คอมเมนต์/ตอบกลับ/กดใจคอมเมนต์)
function updatePostCookiesUI(postId, postCookies) {
  if (!postId || postCookies === undefined || postCookies === null) return;
  const el = document.getElementById(`post-cookies-count-${postId}`);
  if (el) el.innerText = blm48ShortCount(postCookies);
  blm48QueuePostGifts([postId]); // รูป 3 อันดับหน้าจำนวนคุกกี้นับจากใจ/คอมเมนต์/ของขวัญ เลยต้องดึงใหม่ทุกครั้งที่ยอดเปลี่ยน
}

// หา postId จากคอมเมนต์/reply (ใช้ตอนกดใจคอมเมนต์ ซึ่งมีแค่ commentId ไม่มี postId ส่งมาตรงๆ)
function findPostIdFromElement(el) {
  const postCard = el && el.closest ? el.closest('.post-card') : null;
  return postCard && postCard.id ? postCard.id.replace(/^post-/, '') : null;
}

// 🌸 อัปเดตโพสต์ที่อยู่บนจออยู่แล้วแบบ "เงียบ" (ใช้ตอน Realtime/refresh ดึงข้อมูลใหม่มา) - แก้เฉพาะจุดที่เปลี่ยนจริง
// เดิมเขียน commentList.innerHTML ทับทั้งลิสต์ทุกครั้งที่มีใครไลก์/คอมเมนต์ที่ไหนก็ตามในแอป ทำให้คอมเมนต์ที่กำลังดูอยู่
// กระพริบรีเซ็ต: ลูกศร reply ที่เปิดไว้ปิดเอง, กล่อง reply/ข้อความที่พิมพ์ค้างหาย, ช่องแก้ไขคอมเมนต์หาย, เลื่อนลิสต์กลับ,
// และหัวใจที่เพิ่งกด (optimistic) โดนทับกลับก่อน server ตอบ ตอนนี้แทรก/ลบ/อัปเดตเฉพาะคอมเมนต์ที่ต่างจากเดิมเท่านั้น
function patchPostLive(post) {
  if (!post || !post.id) return;
  const id = post.id;

  const likeCountEl = document.getElementById(`like-count-${id}`);
  const heartIcon = document.getElementById(`heart-${id}`);
  const heartBusy = !!(heartIcon && heartIcon.dataset.loading === 'true'); // กำลังรอ server ตอบหลังกดใจ - อย่าทับค่า optimistic
  if (!heartBusy) {
    if (likeCountEl) likeCountEl.innerText = post.likes || 0;
    if (heartIcon) heartIcon.className = post.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  }

  const cookieCountEl = document.getElementById(`post-cookies-count-${id}`);
  if (cookieCountEl) cookieCountEl.innerText = blm48ShortCount(post.cookies || 0);

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const commentCountEl = document.getElementById(`comment-count-${id}`);
  if (commentCountEl) commentCountEl.innerText = comments.length;

  reconcileComments(id, comments);
}

// คอมเมนต์ id นี้แสดงอยู่บนจอแล้วหรือยัง (ใช้กันแทรกซ้ำตอนส่งคอมเมนต์/ตอบกลับ ที่ Realtime อาจวาดให้ไปก่อน)
function commentAlreadyOnScreen(commentId) {
  if (!commentId) return false;
  return !!document.querySelector(`.comment-item[data-comment-id="${CSS.escape(String(commentId))}"]`);
}

function reconcileComments(postId, comments) {
  const listEl = document.getElementById(`comment-list-${postId}`);
  if (!listEl) return;

  // จัดกลุ่มเหมือน buildCommentsHtml: reply ทุกอันผูกกับคอมเมนต์แม่บนสุดเสมอ
  const byId = {};
  comments.forEach(c => { if (c.commentId) byId[c.commentId] = c; });
  const topLevel = [];
  const repliesByParent = {};
  comments.forEach(c => {
    if (!c.parentCommentId || !byId[c.parentCommentId]) {
      topLevel.push(c);
    } else {
      let topId = c.parentCommentId;
      let hops = 0;
      while (byId[topId] && byId[topId].parentCommentId && byId[byId[topId].parentCommentId] && hops < 5) {
        topId = byId[topId].parentCommentId;
        hops++;
      }
      (repliesByParent[topId] = repliesByParent[topId] || []).push(c);
    }
  });

  comments.forEach(blm48RegisterCommenter);
  const findItem = (root, cid) => root.querySelector(`.comment-item[data-comment-id="${CSS.escape(cid)}"]`);

  // อัปเดตคอมเมนต์/reply ที่มีอยู่แล้วบนจอ: ยอดไลก์ + หัวใจ + ข้อความ (ถ้าไม่ได้กำลังแก้ไขอยู่)
  const patchItem = (cmt) => {
    const cid = cmt.commentId;
    const heart = document.getElementById(`cmt-heart-${cid}`);
    const likeSpan = document.getElementById(`cmt-like-count-${cid}`);
    if (heart && likeSpan && heart.dataset.loading !== 'true') {
      blm48SetCmtLikeCount(likeSpan, cmt.likes || 0);
      heart.classList.toggle('fa-solid', !!cmt.isLiked);
      heart.classList.toggle('fa-regular', !cmt.isLiked);
    }
    const textEl = document.getElementById(`cmt-text-${cid}`);
    if (textEl && textEl.dataset.editing !== 'true') {
      const html = blm48FormatCommentText(cmt.text || '');
      if (textEl.innerHTML !== html) textEl.innerHTML = html;
    }
    window.__commentTextCache = window.__commentTextCache || {};
    if (!(textEl && textEl.dataset.editing === 'true')) window.__commentTextCache[cid] = cmt.text || '';
  };

  // ฟีด (data-preview): โชว์แค่คอมเมนต์ยอดนิยม 2 อันดับ — วาดใหม่เมื่ออันดับเปลี่ยน ไม่งั้นแค่อัปเดตยอดไลก์/ข้อความ
  if (listEl.dataset.preview === '1') {
    const top = blm48TopComments(topLevel, 2);
    const onScreen = Array.from(listEl.querySelectorAll(':scope > .comment-item.cmt-top')).map(el => el.dataset.commentId);
    const busy = blm48IsReplying(postId) || !!listEl.querySelector('[data-editing="true"]');
    const same = onScreen.length === top.length && top.every((c, i) => String(c.commentId) === onScreen[i]);
    if (same || busy) {
      top.forEach(patchItem);
    } else {
      listEl.innerHTML = top.map(c => blm48CommentHtml(c, postId, false, [], { canReply: true })).join('');
    }
    return;
  }

  if (topLevel.length === 0) {
    if (!listEl.querySelector('.no-comment-placeholder')) listEl.innerHTML = buildCommentsHtml([], postId);
    return;
  }
  // หน้าโพสต์เต็ม: เรียงตามโหมดที่เลือก (Top / Newest) — ใส่ data-sort ไว้ที่ลิสต์
  const sortMode = listEl.dataset.sort;
  if (sortMode) topLevel.splice(0, topLevel.length, ...blm48SortComments(topLevel, sortMode));
  const placeholder = listEl.querySelector('.no-comment-placeholder');
  if (placeholder) placeholder.remove();

  // คอมเมนต์ที่หายไปจาก server แล้ว (โดนลบ) ค่อยเอาออกจากจอ
  const liveIds = new Set(comments.map(c => c.commentId).filter(Boolean));
  listEl.querySelectorAll('.comment-item[data-comment-id]').forEach(el => {
    if (!liveIds.has(el.dataset.commentId)) el.remove();
  });

  // ซ่อมคอมเมนต์ซ้ำ (id เดียวกันขึ้นจอ 2 อัน จากจังหวะส่งคอมเมนต์ชนกับ Realtime) - เก็บอันแรกไว้ ลบที่เหลือ
  // ถ้าปล่อยไว้ กดหัวใจที่อันที่ 2 แล้วระบบไปอัปเดตอันแรกแทน หัวใจที่กดเลยเหมือนไม่ติด
  const seenIds = new Set();
  listEl.querySelectorAll('.comment-item[data-comment-id]').forEach(el => {
    const cid = el.dataset.commentId;
    if (!cid || !el.isConnected) return;
    if (seenIds.has(cid)) el.remove(); else seenIds.add(cid);
  });

  let prevEl = null;
  topLevel.forEach(cmt => {
    const replies = repliesByParent[cmt.commentId] || [];
    let el = cmt.commentId ? findItem(listEl, cmt.commentId) : null;

    if (el) {
      patchItem(cmt);
      const repliesEl = document.getElementById(`replies-${cmt.commentId}`);
      if (repliesEl) {
        let prevReply = null;
        replies.forEach(r => {
          let rEl = r.commentId ? findItem(repliesEl, r.commentId) : null;
          if (rEl) {
            patchItem(r);
          } else {
            const html = buildSingleCommentHtml(r, postId, true);
            if (prevReply) prevReply.insertAdjacentHTML('afterend', html);
            else repliesEl.insertAdjacentHTML('afterbegin', html);
            rEl = r.commentId ? findItem(repliesEl, r.commentId) : null;
          }
          if (rEl) prevReply = rEl;
        });
        blm48UpdateRepliesToggle(cmt.commentId);
      }
    } else {
      const html = buildSingleCommentHtml(cmt, postId, false, replies);
      if (prevEl) prevEl.insertAdjacentHTML('afterend', html);
      else listEl.insertAdjacentHTML('afterbegin', html);
      el = cmt.commentId ? findItem(listEl, cmt.commentId) : null;
    }
    if (el) prevEl = el;
  });

  // จัดลำดับคอมเมนต์ที่อยู่บนจอแล้วให้ตรงโหมดเรียง (ไม่ทำตอนกำลังตอบกลับ/แก้ไข กันช่องที่พิมพ์อยู่กระโดด)
  if (sortMode && !blm48IsReplying(postId) && !listEl.querySelector('[data-editing="true"]')) {
    topLevel.forEach(c => {
      const item = c.commentId ? findItem(listEl, c.commentId) : null;
      if (item) listEl.appendChild(item);
    });
  }
}

// แชร์โพสต์เป็นลิงก์ (เปิด native share sheet ถ้ามี ไม่งั้น copy ลิงก์ไปคลิปบอร์ด)
async function actionSharePost(postId, targetPage) {
  if (!postId) return;
  const shareUrl = `${window.location.origin}/${targetPage || 'index'}?post=${encodeURIComponent(postId)}`;
  const shareData = { title: 'BLM48', text: 'มาดูโพสต์นี้ในแอป BLM48 กันเถอะ! 🌸', url: shareUrl };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // ผู้ใช้กดยกเลิกเอง ไม่ต้อง fallback
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    if (window.Swal) {
      Swal.fire({ icon: 'success', title: 'คัดลอกลิงก์แล้ว!', text: 'วางลิงก์เพื่อแชร์โพสต์นี้ได้เลยน้า', timer: 1800, showConfirmButton: false });
    }
  } catch (e) {
    if (window.Swal) {
      Swal.fire({
        icon: 'info',
        title: 'ลิงก์โพสต์นี้',
        html: `<input type="text" readonly value="${shareUrl}" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;box-sizing:border-box;" onclick="this.select()">`,
        confirmButtonText: 'ปิด'
      });
    }
  }
}

// เลื่อนจอไปหาโพสต์ที่แชร์มา (?post=POST_ID) พร้อมไฮไลต์สั้นๆ ให้เห็นชัด
function scrollToSharedPostFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (!postId) return;
    const el = document.getElementById(`post-${postId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const prevTransition = el.style.transition;
    const prevBoxShadow = el.style.boxShadow;
    el.style.transition = 'box-shadow 0.3s ease';
    el.style.boxShadow = '0 0 0 3px #ff85a2';
    setTimeout(() => {
      el.style.boxShadow = prevBoxShadow;
      setTimeout(() => { el.style.transition = prevTransition; }, 350);
    }, 2200);
  } catch (e) {}
}

// ใช้แสดงข้อความในหน้าเว็บ (ไม่ใช่ในอาร์กิวเมนต์ onclick)
function escapeHtml(text) {
  if (text === undefined || text === null || text === '') return '';
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ใช้สำหรับแทรกค่าลงในอาร์กิวเมนต์ onclick="fn('${...}')" อย่างปลอดภัย
// (กันทั้งเบรกออกจาก HTML attribute และเบรกออกจาก JS string)
function escapeAttr(text) {
  if (!text) return '';
  return text.toString()
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// =========================================================================
// 🖼️ แกลเลอรี่รูปในโพสต์ (ใช้ร่วมกัน index / member / fanpost / postdetail ผ่าน buildImagesHtml ของแต่ละหน้า)
// แบบแอป iAM48: มุมเหลี่ยม ช่องห่าง 4px
//   1 รูป = จัตุรัสเต็มความกว้าง | 2 รูป = คู่สี่เหลี่ยมจัตุรัส | 3 รูป = รูปใหญ่ซ้าย + 2 รูปซ้อนขวา | 4 รูป = 2x2 | มากกว่า 4 = 2x2 + "+N" ที่ช่องสุดท้าย
// =========================================================================
function buildPostImagesHtml(displayImage) {
  if (!displayImage) return '';
  const urls = String(displayImage).split(',').map(u => u.trim()).filter(Boolean);
  if (!urls.length) return '';

  const allJs = urls.map(u => `'${escapeAttr(u)}'`).join(',');
  // รูปวางแบบ absolute เต็มช่อง → ขนาดจริงของรูป (เช่นรูปแนวตั้งยาว ๆ) ไม่ดันช่อง/กริดให้ยืด ขนาดล็อกตามเลย์เอาต์เสมอ
  const imgTag = (i, extra) => `<img src="${escapeHtml(urls[i])}" onclick="openImageViewer(${i}, [${allJs}])" loading="lazy" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; border-radius: 0;${extra || ''}">`;
  const cell = (i, style, inner) => `<div style="position: relative; overflow: hidden; min-width: 0; min-height: 0; background: #f1f3f5; ${style || ''}">${inner || imgTag(i)}</div>`;

  if (urls.length === 1) {
    return `
      <div class="post-gallery-single" style="position: relative; overflow: hidden; margin-top: 10px; width: 100%; aspect-ratio: 1 / 1; background: #f1f3f5;">
        ${imgTag(0)}
      </div>
    `;
  }

  const grid = (cols, cells, extra) =>
    `<div class="post-photos post-photos-${Math.min(urls.length, 5)}" style="display: grid; grid-template-columns: ${cols}; gap: 4px; margin-top: 10px; ${extra || ''}">${cells}</div>`;

  if (urls.length === 2) {
    return grid('1fr 1fr', [0, 1].map(i => cell(i, 'aspect-ratio: 1 / 1;')).join(''));
  }

  if (urls.length === 3) {
    // รูปแรกใหญ่ทางซ้าย (กินสองแถว) อีก 2 รูปเป็นจัตุรัสซ้อนกันทางขวา
    return grid('2fr 1fr',
      cell(0, 'grid-row: 1 / span 2;') +
      cell(1, 'aspect-ratio: 1 / 1;') +
      cell(2, 'aspect-ratio: 1 / 1;'),
      'grid-template-rows: 1fr 1fr;');
  }

  // 4 รูปขึ้นไป: 2x2 ช่องสุดท้ายมีป้าย +N ถ้ามีรูปเกิน
  const extraCount = urls.length - 4;
  return grid('1fr 1fr', [0, 1, 2, 3].map(i => {
    const overlay = (i === 3 && extraCount > 0)
      ? `<div onclick="openImageViewer(3, [${allJs}])" style="position: absolute; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 2rem; font-weight: 500; cursor: pointer;">+${extraCount}</div>`
      : '';
    return cell(i, 'aspect-ratio: 1 / 1;', imgTag(i) + overlay);
  }).join(''));
}

// =========================================================================
// 🕒 เวลาของคอมเมนต์แบบ "7 minutes ago" / "Last week" / "2 months ago" (ใต้ฟองคอมเมนต์ทุกหน้า)
// =========================================================================
function commentTimeAgo(ts) {
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  if (!t || isNaN(t)) return '';
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 60) return 'Just now';
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const rtf = (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;
  for (const [unit, size] of units) {
    if (sec >= size) {
      const n = Math.floor(sec / size);
      if (!rtf) return `${n} ${unit}${n > 1 ? 's' : ''} ago`;
      const txt = rtf.format(-n, unit); // "last week", "2 months ago", "yesterday"
      return txt.charAt(0).toUpperCase() + txt.slice(1);
    }
  }
  return 'Just now';
}

// =========================================================================
// 💬 คอมเมนต์สไตล์ Instagram (index / member / fanpost / postdetail ใช้ร่วมกัน)
// ชื่อตัวหนา + เวลาสั้น "3h" / "84w" บรรทัดเดียว, ข้อความ, ปุ่ม Reply ใต้ข้อความ, หัวใจ + ยอดไลก์ชิดขวา
// reply ย่อเข้าไป + ปุ่ม "View N replies" / "Hide replies" มีเส้นนำหน้า
// กด Reply ที่คอมเมนต์ไหนก็ได้ (รวมถึง reply) -> ช่องพิมพ์หลักขึ้นแถบ "Replying to ชื่อ" + เติม @ชื่อ ให้
// ฝั่ง server (add_comment) ผูก reply ของ reply เข้ากับคอมเมนต์บนสุดเอง + แจ้งเตือนเจ้าของคอมเมนต์ที่ถูกตอบ
// =========================================================================
const BLM48_CMT_DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/d/1rebp2F8vyP0nyvsEOFD9Nw2mPcRtVqtG=s1000';
const BLM48_CMT_BADGE_ROLES = ['member', 'admin', 'ceo'];
const BLM48_CMT_BADGE = `<svg class="cmt-verified" viewBox="0 0 24 24"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;

// เวลาแบบสั้นของ IG: now / 5m / 3h / 2d / 6w / 1y
function commentTimeShort(ts) {
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  if (!t || isNaN(t)) return 'now';
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return 'now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h';
  if (sec < 604800) return Math.floor(sec / 86400) + 'd';
  if (sec < 31536000) return Math.floor(sec / 604800) + 'w';
  return Math.floor(sec / 31536000) + 'y';
}

// รายชื่อคนที่คอมเมนต์ (ชื่อที่แสดง/username -> username) ใช้ระบายสี @แท็ก เฉพาะชื่อที่มีอยู่จริง (ชื่อมั่วไม่ระบาย)
window.__cmtPeople = window.__cmtPeople || {};
function blm48RegisterCommenter(c) {
  if (!c || !c.username) return;
  if (c.name) window.__cmtPeople[String(c.name).trim().toLowerCase()] = { label: String(c.name).trim(), username: c.username };
  window.__cmtPeople[String(c.username).trim().toLowerCase()] = { label: String(c.username).trim(), username: c.username };
}

// escape ข้อความ + ระบายสี @ชื่อ (ชื่อมีเว้นวรรคได้ เทียบชื่อยาวสุดก่อน) กดแล้วเปิดโปรไฟล์คนนั้น
function blm48FormatCommentText(text) {
  const raw = String(text == null ? '' : text);
  if (raw.indexOf('@') === -1) return escapeHtml(raw);
  const keys = Object.keys(window.__cmtPeople).sort((a, b) => b.length - a.length);
  const lower = raw.toLowerCase();
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const at = raw.indexOf('@', i);
    if (at === -1) { out += escapeHtml(raw.slice(i)); break; }
    out += escapeHtml(raw.slice(i, at));
    let hit = null;
    for (const k of keys) {
      if (!k || lower.substr(at + 1, k.length) !== k) continue;
      const next = raw.charAt(at + 1 + k.length);
      if (next && /[A-Za-z0-9_.]/.test(next)) continue; // ต้องจบคำพอดี
      hit = k; break;
    }
    if (hit) {
      const p = window.__cmtPeople[hit];
      out += `<span class="cmt-mention"${profileLinkAttr(p.username)}>@${escapeHtml(raw.substr(at + 1, hit.length))}</span>`;
      i = at + 1 + hit.length;
    } else {
      out += '@';
      i = at + 1;
    }
  }
  return out;
}

// HTML ของคอมเมนต์ 1 อัน (top-level จะห่อ reply ของมันไว้ข้างในด้วย)
// opts.canReply = false -> ไม่มีปุ่ม Reply (เช่นบัญชีเมมเบอร์ในโพสต์แฟนคลับ)
function blm48CommentHtml(cmt, postId, isReply, replies, opts) {
  opts = opts || {};
  const canReply = opts.canReply !== false;
  const replyList = Array.isArray(replies) ? replies : [];
  blm48RegisterCommenter(cmt);
  replyList.forEach(blm48RegisterCommenter);

  const commentId = cmt.commentId || '';
  const cid = escapeAttr(commentId);
  const likes = cmt.likes || 0;
  const heartClass = cmt.isLiked ? 'fa-solid' : 'fa-regular';
  const role = cmt.role ? String(cmt.role).toLowerCase() : '';
  const badge = BLM48_CMT_BADGE_ROLES.includes(role) ? BLM48_CMT_BADGE : '';
  const img = cmt.profile_img || BLM48_CMT_DEFAULT_AVATAR;

  window.__commentTextCache = window.__commentTextCache || {};
  if (commentId) window.__commentTextCache[commentId] = cmt.text || '';
  const sessionUser = (typeof getUserSession === 'function') ? getUserSession() : null;
  const isOwn = !!(sessionUser && sessionUser.username && cmt.username && sessionUser.username === cmt.username);

  const row = `
    <div class="cmt-row">
      <img class="cmt-avatar" src="${escapeAttr(img)}"${profileLinkAttr(cmt.username)} alt="">
      <div class="cmt-body">
        <div class="cmt-bubble">
          <div class="cmt-head"><b class="cmt-name"${profileLinkAttr(cmt.username)}>${escapeHtml(cmt.name)}</b>${badge}</div>
          <div class="cmt-text" id="cmt-text-${cid}">${blm48FormatCommentText(cmt.text)}</div>
        </div>
        <div class="cmt-actions">
          <span class="cmt-time">${commentTimeShort(cmt.timestamp)}</span>
          ${canReply ? `<button type="button" onclick="blm48StartReply('${escapeAttr(postId)}', '${cid}')">Reply</button>` : ''}
          ${isOwn ? `<button type="button" onclick="startEditComment('${cid}')">Edit</button>` : ''}
        </div>
      </div>
      <button type="button" class="cmt-like" onclick="blm48ToggleCommentLike('${cid}')" aria-label="Like">
        <i class="${heartClass} fa-heart" id="cmt-heart-${cid}"></i>
        <span class="cmt-like-count" id="cmt-like-count-${cid}" data-n="${likes}">${likes}</span>
      </button>
    </div>`;

  if (isReply) {
    return `<div class="comment-item cmt-reply" data-comment-id="${cid}" data-name="${escapeAttr(cmt.name || '')}" data-username="${escapeAttr(cmt.username || '')}">${row}</div>`;
  }

  const repliesHtml = replyList.map(r => buildSingleCommentHtml(r, postId, true)).join('');
  const n = replyList.length;
  return `
    <div class="comment-item cmt-top" data-comment-id="${cid}" data-name="${escapeAttr(cmt.name || '')}" data-username="${escapeAttr(cmt.username || '')}">
      ${row}
      <div class="cmt-replies" id="replies-${cid}" style="display: none;">${repliesHtml}</div>
      <button type="button" class="cmt-replies-toggle" id="replies-toggle-btn-${cid}" onclick="blm48ToggleReplies('${cid}')" style="display: ${n > 0 ? 'flex' : 'none'};">
        <span class="cmt-replies-line"></span><span id="replies-toggle-label-${cid}">${n === 1 ? 'View 1 reply' : `View ${n} replies`}</span><span id="replies-count-${cid}" hidden>${n}</span>
      </button>
    </div>`;
}

// ข้อความปุ่ม View N replies / Hide replies ตามจำนวน + สถานะเปิด/ปิด
function blm48UpdateRepliesToggle(topId) {
  const repliesEl = document.getElementById(`replies-${topId}`);
  const btn = document.getElementById(`replies-toggle-btn-${topId}`);
  const label = document.getElementById(`replies-toggle-label-${topId}`);
  const countEl = document.getElementById(`replies-count-${topId}`);
  if (!repliesEl || !btn) return;
  const n = repliesEl.querySelectorAll(':scope > .comment-item').length;
  if (countEl) countEl.innerText = n;
  btn.style.display = n > 0 ? 'flex' : 'none';
  const open = repliesEl.style.display !== 'none';
  if (label) label.innerText = open ? 'Hide replies' : (n === 1 ? 'View 1 reply' : `View ${n} replies`);
}

function blm48ToggleReplies(topId) {
  const repliesEl = document.getElementById(`replies-${topId}`);
  if (!repliesEl) return;
  repliesEl.style.display = repliesEl.style.display === 'none' ? 'block' : 'none';
  blm48UpdateRepliesToggle(topId);
}

// ยอดไลก์ 0 ไม่ต้องโชว์ตัวเลข (แบบ IG) - CSS ซ่อนด้วย [data-n="0"]
function blm48SetCmtLikeCount(span, n) {
  if (!span) return;
  span.innerText = n;
  span.dataset.n = String(n);
}

// 💖 กดใจคอมเมนต์/reply (เจ้าของโพสต์ได้ 9 คุกกี้ - คิดฝั่ง server)
async function blm48ToggleCommentLike(commentId) {
  const currentUser = getUserSession();
  if (!currentUser || !currentUser.username) {
    if (window.Swal) Swal.fire({ icon: 'warning', title: 'ไม่พบผู้ใช้งาน', text: 'กรุณาล็อกอินก่อนงับ', confirmButtonColor: 'var(--primary-pink)' });
    return;
  }
  const heartIcon = document.getElementById(`cmt-heart-${commentId}`);
  const likeSpan = document.getElementById(`cmt-like-count-${commentId}`);
  if (!heartIcon || !likeSpan) return;
  if (heartIcon.dataset.loading === 'true') return;
  heartIcon.dataset.loading = 'true';

  const wasLiked = heartIcon.classList.contains('fa-solid');
  const before = parseInt(likeSpan.innerText) || 0;
  heartIcon.classList.toggle('fa-solid', !wasLiked);
  heartIcon.classList.toggle('fa-regular', wasLiked);
  blm48SetCmtLikeCount(likeSpan, wasLiked ? Math.max(0, before - 1) : before + 1);

  try {
    const result = await blm48LikeComment(currentUser.username, commentId);
    if (!result || result.status !== 'success') throw new Error(result && result.message);
    blm48SetCmtLikeCount(likeSpan, result.likes || 0);
    heartIcon.classList.toggle('fa-solid', !!result.isLiked);
    heartIcon.classList.toggle('fa-regular', !result.isLiked);
    updatePostCookiesUI(findPostIdFromElement(heartIcon), result.postCookies);
  } catch (error) {
    heartIcon.classList.toggle('fa-solid', wasLiked);
    heartIcon.classList.toggle('fa-regular', !wasLiked);
    blm48SetCmtLikeCount(likeSpan, before);
    console.error('Like Comment Error:', error);
  } finally {
    delete heartIcon.dataset.loading;
  }
}

// =========================================================================
// 🧾 ส่วนล่างของโพสต์เมมเบอร์ (Home / Member / postdetail) แบบ iAM:
//   แถว [รูป 3 คนส่งของขวัญเยอะสุด + ยอดคุกกี้ทั้งหมดของโพสต์ (posts.cookies รวมของขวัญ)]  ...  [N Comments] (ไม่มีเส้นด้านบน)
//   ปุ่ม [♥ N Likes] | [🎁 Send Gift]   (กดใจโพสต์ เมมเบอร์ได้ 9 คุกกี้เหมือนเดิม)
//   คอมเมนต์ยอดนิยม 2 อันดับ + ช่องพิมพ์ (มีปุ่มของขวัญในช่อง) — ไม่มีคอมเมนต์ = มีแค่ช่องพิมพ์
// id ของหัวใจ/ยอดไลก์/ยอดคอมเมนต์ยังเหมือนเดิม (heart- / like-count- / comment-count-) ให้ likePost,
// patchPostLive และ submitComment ของแต่ละหน้าทำงานต่อได้
// =========================================================================
// ตัวเลขสั้นแบบ 4K / 1.2M
function blm48ShortCount(n) {
  const x = Number(n) || 0;
  if (x >= 1e6) return (x / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (x >= 1e3) return (x / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return x.toLocaleString();
}

// opts.memberName = ชื่อเมมเบอร์เจ้าของโพสต์ (โชว์ในกล่องยืนยันของขวัญ)
// opts.canGift = false -> ไม่มีแถว Gifts/ปุ่ม Send Gift (เช่นโพสต์แฟนคลับ)
// opts.onCommentsClick = JS ตอนกด "N Comments" (ค่าเริ่มต้น: เปิดหน้าโพสต์เต็ม)
function blm48PostStatsActionsHtml(post, opts) {
  opts = opts || {};
  const id = escapeAttr(post.id || '');
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const canGift = opts.canGift !== false;
  const liked = !!post.isLiked;
  const commentsClick = opts.onCommentsClick || `window.location.href='postdetail?id=${encodeURIComponent(post.id || '')}'`;
  return `
    <div class="pf-stats">
      ${canGift ? `<div class="pf-gifts" id="post-gifts-${id}" data-post-id="${id}" data-member="${escapeAttr(opts.memberName || '')}">
        <span class="pf-gifters" id="post-gifters-${id}"></span><span class="pf-gift-total"><span id="post-cookies-count-${id}">${blm48ShortCount(post.cookies || 0)}</span> Cookies</span>
      </div>` : '<div></div>'}
      <button type="button" class="pf-comment-count" onclick="${commentsClick}"><span id="comment-count-${id}">${comments.length}</span> Comments</button>
    </div>
    <div class="pf-actions">
      <button type="button" class="pf-act pf-like" onclick="likePost('${id}')" aria-label="Like">
        <i class="${liked ? 'fa-solid' : 'fa-regular'} fa-heart" id="heart-${id}"></i><span id="like-count-${id}">${post.likes || 0}</span><span>Likes</span>
      </button>
      ${canGift ? `<span class="pf-act-divider"></span>
      <button type="button" class="pf-act pf-gift" onclick="blm48OpenPostGift('${id}')"><i class="fa-solid fa-gift pf-act-icon"></i><span>Send Gift</span></button>` : ''}
    </div>`;
}

// เรียงคอมเมนต์: 'top' = ไลก์เยอะสุดก่อน (เท่ากันเอาอันใหม่กว่า) / 'new' = ใหม่สุดก่อน
function blm48CommentTime(c) {
  const t = c && c.timestamp;
  return Number(t) || Date.parse(t) || 0;
}
function blm48SortComments(list, mode) {
  return list.slice().sort((a, b) => mode === 'new'
    ? blm48CommentTime(b) - blm48CommentTime(a)
    : (Number(b.likes) || 0) - (Number(a.likes) || 0) || blm48CommentTime(b) - blm48CommentTime(a));
}
// คอมเมนต์ยอดนิยม n อันดับ — เฉพาะคอมเมนต์บนสุด ไม่รวม reply
function blm48TopComments(topLevel, n) {
  return blm48SortComments(topLevel, 'top').slice(0, n);
}
function blm48TopLevelComments(comments) {
  const byId = {};
  (comments || []).forEach(c => { if (c.commentId) byId[c.commentId] = c; });
  return (comments || []).filter(c => !c.parentCommentId || !byId[c.parentCommentId]);
}

// คอมเมนต์ยอดนิยม 2 อันดับ + ช่องพิมพ์ (ใช้ในฟีด Home/Member) — กด "N Comments" ไปดูทั้งหมดที่หน้าโพสต์
function blm48PostCommentPreviewHtml(post, opts) {
  opts = opts || {};
  const id = escapeAttr(post.id || '');
  const canGift = opts.canGift !== false;
  const top = blm48TopComments(blm48TopLevelComments(post.comments), 2);
  const me = typeof getUserSession === 'function' ? getUserSession() : null;
  const myImg = (me && me.profile_img) || BLM48_CMT_DEFAULT_AVATAR;
  return `
    <div id="comment-section-${id}" class="pf-cmt-section">
      <div id="comment-list-${id}" class="pf-cmt-list" data-preview="1">${top.map(c => blm48CommentHtml(c, post.id || '', false, [], { canReply: true })).join('')}</div>
      <div class="comment-input-box pf-input-row">
        <img class="pf-my-avatar" src="${escapeAttr(myImg)}" alt="">
        <div class="pf-input-wrap">
          <input type="text" id="comment-input-${id}" placeholder="Write a comment...">
          ${canGift ? `<button type="button" class="pf-input-gift" onclick="blm48OpenPostGift('${id}')" aria-label="Send Gift"><i class="fa-solid fa-gift"></i></button>` : ''}
        </div>
        <button type="button" class="cmt-send-btn pf-send" onclick="submitComment('${id}', this)" aria-label="ส่งคอมเมนต์"><i class="fa-regular fa-paper-plane"></i></button>
      </div>
    </div>`;
}

// 🎁 กด Send Gift ในโพสต์: เปิดแผงของขวัญ (ไม่โชว์โปรไฟล์เมมเบอร์) — ทุกบัญชีที่ล็อกอินแล้ว
let blm48GiftSheetLoading = null;
function blm48LoadGiftSheet() {
  if (window.blm48OpenMemberGift) return Promise.resolve();
  const load = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  if (!blm48GiftSheetLoading) {
    blm48GiftSheetLoading = (window.blm48GiftImageHtml ? Promise.resolve() : load('assets/js/member-gift-stickers.js'))
      .then(() => load('assets/js/member-gift-sheet.js'));
    blm48GiftSheetLoading.catch(() => { blm48GiftSheetLoading = null; });
  }
  return blm48GiftSheetLoading;
}

async function blm48OpenPostGift(postId) {
  const u = typeof getUserSession === 'function' ? getUserSession() : null;
  if (!u || !u.username) {
    Swal.fire({ title: 'กรุณาเข้าสู่ระบบ', text: 'เข้าสู่ระบบก่อนส่งของขวัญให้เมมเบอร์นะคะ', confirmButtonText: 'OK' });
    return;
  }
  const holder = document.getElementById(`post-gifts-${postId}`);
  try {
    await blm48LoadGiftSheet();
  } catch (e) {
    console.error('Gift sheet load error:', e);
    return;
  }
  blm48OpenMemberGift({
    name: (holder && holder.dataset.member) || '',
    postId,
    hideRecipient: true,
    onSent: (res) => { updatePostCookiesUI(postId, res && res.postCookies); blm48QueuePostGifts([postId]); }
  });
}

// 📊 รูป 3 แฟนที่ให้คุกกี้โพสต์นี้เยอะสุด (กดใจ + คอมเมนต์ + กดใจคอมเมนต์ + ของขวัญ, ไม่นับ member/admin): เก็บ id ของโพสต์ที่เพิ่งขึ้นจอ แล้วดึงทีเดียว (ทุกหน้า ทุกจังหวะที่วาดโพสต์ใหม่)
const blm48PendingGiftPosts = new Set();
let blm48GiftSummaryTimer = null;
function blm48QueuePostGifts(ids) {
  (ids || []).forEach(id => id && blm48PendingGiftPosts.add(String(id)));
  clearTimeout(blm48GiftSummaryTimer);
  blm48GiftSummaryTimer = setTimeout(blm48FlushPostGifts, 150);
}
async function blm48FlushPostGifts() {
  const ids = Array.from(blm48PendingGiftPosts);
  blm48PendingGiftPosts.clear();
  if (!ids.length || typeof blm48GetPostGiftSummaries !== 'function') return;
  try {
    const res = await blm48GetPostGiftSummaries(ids);
    const map = {};
    (Array.isArray(res) ? res : []).forEach(s => { map[s.postId] = s; });
    ids.forEach(id => {
      const s = map[id] || { gifts: 0, gifters: [] };
      const giftersEl = document.getElementById(`post-gifters-${id}`);
      if (giftersEl) giftersEl.innerHTML = (s.gifters || []).map((g, i) =>
        `<span class="pf-gifter" data-fan="${escapeAttr(g.username || '')}">${blm48MedalAvatarHtml(g.img, i, 32, g.name)}</span>`
      ).join('');
    });
  } catch (e) { console.error('Post gift summary error:', e); }
}
(function watchPostGifts() {
  const scan = (root) => {
    const ids = [];
    (root.querySelectorAll ? root.querySelectorAll('.pf-gifts[data-post-id]:not([data-gift-loaded])') : []).forEach(el => {
      el.dataset.giftLoaded = '1';
      ids.push(el.dataset.postId);
    });
    if (ids.length) blm48QueuePostGifts(ids);
  };
  const start = () => {
    scan(document);
    new MutationObserver(muts => {
      for (const m of muts) m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n.matches && n.matches('.pf-gifts') ? n.parentNode : n); });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// 🎨 สไตล์ส่วนล่างโพสต์ + ป๊อปอัปแจ้งเตือน (SweetAlert) ทุกหน้า แบบเดียวกัน:
// การ์ดขาว หัวข้อตัวหนา ไม่มีไอคอนใหญ่ ปุ่ม Cancel ขอบดำ + ปุ่มหลักสีเหลืองทรงแคปซูล
(function injectPostFooterAndAlertCss() {
  if (document.getElementById('blm48-post-footer-css')) return;
  const st = document.createElement('style');
  st.id = 'blm48-post-footer-css';
  st.textContent = `
    .pf-stats { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 0 8px; min-height: 40px; }
    .pf-gifts { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 0.92rem; color: #555; }
    .pf-gifters { display: inline-flex; align-items: center; }
    .pf-gifter { display: inline-flex; margin-right: -4px; cursor: pointer; }
    .pf-gifters:not(:empty) { margin-right: 6px; }
    .pf-comment-count { background: none; border: none; padding: 0; font-family: inherit; font-size: 0.92rem; color: #555; cursor: pointer; white-space: nowrap; }
    .pf-actions { display: flex; align-items: center; border-top: 1px solid #eee; border-bottom: 1px solid #eee; margin: 0 -15px; }
    .pf-act { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background: none; border: none; padding: 11px 6px; font-family: inherit; font-size: 1rem; font-weight: 500; color: #222; cursor: pointer; }
    .pf-act:active { background: #fafafa; }
    .pf-act-icon { font-size: 1.15rem; }
    .pf-like > .fa-heart { font-size: 1.15rem; color: var(--primary-pink, #ff85a2); }
    .pf-like > [id^="like-count-"] { font-weight: 600; margin-right: -4px; }
    .pf-gift .pf-act-icon { color: #e8590c; }
    .pf-act-divider { width: 1px; align-self: stretch; margin: 8px 0; background: #e6e6e6; }
    .pf-cmt-section { margin-top: 12px; }
    .pf-cmt-list:empty { display: none; }
    .pf-cmt-list .cmt-replies-toggle { display: none !important; }
    .pf-input-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .pf-my-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #f2f2f2; }
    .pf-input-wrap { flex: 1; min-width: 0; display: flex; align-items: center; border: 1px solid #d9d9d9; border-radius: 22px; padding: 0 6px 0 14px; background: #fff; }
    .pf-input-wrap input, .comment-input-box .pf-input-wrap input, .comment-input-box .pf-input-wrap input:focus { flex: 1; min-width: 0; width: auto !important; height: auto !important; border: none !important; border-radius: 0 !important; outline: none !important; box-shadow: none !important; background: none !important; font-family: inherit; font-size: 0.9rem; padding: 9px 0 !important; margin: 0 !important; }
    .pf-input-gift { background: none; border: none; color: #e8590c; font-size: 1.05rem; padding: 6px; cursor: pointer; flex-shrink: 0; }

    .swal2-container .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup):not([style*="width"]) { width: min(340px, calc(100vw - 48px)) !important; }
    .swal2-container .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) { padding: 22px 20px 20px !important; border-radius: 18px !important; background: #fff !important; border: none !important; box-shadow: 0 10px 30px rgba(0,0,0,0.12) !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast) > .swal2-icon { display: none !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-title { font-family: 'Quicksand','Kanit',sans-serif !important; font-size: 18px !important; font-weight: 700 !important; color: #111 !important; padding: 0 !important; margin: 0 0 10px !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-html-container { font-family: 'Quicksand','Kanit',sans-serif !important; font-size: 15px !important; color: #222 !important; line-height: 1.5 !important; margin: 4px 0 0 !important; padding: 0 !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-actions { width: 100% !important; flex-wrap: nowrap !important; gap: 12px !important; margin: 22px 0 0 !important; padding: 0 !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-actions:not([style*="display: none"]) > button { flex: 1 1 0 !important; min-width: 0 !important; height: 46px !important; margin: 0 !important; border-radius: 23px !important; font-family: 'Quicksand','Kanit',sans-serif !important; font-size: 16px !important; box-shadow: none !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-confirm { order: 2 !important; background: #fbd96b !important; background-image: none !important; color: #111 !important; border: none !important; font-weight: 600 !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-deny { order: 1 !important; background: #fff !important; color: #111 !important; border: 1.5px solid #111 !important; font-weight: 500 !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-cancel { order: 0 !important; background: #fff !important; background-image: none !important; color: #111 !important; border: 1.5px solid #111 !important; font-weight: 500 !important; }
    .swal2-popup.swal2-modal:not(.swal2-toast):not(.ks-popup) .swal2-styled:focus { box-shadow: none !important; }
  `;
  (document.head || document.documentElement).appendChild(st);
})();

// ↩️ กด Reply: ใช้ช่องพิมพ์คอมเมนต์หลักของโพสต์นั้น + แถบ "Replying to ชื่อ ×" + เติม @ชื่อ ให้
function blm48StartReply(postId, commentId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const item = document.querySelector(`.comment-item[data-comment-id="${CSS.escape(String(commentId))}"]`);
  if (!input || !item) return;
  const name = item.dataset.name || item.dataset.username || '';

  document.querySelectorAll('.comment-item.cmt-replying').forEach(el => el.classList.remove('cmt-replying'));
  item.classList.add('cmt-replying');

  input.dataset.replyParent = commentId;
  let bar = document.getElementById(`reply-bar-${postId}`);
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'cmt-replying-bar';
    bar.id = `reply-bar-${postId}`;
    (input.closest('.comment-input-box') || input.parentElement).insertAdjacentElement('beforebegin', bar);
  }
  bar.innerHTML = `<span>Replying to <b>${escapeHtml(name)}</b></span><button type="button" onclick="blm48CancelReply('${escapeAttr(postId)}')" aria-label="Cancel reply"><i class="fa-solid fa-xmark"></i></button>`;

  const section = document.getElementById(`comment-section-${postId}`);
  if (section && section.style.display === 'none') section.style.display = 'block';
  input.value = name ? `@${name} ` : '';
  input.placeholder = `Reply to ${name}...`;
  input.focus();
  try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
}

function blm48CancelReply(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const bar = document.getElementById(`reply-bar-${postId}`);
  if (bar) bar.remove();
  document.querySelectorAll('.comment-item.cmt-replying').forEach(el => el.classList.remove('cmt-replying'));
  if (input) {
    const parentId = input.dataset.replyParent;
    const item = parentId ? document.querySelector(`.comment-item[data-comment-id="${CSS.escape(parentId)}"]`) : null;
    const prefill = item ? `@${item.dataset.name || item.dataset.username || ''} ` : null;
    if (prefill && input.value === prefill) input.value = '';
    delete input.dataset.replyParent;
    input.placeholder = 'Write a comment...';
  }
}

function blm48IsReplying(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  return !!(input && input.dataset.replyParent);
}

// ส่ง reply จากช่องพิมพ์หลัก (เรียกจาก submitComment ของแต่ละหน้า ตอนกำลังตอบกลับอยู่)
async function blm48SubmitReply(postId, btnElement) {
  const currentUser = getUserSession();
  if (!currentUser || !currentUser.username) {
    Swal.fire('พบปัญหา 😥', 'กรุณาล็อกอินเข้าสู่ระบบก่อนตอบกลับนะงับ', 'warning');
    return;
  }
  const inputEl = document.getElementById(`comment-input-${postId}`);
  if (!inputEl) return;
  const parentId = inputEl.dataset.replyParent;
  const replyText = inputEl.value.trim();
  if (btnElement && btnElement.disabled) return;
  if (!replyText) {
    Swal.fire('ข้อความว่างเปล่า', 'พิมพ์อะไรบางอย่างก่อนส่งน้า', 'info');
    return;
  }

  let originalHtml = '';
  if (btnElement) { originalHtml = btnElement.innerHTML; btnElement.disabled = true; }
  inputEl.disabled = true;

  try {
    const result = await blm48AddComment(currentUser.username, postId, replyText, parentId);
    if (!result || result.status !== 'success') throw new Error(result && result.message);

    // server ผูก reply เข้ากับคอมเมนต์บนสุดเสมอ (parentCommentId ที่ตอบกลับมา)
    const parentItem = document.querySelector(`.comment-item[data-comment-id="${CSS.escape(parentId)}"]`);
    const topEl = parentItem ? (parentItem.closest('.cmt-top') || parentItem) : null;
    const topId = result.parentCommentId || (topEl && topEl.dataset.commentId) || parentId;
    const repliesEl = document.getElementById(`replies-${topId}`);
    if (repliesEl) {
      if (!commentAlreadyOnScreen(result.commentId)) repliesEl.insertAdjacentHTML('beforeend', buildSingleCommentHtml({
        commentId: result.commentId,
        username: currentUser.username,
        name: currentUser.name || currentUser.username || 'Anonymous',
        role: currentUser.role || 'user',
        profile_img: currentUser.profile_img || BLM48_CMT_DEFAULT_AVATAR,
        text: replyText,
        likes: 0,
        isLiked: false,
        timestamp: Date.now(),
        parentCommentId: topId
      }, postId, true));
      repliesEl.style.display = 'block';
      blm48UpdateRepliesToggle(topId);
      const newEl = document.querySelector(`.comment-item[data-comment-id="${CSS.escape(String(result.commentId))}"]`);
      if (newEl) newEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    const commentCountEl = document.getElementById(`comment-count-${postId}`);
    if (commentCountEl) commentCountEl.innerText = (parseInt(commentCountEl.innerText) || 0) + 1;
    updatePostCookiesUI(postId, result.postCookies);

    inputEl.value = '';
    blm48CancelReply(postId);
  } catch (error) {
    console.error('Submit Reply Error:', error);
    Swal.fire('เกิดข้อผิดพลาด', (error && error.message) || 'ส่งการตอบกลับไม่สำเร็จงับ', 'error');
  } finally {
    if (btnElement) { btnElement.innerHTML = originalHtml; btnElement.disabled = false; }
    inputEl.disabled = false;
  }
}

// =========================================================================
// 👤 กดรูป/ชื่อแล้วเปิดโปรไฟล์: ใส่ data-fan="username" (แฟนคลับ -> fan.html, บัญชีเมมเบอร์ fan.html จะพาไปหน้า member ให้เอง)
// หรือ data-member="ชื่อเมมเบอร์" (-> member.html) ไว้ที่ element ไหนก็ได้ ตัวดักคลิกด้านล่างจัดการให้
// ทำงานช่วง capture + หยุด event ไม่ให้ไปเปิดการ์ด/โพสต์ที่ครอบอยู่ซ้อนกัน
// =========================================================================
function profileLinkAttr(username) {
  return username ? ` data-fan="${escapeHtml(username)}"` : '';
}
function memberLinkAttr(memberName) {
  return memberName ? ` data-member="${escapeHtml(memberName)}"` : '';
}
document.addEventListener('click', function (e) {
  const el = e.target.closest && e.target.closest('[data-fan], [data-member]');
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  if (el.dataset.member) {
    window.location.href = `member?name=${encodeURIComponent(el.dataset.member)}`;
  } else if (el.dataset.fan) {
    window.location.href = `fan?u=${encodeURIComponent(el.dataset.fan)}`;
  }
}, true);
(function addProfileLinkCursor() {
  const style = document.createElement('style');
  style.textContent = '[data-fan], [data-member] { cursor: pointer; }';
  (document.head || document.documentElement).appendChild(style);
})();

// =========================================================================
// 👑 สลิปโอน Token/Cookie/GEToken (ใช้ร่วมกันโดย admin_transfer.html ตอนโอนใหม่
// และ admin_transfer_history.html ตอนเปิดดูสลิปย้อนหลัง) - เดิมอยู่ใน admin.html
// เพียงไฟล์เดียวตอนที่ทั้งสองฟีเจอร์ยังเป็น modal ในหน้าเดียวกัน
// ต้องมีฟังก์ชัน resolveDriveImage() ประกาศไว้ในหน้าที่เรียกใช้ด้วย
// =========================================================================

// โหลดรูปแบบปลอดภัย - คืนค่า null แทนที่จะ throw ถ้าโหลดไม่สำเร็จ (เผื่อโดเมนรูปไม่รองรับ CORS)
function loadImageSafe(src, useCors) {
  return new Promise((resolve) => {
    const img = new Image();
    if (useCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// วาดรูปโปรไฟล์แบบ cover-fit ครอบตัดเป็นวงกลม ทับลงบนวงกลมขาวในพื้นหลังสลิป
function drawCircleAvatar(ctx, img, cx, cy, r) {
  if (!img) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}

// สร้างสลิปยืนยันการโอนโดยเอาข้อมูลไปวางทับบนรูปพื้นหลังสลิปจริง (assets/images/transfer-slip-bg.png)
// ตำแหน่งพิกัดถูก calibrate ให้ตรงกับจุดวงเล็บในรูปตัวอย่างของแอดมิน
// ใช้ได้ทั้งตอนโอนเสร็จใหม่ๆ (มี refNo/createdAt จาก server) และตอนเปิดดูย้อนหลังจากประวัติ
async function generateTransferSlip({ admin, adminName, adminAvatar, target, token, cookie, getoken, refNo, createdAt }) {
  const now = createdAt ? new Date(createdAt) : new Date();
  const dateStr = now.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  const ref = refNo || ('TXN' + now.getTime());

  const bg = new Image();
  const loaded = new Promise((resolve, reject) => {
    bg.onload = resolve;
    bg.onerror = reject;
  });
  bg.src = 'assets/images/transfer-slip-bg.png?v=20260810';

  const drawSlip = async (includeAvatars) => {
    const canvas = document.createElement('canvas');
    canvas.width = bg.naturalWidth;
    canvas.height = bg.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bg, 0, 0);

    if (includeAvatars) {
      const [adminImg, targetImg] = await Promise.all([
        loadImageSafe(resolveDriveImage(adminAvatar), true),
        loadImageSafe(resolveDriveImage(target.profile_img), true)
      ]);
      // พิกัดวงกลมนี้วัดจากพิกเซลจริงของรูปพื้นหลัง (สแกนหาขอบวงกลมขาว) ไม่ใช่กะด้วยตา
      drawCircleAvatar(ctx, adminImg, 156, 306, 82);
      drawCircleAvatar(ctx, targetImg, 156, 640, 82);
    }

    ctx.fillStyle = '#ffffff';

    ctx.textAlign = 'left';
    ctx.font = '600 38px "Quicksand", "Kanit", sans-serif';
    ctx.fillText(dateStr, 64, 1250);

    ctx.font = '600 42px "Quicksand", "Kanit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('@' + admin, 280, 352);
    ctx.fillText(adminName || admin, 280, 414);

    ctx.fillText('@' + target.username, 280, 680);
    ctx.fillText(target.name || target.username, 280, 742);

    ctx.textAlign = 'right';
    ctx.font = '600 46px "Quicksand", "Kanit", sans-serif';
    ctx.fillText(ref, 1170, 944);

    const items = [];
    if (token > 0) items.push({ label: 'Token', amount: token });
    if (cookie > 0) items.push({ label: 'Cookie', amount: cookie });
    if (getoken > 0) items.push({ label: 'GEToken', amount: getoken });
    let y = 1074;
    ctx.font = '700 52px "Quicksand", "Kanit", sans-serif';
    items.forEach(item => {
      ctx.fillText(Number(item.amount).toLocaleString() + ' ' + item.label, 1170, y);
      y += 62;
    });

    return canvas;
  };

  let canvas, dataUrl;
  try {
    await loaded;
  } catch (e) {
    Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรูปพื้นหลังสลิปได้ (assets/images/transfer-slip-bg.png)', 'error');
    return;
  }

  try {
    canvas = await drawSlip(true);
    dataUrl = canvas.toDataURL('image/png');
  } catch (e) {
    // canvas ถูก taint เพราะโดเมนรูปโปรไฟล์ไม่รองรับ CORS - สร้างใหม่แบบไม่มีรูปโปรไฟล์แทน
    canvas = await drawSlip(false);
    dataUrl = canvas.toDataURL('image/png');
  }

  Swal.fire({
    title: refNo ? 'สลิปการโอน' : 'ทำรายการโอนสำเร็จ',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; gap:15px;">
        <img src="${dataUrl}" style="width:100%; max-width:340px; border-radius:14px; box-shadow:0 8px 26px rgba(255,133,162,0.25);">
        <a href="${dataUrl}" download="BLM48_Transfer_${target.username}_${ref}.png" style="
          display:inline-flex; align-items:center; gap:8px; padding:12px 32px;
          background: var(--primary-pink); color:#fff; text-decoration:none; border-radius:25px;
          font-weight:bold; font-size:15px; box-shadow:0 4px 12px rgba(255,133,162,0.3);
        ">
          <i class="fas fa-download"></i> บันทึกสลิป
        </a>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true
  });
}

// 🛡️ [กันแท็กผี] แคชรายชื่อเมมเบอร์จริง (lowercase -> ชื่อจริงตามระบบ) ไว้เช็คก่อนแปลง @ชื่อ เป็นลิงก์
// index.html มักมี window.memberData อยู่แล้ว (จาก renderRanking) ใช้อันนั้นก่อนถ้ามี ไม่งั้นค่อยไปดึงเอง (member.html)
// แคชคำนวณ Map ใหม่เฉพาะตอน window.memberData เปลี่ยน reference เท่านั้น ไม่ต้องวนลูปทุกครั้งที่ render โพสต์
let _memberNameLookupSource = null;
let _memberNameLookupCache = null;
let _memberNameCacheLoading = false;

function getMemberNameLookup() {
  const source = window.memberData;
  if (!Array.isArray(source) || source.length === 0) return null;
  if (_memberNameLookupSource === source) return _memberNameLookupCache;

  const map = new Map();
  source.forEach(m => {
    const name = m && m.name ? m.name.toString().trim() : '';
    if (name) map.set(name.toLowerCase(), name);
  });
  _memberNameLookupSource = source;
  _memberNameLookupCache = map;
  return map;
}

// เรียกตอนโหลดหน้า (fire-and-forget) เพื่อให้ตรวจแท็กได้ทันเวลาที่โพสต์เริ่ม render
// ถ้า window.memberData มีข้อมูลอยู่แล้ว (เช่น index.html โหลดจากแคช) จะข้ามการดึงซ้ำทันที
async function primeMemberNameCache() {
  if ((Array.isArray(window.memberData) && window.memberData.length > 0) || _memberNameCacheLoading) return;
  _memberNameCacheLoading = true;
  try {
    const res = await blm48GetAllMembers();
    if (res && res.status === 'success' && Array.isArray(res.data)) {
      window.memberData = res.data;
    }
  } catch (e) {
    console.error('โหลดรายชื่อเมมเบอร์สำหรับตรวจแท็กไม่สำเร็จ:', e);
  } finally {
    _memberNameCacheLoading = false;
  }
}

// แปลงเนื้อหาโพสต์เป็น HTML ที่แสดงผล: escape ทุกอย่างก่อนเสมอ (กัน XSS) แล้วค่อยแปลง
// URL / #hashtag / @แท็กเมมเบอร์ ที่เจอเป็นลิงก์คลิกได้ทีหลังจากข้อความที่ escape แล้วเท่านั้น
// ใช้แทน escapeHtml(post.content) ตรงๆ ในทุกที่ที่ render เนื้อหาโพสต์ (index.html, member.html)
function formatPostContent(content) {
  const raw = (content || '').toString();
  // ลำดับ alternative สำคัญ: URL ต้องมาก่อน เพื่อกิน "#section" ท้ายลิงก์ไปด้วยกัน ไม่ให้ไปโดนจับเป็น hashtag ซ้ำ
  // lookbehind กัน false positive: "C#" ไม่ให้เป็น hashtag, "user@email.com" ไม่ให้เป็นการแท็กเมมเบอร์
  // \p{M} (combining mark) ต้องอยู่ในกลุ่มด้วย ไม่งั้นคำไทยที่มีสระ/วรรณยุกต์ลอย (เ, ็, ่, ้ ฯลฯ) จะถูกตัดคำกลางคัน
  const pattern = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)|(?<![\w#])#([\p{L}\p{M}\p{N}_]+)|(?<![\w@.])@([\p{L}\p{M}\p{N}_.]+)/gu;
  const trailingPunctRe = /[.,!?;:'")\]}]+$/;

  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    result += escapeHtml(raw.slice(lastIndex, match.index));

    if (match[1]) {
      // ตัดเครื่องหมายวรรคตอนท้ายประโยคที่ติดมากับ URL ออก (เช่น "...ดูที่ https://a.com/x." ไม่ให้จุดท้ายติดไปในลิงก์)
      let url = match[1];
      let trailing = '';
      const trailMatch = url.match(trailingPunctRe);
      if (trailMatch) {
        trailing = trailMatch[0];
        url = url.slice(0, -trailing.length);
      }
      const href = url.startsWith('www.') ? `https://${url}` : url;
      result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary-pink,#ff85a2);text-decoration:underline;word-break:break-all;">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
    } else if (match[2]) {
      const tag = match[2];
      result += `<a href="javascript:void(0)" onclick="filterFeedByHashtag('${escapeAttr(tag)}')" style="color:#d4af37;font-weight:700;text-decoration:none;">#${escapeHtml(tag)}</a>`;
    } else if (match[3]) {
      // 🛡️ [กันแท็กผี] แปลงเป็นลิงก์เฉพาะชื่อที่มีตัวตนจริงในระบบเท่านั้น (เทียบแบบ case-insensitive)
      // ชื่อที่พิมพ์มั่ว/สะกดผิด/ไม่มีเมมเบอร์คนนี้จริง จะโชว์เป็นข้อความเฉยๆ ไม่ใช่ลิงก์ไปหน้าเปล่า
      const name = match[3];
      const lookup = getMemberNameLookup();
      const canonicalName = lookup ? lookup.get(name.toLowerCase()) : null;
      if (canonicalName) {
        result += `<a href="member?name=${encodeURIComponent(canonicalName)}" style="color:var(--primary-pink,#ff85a2);font-weight:700;text-decoration:none;">@${escapeHtml(canonicalName)}</a>`;
      } else {
        result += `@${escapeHtml(name)}`;
      }
    }

    lastIndex = pattern.lastIndex;
  }
  result += escapeHtml(raw.slice(lastIndex));
  return result;
}

// กรองฟีดที่โหลดไว้แล้วบนจอด้วยแฮชแท็ก (client-side ล้วนๆ ไม่ query เซิร์ฟเวอร์ใหม่)
// ใช้ id/class ร่วมกันของ index.html และ member.html (#posts-container, .post-card, #content-<postId>)
function filterFeedByHashtag(tag) {
  const container = document.getElementById('posts-container');
  if (!container || !tag) return;

  const needle = '#' + tag.toString().trim().toLowerCase();
  const cards = container.querySelectorAll('.post-card');
  let matchCount = 0;
  cards.forEach(card => {
    const contentEl = card.querySelector('[id^="content-"]');
    const text = contentEl ? contentEl.textContent.toLowerCase() : '';
    const isMatch = text.includes(needle);
    card.style.display = isMatch ? '' : 'none';
    if (isMatch) matchCount++;
  });

  showHashtagFilterBar(tag, matchCount);
}

function showHashtagFilterBar(tag, matchCount) {
  const container = document.getElementById('posts-container');
  if (!container) return;
  let bar = document.getElementById('hashtag-filter-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'hashtag-filter-bar';
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff0f3;border:1px solid #ffccd5;border-radius:12px;padding:10px 14px;margin-bottom:15px;font-size:0.85rem;color:#ff6b8b;font-weight:600;';
    container.parentNode.insertBefore(bar, container);
  }
  bar.innerHTML = `
    <span><i class="fa-solid fa-hashtag"></i> กำลังกรองด้วย #${escapeHtml(tag)} (${matchCount} โพสต์)</span>
    <button onclick="clearHashtagFilter()" style="background:none;border:none;color:#ff6b8b;font-weight:700;cursor:pointer;font-size:0.85rem;">ล้างตัวกรอง <i class="fa-solid fa-xmark"></i></button>
  `;
}

function clearHashtagFilter() {
  const container = document.getElementById('posts-container');
  if (container) container.querySelectorAll('.post-card').forEach(card => { card.style.display = ''; });
  const bar = document.getElementById('hashtag-filter-bar');
  if (bar) bar.remove();
}

// อ่าน session ผู้ใช้จาก localStorage คืนค่า user data object (หรือ null ถ้าไม่มี/หมดอายุ)
function getUserSession() {
  try {
    const sessionStr = localStorage.getItem('bnl_session');
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);
    const expiryTime = session.expiry || session.expire;
    if (expiryTime && new Date().getTime() > expiryTime) {
      localStorage.removeItem('bnl_session');
      return null;
    }
    return session.data || session.user || session;
  } catch (e) {
    console.error("Session Parse Error:", e);
    return null;
  }
}

// เหมือน getUserSession() แต่คืนค่าแค่ username (บางหน้าเรียกใช้ชื่อนี้)
function getUsername() {
  const userData = getUserSession();
  return userData ? (userData.username || "") : "";
}

// alias ของ getUsername() — บางหน้าเรียกใช้ชื่อนี้
function getUsernameFromSession() {
  return getUsername();
}

// บันทึก session ผู้ใช้ลง localStorage (อายุ 90 วัน)
function saveUserSession(userData) {
  const expiry = new Date().getTime() + (90 * 24 * 60 * 60 * 1000);
  localStorage.setItem('bnl_session', JSON.stringify({ data: userData, expiry: expiry }));
}

// 🛒 ตะกร้า Shop: เก็บในเครื่อง (localStorage) แยกตาม username
// แต่ละบรรทัด = { kind: 'cookie'|'cafe'|'gacha'|'preorder', refId, variant, name, label, image, unitPrice, quantity }
// ราคาในตะกร้าเป็นแค่ตัวแสดงผล ตอน Place Order เซิร์ฟเวอร์ (shop_checkout) คิดราคาจริงเองทั้งหมด
// เครื่องดื่ม BLM48 Cafe ในตะกร้า/คำสั่งซื้อ ใช้ภาพโปรโมทหน้าร้าน (ไม่ใช่รูปแก้ว) — แก้ตรงนี้ที่เดียว ของที่อยู่ในตะกร้าอยู่แล้วก็เปลี่ยนตาม
const BLM48_CAFE_CART_IMAGES = {
  cafe_matcha_01: 'https://lh3.googleusercontent.com/d/1M9JtYBOwdqADFZtXTKhKq45WRE9GBziE=s1000',
  cafe_pinkmilk_01: 'https://lh3.googleusercontent.com/d/1wFYHde-eBVjzwocJyvreJM2XZeTjsDc8=s1000',
  cafe_cocoa_01: 'https://lh3.googleusercontent.com/d/1ILJYZnane2OGreL8weF_4qfObmk1dy3_=s1000',
  cafe_thaimirukutea_01: 'https://lh3.googleusercontent.com/d/1I-EBFnkTdtPRFgkEsN9mOF72gAmlxtuT=s1000'
};

const blm48Cart = {
  _key() {
    const u = getUsername();
    return u ? 'blm48_cart_' + u : null;
  },
  get() {
    try {
      const key = this._key();
      const lines = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
      if (!Array.isArray(lines)) return [];
      lines.forEach(l => { if (l && l.kind === 'cafe' && BLM48_CAFE_CART_IMAGES[l.refId]) l.image = BLM48_CAFE_CART_IMAGES[l.refId]; });
      return lines;
    } catch (e) { return []; }
  },
  save(lines) {
    try {
      const key = this._key();
      if (key) localStorage.setItem(key, JSON.stringify(lines));
    } catch (e) { /* storage blocked - cart just won't persist */ }
    document.dispatchEvent(new CustomEvent('blm48-cart-change'));
  },
  lineKey(l) { return l.kind + '|' + l.refId + '|' + (l.variant || 1); },
  add(line, qty) {
    const lines = this.get();
    const k = this.lineKey(line);
    const existing = lines.find(l => this.lineKey(l) === k);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + (qty || 1));
      Object.assign(existing, { name: line.name, label: line.label, image: line.image, unitPrice: line.unitPrice });
    } else {
      lines.push(Object.assign({ variant: 1 }, line, { quantity: Math.min(99, qty || 1) }));
    }
    this.save(lines);
  },
  setQty(key, qty) {
    const lines = this.get();
    const l = lines.find(x => this.lineKey(x) === key);
    if (l) { l.quantity = Math.max(1, Math.min(99, qty)); this.save(lines); }
  },
  remove(key) { this.save(this.get().filter(l => this.lineKey(l) !== key)); },
  clear() { this.save([]); },
  count() { return this.get().reduce((n, l) => n + (Number(l.quantity) || 0), 0); },
  total() { return this.get().reduce((n, l) => n + (Number(l.unitPrice) || 0) * (Number(l.quantity) || 0), 0); }
};

// เปิด/ปิดจุดแดงแจ้งเตือนที่แท็บ Notification ด้านล่าง (id="noti-badge")
function checkNotificationBadge() {
  const hasNewNoti = localStorage.getItem("blm48_has_new_noti");
  const badgeElement = document.getElementById("noti-badge");
  if (badgeElement) {
    badgeElement.style.display = (hasNewNoti === "true") ? "block" : "none";
  }
}
document.addEventListener("DOMContentLoaded", checkNotificationBadge);

// =========================================================================
// 🔔 ระบบแจ้งเตือนส่วนตัว (โพสของ Kami-Oshi/Oshi, คอมเมนต์/รีพาย/แท็กที่เกี่ยวกับเรา)
// ทำงานทุกหน้า (ไม่ใช่แค่ index.html) ฟังผ่าน Supabase Realtime
// (blm48SubscribeNotifications, ดู supabase-client.js) - แต่ละแถวใน public.notifications
// ตอนนี้ scope มาเฉพาะผู้รับแล้วตั้งแต่ฝั่งเซิร์ฟเวอร์ (recipient_username, ดู create_post/
// add_comment RPC) ฝั่งนี้แค่เช็คว่าแถวที่เข้ามาเป็นของเราหรือเปล่า ไม่ต้องคำนวณ favorites เอง
// เจอแล้วจะ 1) เปิดจุดแดงที่กระดิ่ง (ใช้ path เดิมของ checkNotificationBadge)
// 2) โชว์แบนเนอร์แบบแจ้งเตือน iOS ลอยลงมาจากขอบบนจอ ไม่ว่าจะอยู่หน้าไหนของเว็บแอพ
//
// การแจ้งเตือนแบบ Push จริง (ทำงานแม้ปิดแอป/เบราว์เซอร์) เป็นคนละกลไก - ยิงจากฝั่งเซิร์ฟเวอร์
// ตรงผ่าน Database Webhook -> Edge Function "send-push" ทุกครั้งที่มีแถวส่วนตัวถูก insert
// ไม่พึ่งพา Realtime/แท็บที่เปิดอยู่เลย ดู subscribeToPush() ด้านล่างสำหรับฝั่งขอ permission
// =========================================================================

// แปลง VAPID public key (base64url) เป็น Uint8Array ตามฟอร์แมตที่ PushManager.subscribe ต้องการ
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const BLM48_VAPID_PUBLIC_KEY = 'BMmRmzp_a8BerbNj2lvLkAwRRJbyaWE5Ee7ItH3WmXa1D6HDVuGtDSTNT2G8N-GtmS3NUR79HzpvwPY8Nne6x_o';

// ขอ permission แจ้งเตือน + สมัคร Push subscription ของเบราว์เซอร์/อุปกรณ์นี้ แล้วบันทึกไว้ที่
// เซิร์ฟเวอร์ผูกกับ username ปัจจุบัน ต้องเรียกจาก user gesture (กดปุ่ม) เท่านั้น เบราว์เซอร์ส่วนใหญ่
// จะบล็อก requestPermission() ที่ถูกยิงอัตโนมัติตอนโหลดหน้า
async function subscribeToPush(username) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { status: 'error', message: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push ค่ะ' };
  }
  if (!username) {
    return { status: 'error', message: 'กรุณาเข้าสู่ระบบก่อนเปิดการแจ้งเตือน' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { status: 'error', message: 'ไม่ได้รับอนุญาตให้แจ้งเตือนค่ะ' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(BLM48_VAPID_PUBLIC_KEY)
      });
    }

    const raw = subscription.toJSON();
    const res = await blm48SavePushSubscription(username, raw.endpoint, raw.keys.p256dh, raw.keys.auth);
    if (res && res.status && res.status !== 'success') {
      return { status: 'error', message: res.message || 'บันทึกการแจ้งเตือนไม่สำเร็จ' };
    }
    return { status: 'success' };
  } catch (e) {
    console.error('subscribeToPush error:', e);
    return { status: 'error', message: 'เปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ' };
  }
}

// ปิดการแจ้งเตือน Push ของเบราว์เซอร์/อุปกรณ์นี้ - ยกเลิก subscription ฝั่งเบราว์เซอร์ และลบแถวที่
// เคยบันทึกไว้ที่เซิร์ฟเวอร์ (endpoint นี้) ออกด้วย ไม่งั้นเซิร์ฟเวอร์จะยังพยายามส่ง push มาที่
// endpoint ที่ใช้งานไม่ได้แล้วอยู่ดี
async function unsubscribeFromPush(username) {
  if (!('serviceWorker' in navigator)) return { status: 'success' };
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return { status: 'success' };

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { status: 'success' };

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    if (username) await blm48RemovePushSubscription(username, endpoint);
    return { status: 'success' };
  } catch (e) {
    console.error('unsubscribeFromPush error:', e);
    return { status: 'error', message: 'ปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ' };
  }
}

// คืนสถานะ subscription ปัจจุบันของเบราว์เซอร์นี้ ('on' / 'off' / 'unsupported') - ใช้ตอนโหลดหน้า
// notification.html เพื่อโชว์ปุ่มถูกสถานะ (ไม่ใช้ Notification.permission เฉยๆ เพราะ permission
// อาจ granted ไว้แล้วแต่ผู้ใช้กดปิด/ยกเลิก subscription เองทีหลังก็ได้)
async function getPushSubscriptionStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return 'off';
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'on' : 'off';
  } catch (e) {
    return 'off';
  }
}

// บางเบราว์เซอร์/บางเวอร์ชัน iOS จะเคลียร์ Push subscription ทิ้งเงียบๆ หลังปัดแอปทิ้ง (permission
// ที่เคย "granted" ไว้ยังอยู่ แต่ subscription จริงหายไป) ทำให้ผู้ใช้ต้องมากดปุ่ม "เปิดการแจ้งเตือน"
// ใหม่ทุกครั้ง ฟังก์ชันนี้เช็คแล้ว subscribe ให้ใหม่แบบเงียบๆ (ไม่ต้องขอ permission ซ้ำเพราะ
// grant ไว้แล้ว ไม่มี prompt โผล่มากวนผู้ใช้) ทุกครั้งที่โหลดหน้าเว็บ - เรียกจาก DOMContentLoaded
// ด้านล่าง (ทำงานทุกหน้า) และจาก notification.html ก่อน render ปุ่ม toggle
async function ensurePushSubscriptionHealthy(username) {
  if (!username) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const status = await getPushSubscriptionStatus();
    if (status === 'off') {
      await subscribeToPush(username);
    }
  } catch (e) {
    console.error('ensurePushSubscriptionHealthy error:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const session = getUserSession();
  if (session && session.username) ensurePushSubscriptionHealthy(session.username);
});

function injectIosNotificationStyles() {
  if (document.getElementById('blm48-ios-noti-style')) return;
  const style = document.createElement('style');
  style.id = 'blm48-ios-noti-style';
  style.textContent = `
    .blm48-ios-noti {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 10px);
      left: 50%;
      width: min(92vw, 380px);
      background: rgba(250,250,252,0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      padding: 12px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      z-index: 999999;
      cursor: pointer;
      box-sizing: border-box;
      transform: translateX(-50%) translateY(-140%);
      opacity: 0;
      transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
      font-family: 'Quicksand', 'Kanit', sans-serif;
    }
    .blm48-ios-noti.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    .blm48-ios-noti-avatar { width: 38px; height: 38px; border-radius: 10px; object-fit: cover; flex: 0 0 auto; background: #eee; }
    .blm48-ios-noti-body { flex: 1; min-width: 0; }
    .blm48-ios-noti-row1 { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .blm48-ios-noti-title { font-weight: 700; font-size: 0.85rem; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .blm48-ios-noti-time { font-size: 0.68rem; color: #888; flex: 0 0 auto; }
    .blm48-ios-noti-text { font-size: 0.8rem; color: #333; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `;
  document.head.appendChild(style);
}

let blm48IosNotiTimer = null;
// แสดงแบนเนอร์แจ้งเตือนสไตล์ iOS ลอยลงมาจากขอบบนจอ - ทำงานได้ทุกหน้าที่โหลด common.js
function showIosNotification({ avatar, title, text, onClick }) {
  injectIosNotificationStyles();
  const existing = document.querySelector('.blm48-ios-noti');
  if (existing) existing.remove();
  if (blm48IosNotiTimer) clearTimeout(blm48IosNotiTimer);

  const el = document.createElement('div');
  el.className = 'blm48-ios-noti';
  el.innerHTML = `
    <img class="blm48-ios-noti-avatar" src="${escapeAttr(avatar || 'https://lh3.googleusercontent.com/d/1rebp2F8vyP0nyvsEOFD9Nw2mPcRtVqtG=s1000')}" alt="">
    <div class="blm48-ios-noti-body">
      <div class="blm48-ios-noti-row1">
        <span class="blm48-ios-noti-title">${escapeHtml(title)}</span>
        <span class="blm48-ios-noti-time">now</span>
      </div>
      <div class="blm48-ios-noti-text">${escapeHtml(text || '')}</div>
    </div>
  `;
  const dismiss = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  };
  el.addEventListener('click', () => {
    dismiss();
    if (typeof onClick === 'function') onClick();
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  blm48IosNotiTimer = setTimeout(dismiss, 5000);
}

// กันแจ้งเตือนซ้ำ: ตอนแท็บเปิดอยู่+subscribe push ไว้ด้วย มีโอกาสที่ทั้ง Realtime (ด้านล่าง)
// และ Service Worker push message (ดูด้านล่างสุด) จะยิงมาถึงเกือบพร้อมกันสำหรับแจ้งเตือนแถวเดียวกัน
// เก็บ id ที่เพิ่งโชว์ไปแล้วไว้ ใครมาถึงก่อนได้โชว์ อีกทางนึงข้ามไปเลย
const __blm48ShownNotiIds = new Set();
function blm48MarkNotiShown(id) {
  if (id === undefined || id === null) return true;
  if (__blm48ShownNotiIds.has(id)) return false;
  __blm48ShownNotiIds.add(id);
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getUserSession() || typeof blm48SubscribeNotifications !== 'function') return;

  const subscribedAt = Date.now();
  blm48SubscribeNotifications((row) => {
    if (!row || !row.writer) return;
    const isBroadcast = !row.recipient_username;
    const broadcastTypeVal = row.notifType || row.notif_type;
    // broadcast rows ปกติไม่โชว์ toast เหมือนเดิม ยกเว้น notif_type='shop' (แจ้งเตือนสินค้าเปิดขาย
    // ต้องเห็นทุกคน ดู check_shop_open_notifications() ฝั่ง Supabase ที่ยิง broadcast แบบนี้) หรือ
    // 'admin' (ประกาศที่แอดมินพิมพ์เองในหน้า notification.html - add_notification RPC)
    if (isBroadcast && broadcastTypeVal !== 'shop' && broadcastTypeVal !== 'admin') return;

    const rowTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
    if (rowTs < subscribedAt) return; // ข้ามของเก่าที่อาจถูกส่งมาตอนเพิ่ง subscribe

    if (!isBroadcast) {
      // เช็ค username สดทุกครั้ง (ไม่ cache ไว้ตอน subscribe) เพราะตอนโหลดหน้าเสร็จใหม่ๆ session
      // ในเครื่องอาจยังเป็นข้อมูลเก่า กว่า syncUserData() จะดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์มาทับ
      const currentUsername = getUsername();
      if (!currentUsername || row.recipient_username !== currentUsername) return;
    }
    if (!blm48MarkNotiShown(row.id)) return;

    localStorage.setItem('blm48_has_new_noti', 'true');
    if (typeof checkNotificationBadge === 'function') checkNotificationBadge();

    const notifTypeVal = row.notifType || row.notif_type;
    const targetUrl = row.post_id
      ? `postdetail?id=${encodeURIComponent(row.post_id)}`
      : (notifTypeVal === 'shop' ? 'shop.html' : (notifTypeVal === 'wallet' ? 'history.html' : (notifTypeVal === 'preorder' ? 'orders.html' : 'notification.html')));
    showIosNotification({
      avatar: row.avatar,
      title: row.writer,
      text: row.action,
      onClick: () => { window.location.href = targetUrl; }
    });
  });
});

// เมื่อ Service Worker เจอ push event ตอนแท็บนี้กำลังโฟกัสอยู่พอดี (ดู sw.js) จะส่ง postMessage
// มาแทนการเด้ง OS banner ซ้อนกับสิ่งที่เห็นอยู่แล้ว - โชว์เป็นแบนเนอร์ในแอปแบบเดียวกับข้างบนแทน
// (นี่คือทางที่ทำให้ "อยู่ในแอปแล้วก็ยังเห็นแจ้งเตือน" ได้ ไม่ใช่แค่ตอนแอปถูกปิด/อยู่เบื้องหลัง)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.type !== 'blm48-push' || !msg.payload) return;
    const payload = msg.payload;
    if (!blm48MarkNotiShown(payload.id)) return;

    localStorage.setItem('blm48_has_new_noti', 'true');
    if (typeof checkNotificationBadge === 'function') checkNotificationBadge();

    showIosNotification({
      avatar: payload.avatar,
      title: payload.title,
      text: payload.body,
      onClick: () => { window.location.href = payload.url || 'notification.html'; }
    });
  });
}

// =========================================================================
// 🎨 ระบบธีมสีตามวง — เปลี่ยนสีหลักของทั้งแอพเป็นสีวงของ Champ of the Month
// ทุกหน้าประกาศตัวแปรสีธีมไว้คนละชื่อ (--primary-pink, --blm-pink, --blmem-pink)
// ฟังก์ชันนี้ set ทับทุกชื่อไปพร้อมกัน หน้าไหนใช้ชื่อไหนอยู่ก็จะรับสีไปเอง
// =========================================================================
const GROUP_THEME_VAR_NAMES = ['--primary-pink', '--soft-pink', '--blm-pink', '--blm-light-pink', '--blmem-pink', '--blmem-pink-light'];
const GROUP_THEME_LIGHT_VAR_NAMES = ['--soft-pink', '--blm-light-pink', '--blmem-pink-light'];
const GROUP_THEMES = {
  NPT48: { primary: '#6acbfc', light: '#e4f6ff', metaColor: '#6acbfc' },
  BLM48: { primary: '#ff85a2', light: '#ffe4e1', metaColor: '#ffc0cb' }
};

// สีกรอบรูปโปรไฟล์ประจำวง — ใช้กับรูปเมมเบอร์ในกิจกรรมโหวต และกิจกรรมอื่นๆ ที่จะตามมา
// รับได้ทั้งชื่อวง ("NPT48") และชื่อผู้สมัครแบบมีวงต่อท้าย ("April NPT48"); ไม่รู้วง = BLM48
const GROUP_FRAME_COLORS = { BLM48: '#ffde5b', NPT48: '#66cbff' };
function groupFrameColor(groupOrName) {
  const s = String(groupOrName || '').trim().toUpperCase();
  const key = Object.keys(GROUP_FRAME_COLORS).find(g => s === g || s.endsWith(' ' + g));
  return GROUP_FRAME_COLORS[key || 'BLM48'];
}

// 🏅 รูปมินิอันดับ 1-3 ในกรอบเหรียญขอบหยัก + มงกุฎ (ทอง/เงิน/ทองแดง) — แบบเดียวกับหน้า topfans.html
// ใช้กับแถว Top Fans / Top Today VIP ในหน้า Home และหน้า Member; rank เป็น 0-based
const MEDAL_COLORS = [
  { main: '#f5b400', light: '#ffe17a', dark: '#c98a00' },
  { main: '#a9aeb8', light: '#eef0f4', dark: '#7d828c' },
  { main: '#c8793a', light: '#f3bf8f', dark: '#9a5524' }
];
let medalUid = 0;
function blm48MedalAvatarHtml(img, rank, size, alt) {
  if (!document.getElementById('blm48-medal-css')) {
    const st = document.createElement('style');
    st.id = 'blm48-medal-css';
    st.textContent = `
      .medal-mini { position: relative; display: inline-block; flex-shrink: 0; direction: ltr; }
      .medal-mini > svg.mm-badge { position: absolute; inset: 0; width: 100%; height: 100%; }
      .medal-mini > img { position: absolute; inset: 15%; width: 70%; height: 70%; border-radius: 50%; object-fit: cover; background: #fff; border: 1px solid #fff; }
      .medal-mini > svg.mm-crown { position: absolute; left: 50%; transform: translateX(-50%); top: -24%; width: 70%; pointer-events: none; }`;
    document.head.appendChild(st);
  }
  const c = MEDAL_COLORS[rank] || MEDAL_COLORS[2];
  const uid = ++medalUid;
  let bumps = '';
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14;
    bumps += `<circle cx="${(50 + 44 * Math.cos(a)).toFixed(2)}" cy="${(50 + 44 * Math.sin(a)).toFixed(2)}" r="9"/>`;
  }
  const fallback = 'https://raw.githubusercontent.com/Chatchapong-Sing/stockManagement/main/default-profile.png';
  const src = img && String(img).trim() ? String(img) : fallback;
  return `<span class="medal-mini" style="width:${size}px;height:${size}px;margin-top:${Math.round(size * 0.24)}px;">
    <svg class="mm-badge" viewBox="-6 -6 112 112"><defs><linearGradient id="mmb${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset="1" stop-color="${c.main}"/></linearGradient></defs><g fill="url(#mmb${uid})" stroke="${c.dark}" stroke-width="1">${bumps}<circle cx="50" cy="50" r="44"/></g></svg>
    <img src="${escapeHtml(src)}" alt="${escapeHtml(alt || '')}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">
    <svg class="mm-crown" viewBox="0 0 64 34"><defs><linearGradient id="mmc${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset="1" stop-color="${c.main}"/></linearGradient></defs><path d="M6 30 L3 11 L17 20 L24 7 L32 17 L40 7 L47 20 L61 11 L58 30 Z" fill="url(#mmc${uid})" stroke="${c.dark}" stroke-width="1.6" stroke-linejoin="round"/><path d="M32 0.5 L34.2 5.3 L39.3 5.8 L35.5 9.2 L36.6 14.2 L32 11.6 L27.4 14.2 L28.5 9.2 L24.7 5.8 L29.8 5.3 Z" fill="${c.light}" stroke="${c.dark}" stroke-width="1.2" stroke-linejoin="round"/></svg>
  </span>`;
}

// เขียนค่าตัวแปรสี CSS ทุกชื่อ (ทุกหน้า) ให้ตรงกับวงที่ระบุ ("BLM48" คือค่าปกติ)
function applyGroupThemeVars(groupName) {
  const group = (groupName || 'BLM48').toString().trim().toUpperCase();
  const theme = GROUP_THEMES[group] || GROUP_THEMES.BLM48;
  const root = document.documentElement.style;

  if (group === 'NPT48') {
    GROUP_THEME_VAR_NAMES.forEach(name => {
      const isLight = GROUP_THEME_LIGHT_VAR_NAMES.includes(name);
      root.setProperty(name, isLight ? theme.light : theme.primary);
    });
  } else {
    // BLM48 = ค่าเริ่มต้น: ลบ inline override ทิ้ง ให้กลับไปใช้ค่า default ที่ประกาศไว้ใน :root ของแต่ละหน้าเอง
    GROUP_THEME_VAR_NAMES.forEach(name => root.removeProperty(name));
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', theme.metaColor);
}

// ดึงวงของ Champ of the Month ล่าสุดจากเซิร์ฟเวอร์ แล้วเปลี่ยนธีมสีทั้งแอพให้ตรงวง
// ใช้ localStorage เป็นแคชกันจอกระพริบสีเดิมระหว่างรอโหลด และกันหน้าที่ยิง fetch ไม่ทัน/พลาด
async function applyGroupTheme() {
  const cachedGroup = localStorage.getItem('bnl_champ_group') || 'BLM48';
  applyGroupThemeVars(cachedGroup);

  try {
    const json = await blm48GetChampOfTheMonth();
    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      // ข้อมูลถูก reverse ไว้จากฝั่งเซิร์ฟเวอร์แล้ว ตัวแรกคือแชมป์ล่าสุด
      const latestGroup = (json.data[0].groupName || 'BLM48').toString().trim().toUpperCase();
      localStorage.setItem('bnl_champ_group', latestGroup);
      localStorage.setItem('bnl_champ_name', json.data[0].name || '');
      localStorage.setItem('bnl_champ_month', json.data[0].monthYear || '');
      applyGroupThemeVars(latestGroup);
    }
  } catch (e) {
    // เน็ตหลุด/เรียกไม่สำเร็จ — ปล่อยให้ใช้สีจากแคชเดิมต่อไป ไม่ต้องล้มทั้งหน้า
    console.error("applyGroupTheme error:", e);
  }
}

// =========================================================================
// ล็อกการเลื่อนพื้นหลังตอนเปิด popup/modal ใดๆ — ใช้ตัวนับแทน boolean เดียว
// เผื่อกรณี modal ซ้อนกัน (เปิดอันที่ 2 ก่อนปิดอันแรก) จะได้ไม่ปลดล็อกก่อนเวลา
// เรียก blm48LockBodyScroll() ตอนเปิด และ blm48UnlockBodyScroll() ตอนปิด เสมอเป็นคู่
// =========================================================================
let __blm48ScrollLockCount = 0;
function blm48LockBodyScroll() {
  __blm48ScrollLockCount++;
  document.body.style.overflow = 'hidden';
}
function blm48UnlockBodyScroll() {
  __blm48ScrollLockCount = Math.max(0, __blm48ScrollLockCount - 1);
  if (__blm48ScrollLockCount === 0) document.body.style.overflow = '';
}
document.addEventListener("DOMContentLoaded", applyGroupTheme);

// =========================================================================
// 🌟 Special Fans Day: นับวันของเดือน (Countdown เดือน) - โชว์สัปดาห์ปัจจุบันของเดือน
// วันที่ผ่านแล้ว = ✓, วันนี้ = 🍪, วันที่ยังไม่ถึง = เลขวันที่ (เวลาไทย)
// ใช้ร่วมกัน index.html (เหนือ Member Ranking) และ specialfansday.html - สไตล์อยู่ใน glassmorphism.css
// =========================================================================
function buildSpecialFansDaysHtml() {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const currentWeekNumber = Math.ceil(today / 7);
  const startDay = ((currentWeekNumber - 1) * 7) + 1;
  const endDay = Math.min(startDay + 6, daysInMonth);

  let daysHtml = '';
  for (let day = startDay; day <= endDay; day++) {
    let statusClass = 'future';
    let content = day;
    if (day < today) {
      statusClass = 'checked';
      content = '<i class="fas fa-check"></i>';
    } else if (day === today) {
      statusClass = 'current';
      content = '<i class="fas fa-cookie-bite"></i>';
    }
    daysHtml += `
      <div class="day-item ${day <= today ? 'reached' : 'upcoming'}">
        <div class="day-circle ${statusClass}">${content}</div>
        <span class="day-date">${day} ${MONTHS[month]}</span>
      </div>
    `;
  }
  return `<div class="week-block"><div class="days-row">${daysHtml}</div></div>`;
}
