// =========================================================================
// BLM48 Membership — 🎉 ธีมเทศกาลอัตโนมัติ (สากล + ไทย) + ของตกแต่งลอยบนจอ
// Loaded in <head> of every member-facing page, right after festivals.css.
// Picks the festival whose window contains today's date and adds
// html.theme-festival + html.theme-<id> (which activate the rules in
// festivals.css). Outside every window nothing happens, so the pages fall
// back to the normal theme without touching them again.
//
// ดูตัวอย่างธีมไหนก็ได้ทุกเวลา: เปิดหน้าใดก็ได้พร้อม ?festival=<id>
//   เช่น index?festival=songkran  (จำไว้จนปิดแท็บ)
//   ?festival=none = ปิดธีมทั้งหมด, ?festival=auto = กลับไปใช้ตามวันที่จริง
// =========================================================================

(function festivalTheme() {
  // ---------------------------------------------------------------------
  // วันที่ของเทศกาลตามปฏิทินจันทรคติ (เปลี่ยนทุกปี) — เดือน-วัน ตามเวลาไทย
  // ---------------------------------------------------------------------
  const CHINESE_NEW_YEAR = {
    2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03',
    2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19', 2035: '02-08'
  };
  // ปีที่ไม่มีในตารางนี้จะประมาณจากวันเพ็ญที่ใกล้ 15 พ.ย. ที่สุด (อาจคลาด ±1 วัน)
  // ควรเช็กกับปฏิทินไทยแล้วเติมลงตารางล่วงหน้า
  const LOY_KRATHONG = {
    2026: '11-24', 2027: '11-13'
  };

  const DAY = 86400000;
  // นับเป็น "เลขวัน" (ไม่สนเวลา) เทียบช่วงวันที่ได้ง่ายและข้ามปีได้
  function dayNum(y, m, d) { return Date.UTC(y, m - 1, d) / DAY; }
  function fixed(y, mmdd) { const p = mmdd.split('-'); return dayNum(y, +p[0], +p[1]); }

  // วันเพ็ญ (เวลาไทย) ที่ใกล้วันที่กำหนดที่สุด — ใช้เป็นค่าประมาณวันลอยกระทง
  function nearestFullMoon(y, m, d) {
    const SYNODIC = 29.530588853;
    const REF_FULL_MOON = Date.UTC(2000, 0, 21, 4, 40) / DAY; // 21 ม.ค. 2000 04:40 UTC
    const target = dayNum(y, m, d);
    const n = Math.round((target - REF_FULL_MOON) / SYNODIC);
    return Math.floor(REF_FULL_MOON + n * SYNODIC + 7 / 24); // +7 ชม. = เวลาไทย
  }

  // เสาร์ที่ 2 ของเดือนมกราคม (วันเด็ก)
  function secondSaturdayOfJanuary(y) {
    const firstDow = new Date(Date.UTC(y, 0, 1)).getUTCDay();
    return dayNum(y, 1, 1 + ((6 - firstDow + 7) % 7) + 7);
  }

  // ---------------------------------------------------------------------
  // รายการเทศกาล — เรียงตามลำดับความสำคัญ (ถ้าช่วงทับกัน อันที่อยู่บนกว่าชนะ)
  // window(y) คืน [วันเริ่ม, วันสุดท้าย] เป็นเลขวันของเทศกาลรอบปี y (หรือ null)
  //   barColor: สีแถบสถานะเบราว์เซอร์ / PWA
  //   fall:  ของที่ร่วงลงมาจากด้านบน    rise: ของที่ลอยขึ้นจากด้านล่าง
  //   icons: สลับไอคอนพื้นหลังหลังการ์ดอันดับหน้าแรก (index.html #bg-decorations)
  // ---------------------------------------------------------------------
  const FESTIVALS = [
    {
      id: 'childrensday', name: 'วันเด็ก',
      window: y => { const s = secondSaturdayOfJanuary(y); return [s - 3, s]; },
      barColor: '#2ec4b6',
      rise: ['🎈', '🪁', '🎈', '🧸', '🎈'],
      icons: { 'fa-crown': 'fa-child-reaching', 'fa-heart': 'fa-gift', 'fa-music': 'fa-puzzle-piece', 'fa-wand-magic-sparkles': 'fa-ice-cream' }
    },
    {
      id: 'chinesenewyear', name: 'ตรุษจีน',
      window: y => CHINESE_NEW_YEAR[y] ? [fixed(y, CHINESE_NEW_YEAR[y]) - 5, fixed(y, CHINESE_NEW_YEAR[y]) + 4] : null,
      barColor: '#8b0000',
      fall: ['🧧', '✨', '🧧'],
      rise: ['🏮', '🍊', '🏮', '🍊', '🏮'],
      icons: { 'fa-crown': 'fa-dragon', 'fa-heart': 'fa-coins', 'fa-star': 'fa-fan', 'fa-music': 'fa-drum', 'fa-wand-magic-sparkles': 'fa-envelope' }
    },
    {
      id: 'loykrathong', name: 'ลอยกระทง',
      window: y => {
        const day = LOY_KRATHONG[y] ? fixed(y, LOY_KRATHONG[y]) : nearestFullMoon(y, 11, 15);
        return [day - 6, day + 1];
      },
      barColor: '#0b1d3a',
      rise: ['🪷', '🕯️', '✨', '🪷', '🕯️'],
      icons: { 'fa-crown': 'fa-moon', 'fa-heart': 'fa-water', 'fa-wand-magic-sparkles': 'fa-fire' }
    },
    {
      id: 'songkran', name: 'สงกรานต์',
      window: y => [dayNum(y, 4, 10), dayNum(y, 4, 16)],
      barColor: '#0077b6',
      fall: ['💧', '💦', '💧', '💧'],
      rise: ['🌼', '🌸', '🐘', '🌼', '🌸'],
      icons: { 'fa-crown': 'fa-sun', 'fa-heart': 'fa-droplet', 'fa-star': 'fa-umbrella-beach', 'fa-music': 'fa-water' }
    },
    {
      id: 'valentine', name: 'วาเลนไทน์',
      window: y => [dayNum(y, 2, 7), dayNum(y, 2, 14)],
      barColor: '#c9184a',
      fall: ['💕', '💗', '❤️', '💕'],
      rise: ['💌', '🌹', '💝', '🌹', '💌'],
      icons: { 'fa-crown': 'fa-heart', 'fa-star': 'fa-envelope', 'fa-wand-magic-sparkles': 'fa-gift' }
    },
    {
      id: 'christmas', name: 'คริสต์มาส',
      window: y => [dayNum(y, 12, 1), dayNum(y, 12, 25)],
      barColor: '#14532d',
      fall: ['❄️', '❄', '❄️', '❄'],
      rise: ['🎄', '🎁', '⛄', '🎁', '🎄'],
      icons: { 'fa-crown': 'fa-tree', 'fa-heart': 'fa-gifts', 'fa-star': 'fa-snowflake', 'fa-music': 'fa-bell', 'fa-wand-magic-sparkles': 'fa-candy-cane' }
    },
    {
      id: 'newyear', name: 'ปีใหม่',
      window: y => [dayNum(y, 12, 26), dayNum(y + 1, 1, 3)],
      barColor: '#0f1b3d',
      fall: ['✨', '🎊', '✨', '🎉'],
      rise: ['🎆', '🥂', '🎇', '🥂', '🎆'],
      icons: { 'fa-crown': 'fa-champagne-glasses', 'fa-heart': 'fa-gift' }
    },
    {
      id: 'halloween', name: 'ฮาโลวีน',
      window: y => [dayNum(y, 10, 1), dayNum(y, 11, 2)],
      barColor: '#2b1745',
      rise: ['🎃', '👻', '🍬', '👻', '🎃'],
      bats: true,
      icons: { 'fa-crown': 'fa-ghost', 'fa-heart': 'fa-spider', 'fa-star': 'fa-moon', 'fa-music': 'fa-hat-wizard', 'fa-wand-magic-sparkles': 'fa-skull' }
    }
  ];

  // ---------------------------------------------------------------------
  // เลือกเทศกาลของวันนี้ (หรือธีมที่สั่งดูตัวอย่างผ่าน ?festival=)
  // ---------------------------------------------------------------------
  const PREVIEW_KEY = 'blm48_festival_preview';
  function readPreview() {
    try {
      const param = new URLSearchParams(window.location.search).get('festival');
      if (param === 'auto') sessionStorage.removeItem(PREVIEW_KEY);
      else if (param) sessionStorage.setItem(PREVIEW_KEY, param);
      return sessionStorage.getItem(PREVIEW_KEY);
    } catch (e) {
      return null;
    }
  }

  function festivalForToday() {
    const now = new Date();
    const y = now.getFullYear();
    const today = dayNum(y, now.getMonth() + 1, now.getDate());
    // เช็กรอบปีที่แล้วด้วย สำหรับเทศกาลที่คร่อมปี (ปีใหม่ 26 ธ.ค. - 3 ม.ค.)
    return FESTIVALS.find(f => [y - 1, y].some(yy => {
      const w = f.window(yy);
      return w && today >= w[0] && today <= w[1];
    })) || null;
  }

  const preview = readPreview();
  const festival = preview === 'none' ? null
    : (preview && FESTIVALS.find(f => f.id === preview)) || festivalForToday();
  if (!festival) return;

  // ใส่คลาสทันทีตั้งแต่ใน <head> กันหน้ากระพริบเป็นธีมเดิมก่อนเปลี่ยน
  document.documentElement.classList.add('theme-festival', 'theme-' + festival.id);

  function setThemeColor() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = festival.barColor;
  }

  const BAT_SVG = '<svg viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg"><path fill="#2a1d33" d="M32 10c-2-4-3-6-3-6l-1 4c-4-3-10-3-14 0 2 1 3 3 3 5-4-2-10-1-13 2 4 0 7 2 8 5 5-3 11-2 15 2 1-3 3-5 5-6 2 1 4 3 5 6 4-4 10-5 15-2 1-3 4-5 8-5-3-3-9-4-13-2 0-2 1-4 3-5-4-3-10-3-14 0l-1-4s-1 2-3 6z"/></svg>';
  const WEB_SVG = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#2a1d33" stroke-width="1"><path d="M0 0L100 100M0 0L100 38M0 0L38 100M0 0L100 0M0 0L0 100"/><path d="M20 0Q16 9 20 20Q9 16 0 20M42 0Q34 18 42 42Q18 34 0 42M66 0Q54 28 66 66Q28 54 0 66M90 0Q74 40 90 90Q40 74 0 90"/></svg>';
  const SPIDER_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g stroke="#2a1d33" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M9 11L3 7M9 13L2 13M9 15L3 19M10 16L6 22M15 11L21 7M15 13L22 13M15 15L21 19M14 16L18 22"/></g><ellipse cx="12" cy="9" rx="3" ry="3" fill="#2a1d33"/><ellipse cx="12" cy="15" rx="4" ry="5" fill="#2a1d33"/><circle cx="11" cy="8.5" r=".8" fill="#ff7518"/><circle cx="13" cy="8.5" r=".8" fill="#ff7518"/></svg>';

  function buildDecorations() {
    if (document.getElementById('fx-deco') || !document.body) return;
    const deco = document.createElement('div');
    deco.id = 'fx-deco';
    deco.setAttribute('aria-hidden', 'true');
    let html = '';

    // ฮาโลวีน: ใยแมงมุม แมงมุมห้อย และค้างคาวบินผ่านจอ
    if (festival.bats) {
      html += '<div class="fx-web left">' + WEB_SVG + '</div>'
        + '<div class="fx-web right">' + WEB_SVG + '</div>'
        + '<div class="fx-spider">' + SPIDER_SVG + '</div>';
      [
        { top: 18, size: 42, dur: 16, delay: 0 },
        { top: 34, size: 30, dur: 21, delay: 6 },
        { top: 55, size: 36, dur: 18, delay: 11 },
        { top: 72, size: 26, dur: 24, delay: 3 }
      ].forEach(function (b) {
        html += '<div class="fx-bat" style="top:' + b.top + '%;width:' + b.size + 'px;animation-duration:'
          + b.dur + 's;animation-delay:' + b.delay + 's">' + BAT_SVG + '</div>';
      });
    }

    // ของที่ร่วงลงมา (หิมะ หยดน้ำ หัวใจ พลุกระดาษ) — ตำแหน่ง/ความเร็ว/ดีเลย์ต่างกันให้ดูเป็นธรรมชาติ
    (festival.fall || []).forEach(function (icon, i) {
      html += '<div class="fx-fall" style="left:' + (12 + i * 24) + '%;animation-duration:' + (14 + (i % 3) * 5)
        + 's;animation-delay:' + (i * 4) + 's">' + icon + '</div>';
    });

    // ของที่ลอยขึ้นช้าๆ จากขอบล่าง
    const riseLeft = [8, 30, 55, 78, 92];
    const riseDur = [26, 32, 28, 30, 34];
    const riseDelay = [0, 9, 4, 15, 20];
    (festival.rise || []).forEach(function (icon, i) {
      html += '<div class="fx-rise" style="left:' + riseLeft[i % 5] + '%;animation-duration:' + riseDur[i % 5]
        + 's;animation-delay:' + riseDelay[i % 5] + 's">' + icon + '</div>';
    });

    deco.innerHTML = html;
    document.body.appendChild(deco);
  }

  // ไอคอนพื้นหลังหลังการ์ดอันดับ (index.html #bg-decorations) → ไอคอนของเทศกาล
  function swapDecorIcons() {
    const swaps = festival.icons || {};
    document.querySelectorAll('.bg-decorations .decor-item').forEach(function (icon) {
      Object.keys(swaps).forEach(function (from) {
        if (icon.classList.contains(from)) icon.classList.replace(from, swaps[from]);
      });
    });
  }

  function init() {
    setThemeColor();
    buildDecorations();
    swapDecorIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
