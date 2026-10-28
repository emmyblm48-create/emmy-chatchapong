/* ==========================================================================
   🎂 Happy Birthday — Splash (ดีไซน์ "Happy Birthday — Splash")
   หลังบ้านใส่แค่ "รูปเมมเบอร์" ในช่องเดิม members.splash_bd_url -> ระบบประกอบการ์ดให้เอง:
   การ์ด + "HAPPY BIRTHDAY" + ชื่อเมมเบอร์ตัวโปร่ง + ไอคอนเค้ก + ป้ายวันที่ (เช่น 28 October)
   แอนิเมชัน: การ์ดเด้งขึ้น -> ตัวหนังสือกวาดเข้า -> คอนเฟตติระเบิด + ร่วง + ฟองแสงลอย + แสงวิ่ง
   สีพื้นหลัง/กล่องการ์ด/ตัวอักษรชื่อ/ป้ายวันที่/คอนเฟตติ ปรับตามโทนสีของรูปเมมเบอร์เอง (buildPalette)
   ถ้ารูปในช่องนั้นเป็น Splash สำเร็จรูปแบบเดิม (รูปสูงเต็มจอ) จะคืน false ให้ index.html โชว์รูปแบบเดิมแทน
   ใช้ใน index.html ผ่าน applyThemeAndToggleSplash -> BLM48BirthdaySplash.render(container, { name, photo, birthday })
   ========================================================================== */
(function () {
  if (window.BLM48BirthdaySplash) return;

  var W = 390, H = 847; // ขนาดอาร์ตบอร์ดของดีไซน์ (ย่อ/ขยายทั้งก้อนให้พอดีจอจริง)
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  // รูปที่สูงกว่า 1.8 เท่าของความกว้าง = Splash สำเร็จรูปเต็มจอแบบเดิม (ไม่ใช่รูปเมมเบอร์)
  var LEGACY_RATIO = 1.8;

  var CSS = '' +
    '.bs-root{position:absolute;inset:0;overflow:hidden;background:linear-gradient(180deg,var(--bs-bg1) 0%,var(--bs-bg2) 45%,var(--bs-bg3) 75%,var(--bs-bg4) 100%);--bd:8s;--bs-bg1:#C2DECF;--bs-bg2:#DCE3DD;--bs-bg3:#EEDDE4;--bs-bg4:#F5DCE6;--bs-card:#8C8C7C;--bs-pill:#E8C9D1;--bs-name:#fff;--bs-cake:rgba(80,80,60,.35);--bs-glow:rgba(255,214,228,.85);--bs-c1:#9FD3B8;--bs-c2:#F4B6CB;--bs-c3:#F6E3A1;--bs-c4:#A3A38C}' +
    '.bs-root .bs-stage{position:absolute;left:50%;top:50%;width:' + W + 'px;height:' + H + 'px;margin:-' + (H / 2) + 'px 0 0 -' + (W / 2) + 'px;transform-origin:50% 50%}' +
    '.bs-root .ba{animation-duration:var(--bd);animation-iteration-count:infinite;animation-fill-mode:both}' +
    '.bs-root .b-veil{animation-name:bVeil;animation-timing-function:ease-in-out}' +
    '.bs-root .b-card{animation-name:bCard;transform-origin:50% 70%}' +
    '.bs-root .b-t1{animation-name:bT1}' +
    '.bs-root .b-t2{animation-name:bT2;transform-origin:50% 50%}' +
    '.bs-root .b-sweepA{animation-name:bSweepA;animation-timing-function:cubic-bezier(.45,0,.2,1)}' +
    '.bs-root .b-sweepB{animation-name:bSweepB;animation-timing-function:cubic-bezier(.45,0,.2,1)}' +
    '.bs-root .b-sweepC{animation-name:bSweepC;animation-timing-function:cubic-bezier(.45,0,.2,1)}' +
    '.bs-root .b-burst{animation-name:bBurst}' +
    '.bs-root .b-fx{animation-name:bFx}' +
    '.bs-root .b-tw{animation:bTw 1.9s ease-in-out infinite;transform-origin:50% 50%}' +
    '.bs-root .b-tw.t2{animation-duration:2.3s;animation-delay:-.8s}' +
    '.bs-root .b-tw.t3{animation-duration:1.6s;animation-delay:-1.2s}' +
    '.bs-root .b-fall{animation:bFall 9s linear infinite}' +
    '.bs-root .b-fall.f2{animation-duration:11s;animation-delay:-4s}' +
    '.bs-root .b-fall.f3{animation-duration:8s;animation-delay:-6s}' +
    '.bs-root .b-fall.f4{animation-duration:12s;animation-delay:-2s}' +
    '.bs-root .b-fall.f5{animation-duration:10s;animation-delay:-7.5s}' +
    '.bs-root .b-fall.f6{animation-duration:9.5s;animation-delay:-3.2s}' +
    '.bs-root .b-fall.f7{animation-duration:10.5s;animation-delay:-8.4s}' +
    '.bs-root .b-fall.f8{animation-duration:8.5s;animation-delay:-5.1s}' +
    '.bs-root .b-rise{animation:bRise 10s ease-in-out infinite}' +
    '.bs-root .b-rise.r2{animation-duration:13s;animation-delay:-5s}' +
    '.bs-root .b-rise.r3{animation-duration:11s;animation-delay:-8s}' +
    '.bs-root .b-rise.r4{animation-duration:14s;animation-delay:-2s}' +
    '.bs-root .b-drift{animation:bDrift 12s ease-in-out infinite alternate}' +
    '.bs-root .b-drift.d2{animation-duration:15s;animation-delay:-6s}' +
    // การ์ด (สร้างเองจากรูปเมมเบอร์ แทนรูปการ์ดสำเร็จในดีไซน์)
    '.bs-root .bs-card{position:absolute;left:16.3px;top:16.3px;width:292.5px;height:420px;background:var(--bs-card);border-radius:4px 4px 22px 22px;box-shadow:0 4px 14px rgba(70,80,60,.18);overflow:hidden}' +
    '.bs-root .bs-photo{position:absolute;left:6px;right:6.9px;top:85.7px;bottom:5px;border-radius:2px 2px 17px 17px;overflow:hidden;background:#C9CCBE}' +
    '.bs-root .bs-photo img{width:100%;height:100%;object-fit:cover;object-position:50% 25%;display:block}' +
    ".bs-root .bs-t1,.bs-root .bs-t2{position:absolute;left:0;width:325px;text-align:center;color:#fff;white-space:nowrap;font-family:'Quicksand','Kanit',sans-serif;line-height:1}" +
    ".bs-root .bs-t1{top:27px;font-family:'Archivo','Kanit',sans-serif;font-stretch:125%;font-size:24px;font-weight:800;letter-spacing:.02em}" +
    // HAPPY BIRTHDAY + ชื่อเมมเบอร์: Archivo ตัวกว้าง พิมพ์ใหญ่ (ผู้ใช้เลือกจากดีไซน์อ้างอิง 2026-10-26 แทน Comfortaa) สีตามโทนรองของรูป
    // ข้อยกเว้นของกฎ Quicksand/Kanit เฉพาะ Splash/Banner วันเกิด - ถ้าแอดมินเลือกฟอนต์ไว้ (bday_font) ชื่อใช้ฟอนต์นั้นแทน
    ".bs-root .bs-t2{top:57px;font-family:'Archivo','Kanit',sans-serif;font-stretch:125%;font-weight:800;text-transform:uppercase;color:var(--bs-name);letter-spacing:.02em}" +
    '.bs-root .bs-cake{position:absolute;left:27px;top:106px;width:24px;height:24px;border-radius:50%;border:1.5px solid #fff;background:url(assets/img/bday-splash/cake.webp) 50% 50% / 25.8px 56.1px no-repeat,var(--bs-cake);box-sizing:border-box}' +
    ".bs-root .bs-pill{position:absolute;left:107.9px;top:403.8px;width:108px;height:14px;border-radius:999px;background:var(--bs-pill);color:#fff;font-family:'Avenir Next','Avenir','Nunito Sans','Kanit',sans-serif;font-size:9.5px;font-weight:600;line-height:14px;text-align:center;overflow:hidden;letter-spacing:.02em}" +
    '@keyframes bVeil{0%{opacity:1}6%{opacity:0}93%{opacity:0}100%{opacity:1}}' +
    '@keyframes bCard{0%,4%{opacity:0;transform:translateY(64px) scale(.9) rotate(-3deg);animation-timing-function:cubic-bezier(.34,1.4,.64,1)}20%{opacity:1;transform:translateY(0) scale(1) rotate(0deg);animation-timing-function:ease-in-out}48%{opacity:1;transform:translateY(-5px) scale(1) rotate(0deg);animation-timing-function:ease-in-out}70%{opacity:1;transform:translateY(0) scale(1) rotate(0deg);animation-timing-function:ease-in-out}88%{opacity:1;transform:translateY(-5px) scale(1) rotate(0deg);animation-timing-function:ease-in-out}100%{opacity:1;transform:translateY(0) scale(1) rotate(0deg)}}' +
    '@keyframes bT1{0%,18%{opacity:0;clip-path:inset(0 100% 0 0);transform:translateY(8px);animation-timing-function:cubic-bezier(.16,1,.3,1)}19%{opacity:1}29%,100%{opacity:1;clip-path:inset(0 0 0 0);transform:translateY(0)}}' +
    '@keyframes bT2{0%,25%{opacity:0;clip-path:inset(0 50% 0 50%);transform:scale(.88);animation-timing-function:cubic-bezier(.16,1,.3,1)}26%{opacity:1}38%,100%{opacity:1;clip-path:inset(0 0 0 0);transform:scale(1)}}' +
    '@keyframes bSweepA{0%,20%{transform:translateX(-140px) skewX(-18deg)}34%,100%{transform:translateX(440px) skewX(-18deg)}}' +
    '@keyframes bSweepB{0%,42%{transform:translateX(-90px) skewX(-18deg)}54%,100%{transform:translateX(320px) skewX(-18deg)}}' +
    '@keyframes bSweepC{0%,50%{transform:translateX(-50px) skewX(-18deg)}58%,100%{transform:translateX(150px) skewX(-18deg)}}' +
    '@keyframes bBurst{0%,30%{opacity:0;transform:translate(0,0) rotate(0deg) scale(.4)}31%{opacity:1;transform:translate(0,0) rotate(0deg) scale(.6);animation-timing-function:cubic-bezier(.1,.8,.3,1)}40%{opacity:1;transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1);animation-timing-function:cubic-bezier(.5,0,.9,.6)}62%{opacity:0;transform:translate(calc(var(--x) * 1.2),calc(var(--y) + 300px)) rotate(calc(var(--r) * 3)) scale(1)}100%{opacity:0;transform:translate(calc(var(--x) * 1.2),calc(var(--y) + 300px)) rotate(calc(var(--r) * 3)) scale(1)}}' +
    '@keyframes bFx{0%,36%{opacity:0}46%,100%{opacity:1}}' +
    '@keyframes bTw{0%,100%{transform:scale(.25) rotate(0deg);opacity:.2}50%{transform:scale(1) rotate(45deg);opacity:1}}' +
    '@keyframes bFall{0%{transform:translate(0,-30px) rotate(0deg)}50%{transform:translate(24px,430px) rotate(260deg)}100%{transform:translate(-12px,900px) rotate(520deg)}}' +
    '@keyframes bRise{0%{transform:translateY(0);opacity:0}15%{opacity:.7}85%{opacity:.5}100%{transform:translateY(-760px);opacity:0}}' +
    '@keyframes bDrift{0%{transform:translate(0,0) scale(1)}100%{transform:translate(40px,-30px) scale(1.15)}}';

  // ตัวอักษรเด่นฟอนต์พิกเซลในชื่อ (Splash + Banner) - ใช้ร่วมกันทั้งสองแบบ
  CSS += ".bs-root .b-px,.bb-root .b-px{font-family:'Pixelify Sans',monospace;font-weight:400;font-stretch:normal;font-style:italic;font-size:1.22em;line-height:0;letter-spacing:0;margin:0 .02em}";

  var STAR ='M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z';

  function injectCss() {
    if (document.getElementById('bday-splash-css')) return;
    if (!document.getElementById('bday-splash-font')) {
      var ln = document.createElement('link');
      ln.id = 'bday-splash-font';
      ln.rel = 'stylesheet';
      // Avenir Next มีเฉพาะเครื่อง Apple (ไม่มีเว็บฟอนต์) -> เครื่องอื่นใช้ Nunito Sans ซึ่งหน้าตาใกล้เคียงแทน
      ln.href = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&family=Pixelify+Sans:wght@400&family=Nunito+Sans:wght@500;700&display=swap';
      (document.head || document.documentElement).appendChild(ln);
    }
    var st = document.createElement('style');
    st.id = 'bday-splash-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // "10-28" / "2026-10-28" -> "28 October"
  function formatBirthday(v) {
    var m = String(v || '').match(/(\d{1,2})-(\d{1,2})$/);
    if (!m) return '';
    var month = parseInt(m[1], 10), day = parseInt(m[2], 10);
    if (!(month >= 1 && month <= 12) || !day) return '';
    return day + ' ' + MONTHS[month - 1];
  }

  // โหลดรูปก่อนวาด + คืนขนาดจริงไว้แยกว่าเป็นรูปเมมเบอร์หรือ Splash สำเร็จรูปแบบเดิม
  function loadPhoto(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.referrerPolicy = 'no-referrer'; // รูป Google Drive (lh3) โดนตีกลับ 429 บางครั้งถ้าส่ง referrer ไป
      img.onload = function () { resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // ===== 🎨 ดึงโทนสีจากรูปเมมเบอร์ -> พื้นหลัง / กล่องการ์ด / ตัวอักษรชื่อ / ป้ายวันที่ / คอนเฟตติ =====
  // อ่านพิกเซลรูปย่อ (ต้องโหลดแบบ CORS - รูป Google Drive lh3 และ Supabase Storage อนุญาตแล้ว)
  // แบ่งสีตาม hue 24 ช่อง ให้น้ำหนักสีที่สด/ไม่มืดไม่สว่างจัด -> โทนหลัก + โทนรอง (ต่าง hue >= 40°)
  // อ่านไม่ได้ (เช่นโฮสต์ไม่เปิด CORS) -> คืน null แล้วใช้สีตั้งต้นของดีไซน์ (เขียวหม่น/ชมพู)
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function hsl(h, s, l, a) {
    var v = Math.round(((h % 360) + 360) % 360) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%';
    return a == null ? 'hsl(' + v + ')' : 'hsla(' + v + ',' + a + ')';
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function hueDist(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

  function buildPalette(data) {
    var BINS = 24, score = [], sx = [], sy = [], ss = [], sl = [], sumL = 0, nPx = 0;
    for (var i = 0; i < BINS; i++) { score[i] = 0; sx[i] = 0; sy[i] = 0; ss[i] = 0; sl[i] = 0; }
    for (var k = 0; k < data.length; k += 4) {
      if (data[k + 3] < 200) continue;
      var p = rgbToHsl(data[k], data[k + 1], data[k + 2]);
      sumL += p[2]; nPx++; // ความสว่างเฉลี่ยทั้งรูป (รวมเทา/ขาว/ดำ) ใช้ตัดสินว่ารูปโทนเข้มหรือโทนอ่อน
      if (p[1] < 0.1 || p[2] < 0.1 || p[2] > 0.95) continue; // ข้ามเทา/ขาว/ดำ
      // ยกกำลังสองความสด: สีสดจริง (ผ้าม่าน/ฉาก) ชนะสีผิวที่สีคล้ายกันแต่จางกว่า
      var w = p[1] * p[1] * (1 - Math.abs(p[2] - 0.5));
      if (w <= 0) continue;
      var b = Math.floor(p[0] / (360 / BINS)) % BINS;
      score[b] += w;
      sx[b] += Math.cos(p[0] * Math.PI / 180) * w; sy[b] += Math.sin(p[0] * Math.PI / 180) * w;
      ss[b] += p[1] * w;
      sl[b] += p[2] * w;
    }
    // รวมช่องข้างเคียงให้กลุ่มสีที่ใกล้กันชนะรวมกัน
    function groupScore(i) { return score[(i + BINS - 1) % BINS] + score[i] + score[(i + 1) % BINS]; }
    function groupHue(i) {
      var x = 0, y = 0;
      [-1, 0, 1].forEach(function (o) { var j = (i + o + BINS) % BINS; x += sx[j]; y += sy[j]; });
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
    var best = -1, bestScore = 0;
    for (i = 0; i < BINS; i++) if (groupScore(i) > bestScore) { bestScore = groupScore(i); best = i; }
    if (best < 0 || bestScore < 1) return null; // รูปขาวดำ/สีจางมาก -> ใช้สีตั้งต้น
    var hp = groupHue(best);
    // ความสด/ความสว่างของโทนหลักคิดจากช่องที่แรงที่สุดในกลุ่ม (ช่องข้างเคียงมักมีสีผิวที่จางกว่าปนอยู่)
    var peak = best;
    [-1, 1].forEach(function (o) { var j = (best + o + BINS) % BINS; if (score[j] > score[peak]) peak = j; });
    var sp = ss[peak] / (score[peak] || 1);
    var lp = sl[peak] / (score[peak] || 1);
    var second = -1, secondScore = 0;
    for (i = 0; i < BINS; i++) {
      var hi = groupHue(i);
      if (hueDist(hi, hp) >= 40 && groupScore(i) > secondScore) { secondScore = groupScore(i); second = i; }
    }
    // ไม่มีสีรองชัดๆ -> ใช้ชมพูอ่อนแบบดีไซน์ (ถ้าโทนหลักเป็นชมพูอยู่แล้วใช้ฟ้าแทน)
    var hs = (second >= 0 && secondScore >= bestScore * 0.12) ? groupHue(second) : (hueDist(hp, 340) < 40 ? 200 : 340);
    // รูปโทนเข้ม (สว่างเฉลี่ยต่ำ) -> ใช้สีเข้ม/สดตามรูป, รูปโทนอ่อน -> พาสเทลแบบดีไซน์ต้นฉบับ
    // depth 0 = โทนอ่อนเต็มที่ ... 1 = โทนเข้มเต็มที่ (ไล่ระดับกลางๆ ได้) ตัวหนังสือสีขาวอ่านออกทั้งสองแบบ
    // ตัดสินจากสีหลักของรูป (ไม่ใช่ความสว่างเฉลี่ยทั้งรูป - รูปที่มีผิว/เสื้อขาวเยอะจะดูสว่างเสมอ):
    // สีหลักยิ่งเข้ม (lp ต่ำ) และยิ่งสด (sp สูง) -> depth ยิ่งสูง, รูปทั้งรูปมืดก็ดันให้เข้มขึ้นอีก
    var avgL = nPx ? sumL / nPx : 0.6;
    var depth = Math.max(
      clamp((0.62 - lp) / 0.25, 0, 1) * clamp((sp - 0.2) / 0.3, 0, 1),
      clamp((0.62 - avgL) / 0.3, 0, 1)
    );
    var mix = function (a, b) { return a + (b - a) * depth; };
    var bgHue2 = depth > 0.5 ? hp : hs; // โทนเข้มให้พื้นล่างเป็นสีเดียวกับโทนหลัก (ไม่เอาสีรองมาไล่จนดูหม่น)
    // ใช้ความสดตามรูปได้เต็มที่ (รูปสีจางก็ยังพาสเทลเหมือนเดิมเพราะ sp ต่ำ)
    var cardS = mix(clamp(sp * 0.75, 0.08, 0.6), clamp(sp * 1.1, 0.4, 0.85));
    var cardL = mix(0.48, clamp(lp * 0.85, 0.2, 0.4));
    return {
      bg1: hsl(hp, mix(clamp(sp * 0.9, 0.2, 0.7), clamp(sp * 1.2, 0.45, 0.85)), mix(0.82, clamp(lp * 0.95, 0.2, 0.42))),
      bg2: hsl(hp, mix(0.14, 0.6), mix(0.88, 0.3)),
      bg3: hsl(bgHue2 + (depth > 0.5 ? 8 : 0), mix(0.3, 0.65), mix(0.9, 0.24)),
      bg4: hsl(bgHue2 - (depth > 0.5 ? 8 : 0), mix(0.55, 0.7), mix(0.91, 0.17)),
      card: hsl(hp, cardS, cardL), // มืดพอให้ตัวหนังสือขาวอ่านออก
      pill: hsl(hs, 0.5, mix(0.78, 0.72)),
      name: hsl(hs, 0.7, 0.9),
      cake: hsl(hp, cardS, mix(0.3, 0.18), 0.45),
      glow: hsl(hs, 0.8, mix(0.88, 0.6), mix(0.85, 0.5)),
      c1: hsl(hp, mix(0.42, 0.8), mix(0.72, 0.62)),
      c2: hsl(hs, 0.7, 0.82),
      c3: hsl(45, 0.8, 0.8),
      c4: hsl(hp, mix(0.14, 0.5), mix(0.6, 0.45))
    };
  }

  function extractPalette(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = function () {
        try {
          var w = 48, h = Math.max(1, Math.round(48 * img.naturalHeight / img.naturalWidth));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(buildPalette(ctx.getImageData(0, 0, w, h).data));
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function applyPalette(root, pal) {
    if (!pal) return;
    Object.keys(pal).forEach(function (k) { root.style.setProperty('--bs-' + k, pal[k]); });
  }

  function isLegacyFullSplash(size) {
    return size && size.w > 0 && size.h / size.w > LEGACY_RATIO;
  }

  // ===== ฟอนต์ที่แอดมินเลือกได้ (หน้า Theme Application -> members.bday_font) =====
  // ใช้กับชื่อเล่นเมมเบอร์เท่านั้น (Splash + Banner) - "HAPPY BIRTHDAY" ใช้ฟอนต์ของดีไซน์เสมอ
  // ไม่เลือก (null) = Comfortaa ตามดีไซน์
  var FONTS = [
    { name: 'Fredoka', css: 'Fredoka:wght@600', weight: 600 },
    { name: 'Baloo 2', css: 'Baloo+2:wght@700', weight: 700 },
    { name: 'Quicksand', css: 'Quicksand:wght@700', weight: 700 },
    { name: 'Playfair Display', css: 'Playfair+Display:wght@700', weight: 700 },
    { name: 'Lobster', css: 'Lobster', weight: 400 },
    { name: 'Pacifico', css: 'Pacifico', weight: 400 },
    { name: 'Dancing Script', css: 'Dancing+Script:wght@700', weight: 700 },
    { name: 'Caveat', css: 'Caveat:wght@700', weight: 700 },
    { name: 'Great Vibes', css: 'Great+Vibes', weight: 400 }
  ];

  // คืนข้อมูลฟอนต์ที่อยู่ในลิสต์เท่านั้น (ชื่ออื่น/ว่าง -> null = ฟอนต์ตั้งต้น)
  function findFont(name) {
    for (var i = 0; i < FONTS.length; i++) if (FONTS[i].name === name) return FONTS[i];
    return null;
  }

  function loadFont(f) {
    if (!f) return;
    var id = 'bday-font-' + f.name.replace(/\s+/g, '-');
    if (document.getElementById(id)) return;
    var ln = document.createElement('link');
    ln.id = id;
    ln.rel = 'stylesheet';
    ln.href = 'https://fonts.googleapis.com/css2?family=' + f.css + '&display=swap';
    (document.head || document.documentElement).appendChild(ln);
  }

  function fontStyle(f) {
    return f ? "font-family:'" + f.name + "','Kanit',sans-serif;font-weight:" + f.weight + ';font-stretch:normal;text-transform:none;letter-spacing:.02em;' : '';
  }

  // ===== ปรับขนาด/ตำแหน่งรูปเมมเบอร์ (หน้า Theme Application -> members.bday_photo_adjust) =====
  // adjust = { zoom: 100-300 (%), x: 0-100 (ซ้าย-ขวา), y: 0-100 (บน-ล่าง) } / ไม่มี = ตามดีไซน์เดิม
  // รูปเต็มกรอบแบบ cover เลื่อนด้วย object-position แล้วซูมเข้าหาจุดเดียวกัน -> ซูมแล้วเลื่อนได้ทั้งสองแกน
  function clampNum(v, lo, hi, def) {
    v = Number(v);
    return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;
  }
  function photoStyle(adj) {
    if (!adj || typeof adj !== 'object') return '';
    var z = clampNum(adj.zoom, 100, 300, 100), x = clampNum(adj.x, 0, 100, 50), y = clampNum(adj.y, 0, 100, 50);
    return 'object-position:' + x + '% ' + y + '%;transform-origin:' + x + '% ' + y + '%;' + (z !== 100 ? 'transform:scale(' + (z / 100) + ');' : '');
  }

  // ฟอนต์แต่ละแบบกว้างไม่เท่ากัน -> วัดความกว้างจริงด้วย canvas (ไม่ต้องรอหน้าโชว์) แล้วย่อให้ไม่เกิน max
  // คืนขนาดตัวอักษร (หน่วยเดียวกับ base/max: px บน Splash, cqw บน Banner)
  var measureCtx = null;
  function fitSize(f, text, base, max) {
    if (!f || !text) return base;
    try {
      measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
      measureCtx.font = f.weight + ' 100px "' + f.name + '", Kanit, sans-serif';
      var w100 = measureCtx.measureText(text).width + text.length * 2; // + letter-spacing .02em
      return w100 > 0 ? Math.min(base, max * 100 / w100) : base;
    } catch (e) { return base; }
  }

  // ชื่อเมมเบอร์ + ตัวอักษรเด่น 1 ตัวเป็นฟอนต์พิกเซล (Pixelify Sans) แบบตัว P ใน "SATANG POUND" ของดีไซน์อ้างอิง
  // หลายคำ -> ตัวแรกของคำสุดท้าย, คำเดียว -> ตัวกลางชื่อ / ใช้เฉพาะตัวอังกฤษ และเฉพาะตอนแอดมินไม่ได้เลือกฟอนต์เอง
  function accentPos(name) {
    var s = String(name || '');
    var sp = s.lastIndexOf(' ');
    var i = sp > 0 ? sp + 1 : Math.floor(s.length / 2);
    return /[A-Za-z]/.test(s.charAt(i)) ? i : -1;
  }
  function nameHtml(name, f) {
    var s = String(name || ''), i = f ? -1 : accentPos(s);
    if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + '<span class="b-px">' + esc(s.charAt(i)) + '</span>' + esc(s.slice(i + 1));
  }

  // ชื่อยาว -> ลดขนาดตัวอักษรให้อยู่ในความกว้างของหัวการ์ด (~280px) / Archivo ตัวกว้างพิมพ์ใหญ่ ~0.95em ต่อตัวอักษร (รวมตัวพิกเซล)
  function nameFontSize(name) {
    var n = Math.max(1, String(name || '').length);
    return Math.min(34, 270 / (n * 0.95));
  }

  function markup(o) {
    var dateText = formatBirthday(o.birthday);
    var falls = [[30, 6, 11, 2, 'var(--bs-c1)', ''], [82, 7, 7, 50, 'var(--bs-c2)', 'f2'], [140, 5, 10, 2, 'var(--bs-c3)', 'f3'], [196, 6, 11, 2, '#FFFFFF', 'f4'],
                 [250, 7, 7, 50, 'var(--bs-c1)', 'f5'], [298, 5, 10, 2, 'var(--bs-c2)', 'f6'], [340, 6, 6, 50, 'var(--bs-c4)', 'f7'], [366, 6, 11, 2, 'var(--bs-c3)', 'f8']]
      .map(function (f) {
        return '<div class="b-fall ' + f[5] + '" style="position:absolute;left:' + f[0] + 'px;top:0;width:' + f[1] + 'px;height:' + f[2] + 'px;border-radius:' + (f[3] === 50 ? '50%' : f[3] + 'px') + ';background:' + f[4] + '"></div>';
      }).join('');
    var bursts = [[7, 12, 2, 'var(--bs-c1)', -150, -120, 220], [8, 8, 50, 'var(--bs-c2)', -110, -170, 140], [6, 11, 2, 'var(--bs-c3)', -60, -200, -200],
                  [7, 12, 2, '#FFFFFF', -15, -215, 260], [8, 8, 50, 'var(--bs-c1)', 30, -205, -160], [6, 11, 2, 'var(--bs-c2)', 75, -185, 300],
                  [7, 12, 2, 'var(--bs-c4)', 120, -150, -240], [8, 8, 50, 'var(--bs-c3)', 158, -110, 180], [6, 11, 2, '#FFFFFF', -170, -60, -120],
                  [7, 12, 2, 'var(--bs-c2)', 172, -55, 150], [6, 6, 50, 'var(--bs-c1)', -95, -95, 90], [6, 6, 50, 'var(--bs-c2)', 100, -100, -90]]
      .map(function (b) {
        return '<div class="ba b-burst" style="position:absolute;width:' + b[0] + 'px;height:' + b[1] + 'px;border-radius:' + (b[2] === 50 ? '50%' : b[2] + 'px') +
          ';background:' + b[3] + ';--x:' + b[4] + 'px;--y:' + b[5] + 'px;--r:' + b[6] + 'deg"></div>';
      }).join('');
    var twinkles = [[82, 280, 14, '#FFFFFF', ''], [344, 196, 20, '#FFFFFF', 't2'], [22, 420, 16, 'var(--bs-c2)', 't3'], [352, 560, 14, 'var(--bs-c1)', ''], [50, 646, 18, '#FFFFFF', 't2']]
      .map(function (t) {
        return '<svg class="b-tw ' + t[4] + '" viewBox="0 0 24 24" style="position:absolute;left:' + t[0] + 'px;top:' + t[1] + 'px;width:' + t[2] + 'px;height:' + t[2] + 'px"><path style="fill:' + t[3] + '" d="' + STAR + '"/></svg>';
      }).join('');

    return '' +
      // แสงฟุ้งพื้นหลัง + ฟองลอยขึ้น
      '<div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none">' +
        '<div class="b-drift" style="position:absolute;left:-80px;top:90px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 70%)"></div>' +
        '<div class="b-drift d2" style="position:absolute;right:-90px;bottom:80px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,var(--bs-glow) 0%,transparent 70%)"></div>' +
      '</div>' +
      '<div class="bs-stage">' +
        '<div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none">' +
          '<div class="b-rise" style="position:absolute;left:40px;top:860px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.75)"></div>' +
          '<div class="b-rise r2" style="position:absolute;left:120px;top:860px;width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.8)"></div>' +
          '<div class="b-rise r3" style="position:absolute;left:300px;top:860px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.6)"></div>' +
          '<div class="b-rise r4" style="position:absolute;left:350px;top:860px;width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.75)"></div>' +
        '</div>' +
        '<div class="ba b-fx" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none">' + falls + '</div>' +
        // การ์ด
        '<div class="ba b-card" style="position:absolute;left:33.1px;top:180.2px;width:325px;height:452.7px">' +
          '<div class="bs-card">' +
            '<div class="bs-photo"><img src="' + esc(o.photo) + '" alt="' + esc(o.name) + ' — Happy Birthday" draggable="false" referrerpolicy="no-referrer" style="' + photoStyle(o.adjust) + '"></div>' +
            '<div style="position:absolute;inset:0;overflow:hidden" aria-hidden="true">' +
              '<div class="ba b-sweepA" style="position:absolute;top:-10%;left:0;width:90px;height:120%;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.45) 50%,rgba(255,255,255,0) 100%)"></div>' +
            '</div>' +
          '</div>' +
          // ไอคอนเค้กเป็นรูป (ไอคอน Font Awesome รุ่นที่แอปใช้ไม่มี fa-cake-candles) - cake.webp พื้นใส 921x2000 เค้กอยู่กลางภาพ สูง 428px -> ย่อให้สูง ~12px
          '<div class="bs-cake" aria-hidden="true"></div>' +
          '<div class="ba b-t1 bs-t1">HAPPY BIRTHDAY</div>' +
          '<div class="ba b-t2 bs-t2" style="' + fontStyle(o.f) + 'font-size:' + (o.f ? fitSize(o.f, String(o.name || ''), 34, 280) : nameFontSize(o.name)).toFixed(1) + 'px">' + nameHtml(o.name, o.f) + '</div>' +
          (dateText ? '<div class="bs-pill">' + esc(dateText) +
            '<div class="ba b-sweepC" aria-hidden="true" style="position:absolute;top:-50%;left:0;width:26px;height:200%;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.8) 50%,rgba(255,255,255,0) 100%)"></div></div>' : '') +
        '</div>' +
        // คอนเฟตติระเบิดจากหัวการ์ด
        '<div aria-hidden="true" style="position:absolute;left:195px;top:250px;width:0;height:0;pointer-events:none">' + bursts + '</div>' +
        '<div class="ba b-fx" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none">' + twinkles + '</div>' +
      '</div>' +
      '<div class="ba b-veil" aria-hidden="true" style="position:absolute;inset:0;background:#FFFFFF;pointer-events:none"></div>';
  }

  function fit(root) {
    var stage = root.querySelector('.bs-stage');
    if (!stage) return;
    var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    stage.style.transform = 'scale(' + Math.min(w / W, h / H) + ')';
  }

  // รอฟอนต์ชื่อ (Archivo) โหลดก่อนวาด ไม่งั้นชื่อจะกระพริบเป็นฟอนต์สำรอง - รอไม่เกิน 1.5 วินาที
  // f = ฟอนต์ที่แอดมินเลือก (ถ้ามี) ต้องโหลดเสร็จก่อนวัดความกว้างชื่อ
  function fontReady(f) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    loadFont(f);
    var loads = [document.fonts.load("800 30px Archivo"), document.fonts.load("400 30px \"Pixelify Sans\""),document.fonts.load("700 24px \"Nunito Sans\"")];
    if (f) loads.push(document.fonts.load(f.weight + ' 30px "' + f.name + '"'));
    return Promise.race([
      Promise.all(loads).catch(function () {}),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]);
  }

  // opts: { name, photo (ลิงก์จาก splash_bd_url), birthday ("MM-DD"), font (ชื่อจาก FONTS / ว่าง = ตั้งต้น) }
  // คืน Promise<boolean>: false = รูปโหลดไม่ได้ หรือเป็น Splash สำเร็จรูปแบบเดิม -> ให้หน้า Home โชว์รูปเต็มจอตามเดิม
  function render(container, opts) {
    injectCss();
    opts = opts || {};
    var f = findFont(opts.font);
    return Promise.all([loadPhoto(opts.photo), extractPalette(opts.photo), fontReady(f)]).then(function (res) {
      var size = res[0], palette = res[1];
      if (!size || isLegacyFullSplash(size)) return false;
      container.innerHTML = '';
      var root = document.createElement('div');
      root.className = 'bs-root';
      applyPalette(root, palette); // สีพื้นหลัง/การ์ด/ชื่อ/ป้ายวันที่/คอนเฟตติ ตามรูปเมมเบอร์
      root.innerHTML = markup({ name: opts.name, photo: opts.photo, birthday: opts.birthday, f: f, adjust: opts.adjust });
      container.appendChild(root);
      fit(root);
      if (!window.__bdaySplashFitBound) {
        window.__bdaySplashFitBound = true;
        window.addEventListener('resize', function () {
          document.querySelectorAll('.bs-root').forEach(fit);
        });
      }
      return true;
    });
  }

  // ===== 🎂 Banner วันเกิดบนหน้า Home (สัดส่วน 3:1 เท่าแบนเนอร์อื่น) =====
  // ดีไซน์ 1668x556: แถบซ้าย + โลโก้ BLM48 มุมล่าง | รูปเมมเบอร์เต็มสูง | วันที่ / HAPPY BIRTHDAY / ชื่อ + ไอคอนเค้กมุมขวาบน
  // ขนาดทุกอย่างเป็นหน่วย cqw (1cqw = 1% ความกว้างแบนเนอร์) จะได้ย่อขยายตามจอโดยไม่ต้องคำนวณเอง
  // สีพื้นใช้ชุดสีเดียวกับ Splash ที่ดึงจากรูปเมมเบอร์
  var BANNER_CSS = '' +
    '.bb-root{position:relative;width:100%;aspect-ratio:3/1;container-type:inline-size;overflow:hidden;' +
      'background:linear-gradient(180deg,var(--bs-bg1) 0%,var(--bs-bg3) 60%,var(--bs-bg4) 100%);' +
      '--bs-bg1:#E3D3D6;--bs-bg3:#EFD3DD;--bs-bg4:#F5CDDC;--bs-cake:rgba(255,255,255,.08)}' +
    // ลายพื้นหลัง: จุดขาวจางๆ 2 ชั้นเหลื่อมกัน (ลายพอลกาดอท) + ประกายดาวกระพริบในฝั่งตัวหนังสือ
    '.bb-root .bb-pattern{position:absolute;inset:0;pointer-events:none;opacity:.55;' +
      'background-image:radial-gradient(circle,rgba(255,255,255,.75) 0 .32cqw,transparent .36cqw),radial-gradient(circle,rgba(255,255,255,.45) 0 .2cqw,transparent .24cqw);' +
      'background-size:3.6cqw 3.6cqw,3.6cqw 3.6cqw;background-position:0 0,1.8cqw 1.8cqw}' +
    '.bb-root .bb-tw{position:absolute;pointer-events:none;animation:bTw 2.2s ease-in-out infinite;transform-origin:50% 50%}' +
    '.bb-root .bb-tw.t2{animation-duration:2.8s;animation-delay:-.9s}.bb-root .bb-tw.t3{animation-duration:1.9s;animation-delay:-1.4s}' +
    '@keyframes bTw{0%,100%{transform:scale(.25) rotate(0deg);opacity:.2}50%{transform:scale(1) rotate(45deg);opacity:1}}' +
    // รูปเมมเบอร์ + เรืองแสงขาวด้านซ้าย/ขวาของรูป
    '.bb-root .bb-glow{position:absolute;top:0;bottom:0;width:4.2cqw;pointer-events:none}' +
    '.bb-root .bb-glow.l{left:1.5cqw;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.85))}' +
    '.bb-root .bb-glow.r{left:41.55cqw;background:linear-gradient(90deg,rgba(255,255,255,.85),rgba(255,255,255,0))}' +
    // กรอบรูป (ซ่อนส่วนที่ล้นตอนซูม) + รูปเต็มกรอบ
    '.bb-root .bb-photo{position:absolute;left:5.7cqw;top:0;width:35.85cqw;height:100%;overflow:hidden;box-shadow:0 0 2.4cqw .4cqw rgba(255,255,255,.9)}' +
    '.bb-root .bb-photo img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}' +
    // โลโก้วง BLM48 (ไฟล์จากผู้ใช้ 1333x1867 สัดส่วนเท่ากล่องมุมซ้ายล่างของดีไซน์)
    '.bb-root .bb-logo{position:absolute;left:0;bottom:0;width:5.7cqw;height:7.85cqw;background:#ffde5b url(assets/img/bday-splash/blm48-logo.png) 50% 50% / cover no-repeat}' +
    ".bb-root .bb-text{position:absolute;left:41.55cqw;right:0;top:0;bottom:0;text-align:center;color:#fff;font-family:'Quicksand','Kanit',sans-serif;text-shadow:0 .1cqw .5cqw rgba(0,0,0,.08)}" +
    ".bb-root .bb-date{position:absolute;left:0;right:0;top:7.4cqw;font-family:'Avenir Next','Avenir','Nunito Sans','Kanit',sans-serif;font-size:2.3cqw;font-weight:500;letter-spacing:.04em;line-height:1}" +
    '.bb-root .bb-date i{display:inline-block;width:1.3cqw;height:1.3cqw;border-radius:50%;background:#fff;margin-right:2.2cqw;vertical-align:.15cqw}' +
    ".bb-root .bb-hbd{position:absolute;left:0;right:0;top:12cqw;font-family:'Archivo','Kanit',sans-serif;font-stretch:125%;font-size:4.3cqw;font-weight:800;letter-spacing:.02em;line-height:1}" +
    ".bb-root .bb-name{position:absolute;left:0;right:0;top:17.6cqw;font-family:'Archivo','Kanit',sans-serif;font-stretch:125%;font-weight:800;text-transform:uppercase;line-height:1;white-space:nowrap;letter-spacing:.02em}" +
    '.bb-root .bb-cake{position:absolute;right:2.75cqw;top:2.1cqw;width:5.2cqw;height:5.2cqw;border-radius:50%;border:.15cqw solid #fff;box-sizing:border-box;' +
      'background:url(assets/img/bday-splash/cake.webp) 50% 50% / 6.2cqw 13.5cqw no-repeat,var(--bs-cake)}';

  // ความกว้างที่ชื่อใช้ได้ ~52cqw / Archivo ตัวกว้างพิมพ์ใหญ่ราว 0.95em ต่อตัวอักษร (รวมตัวพิกเซล) (ไม่เกินขนาดใกล้ๆ HAPPY BIRTHDAY ตามดีไซน์อ้างอิง)
  function bannerNameSize(name) {
    var n = Math.max(1, String(name || '').length);
    return Math.min(6.2, 52 / (n * 0.95));
  }

  function injectBannerCss() {
    injectCss(); // ฟอนต์ Archivo
    if (document.getElementById('bday-banner-css')) return;
    var st = document.createElement('style');
    st.id = 'bday-banner-css';
    st.textContent = BANNER_CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // รูปกว้างเกิน 2 เท่าของความสูง = Banner สำเร็จรูปแบบเดิม (ไม่ใช่รูปเมมเบอร์)
  function isLegacyBanner(size) {
    return size && size.h > 0 && size.w / size.h > 2;
  }

  // opts: { name, photo, birthday } - คืน Promise<boolean>: false = รูปใช้ไม่ได้ / เป็นรูปสำเร็จรูปแบบเดิม
  function renderBanner(container, opts) {
    injectBannerCss();
    opts = opts || {};
    var f = findFont(opts.font);
    return Promise.all([loadPhoto(opts.photo), extractPalette(opts.photo), fontReady(f)]).then(function (res) {
      var size = res[0], palette = res[1];
      if (!size || isLegacyBanner(size) || isLegacyFullSplash(size)) return false;
      var date = formatBirthday(opts.birthday).toUpperCase().replace(' ', ' - ');
      var root = document.createElement('div');
      root.className = 'bb-root';
      if (palette) ['bg1', 'bg3', 'bg4', 'cake'].forEach(function (k) { root.style.setProperty('--bs-' + k, palette[k]); });
      root.innerHTML =
        '<div class="bb-pattern" aria-hidden="true"></div>' +
        [[46, 14, 1.6, ''], [90, 74, 1.9, 't2'], [56, 80, 1.3, 't3'], [97, 46, 1.2, ''], [44, 66, 1.1, 't2']].map(function (t) {
          return '<svg class="bb-tw ' + t[3] + '" viewBox="0 0 24 24" aria-hidden="true" style="left:' + t[0] + 'cqw;top:' + t[1] + '%;width:' + t[2] + 'cqw;height:' + t[2] + 'cqw"><path fill="#fff" d="' + STAR + '"/></svg>';
        }).join('') +
        '<div class="bb-glow l" aria-hidden="true"></div><div class="bb-glow r" aria-hidden="true"></div>' +
        '<div class="bb-photo"><img src="' + esc(opts.photo) + '" alt="Happy Birthday ' + esc(opts.name) + '" draggable="false" referrerpolicy="no-referrer" style="' + photoStyle(opts.adjust) + '"></div>' +
        '<div class="bb-logo" aria-hidden="true"></div>' +
        '<div class="bb-text">' +
          (date ? '<div class="bb-date"><i></i>' + esc(date) + '</div>' : '') +
          '<div class="bb-hbd">HAPPY BIRTHDAY</div>' +
          '<div class="bb-name" style="' + fontStyle(f) + 'font-size:' + (f ? fitSize(f, String(opts.name || ''), 7.8, 52) : bannerNameSize(opts.name)).toFixed(2) + 'cqw">' + nameHtml(opts.name, f) + '</div>' +
        '</div>' +
        '<div class="bb-cake" aria-hidden="true"></div>';
      container.innerHTML = '';
      container.appendChild(root);
      return true;
    });
  }

  window.BLM48BirthdaySplash = { render: render, renderBanner: renderBanner, formatBirthday: formatBirthday, extractPalette: extractPalette, FONTS: FONTS, loadFont: loadFont, photoStyle: photoStyle };
  injectCss(); // โหลดฟอนต์/สไตล์ไว้ตั้งแต่หน้า Loading
})();
