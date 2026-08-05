// =========================================================================
// BLM48 Membership — Shared utilities used across every page.
// Loaded via <script src="assets/js/common.js"></script>.
// Function names match what each page already called, so no call sites
// need to change — only the duplicated function bodies are removed per page.
// =========================================================================

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
// 🔔 ระบบแจ้งเตือนเมื่อ Kami-Oshi/Oshi ของเราลงโพสใหม่ - ทำงานทุกหน้า (ไม่ใช่แค่ index.html)
// ฟังผ่าน Supabase Realtime (blm48SubscribeNotifications, ดู supabase-client.js)
// เพราะโพสของเมมเบอร์ถูก insert เข้า public.notifications ตรงจาก create_post RPC โดยตรง
// เจอแล้วจะ 1) เปิดจุดแดงที่กระดิ่ง (ใช้ path เดิมของ checkNotificationBadge)
// 2) โชว์แบนเนอร์แบบแจ้งเตือน iOS ลอยลงมาจากขอบบนจอ ไม่ว่าจะอยู่หน้าไหนของเว็บแอพ
// =========================================================================

// คืนรายชื่อเมมเบอร์ที่เป็น Kami-Oshi/Oshi ของผู้ใช้ปัจจุบัน (lowercase ไว้เทียบง่ายๆ)
function getFavoriteMemberNames() {
  const session = getUserSession();
  if (!session) return [];
  const names = [];
  if (session.kamioshi) names.push(session.kamioshi);
  if (Array.isArray(session.oshi)) names.push(...session.oshi);
  return names.map(n => (n || '').toString().trim().toLowerCase()).filter(Boolean);
}

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

document.addEventListener('DOMContentLoaded', () => {
  if (!getUserSession() || typeof blm48SubscribeNotifications !== 'function') return;

  const subscribedAt = Date.now();
  blm48SubscribeNotifications((row) => {
    if (!row || !row.writer) return;
    const rowTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
    if (rowTs < subscribedAt) return; // ข้ามของเก่าที่อาจถูกส่งมาตอนเพิ่ง subscribe

    // เช็ค favorites สดทุกครั้งที่มีแจ้งเตือนใหม่เข้ามา (ไม่ cache ไว้ตอน subscribe)
    // เพราะตอนโหลดหน้าเสร็จใหม่ๆ session ในเครื่องอาจยังเป็นข้อมูลเก่า กว่า syncUserData()
    // จะดึงข้อมูล kamioshi/oshi ล่าสุดจากเซิร์ฟเวอร์มาทับ ก็อาจจะผ่านไปหลังจากนี้แล้ว
    const favorites = getFavoriteMemberNames();
    if (favorites.length === 0) return;

    const writerLower = row.writer.toString().trim().toLowerCase();
    if (!favorites.includes(writerLower)) return;

    localStorage.setItem('blm48_has_new_noti', 'true');
    if (typeof checkNotificationBadge === 'function') checkNotificationBadge();

    showIosNotification({
      avatar: row.avatar,
      title: `${row.writer} ลงโพสใหม่แล้ว! 💌`,
      text: row.action,
      onClick: () => { window.location.href = 'notification.html'; }
    });
  });
});

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
document.addEventListener("DOMContentLoaded", applyGroupTheme);
