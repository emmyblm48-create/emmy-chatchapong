// =========================================================================
// BLM48 Membership — 🎨 ธีมของแอปตามช่วงวัน (เช่น ธีมซิงเกิล / Magic Hour) + ของตกแต่งบนจอ
// Loaded in <head> of every member-facing page, right after festivals.css.
// Picks the festival whose window contains today's date and adds
// html.theme-festival + html.theme-<id> (which activate the rules in
// festivals.css). Outside every window nothing happens, so the pages fall
// back to the normal theme without touching them again.
//
// ⚠️ ตั้งแต่ 2026-10-20 ทำงานเฉพาะหน้า Home (index) — หน้าอื่นไม่ใส่ธีมแล้ว
//    (ยกเว้นธีมที่มี tabBarEverywhere: หน้าอื่นได้แถบเมนูล่างของธีมอย่างเดียว)
//    ธีมเทศกาลตามปฏิทิน (วันเด็ก ตรุษจีน สงกรานต์ วาเลนไทน์ ลอยกระทง ฮาโลวีน คริสต์มาส ปีใหม่) ถูกเอาออกแล้ว
//
// ดูตัวอย่างธีมไหนก็ได้ทุกเวลา: เปิดหน้า Home พร้อม ?festival=<id>
//   เช่น index?festival=magichour  (จำไว้จนปิดแท็บ)
//   ?festival=none = ปิดธีมทั้งหมด, ?festival=auto = กลับไปใช้ตามวันที่จริง
// =========================================================================

(function festivalTheme() {
  // ธีมเทศกาลใช้เฉพาะหน้า Home (index) เท่านั้น — หน้าอื่นกลับเป็นหน้าตาปกติแบบก่อนมีธีม (ตามคำขอ 2026-10-20)
  // ยกเว้นธีมที่ตั้ง tabBarEverywhere: หน้าอื่นได้แค่แถบเมนูล่างของธีม (html.theme-tabbar-<id>) อย่างเดียว
  const IS_HOME = /^\/(index(\.html)?)?$/.test(window.location.pathname);

  const DAY = 86400000;
  // นับเป็น "เลขวัน" (ไม่สนเวลา) เทียบช่วงวันที่ได้ง่ายและข้ามปีได้
  function dayNum(y, m, d) { return Date.UTC(y, m - 1, d) / DAY; }

  // ---------------------------------------------------------------------
  // รายการธีมของแอป — เรียงตามลำดับความสำคัญ (ถ้าช่วงทับกัน อันที่อยู่บนกว่าชนะ)
  // (ธีมเทศกาลตามปฏิทิน วันเด็ก/ตรุษจีน/สงกรานต์/วาเลนไทน์/ลอยกระทง/ฮาโลวีน/คริสต์มาส/ปีใหม่ ถูกเอาออกแล้ว 2026-10-20)
  // window(y) คืน [วันเริ่ม, วันสุดท้าย] เป็นเลขวันรอบปี y (หรือ null)
  //   barColor: สีแถบสถานะเบราว์เซอร์ / PWA
  //   tabBarEverywhere: หน้าอื่นที่มีแถบเมนูล่างได้แถบเมนูของธีมด้วย
  //   sparkles: ประกายวิบวับอยู่กับที่   floatingCandles: เทียนลอยเหนือป้าย Champ
  //   decorSvgs: เปลี่ยนไอคอนพื้นหลังหลังการ์ดอันดับหน้าแรก (index.html #bg-decorations) เป็นภาพวาด SVG
  // ---------------------------------------------------------------------
  const FESTIVALS = [
    {
      // ธีม "Magic Hour" ดำ-แดง (ห้องโถงโกธิก พระจันทร์สีเลือด เทียน กลีบกุหลาบ)
      // เริ่ม 1 พ.ย. 2026 เวลา 00:00 (เวลาเครื่องผู้ใช้) ยังไม่กำหนดวันจบ -> ปลายไว้ไกลๆ จนกว่าจะได้วันจบจริง
      id: 'magichour', name: 'Magic Hour',
      window: y => [dayNum(2026, 11, 1), dayNum(2099, 12, 31)],
      barColor: '#120709',
      tabBarEverywhere: true, // แถบเมนูล่างของธีมใช้กับทุกหน้าที่มีแถบเมนูล่าง
      sparkles: true,         // ฝุ่นเวทสีทองวิบวับอยู่กับที่ ไม่มีของร่วง/อิโมจิ
      floatingCandles: true,  // เทียนลอยกลางอากาศขยับขึ้นลงช้าๆ เหนือป้าย Champ (บรรยากาศห้องโถงโรงเรียนเวทมนตร์)
      // กลิ่นอายโลกเวทมนตร์ (ของทั่วไปในโลกพ่อมด — ไม่ใช้โลโก้/ชื่อ/ตราบ้านของ Harry Potter เพราะติดลิขสิทธิ์)
      decorSvgs: {
        'fa-crown': 'wand',                    // ไม้กายสิทธิ์มีประกาย
        'fa-heart': 'potion',                  // ขวดยาวิเศษสีแดง
        'fa-star': 'candle',                   // เทียน
        'fa-music': 'spellbook',               // ตำราเวท
        'fa-wand-magic-sparkles': 'owl'        // นกฮูก
      }
    },
    {
      // ธีมซิงเกิล BLM48 10th Single "Sustainable" (ชมพูพาสเทล กลีบดอกไม้ ไข่มุก)
      // เปิดใช้ 20-31 ต.ค. 2026 (1 พ.ย. 00:00 เปลี่ยนเป็นธีม Magic Hour ตามคำขอ)
      id: 'sustainable', name: 'BLM48 10th Single Sustainable',
      window: y => [dayNum(2026, 10, 20), dayNum(2026, 10, 31)],
      barColor: '#e98aae',
      tabBarEverywhere: true, // แถบเมนูล่างแบบทิวทัศน์ใช้กับทุกหน้าที่มีแถบเมนูล่าง (fanpost/majorvote/notification/profile)
      sparkles: true, // ไม่ใช้อิโมจิ และไม่มีของร่วงจากด้านบน (ตามคำขอ) -> มีแค่ประกายไข่มุก
      // ไอคอนพื้นหลังหลังการ์ดอันดับ = ภาพวาด SVG หลายสีตามโปสเตอร์ (แทนไอคอน Font Awesome สีเดียว)
      decorSvgs: {
        'fa-crown': 'cosmos',                  // ดอกคอสมอสชมพู
        'fa-heart': 'ribbon',                  // โบว์ริบบิ้น
        'fa-star': 'butterfly',                // ผีเสื้อลาเวนเดอร์
        'fa-music': 'pearl',                   // ไข่มุก
        'fa-wand-magic-sparkles': 'lavender'   // ช่อลาเวนเดอร์
      }
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
    // เช็กรอบปีที่แล้วด้วย เผื่อธีมที่ช่วงวันคร่อมปี
    return FESTIVALS.find(f => [y - 1, y].some(yy => {
      const w = f.window(yy);
      return w && today >= w[0] && today <= w[1];
    })) || null;
  }

  const preview = readPreview();
  const festival = preview === 'none' ? null
    : (preview && FESTIVALS.find(f => f.id === preview)) || festivalForToday();
  if (!festival) return;
  if (!IS_HOME) {
    if (festival.tabBarEverywhere) document.documentElement.classList.add('theme-tabbar-' + festival.id);
    return;
  }

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

  function buildDecorations() {
    if (document.getElementById('fx-deco') || !document.body) return;
    const deco = document.createElement('div');
    deco.id = 'fx-deco';
    deco.setAttribute('aria-hidden', 'true');
    let html = '';

    // ประกายวิบวับอยู่กับที่ (ไม่มีของร่วงจากด้านบน ตามคำขอ) — Sustainable = ไข่มุก, Magic Hour = ฝุ่นเวททอง
    if (festival.sparkles) {
      [[12, 14, 3.2, 0], [78, 9, 4.1, 1.4], [30, 33, 3.6, 2.2], [88, 40, 4.4, 0.6],
       [8, 58, 3.9, 1.9], [62, 22, 4.6, 3.1], [46, 70, 3.4, 0.9], [92, 78, 4.2, 2.6]].forEach(function (s) {
        html += '<div class="fx-sparkle" style="left:' + s[0] + '%;top:' + s[1] + '%;animation-duration:'
          + s[2] + 's;animation-delay:' + s[3] + 's"></div>';
      });
    }

    deco.innerHTML = html;
    document.body.appendChild(deco);
  }

  // ภาพวาดไอคอนพื้นหลังแบบหลายสี (ใช้กับ festival.decorSvgs) — viewBox 24x24
  const DECOR_SVGS = {
    cosmos: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#f59fbf" stroke="#fff" stroke-width=".6">'
      + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
        return '<ellipse cx="12" cy="6.2" rx="2.9" ry="5" transform="rotate(' + a + ' 12 12)"/>';
      }).join('')
      + '</g><circle cx="12" cy="12" r="2.7" fill="#ffd56b" stroke="#f2b84b" stroke-width=".6"/></svg>',
    ribbon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<path fill="#e8749f" d="M11 12l-3.2 8.5 2.2-1 1.4 1.6L12.4 12zM13 12l3.2 8.5-2.2-1-1.4 1.6L11.6 12z"/>'
      + '<path fill="#f590b6" d="M12 11.5C9.5 7 3.5 5.5 3.5 9.2c0 3 2 5 4.5 4.6 1.8-.3 3.2-1.2 4-2.3zM12 11.5c2.5-4.5 8.5-6 8.5-2.3 0 3-2 5-4.5 4.6-1.8-.3-3.2-1.2-4-2.3z"/>'
      + '<circle cx="12" cy="11.6" r="2" fill="#e05f92"/></svg>',
    butterfly: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<g fill="#bba8f0" stroke="#9c86de" stroke-width=".5"><path d="M11.5 11C10 6 5.5 2.5 3 4.5S2.5 11.5 7 12.6c-3 1-4 4-2 5.3s5.3-1 6.5-5.3z"/>'
      + '<path d="M12.5 11C14 6 18.5 2.5 21 4.5S21.5 11.5 17 12.6c3 1 4 4 2 5.3s-5.3-1-6.5-5.3z"/></g>'
      + '<rect x="11.3" y="7" width="1.4" height="11" rx=".7" fill="#7d6bb3"/>'
      + '<path d="M11.6 7.4L9.8 4.2M12.4 7.4l1.8-3.2" stroke="#7d6bb3" stroke-width=".7" stroke-linecap="round" fill="none"/></svg>',
    pearl: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="fxPearl" cx=".38" cy=".34" r=".7">'
      + '<stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f6e3ef"/><stop offset="1" stop-color="#d9c4ec"/></radialGradient></defs>'
      + '<circle cx="12" cy="12" r="7.5" fill="url(#fxPearl)" stroke="#e7cfe3" stroke-width=".6"/>'
      + '<ellipse cx="9.6" cy="9.2" rx="2" ry="1.3" fill="#fff" opacity=".9" transform="rotate(-30 9.6 9.2)"/></svg>',
    lavender: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M12 22.5V7" stroke="#8fb58a" stroke-width="1.4" stroke-linecap="round"/><g fill="#a48ad6">'
      + [[12, 3.6, 0], [10.6, 6.4, -25], [13.4, 6.4, 25], [10.6, 9.4, -25], [13.4, 9.4, 25], [10.8, 12.4, -25], [13.2, 12.4, 25]].map(function (b) {
        return '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="1.4" ry="2" transform="rotate(' + b[2] + ' ' + b[0] + ' ' + b[1] + ')"/>';
      }).join('')
      + '</g></svg>',
    // ---- ธีม Magic Hour (ดำ-แดง) ----
    candle: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<ellipse cx="12" cy="5.4" rx="3.2" ry="4" fill="#ffcf6b" opacity=".35"/>'
      + '<path d="M12 2.2c1.4 1.8 1.9 3 1.9 4a1.9 1.9 0 0 1-3.8 0c0-1 .5-2.2 1.9-4z" fill="#ffb627"/>'
      + '<path d="M12 4.4c.6.9.8 1.5.8 2a.8.8 0 0 1-1.6 0c0-.5.2-1.1.8-2z" fill="#fff3c4"/>'
      + '<rect x="9.6" y="9" width="4.8" height="11" rx="1" fill="#f4e9e1"/><path d="M9.6 10.2c1.2.8 2.2-.4 3.2.4.6.5 1.2.2 1.6-.2V9H9.6z" fill="#e6d6cb"/>'
      + '<rect x="7.5" y="19.6" width="9" height="2.2" rx="1.1" fill="#a07d3c"/></svg>',
    wand: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M4 20.5L15.5 9" stroke="#3b2414" stroke-width="2.2" stroke-linecap="round"/>'
      + '<path d="M4 20.5l3.2-3.2" stroke="#6b4423" stroke-width="2.6" stroke-linecap="round"/>'
      + '<path d="M15.5 9l1.2-1.2" stroke="#d4a24c" stroke-width="2" stroke-linecap="round"/>'
      + '<path d="M19 2.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" fill="#ffd56b"/>'
      + '<circle cx="21" cy="9.5" r=".9" fill="#ffe7a8"/><circle cx="13.5" cy="3.5" r=".7" fill="#ffe7a8"/></svg>',
    potion: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<rect x="9.6" y="2.5" width="4.8" height="2.6" rx=".8" fill="#8a5a2b"/>'
      + '<path d="M10.2 5h3.6v3.4c3 1 5 3.6 5 6.7a6.8 6.8 0 0 1-13.6 0c0-3.1 2-5.7 5-6.7z" fill="#e9e4f2" opacity=".9"/>'
      + '<path d="M5.6 14.4h12.8a6.6 6.6 0 0 1-6.4 7.3 6.6 6.6 0 0 1-6.4-7.3z" fill="#c1121f"/>'
      + '<circle cx="10" cy="17" r="1" fill="#ff8a8f"/><circle cx="13.6" cy="18.6" r=".7" fill="#ff8a8f"/>'
      + '<path d="M8.4 10.6c-.8.8-1.2 1.8-1.3 2.8" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".8"/></svg>',
    spellbook: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M4 5.2C6.8 4 9.6 4.2 12 5.8v14c-2.4-1.6-5.2-1.8-8-.6z" fill="#7a0a12"/>'
      + '<path d="M20 5.2C17.2 4 14.4 4.2 12 5.8v14c2.4-1.6 5.2-1.8 8-.6z" fill="#a4161a"/>'
      + '<path d="M5.4 6.4c2-.7 4-.5 5.6.5v11.2c-1.6-.9-3.6-1.1-5.6-.5z" fill="#f4e9d8"/>'
      + '<path d="M18.6 6.4c-2-.7-4-.5-5.6.5v11.2c1.6-.9 3.6-1.1 5.6-.5z" fill="#efe2cc"/>'
      + '<path d="M15.8 9.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" fill="#d4a24c"/>'
      + '<path d="M6.8 9.4h3M6.8 11.4h3M6.8 13.4h2.2" stroke="#b9a07a" stroke-width=".7" stroke-linecap="round"/></svg>',
    owl: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M6 7.5L7.2 3.5 9.6 6M18 7.5l-1.2-4L14.4 6" fill="#6b4a33"/>'
      + '<ellipse cx="12" cy="13" rx="7" ry="8.4" fill="#8a6446"/>'
      + '<ellipse cx="12" cy="15.6" rx="4.2" ry="5" fill="#d9c2a3"/>'
      + '<circle cx="9.1" cy="10.2" r="2.7" fill="#f4e9d8"/><circle cx="14.9" cy="10.2" r="2.7" fill="#f4e9d8"/>'
      + '<circle cx="9.1" cy="10.3" r="1.4" fill="#d4a24c"/><circle cx="14.9" cy="10.3" r="1.4" fill="#d4a24c"/>'
      + '<circle cx="9.1" cy="10.3" r=".7" fill="#1a0a0d"/><circle cx="14.9" cy="10.3" r=".7" fill="#1a0a0d"/>'
      + '<path d="M12 11.6l-1 1.6h2z" fill="#d4a24c"/></svg>'
  };

  function swapDecorIcons() {
    // แบบภาพวาด SVG: ถอดคลาส Font Awesome ออก แล้วใส่ภาพแทน (คลาส dX-Y ตำแหน่ง/องศาเดิมยังอยู่)
    const svgs = festival.decorSvgs || {};
    document.querySelectorAll('.bg-decorations .decor-item').forEach(function (icon) {
      Object.keys(svgs).forEach(function (from) {
        if (!icon.classList.contains(from) || !DECOR_SVGS[svgs[from]]) return;
        icon.classList.remove('fa-solid', from);
        icon.classList.add('fx-decor-svg');
        icon.innerHTML = DECOR_SVGS[svgs[from]];
      });
    });
  }

  // เทียนลอยกลางอากาศ (festival.floatingCandles): อยู่ช่วงบนของหน้า Home ลอยหน้าป้าย Champ ขยับขึ้นลงช้าๆ
  // ใช้ position: absolute (เลื่อนหายไปพร้อมหน้า) ไม่ใช่ fixed เลยไม่ลอยทับโพสต์ตอนเลื่อนลง; ไม่รับการแตะ
  function buildFloatingCandles() {
    if (!festival.floatingCandles || document.getElementById('fx-candles') || !document.body) return;
    const wrap = document.createElement('div');
    wrap.id = 'fx-candles';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = [
      // [ซ้าย %, บน px, ขนาด px, ระยะเวลาลอย s, ดีเลย์ s]
      [2, 62, 30, 4.6, 0], [17, 50, 22, 5.4, 1.2], [36, 60, 19, 4.9, 2.1], [56, 48, 21, 5.8, 0.6],
      [75, 56, 25, 5.1, 1.7], [90, 66, 30, 4.4, 2.6], [0, 168, 20, 5.6, 0.9], [94, 160, 20, 5.2, 2.3]
    ].map(function (c) {
      return '<div class="fx-fcandle" style="left:' + c[0] + '%;top:' + c[1] + 'px;width:' + c[2]
        + 'px;animation-duration:' + c[3] + 's;animation-delay:-' + c[4] + 's">' + DECOR_SVGS.candle + '</div>';
    }).join('');
    document.body.appendChild(wrap);
  }

  function init() {
    setThemeColor();
    buildDecorations();
    swapDecorIcons();
    buildFloatingCandles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
