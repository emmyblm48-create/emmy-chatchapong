/* ==========================================================================
   🏆 Champ of the Month — Splash (ดีไซน์ "Champ of the Month — Splash")
   พื้นผ้าลายสก็อตชมพู + กรอบรูปตั๋วขอบทอง + มงกุฎ + สติกเกอร์ "Champ Of The Month" + กลีบซากุระร่วง
   รูปเมมเบอร์ = รูปโปรไฟล์ล่าสุดจาก BLM48 Official Website (blm48.vercel.app)
   ซึ่งดึงจาก Apps Script ตัวเดียวกับหน้า Profile ของเว็บ -> แคชไว้ใน localStorage แล้วรีเฟรชเงียบๆ ทุกครั้งที่เปิดแอป
   ชื่อบนสติกเกอร์ = "<ชื่อ Champ> BLM48" เขียนเป็นตัวหนังสือบนเมฆของโลโก้ (โลโก้ไม่มีชื่อเมมเบอร์ในรูป)
   ใช้ใน index.html ผ่าน applyThemeAndToggleSplash -> BLM48ChampSplash.render(container, champName)
   ========================================================================== */
(function () {
  if (window.BLM48ChampSplash) return;

  var OFFICIAL_MEMBERS_URL = 'https://script.google.com/macros/s/AKfycbyKX1fncf8dJuPWadPk9w-4t0pPnkNPZlFDvUqllC1aJwbqQ4vVdepMcU6fjbTIOHqz/exec';
  var CACHE_KEY = 'blm48_official_member_photos';
  var IMG = 'assets/img/champ-splash/';
  var W = 390, H = 847; // ขนาดอาร์ตบอร์ดของดีไซน์ (ย่อ/ขยายทั้งก้อนให้พอดีจอจริง)

  // กรอบรูปทรงตั๋ว (มุมเว้าเข้า) ตามรูปกรอบในดีไซน์ 1096x1529
  var FW = 1096, FH = 1529, FR = 105;
  var FRAME_PATH = 'M' + FR + ' 0H' + (FW - FR) + 'A' + FR + ' ' + FR + ' 0 0 0 ' + FW + ' ' + FR +
    'V' + (FH - FR) + 'A' + FR + ' ' + FR + ' 0 0 0 ' + (FW - FR) + ' ' + FH +
    'H' + FR + 'A' + FR + ' ' + FR + ' 0 0 0 0 ' + (FH - FR) +
    'V' + FR + 'A' + FR + ' ' + FR + ' 0 0 0 ' + FR + ' 0Z';
  var FRAME_MASK = 'url("data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + FW + ' ' + FH + '" preserveAspectRatio="none"><path d="' + FRAME_PATH + '"/></svg>') + '")';

  var CSS = '' +
    '.cs-root{position:absolute;inset:0;overflow:hidden;background:#FFEEF3}' +
    '.cs-root .cs-bgfill{position:absolute;inset:0;background:url(' + IMG + 'bg.jpg) center/cover}' +
    '.cs-root .cs-stage{position:absolute;left:50%;top:50%;width:' + W + 'px;height:' + H + 'px;margin:-' + (H / 2) + 'px 0 0 -' + (W / 2) + 'px;transform-origin:50% 50%}' +
    '.cs-root .ca{animation-duration:var(--cd,7s);animation-iteration-count:infinite;animation-fill-mode:both;animation-delay:calc(var(--cd,7s) * var(--k,0))}' +
    '.cs-root .ck1{--k:.04}' +
    '.cs-root .c-veil{animation-name:cVeil;animation-timing-function:ease-in-out}' +
    '.cs-root .c-bg{animation-name:cBg;animation-timing-function:cubic-bezier(.16,1,.3,1);transform-origin:50% 40%}' +
    '.cs-root .c-photo{animation-name:cPhoto;transform-origin:50% 60%}' +
    '.cs-root .c-line{animation-name:cLine}' +
    '.cs-root .c-crown{animation-name:cCrown;transform-origin:50% 100%}' +
    '.cs-root .c-glint{animation-name:cGlint;transform-origin:50% 50%}' +
    '.cs-root .c-title{animation-name:cTitle;transform-origin:50% 55%}' +
    '.cs-root .c-shine{-webkit-mask-image:' + FRAME_MASK + ';mask-image:' + FRAME_MASK + ';-webkit-mask-size:100% 100%;mask-size:100% 100%}' +
    '.cs-root .c-band{animation-name:cSweep;animation-timing-function:cubic-bezier(.45,0,.2,1)}' +
    '.cs-root .c-fx{animation-name:cFx}' +
    '.cs-root .c-tw{animation:cTw 1.8s ease-in-out infinite;transform-origin:50% 50%}' +
    '.cs-root .c-tw.t2{animation-delay:-.4s;animation-duration:2.2s}' +
    '.cs-root .c-tw.t3{animation-delay:-.9s;animation-duration:1.6s}' +
    '.cs-root .c-tw.t4{animation-delay:-1.3s;animation-duration:2.4s}' +
    '.cs-root .c-fall{animation:cFall 8s linear infinite}' +
    '.cs-root .c-fall.f2{animation-duration:9.5s;animation-delay:-3s}' +
    '.cs-root .c-fall.f3{animation-duration:7s;animation-delay:-5.5s}' +
    '.cs-root .c-fall.f4{animation-duration:10s;animation-delay:-1.5s}' +
    '.cs-root .c-fall.f5{animation-duration:8.5s;animation-delay:-7s}' +
    '.cs-root .c-fall.f6{animation-duration:9s;animation-delay:-4.2s}' +
    ".cs-root .cs-name{position:absolute;left:0;right:0;text-align:center;font-family:'Quicksand','Kanit',sans-serif;font-weight:700;color:#2F74DB;white-space:nowrap;letter-spacing:.02em}" +
    '@keyframes cVeil{0%{opacity:1}8%{opacity:0}92%{opacity:0}100%{opacity:1}}' +
    '@keyframes cBg{0%{transform:scale(1.08)}22%,100%{transform:scale(1)}}' +
    '@keyframes cPhoto{0%,6%{opacity:0;transform:translateY(48px) scale(.92);animation-timing-function:cubic-bezier(.16,1,.3,1)}22%{opacity:1;transform:translateY(0) scale(1);animation-timing-function:ease-in-out}62%{opacity:1;transform:translateY(0) scale(1.012);animation-timing-function:ease-in-out}100%{opacity:1;transform:translateY(0) scale(1)}}' +
    '@keyframes cLine{0%,16%{clip-path:inset(0 50% 0 50%);opacity:0;animation-timing-function:cubic-bezier(.65,0,.35,1)}17%{opacity:1;clip-path:inset(0 48% 0 48%)}29%,100%{clip-path:inset(0 0 0 0);opacity:1}}' +
    '@keyframes cCrown{0%,20%{opacity:0;transform:translateY(-36px) rotate(-10deg) scale(.8);animation-timing-function:cubic-bezier(.34,1.56,.64,1)}32%,100%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}}' +
    '@keyframes cGlint{0%,31%{opacity:0;transform:scale(0) rotate(0deg)}35%{opacity:1;transform:scale(1.2) rotate(45deg)}41%,100%{opacity:0;transform:scale(0) rotate(90deg)}}' +
    '@keyframes cTitle{0%,30%{opacity:0;transform:translateY(0) scale(.3) rotate(-8deg);animation-timing-function:cubic-bezier(.34,1.56,.64,1)}42%{opacity:1;transform:translateY(0) scale(1) rotate(0deg);animation-timing-function:ease-in-out}54%{opacity:1;transform:translateY(-5px) scale(1) rotate(0deg);animation-timing-function:ease-in-out}66%{opacity:1;transform:translateY(0) scale(1) rotate(0deg);animation-timing-function:ease-in-out}78%{opacity:1;transform:translateY(-5px) scale(1) rotate(0deg);animation-timing-function:ease-in-out}90%,100%{opacity:1;transform:translateY(0) scale(1) rotate(0deg)}}' +
    '@keyframes cSweep{0%,30%{transform:translateX(-180px) skewX(-18deg)}44%,100%{transform:translateX(440px) skewX(-18deg)}}' +
    '@keyframes cFx{0%,38%{opacity:0}46%,100%{opacity:1}}' +
    '@keyframes cTw{0%,100%{transform:scale(.25) rotate(0deg);opacity:.25}50%{transform:scale(1) rotate(45deg);opacity:1}}' +
    '@keyframes cFall{0%{transform:translate(0,-40px) rotate(0deg)}50%{transform:translate(28px,430px) rotate(200deg)}100%{transform:translate(-10px,900px) rotate(400deg)}}';

  var STAR = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z';
  var PETAL = 'M10 0 C18 6 20 18 10 26 C0 18 2 6 10 0 Z';

  function injectCss() {
    if (document.getElementById('champ-splash-css')) return;
    var st = document.createElement('style');
    st.id = 'champ-splash-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ลิงก์ Google Drive (/file/d/<id>/view) -> ลิงก์รูปตรง lh3 แบบเดียวกับที่เว็บ Official ใช้
  function driveImg(url, size) {
    if (!url) return '';
    if (url.indexOf('drive.google.com') !== -1 || url.indexOf('googleusercontent.com') !== -1) {
      var m = url.match(/[-\w]{25,}/);
      if (m) return 'https://lh3.googleusercontent.com/d/' + m[0] + '=s' + (size || 1000);
    }
    return url;
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; }
  }

  function photoKey(name) { return String(name || '').trim().toLowerCase(); }

  // ดึงรายชื่อเมมเบอร์ + รูปโปรไฟล์ล่าสุดจากเว็บ Official แล้วเก็บแค่ { ชื่อ: ลิงก์รูป }
  var refreshing = null;
  function refreshOfficialPhotos() {
    if (refreshing) return refreshing;
    refreshing = fetch(OFFICIAL_MEMBERS_URL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) {
        var map = {};
        (Array.isArray(rows) ? rows : []).forEach(function (m) {
          if (m && m.name && m.image) map[photoKey(m.name)] = driveImg(m.image, 1000);
        });
        if (Object.keys(map).length) {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch (e) {}
        }
        return map;
      })
      .catch(function (e) { console.warn('Official member photos fetch failed:', e); return readCache(); })
      .then(function (map) { refreshing = null; return map; });
    return refreshing;
  }

  // คืนลิงก์รูปของ Champ: มีในแคชใช้เลย (แล้วรีเฟรชเบื้องหลัง) / ไม่มีรอดึงสดไม่เกิน timeoutMs
  function getChampPhoto(name, timeoutMs) {
    var key = photoKey(name);
    var cached = readCache()[key];
    var fresh = refreshOfficialPhotos();
    if (cached) return Promise.resolve(cached);
    return Promise.race([
      fresh.then(function (map) { return map[key] || null; }),
      new Promise(function (r) { setTimeout(function () { r(null); }, timeoutMs || 2500); })
    ]);
  }

  function preload(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(false);
      var img = new Image();
      img.referrerPolicy = 'no-referrer'; // รูป Google Drive (lh3) โดนตีกลับ 429 บางครั้งถ้าส่ง referrer ไป
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = src;
    });
  }

  // ปรับขนาด/ตำแหน่งรูปในกรอบ (หน้า Theme Application -> members.bday_photo_adjust.champ)
  // adjust = { zoom: 100-300, x: 0-100, y: 0-100 } / ไม่มี = ตามดีไซน์ (50% 30%) - คืน style ทั้งหมดของรูป
  function clampNum(v, lo, hi, def) {
    v = Number(v);
    return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;
  }
  function photoStyle(adj) {
    var a = adj && typeof adj === 'object' ? adj : {};
    var z = clampNum(a.zoom, 100, 300, 100), x = clampNum(a.x, 0, 100, 50), y = clampNum(a.y, 0, 100, 30);
    return 'width:100%;height:100%;object-fit:cover;display:block;object-position:' + x + '% ' + y + '%;transform-origin:' + x + '% ' + y + '%;' +
      (z !== 100 ? 'transform:scale(' + (z / 100) + ');' : '');
  }

  function markup(name, photo, adjust) {
    var petals = [[36, 14, 18, '#F7A6C6', ''], [112, 18, 23, '#FFC6DB', 'f2'], [196, 12, 16, '#F48FB8', 'f3'],
                  [262, 16, 21, '#FFD1E2', 'f4'], [324, 13, 17, '#F7A6C6', 'f5'], [352, 17, 22, '#FFC6DB', 'f6']]
      .map(function (p) {
        return '<svg class="c-fall ' + p[4] + '" viewBox="0 0 20 26" style="position:absolute;left:' + p[0] + 'px;top:0;width:' + p[1] + 'px;height:' + p[2] + 'px"><path fill="' + p[3] + '" d="' + PETAL + '"/></svg>';
      }).join('');
    var twinkles = [[326, 160, 20, '#FFFFFF', ''], [16, 300, 16, '#FF8DB8', 't2'], [352, 520, 18, '#FFD966', 't3'],
                    [8, 560, 22, '#FFFFFF', 't4'], [112, 62, 12, '#FFD966', 't2'], [266, 78, 14, '#FF8DB8', 't3'],
                    [318, 744, 16, '#8FD3FF', ''], [54, 740, 13, '#FF8DB8', 't4']]
      .map(function (t) {
        return '<svg class="c-tw ' + t[4] + '" viewBox="0 0 24 24" style="position:absolute;left:' + t[0] + 'px;top:' + t[1] + 'px;width:' + t[2] + 'px;height:' + t[2] + 'px"><path fill="' + t[3] + '" d="' + STAR + '"/></svg>';
      }).join('');
    var label = (name ? name + ' ' : '') + 'BLM48';
    var nameSize = label.length > 14 ? 15 : 18;

    return '' +
      '<img class="ca c-bg cs-bgfill" src="' + IMG + 'bg.jpg" alt="" style="width:100%;height:100%;object-fit:cover;display:block">' +
      '<div class="cs-stage">' +
        // รูปเมมเบอร์ในกรอบตั๋วขอบทอง + แสงวิ่ง
        '<div class="ca c-photo" style="position:absolute;left:29.8px;top:171.4px;width:323.8px;height:451.7px">' +
          '<div class="c-shine" style="position:absolute;inset:0;overflow:hidden;background:#fff">' +
            '<img src="' + esc(photo) + '" alt="' + esc(name) + ' BLM48 — Champ of the Month" draggable="false" referrerpolicy="no-referrer" style="' + photoStyle(adjust) + '">' +
            '<div class="ca c-band" style="position:absolute;top:-10%;left:0;width:90px;height:120%;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 100%)"></div>' +
          '</div>' +
          '<svg viewBox="0 0 ' + FW + ' ' + FH + '" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">' +
            '<path d="' + FRAME_PATH + '" fill="none" stroke="#C4A26C" stroke-width="10"/>' +
          '</svg>' +
        '</div>' +
        '<div class="ca c-fx" style="position:absolute;inset:0;pointer-events:none" aria-hidden="true">' + petals + '</div>' +
        '<img class="ca c-line" src="' + IMG + 'line-top.png" alt="" style="position:absolute;left:88.3px;top:128.5px;width:213.3px;height:18px;display:block">' +
        '<img class="ca c-line ck1" src="' + IMG + 'line-bottom.png" alt="" style="position:absolute;left:88.3px;top:776.8px;width:213.3px;height:18px;display:block">' +
        '<img class="ca c-crown" src="' + IMG + 'crown.png" alt="" style="position:absolute;left:140.9px;top:39px;width:108.1px;height:65px;display:block">' +
        '<svg class="ca c-glint" viewBox="0 0 24 24" style="position:absolute;left:186px;top:24px;width:18px;height:18px" aria-hidden="true"><path fill="#FFF6D6" d="' + STAR + '"/></svg>' +
        // สติกเกอร์โลโก้ (ไม่มีชื่อเมมเบอร์ในรูป) + เขียนชื่อ Champ ปัจจุบันบนเมฆด้านล่าง
        // title.webp เป็นภาพเต็มอาร์ตบอร์ด 921x2000 (= 390x847) พื้นใส -> เลื่อนให้โลโก้ตรงกรอบสติกเกอร์พอดี
        '<div class="ca c-title" style="position:absolute;left:19.5px;top:538.9px;width:344.2px;height:201.2px">' +
          '<img src="' + IMG + 'title.webp" alt="" style="position:absolute;left:-19.5px;top:-538.9px;width:' + W + 'px;height:' + H + 'px;max-width:none;display:block;pointer-events:none">' +
          '<div class="cs-name" style="top:' + (nameSize > 15 ? 171 : 174) + 'px;font-size:' + nameSize + 'px">' + esc(label) + '</div>' +
        '</div>' +
        '<div class="ca c-fx" style="position:absolute;inset:0;pointer-events:none" aria-hidden="true">' + twinkles + '</div>' +
      '</div>' +
      '<div class="ca c-veil" style="position:absolute;inset:0;background:#FFFFFF;pointer-events:none" aria-hidden="true"></div>';
  }

  // ย่อ/ขยายอาร์ตบอร์ด 390x847 ให้อยู่เต็มจอโดยไม่ล้น (พื้นหลังลายสก็อตเต็มจอเสมอ)
  function fit(root) {
    var stage = root.querySelector('.cs-stage');
    if (!stage) return;
    var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    stage.style.transform = 'scale(' + Math.min(w / W, h / H) + ')';
  }

  // วาด Splash ลงใน container ทันที (เริ่มแอนิเมชันใหม่ทุกครั้ง) - คืน Promise<boolean> ว่าวาดได้ไหม
  // customPhoto = รูปที่แอดมินอัปโหลดในหน้า Theme Application (members.splash_champ_url) ใช้ก่อน
  // ไม่มี/โหลดไม่ได้ -> ใช้รูปโปรไฟล์จากเว็บ Official / หาไม่ได้อีก คืน false ให้หน้า Home ใช้รูป Splash เดิมแทน
  // adjust = ขนาด/ตำแหน่งรูปที่แอดมินตั้งไว้ (ดู photoStyle)
  function render(container, champName, customPhoto, adjust) {
    injectCss();
    var pick = (customPhoto ? preload(customPhoto) : Promise.resolve(false)).then(function (ok) {
      if (ok) return customPhoto;
      return getChampPhoto(champName).then(function (p) {
        return p ? preload(p).then(function (ok2) { return ok2 ? p : null; }) : null;
      });
    });
    return pick.then(function (photo) {
      if (!photo) return false;
      return Promise.resolve(true).then(function () {
        container.innerHTML = '';
        var root = document.createElement('div');
        root.className = 'cs-root';
        root.style.setProperty('--cd', '7s');
        root.innerHTML = markup(champName, photo, adjust);
        container.appendChild(root);
        fit(root);
        if (!window.__champSplashFitBound) {
          window.__champSplashFitBound = true;
          window.addEventListener('resize', function () {
            document.querySelectorAll('.cs-root').forEach(fit);
          });
        }
        return true;
      });
    });
  }

  window.BLM48ChampSplash = { render: render, refreshOfficialPhotos: refreshOfficialPhotos, getChampPhoto: getChampPhoto, photoStyle: photoStyle };
})();
