// =========================================================================
// BLM48 Membership — 🎃 Halloween theme switch + floating decorations.
// Loaded in <head> of every member-facing page, right after halloween.css.
// Adds html.theme-halloween (which activates every rule in halloween.css)
// only between HALLOWEEN_START and HALLOWEEN_END, so the theme turns itself
// on and off each year without touching the pages again.
// =========================================================================

(function halloweenTheme() {
  // เดือนนับจาก 1 (ต.ค. = 10) — ช่วงที่ธีมทำงาน: 1 ต.ค. ถึง 2 พ.ย. ของทุกปี
  const HALLOWEEN_START = { month: 10, day: 1 };
  const HALLOWEEN_END = { month: 11, day: 2 };

  const now = new Date();
  const today = (now.getMonth() + 1) * 100 + now.getDate();
  const inSeason = today >= HALLOWEEN_START.month * 100 + HALLOWEEN_START.day
    && today <= HALLOWEEN_END.month * 100 + HALLOWEEN_END.day;
  if (!inSeason) return;

  // ใส่คลาสทันทีตั้งแต่ใน <head> กันหน้ากระพริบเป็นธีมเดิมก่อนเปลี่ยน
  document.documentElement.classList.add('theme-halloween');

  // แถบสถานะเบราว์เซอร์/PWA ให้เป็นม่วงคืนฮาโลวีน
  function setThemeColor() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = '#2b1745';
  }

  const BAT_SVG = '<svg viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg"><path fill="#2a1d33" d="M32 10c-2-4-3-6-3-6l-1 4c-4-3-10-3-14 0 2 1 3 3 3 5-4-2-10-1-13 2 4 0 7 2 8 5 5-3 11-2 15 2 1-3 3-5 5-6 2 1 4 3 5 6 4-4 10-5 15-2 1-3 4-5 8-5-3-3-9-4-13-2 0-2 1-4 3-5-4-3-10-3-14 0l-1-4s-1 2-3 6z"/></svg>';
  const WEB_SVG = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#2a1d33" stroke-width="1"><path d="M0 0L100 100M0 0L100 38M0 0L38 100M0 0L100 0M0 0L0 100"/><path d="M20 0Q16 9 20 20Q9 16 0 20M42 0Q34 18 42 42Q18 34 0 42M66 0Q54 28 66 66Q28 54 0 66M90 0Q74 40 90 90Q40 74 0 90"/></svg>';
  const SPIDER_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g stroke="#2a1d33" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M9 11L3 7M9 13L2 13M9 15L3 19M10 16L6 22M15 11L21 7M15 13L22 13M15 15L21 19M14 16L18 22"/></g><ellipse cx="12" cy="9" rx="3" ry="3" fill="#2a1d33"/><ellipse cx="12" cy="15" rx="4" ry="5" fill="#2a1d33"/><circle cx="11" cy="8.5" r=".8" fill="#ff7518"/><circle cx="13" cy="8.5" r=".8" fill="#ff7518"/></svg>';

  function buildDecorations() {
    if (document.getElementById('hw-deco') || !document.body) return;
    const deco = document.createElement('div');
    deco.id = 'hw-deco';
    deco.setAttribute('aria-hidden', 'true');

    let html = '<div class="hw-web left">' + WEB_SVG + '</div>'
      + '<div class="hw-web right">' + WEB_SVG + '</div>'
      + '<div class="hw-spider">' + SPIDER_SVG + '</div>';

    // ค้างคาวบินผ่านจอเป็นระยะ — ความสูง/ความเร็ว/ดีเลย์ต่างกันให้ดูเป็นธรรมชาติ
    const bats = [
      { top: 18, size: 42, dur: 16, delay: 0 },
      { top: 34, size: 30, dur: 21, delay: 6 },
      { top: 55, size: 36, dur: 18, delay: 11 },
      { top: 72, size: 26, dur: 24, delay: 3 }
    ];
    bats.forEach(function (b) {
      html += '<div class="hw-bat" style="top:' + b.top + '%;width:' + b.size + 'px;animation-duration:'
        + b.dur + 's;animation-delay:' + b.delay + 's">' + BAT_SVG + '</div>';
    });

    // ฟักทอง/ผี/ลูกอม ลอยขึ้นช้าๆ จากขอบล่าง
    const floats = [
      { icon: '🎃', left: 8, dur: 26, delay: 0 },
      { icon: '👻', left: 30, dur: 32, delay: 9 },
      { icon: '🍬', left: 55, dur: 28, delay: 4 },
      { icon: '👻', left: 78, dur: 30, delay: 15 },
      { icon: '🎃', left: 92, dur: 34, delay: 20 }
    ];
    floats.forEach(function (f) {
      html += '<div class="hw-float" style="left:' + f.left + '%;animation-duration:' + f.dur
        + 's;animation-delay:' + f.delay + 's">' + f.icon + '</div>';
    });

    deco.innerHTML = html;
    document.body.appendChild(deco);
  }

  function init() {
    setThemeColor();
    buildDecorations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
