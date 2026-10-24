/* ==========================================================================
   ⏳ BLM48 Loading screen (ใช้ร่วมทุกหน้าที่มีหน้าโหลด)
   ดีไซน์ "Loading — Live": พื้นเหลืองไล่สี + หัวใจขาว 4 ดวงบานออก + ดาวกลาง + วงโคจรจุด + "Loading..."
   วิธีใช้: วาง <div id="..." data-blm48-loading></div> ไว้ใน body แล้ว include ไฟล์นี้ต่อท้ายทันที
   (สคริปต์จะเติมลายลงไปเองแบบ synchronous เพื่อให้เห็นตั้งแต่เฟรมแรก)
   หน้าเดิมยังใช้ showAppLoading()/hideAppLoading() ของตัวเองสลับ display/opacity ได้เหมือนเดิม
   หรือเรียก blm48ShowLoading()/blm48HideLoading() เพื่อสร้าง overlay ชั่วคราวบนหน้าไหนก็ได้
   ========================================================================== */
(function () {
  if (window.BLM48Loading) return;

  var CSS = '' +
    '.blm48-loading{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;overflow:hidden;' +
      'background:linear-gradient(180deg,#FFE374 0%,#FCE993 48%,#F6EEC4 100%);color:#6E5200;' +
      "font-family:'Quicksand','Kanit',sans-serif;transition:opacity .5s cubic-bezier(.4,0,.2,1);--bl-d:4s}" +
    '.blm48-loading svg.bl-art{position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px 0 0 -150px;overflow:visible;pointer-events:none}' +
    '.blm48-loading .bl-an{animation-duration:var(--bl-d);animation-iteration-count:infinite;animation-fill-mode:both;animation-delay:calc(var(--bl-d) * var(--bl-k,0));transform-box:view-box;transform-origin:0 0}' +
    '.blm48-loading .bl-k1{--bl-k:.03}.blm48-loading .bl-k2{--bl-k:.06}.blm48-loading .bl-k3{--bl-k:.09}.blm48-loading .bl-k4{--bl-k:.12}' +
    '.blm48-loading .bl-glow{animation-name:bl-glow}.blm48-loading .bl-breathe{animation-name:bl-breathe}' +
    '.blm48-loading .bl-star{animation-name:bl-star}.blm48-loading .bl-spark{animation-name:bl-spark}' +
    '.blm48-loading .bl-bloom{animation-name:bl-bloom}.blm48-loading .bl-pop{animation-name:bl-pop}.blm48-loading .bl-orbit{animation-name:bl-orbit}' +
    '.blm48-loading .bl-flow{animation:bl-flow 3s linear infinite}.blm48-loading .bl-flow.bl-slow{animation-duration:4.5s}.blm48-loading .bl-flow.bl-fast{animation-duration:2.2s}' +
    '.blm48-loading .bl-text{position:absolute;left:0;right:0;bottom:calc(104px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:10px}' +
    '.blm48-loading .bl-label{font-size:15px;font-weight:500;letter-spacing:.02em}' +
    '.blm48-loading .bl-dots{display:flex;gap:5px;align-items:center;height:16px}' +
    '.blm48-loading .bl-dot{display:block;width:5px;height:5px;border-radius:50%;background:#6E5200;animation:bl-dot 1.2s ease-in-out infinite both}' +
    '.blm48-loading .bl-dot.bl-d2{animation-delay:.15s}.blm48-loading .bl-dot.bl-d3{animation-delay:.3s}' +
    '@keyframes bl-glow{0%{opacity:0;transform:scale(.4)}14%{opacity:.95;transform:scale(1)}60%{opacity:.7;transform:scale(1.12)}84%{opacity:1;transform:scale(.8)}100%{opacity:0;transform:scale(.3)}}' +
    '@keyframes bl-breathe{0%,42%{transform:scale(1);animation-timing-function:cubic-bezier(.45,0,.55,1)}60%{transform:scale(1.035);animation-timing-function:cubic-bezier(.45,0,.55,1)}76%,100%{transform:scale(1)}}' +
    '@keyframes bl-star{0%{transform:scale(0) rotate(-120deg);opacity:0;animation-timing-function:cubic-bezier(.2,.9,.3,1.3)}12%{transform:scale(1) rotate(0deg);opacity:1}84%{transform:scale(1) rotate(0deg);opacity:1;animation-timing-function:cubic-bezier(.5,0,.2,1)}90%{transform:scale(1.18) rotate(20deg);opacity:1;animation-timing-function:cubic-bezier(.6,0,.9,.4)}98%,100%{transform:scale(0) rotate(120deg);opacity:0}}' +
    '@keyframes bl-spark{0%,8%{transform:scale(0) rotate(-90deg);animation-timing-function:cubic-bezier(.2,.9,.3,1.3)}20%{transform:scale(1) rotate(0deg)}52%{transform:scale(1) rotate(0deg);animation-timing-function:cubic-bezier(.65,0,.35,1)}64%,100%{transform:scale(1) rotate(90deg)}}' +
    '@keyframes bl-bloom{0%,4%{transform:translateY(190px) scale(.1);opacity:0;animation-timing-function:cubic-bezier(.2,.8,.25,1.15)}24%{transform:translateY(0) scale(1);opacity:1}78%{transform:translateY(0) scale(1);opacity:1;animation-timing-function:cubic-bezier(.55,0,.75,.2)}90%,100%{transform:translateY(190px) scale(.1);opacity:0}}' +
    '@keyframes bl-pop{0%,26%{transform:scale(0) rotate(-40deg);opacity:0;animation-timing-function:cubic-bezier(.2,.9,.3,1.4)}36%{transform:scale(1) rotate(0deg);opacity:1}74%{transform:scale(1) rotate(0deg);opacity:1;animation-timing-function:cubic-bezier(.5,0,.8,.3)}82%,100%{transform:scale(0) rotate(40deg);opacity:0}}' +
    '@keyframes bl-orbit{0%,32%{opacity:0;transform:rotate(-28deg) scale(.82);animation-timing-function:cubic-bezier(.2,.8,.3,1)}46%{opacity:1;transform:rotate(0deg) scale(1)}76%{opacity:1;transform:rotate(0deg) scale(1);animation-timing-function:cubic-bezier(.5,0,.8,.4)}86%,100%{opacity:0;transform:rotate(24deg) scale(.85)}}' +
    '@keyframes bl-flow{to{stroke-dashoffset:-120}}' +
    '@keyframes bl-dot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.blm48-loading .bl-an,.blm48-loading .bl-flow{animation-play-state:paused}}';

  var HEART = 'M0 117 C-58 86 -125 42 -125 -42 C-125 -92 -94 -117 -62 -117 C-30 -117 -9 -97 0 -70 C9 -97 30 -117 62 -117 C94 -117 125 -92 125 -42 C125 42 58 86 0 117 Z';
  var SPARK = 'M0 -32 C5 -9 9 -5 32 0 C9 5 5 9 0 32 C-5 9 -9 5 -32 0 C-9 -5 -5 -9 0 -32 Z';
  var ACCENT = '#E2B72B';
  var seq = 0;

  function injectCss() {
    if (document.getElementById('blm48-loading-css')) return;
    var st = document.createElement('style');
    st.id = 'blm48-loading-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function markup() {
    var p = 'blLd' + (++seq) + '_';
    var big = [['translate(0,-238)', 'bl-k1'], ['translate(240,0) rotate(90)', 'bl-k2'],
               ['translate(0,238) rotate(180)', 'bl-k3'], ['translate(-240,0) rotate(-90)', 'bl-k4']]
      .map(function (h) {
        return '<g transform="' + h[0] + '"><g class="bl-an bl-bloom ' + h[1] + '"><path fill="#FFFFFF" d="' + HEART + '"/></g></g>';
      }).join('');
    var small = [['translate(-180,-178) rotate(-45)', ''], ['translate(180,-178) rotate(45)', 'bl-k1'],
                 ['translate(180,178) rotate(135)', 'bl-k2'], ['translate(-180,178) rotate(-135)', 'bl-k3']]
      .map(function (h) {
        return '<g transform="' + h[0] + '"><g class="bl-an bl-pop ' + h[1] + '"><g transform="scale(0.46)">' +
          '<path fill="#FFFFFF" d="' + HEART + '"/><path fill="#FBE58A" transform="translate(0,-6)" d="' + SPARK + '"/></g></g></g>';
      }).join('');
    var rings = [[345, 108, 9, '0 12', 1, ''], [333, 97, 6.5, '0 10', .9, 'bl-slow'], [357, 119, 5, '0 10', .85, 'bl-fast'],
                 [321, 87, 3.5, '0 8', .75, 'bl-slow'], [369, 130, 3, '0 8', .7, ''], [310, 77, 2.2, '0 8', .6, 'bl-fast']]
      .map(function (r) {
        return '<ellipse class="bl-flow ' + r[5] + '" cx="0" cy="0" rx="' + r[0] + '" ry="' + r[1] + '" stroke-width="' + r[2] +
          '" stroke-dasharray="' + r[3] + '" opacity="' + r[4] + '"/>';
      }).join('');

    return '' +
      '<svg class="bl-art" viewBox="-380 -380 760 760" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="' + p + 'glow" cx="0" cy="0" r="260" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0.45"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<linearGradient id="' + p + 'fade" x1="-375" y1="0" x2="375" y2="0" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/><stop offset="0.28" stop-color="#FFFFFF" stop-opacity="0.6"/>' +
            '<stop offset="0.44" stop-color="#FFFFFF" stop-opacity="0.04"/><stop offset="0.56" stop-color="#FFFFFF" stop-opacity="0.04"/>' +
            '<stop offset="0.72" stop-color="#FFFFFF" stop-opacity="0.6"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="1"/>' +
          '</linearGradient>' +
          '<mask id="' + p + 'mask" maskUnits="userSpaceOnUse" x="-400" y="-200" width="800" height="400">' +
            '<rect x="-400" y="-200" width="800" height="400" fill="url(#' + p + 'fade)"/>' +
          '</mask>' +
        '</defs>' +
        '<circle class="bl-an bl-glow" cx="0" cy="0" r="260" fill="url(#' + p + 'glow)"/>' +
        '<g class="bl-an bl-breathe">' + big + small +
          '<g transform="rotate(-33)"><g class="bl-an bl-orbit">' +
            '<g mask="url(#' + p + 'mask)" fill="none" stroke="' + ACCENT + '" stroke-linecap="round">' + rings + '</g>' +
          '</g></g>' +
          '<g class="bl-an bl-star">' +
            '<polygon fill="#FFFFFF" stroke="#FFFFFF" stroke-width="26" stroke-linejoin="round" points="0,-62 22,-38.1 53.7,-31 44,0 53.7,31 22,38.1 0,62 -22,38.1 -53.7,31 -44,0 -53.7,-31 -22,-38.1"/>' +
            '<g class="bl-an bl-spark"><path fill="#FBE27E" d="M0 -38 C6 -11 11 -6 38 0 C11 6 6 11 0 38 C-6 11 -11 6 -38 0 C-11 -6 -6 -11 0 -38 Z"/></g>' +
          '</g>' +
        '</g>' +
      '</svg>' +
      '<div class="bl-text" role="status">' +
        '<span class="bl-label">Loading</span>' +
        '<span class="bl-dots" aria-hidden="true"><span class="bl-dot"></span><span class="bl-dot bl-d2"></span><span class="bl-dot bl-d3"></span></span>' +
      '</div>';
  }

  // เติมลาย Loading ลงใน element (ใส่ class + เนื้อหา SVG) - เรียกซ้ำได้ ไม่วาดซ้ำ
  function mount(el) {
    if (!el || el.__blm48Loading) return el;
    injectCss();
    el.__blm48Loading = true;
    el.classList.add('blm48-loading');
    el.innerHTML = markup();
    return el;
  }

  function mountAll() {
    var els = document.querySelectorAll('[data-blm48-loading]');
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }

  // overlay ชั่วคราว (สำหรับหน้าที่ยังไม่มีหน้าโหลดของตัวเอง)
  function show() {
    var el = document.getElementById('blm48-loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'blm48-loading-overlay';
      mount(el);
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    el.style.opacity = '1';
    return el;
  }

  function hide(el) {
    el = el || document.getElementById('blm48-loading-overlay');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(function () { el.style.display = 'none'; }, 500);
  }

  window.BLM48Loading = { mount: mount, mountAll: mountAll, show: show, hide: hide };
  window.blm48ShowLoading = show;
  window.blm48HideLoading = function () { hide(); };

  mountAll();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
})();
