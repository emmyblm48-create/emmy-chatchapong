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
