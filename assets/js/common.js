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
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxF5G3E1HWhVTQOVGzWtsqSCZfXkq8ZrX6DqGKt_pcicYbi2_59B-ecEeeTU6-aqBEf/exec';
    const res = await fetch(`${scriptURL}?action=getChampOfTheMonth`);
    const json = await res.json();
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
