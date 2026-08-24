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
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, false);
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });
  document.addEventListener('dblclick', function(e) { e.preventDefault(); }, { passive: false });
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
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'index';
      }
    }
  }, { passive: true });
});

// 🛡️ กันกดรูปค้าง (long-press) แล้วเซฟรูป / คลิกขวา Save Image As ทุกหน้า ยกเว้นหน้า inventory
// (หน้า inventory ต้องการให้ผู้ใช้เซฟรูปไอเทมที่ซื้อไว้ได้ตามปกติ)
// ใช้ delegated event ที่ document แทนการเซ็ต attribute ทีละรูป เพื่อให้ครอบคลุมรูปที่ยังไม่ถูกสร้าง
// ตอนนี้ด้วย (โพสต์/แกลเลอรีที่โหลดทีหลังผ่าน JS) โดยไม่ต้องใช้ MutationObserver
(function preventImageSaving() {
  const currentPage = window.location.pathname.replace(/\/+$/, '').split('/').pop() || '';
  if (currentPage === 'inventory' || currentPage === 'inventory.html') return;

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
  const style = document.createElement('style');
  style.textContent = `
    img {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
  `;
  document.head.appendChild(style);
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
      'a, button, input, textarea, img, audio, svg, [onclick], .voice-msg-bubble, [id^="comment-section-"]'
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
  if (el) el.innerText = postCookies;
}

// หา postId จากคอมเมนต์/reply (ใช้ตอนกดใจคอมเมนต์ ซึ่งมีแค่ commentId ไม่มี postId ส่งมาตรงๆ)
function findPostIdFromElement(el) {
  const postCard = el && el.closest ? el.closest('.post-card') : null;
  return postCard && postCard.id ? postCard.id.replace(/^post-/, '') : null;
}

// แชร์โพสต์เป็นลิงก์ (เปิด native share sheet ถ้ามี ไม่งั้น copy ลิงก์ไปคลิปบอร์ด)
async function actionSharePost(postId) {
  if (!postId) return;
  const shareUrl = `${window.location.origin}/index?post=${encodeURIComponent(postId)}`;
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
      font-family: 'Quicksand', 'Kanit', -apple-system, sans-serif;
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
    if (!row || !row.writer || !row.recipient_username) return; // broadcast/admin rows ไม่โชว์ toast (เหมือนเดิม)
    const rowTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
    if (rowTs < subscribedAt) return; // ข้ามของเก่าที่อาจถูกส่งมาตอนเพิ่ง subscribe

    // เช็ค username สดทุกครั้ง (ไม่ cache ไว้ตอน subscribe) เพราะตอนโหลดหน้าเสร็จใหม่ๆ session
    // ในเครื่องอาจยังเป็นข้อมูลเก่า กว่า syncUserData() จะดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์มาทับ
    const currentUsername = getUsername();
    if (!currentUsername || row.recipient_username !== currentUsername) return;
    if (!blm48MarkNotiShown(row.id)) return;

    localStorage.setItem('blm48_has_new_noti', 'true');
    if (typeof checkNotificationBadge === 'function') checkNotificationBadge();

    const targetUrl = row.post_id ? `postdetail?id=${encodeURIComponent(row.post_id)}` : 'notification.html';
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
// 🎙️ Voice message bubble player - ใช้ร่วมกันในทุกหน้าที่แสดงฟีดโพส (index.html, member.html)
// แต่ละโพสมี <audio class="voice-msg-audio" id="voice-audio-{postId}"> ซ่อนอยู่ พร้อมปุ่มเล่น/แถบ
// ความคืบหน้า/เวลา ที่ผูก id ตาม postId เดียวกัน เรียกใช้ผ่าน inline event attribute ในโพสนั้นๆ
// =========================================================================

function formatVoiceMsgTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// เรียกตอน <audio> ยิง onloadedmetadata - ใช้โชว์ความยาวคลิปทั้งหมดก่อนกดเล่น
function initVoiceDuration(postId) {
  const audio = document.getElementById(`voice-audio-${postId}`);
  const timeEl = document.getElementById(`voice-time-${postId}`);
  if (audio && timeEl && isFinite(audio.duration)) {
    timeEl.textContent = formatVoiceMsgTime(audio.duration);
  }
}

// เรียกตอน <audio> ยิง ontimeupdate ระหว่างเล่น - อัปเดตแถบความคืบหน้า + เวลาปัจจุบัน
function updateVoiceProgress(postId) {
  const audio = document.getElementById(`voice-audio-${postId}`);
  const progress = document.getElementById(`voice-progress-${postId}`);
  const timeEl = document.getElementById(`voice-time-${postId}`);
  if (!audio || !audio.duration) return;
  if (progress) progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  if (timeEl) timeEl.textContent = formatVoiceMsgTime(audio.currentTime);
}

// เรียกตอน <audio> ยิง onended - รีเซ็ตปุ่ม/แถบกลับเป็นสถานะพร้อมเล่นใหม่
function onVoiceEnded(postId) {
  const audio = document.getElementById(`voice-audio-${postId}`);
  const progress = document.getElementById(`voice-progress-${postId}`);
  const timeEl = document.getElementById(`voice-time-${postId}`);
  const btn = document.getElementById(`voice-play-btn-${postId}`);
  if (progress) progress.style.width = '0%';
  if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i>';
  if (audio && timeEl && isFinite(audio.duration)) timeEl.textContent = formatVoiceMsgTime(audio.duration);
}

// ปุ่มเล่น/หยุดหลัก - หยุดคลิปเสียงอื่นที่กำลังเล่นอยู่ก่อนเสมอ กันเสียงซ้อนกันหลายคลิปพร้อมกันในฟีด
function toggleVoiceMessage(postId) {
  const audio = document.getElementById(`voice-audio-${postId}`);
  const btn = document.getElementById(`voice-play-btn-${postId}`);
  if (!audio || !btn) return;

  document.querySelectorAll('audio.voice-msg-audio').forEach(el => {
    if (el !== audio && !el.paused) {
      el.pause();
      const otherId = el.id.replace('voice-audio-', '');
      const otherBtn = document.getElementById(`voice-play-btn-${otherId}`);
      if (otherBtn) otherBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  });

  if (audio.paused) {
    audio.play();
    btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    audio.pause();
    btn.innerHTML = '<i class="fa-solid fa-play"></i>';
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
