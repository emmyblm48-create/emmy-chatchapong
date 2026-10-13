// 🔍 ดูสินค้าแบบ 3D: ลากหมุนการ์ด/สินค้าได้รอบทิศ + แสงโฮโลแกรมตามมุม · แตะสองครั้ง = พลิกดูด้านหลัง
// ใช้: blm48Open3DViewer({ image, label, isSSR, collection?, collectionId? })
(function () {
  const BACK_LOGO = 'https://lh3.googleusercontent.com/d/1p6lV8bD6VVjR-Ys2EnpcQH1AOsnahQSp=s300';

  // 🖼️ ด้านหลังของสินค้าตามรูปทรงในแต่ละคอลเลกชัน (ไม่อยู่ในรายการ = ด้านหลังสีเหลือง + โลโก้เดิม)
  const CAFE_BG = 'https://lh3.googleusercontent.com/d/1MLtVYBkoWNrkqWr2AJqYtAfy6q7q2jJO=s1600'; // ฉากร้าน BLM48 Cafe (ไอเทม Cafe BG V.1)
  const BG_OCTAGON   = 'https://lh3.googleusercontent.com/d/1FfSfvrqEYzpYerms1NQtRyU8XkXnxi7K=s1000';
  const BG_CIRCLE    = 'https://lh3.googleusercontent.com/d/1cD2O5kLlkbAqQ31S88t1YWzlmoUGMnHs=s1000';
  const BG_PHOTOCARD = 'https://lh3.googleusercontent.com/d/1LRRKV6c7W-bV-_0x5Uhd4CKUkxVNJ4u2=s1000';
  const COLLECTION_BG = {
    'BLM48 Limited Coaster "BLM48 5th Generation"': BG_OCTAGON,
    'BLM48 Limited Coaster "Sustainable"': BG_OCTAGON,
    'BLM48 Limited Coaster "BINGO!"': BG_CIRCLE,
    'BLM48 Limited Coaster "New Ship"': BG_CIRCLE,
    'Concert 2026 - This Letter Says "Marry Me"': BG_PHOTOCARD,
    'BLM48 Tanabata 2026': BG_PHOTOCARD,
    'BLM48 Kami 7 in Bloom': BG_PHOTOCARD
  };
  // หน้า Success! ใช้ collection_id ของรางวัล
  const COLLECTION_ID_BG = {
    gacha_gen5: BG_OCTAGON, gacha_single10: BG_OCTAGON,
    gacha_single9: BG_CIRCLE, gacha_5thGenNewShip: BG_CIRCLE,
    votemajor_tanabata2026: BG_PHOTOCARD
  };
  function backFor(opts) {
    const name = String(opts.collection || '').trim();
    return COLLECTION_BG[name] || COLLECTION_ID_BG[opts.collectionId] || '';
  }

  function injectStyles() {
    if (document.getElementById('blm48-3d-style')) return;
    const st = document.createElement('style');
    st.id = 'blm48-3d-style';
    st.textContent = `
      .v3d-overlay { position: fixed; inset: 0; z-index: 21000; display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: radial-gradient(circle at 50% 40%, #f0454b 0%, #c8151d 55%, #8f0c12 100%); font-family: 'Quicksand', 'Kanit', sans-serif; color: #fff;
        touch-action: none; user-select: none; -webkit-user-select: none; opacity: 0; transition: opacity 0.25s; }
      .v3d-overlay.show { opacity: 1; }
      /* 🥤 เครื่องดื่ม BLM48 Cafe: ฉากหลังเป็นร้านคาเฟ่ (เบลอนิด + ไล่มืดบน/ล่างให้ตัวหนังสืออ่านง่าย) */
      .v3d-overlay.is-cafe { background: #e9dcd6; isolation: isolate; }
      .v3d-overlay.is-cafe::before { content: ''; position: absolute; inset: -12px; z-index: -2;
        background: url("${CAFE_BG}") center 42% / cover no-repeat; filter: blur(2.5px) saturate(1.05); }
      .v3d-overlay.is-cafe::after { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
        background: linear-gradient(to bottom, rgba(40,20,20,0.45) 0%, rgba(40,20,20,0.05) 22%, rgba(40,20,20,0) 55%, rgba(40,20,20,0.55) 100%); }
      .v3d-overlay.is-cafe .v3d-title, .v3d-overlay.is-cafe .v3d-hint { text-shadow: 0 1px 4px rgba(0,0,0,0.6); }
      .v3d-overlay.is-cafe .v3d-hint { color: rgba(255,255,255,0.9); }
      .v3d-overlay.is-cafe .v3d-close, .v3d-overlay.is-cafe .v3d-btn { background: rgba(30,15,15,0.42); border-color: rgba(255,255,255,0.35); }
      .v3d-close { position: absolute; top: calc(14px + env(safe-area-inset-top)); right: 14px; width: 40px; height: 40px; border-radius: 50%;
        border: none; background: rgba(255,255,255,0.12); color: #fff; font-size: 18px; cursor: pointer; }
      .v3d-title { position: absolute; top: calc(22px + env(safe-area-inset-top)); left: 16px; right: 64px; font-size: 15px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .v3d-title .ssr { display: inline-block; font-size: 11px; font-weight: 700; color: #3b2a00; background: linear-gradient(135deg,#ffe9a3,#f3c548);
        border-radius: 999px; padding: 2px 8px; margin-left: 6px; vertical-align: 1px; }
      .v3d-scene { perspective: 1100px; width: 100%; display: flex; justify-content: center; }
      .v3d-card { position: relative; width: min(68vw, 300px); transform-style: preserve-3d; cursor: grab; will-change: transform; }
      .v3d-card:active { cursor: grabbing; }
      .v3d-face { position: absolute; inset: 0; border-radius: 14px; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      /* เงาตามรูปทรงของจริง (ของทรงกลม/พื้นใส เช่น Coaster จะไม่เห็นกรอบสี่เหลี่ยม) */
      .v3d-front img { width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none; -webkit-touch-callout: none;
        filter: drop-shadow(0 22px 26px rgba(0,0,0,0.5)) brightness(var(--br, 1)) saturate(var(--sat, 1)); }
      .v3d-back { transform: rotateY(180deg); background: linear-gradient(135deg, #ffe680, #ffd23f); display: flex; align-items: center; justify-content: center;
        overflow: hidden; box-shadow: 0 24px 50px rgba(0,0,0,0.45); }
      .v3d-back img { width: 42%; border-radius: 22%; pointer-events: none; }
      /* ด้านหลังเป็นรูปจริงของสินค้า: Coaster ทรงแปดเหลี่ยม/วงกลม (พื้นใส) ใช้เงาตามรูปทรง, Photocard เต็มใบ */
      /* จัดวางแบบเดียวกับด้านหน้าทุกอย่าง (ไม่ใช้ flex) ให้ขนาดเท่าด้านหน้าพอดีทุกเบราว์เซอร์ */
      .v3d-back.is-art { display: block; background: none; box-shadow: none; overflow: visible; border-radius: 0; }
      .v3d-back.is-art img { display: block; width: 100%; height: 100%; object-fit: contain; border-radius: 0; -webkit-touch-callout: none;
        filter: drop-shadow(0 22px 26px rgba(0,0,0,0.5)); }
      .v3d-back.is-art.is-card { overflow: hidden; border-radius: 14px; box-shadow: 0 24px 50px rgba(0,0,0,0.45); }
      .v3d-back.is-art.is-card img { object-fit: cover; filter: none; }
      /* 🥤 แก้ว Cafe 3D */
      .v3d-card.is-cup { cursor: grab; }
      .v3d-card.is-cup.cup-ready .v3d-face { display: none; }
      .v3d-cup, .v3d-cup-part { position: absolute; left: 50%; top: 0; width: 0; height: 0; transform-style: preserve-3d; }
      .v3d-cup-part { left: 0; }
      .v3d-cup-facet, .v3d-cup-disc { position: absolute; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      .v3d-cup-facet { background-repeat: no-repeat; }
      .v3d-cup-facet i { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
      .v3d-cup-facet .sh { background: #1a0000; }
      .v3d-cup-facet .hl { background: #fff; }
      .v3d-cup-disc { border-radius: 50%; }
      .v3d-hint { margin-top: 34px; font-size: 12.5px; color: rgba(255,255,255,0.6); text-align: center; }
      .v3d-actions { margin-top: 14px; display: flex; gap: 10px; }
      .v3d-btn { border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); color: #fff; border-radius: 999px; padding: 8px 16px;
        font-family: inherit; font-size: 13px; cursor: pointer; }
    `;
    document.head.appendChild(st);
  }

  // =========================================================================
  // 🥤 แก้วเครื่องดื่ม BLM48 Cafe แบบ 3D จริง: ตัวแก้วทรงกรวยหมุนได้รอบ (ห่อลายจากรูปสินค้า) + ฝาโดม + จุกแดง + หลอด
  // รูปเครื่องดื่มทุกแก้วใช้แม่แบบเดียวกัน (วัดจากรูป 800x1000) ค่าในนี้เป็นสัดส่วนของ "ความสูงรูป"
  // x ในรูปคิดเป็นสัดส่วนความกว้าง (กว้าง = 0.8 ของความสูง)
  // =========================================================================
  const CUP = {
    aspect: 0.8, cxN: 0.527,
    body: { y0: 0.355, y1: 0.925, rTop: 0.1768, rBot: 0.1186 },
    lid: { y0: 0.264, y1: 0.355, rTop: 0.161, rBot: 0.1944 },
    straw: { x: 0.145, y: 0.262, len: 0.225, r: 0.0245, tilt: 18 },
    plug: { x: -0.115, z: 0.075, r: 0.022, h: 0.016 }
  };
  const SIDE_DEG = 50; // เกินมุมนี้ (ด้านข้าง/ด้านหลังแก้ว) ใช้สีชั้นเครื่องดื่มเรียบๆ ไม่มีโลโก้

  function isCafeDrink(opts) {
    return !!opts.cup;
  }

  // เช็กว่ารูปเป็นแม่แบบแก้วเดียวกันจริง (กลางตัวแก้วทึบ, ข้างแก้วโปร่งใส) ไม่ใช่ก็ใช้การ์ดแบนแบบเดิม
  function looksLikeCup(d, iw, ih) {
    const a = (xn, yn) => d[(Math.round(yn * ih) * iw + Math.round(xn * iw)) * 4 + 3];
    return a(0.527, 0.6) > 200 && a(0.527, 0.4) > 200 && a(0.12, 0.6) < 30 && a(0.9, 0.6) < 30 && a(0.527, 0.985) < 30 && a(0.45, 0.1) < 30;
  }

  // คลี่ลายรอบแก้ว: แต่ละคอลัมน์ = มุมรอบแก้ว (-180..180, หน้า = 0) อ่านพิกเซลจากรูปด้านหน้าตามรัศมีของแถวนั้น
  function unwrapTexture(d, iw, ih, part, U) {
    const Y0 = Math.round(part.y0 * ih), Y1 = Math.round(part.y1 * ih), Hh = Math.max(1, Y1 - Y0);
    const c = document.createElement('canvas'); c.width = U; c.height = Hh;
    const ctx = c.getContext('2d');
    const out = ctx.createImageData(U, Hh);
    const side = Math.sin(SIDE_DEG * Math.PI / 180);
    for (let v = 0; v < Hh; v++) {
      const k = v / Hh;
      const rN = (part.rTop + (part.rBot - part.rTop) * k) / CUP.aspect * 0.97;
      const Y = Y0 + v;
      for (let u = 0; u < U; u++) {
        const th = ((u + 0.5) / U) * 2 * Math.PI - Math.PI;
        let s = Math.sin(th);
        if (Math.abs(th) > SIDE_DEG * Math.PI / 180) s = Math.sign(th) * side;
        const X = Math.min(iw - 1, Math.max(0, Math.round((CUP.cxN + rN * s) * iw)));
        const si = (Y * iw + X) * 4, di = (v * U + u) * 4;
        out.data[di] = d[si]; out.data[di + 1] = d[si + 1]; out.data[di + 2] = d[si + 2]; out.data[di + 3] = d[si + 3];
      }
    }
    ctx.putImageData(out, 0, 0);
    return c;
  }
  function pixelAt(d, iw, ih, xn, yn) {
    const i = (Math.round(yn * ih) * iw + Math.round(xn * iw)) * 4;
    return `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
  }

  // ทรงกรวยตัด (ใช้ทั้งตัวแก้วและขอบฝา) แต่ละด้านเป็นแผ่นสี่เหลี่ยมคางหมู + เงาตามแสง
  function addCone(root, size, part, texUrl, N, lit) {
    const h = (part.y1 - part.y0) * size;
    const rt = part.rTop * size, rb = part.rBot * size;
    const slant = Math.hypot(h, rt - rb);
    const alpha = Math.atan2(rt - rb, h) * 180 / Math.PI;
    const wT = 2 * rt * Math.tan(Math.PI / N) + 1.2, wB = 2 * rb * Math.tan(Math.PI / N) + 1.2;
    const w = Math.max(wT, wB), inset = Math.abs(wT - wB) / 2 / w * 100;
    const clip = wT >= wB ? `polygon(0 0, 100% 0, ${100 - inset}% 100%, ${inset}% 100%)` : `polygon(${inset}% 0, ${100 - inset}% 0, 100% 100%, 0 100%)`;
    const rMid = (rt + rb) / 2, yMid = (part.y0 + part.y1) / 2 * size;
    for (let i = 0; i < N; i++) {
      const th = -180 + (i + 0.5) * 360 / N;
      const f = document.createElement('div');
      f.className = 'v3d-cup-facet';
      f.style.cssText = `width:${w}px;height:${slant}px;left:${-w / 2}px;top:${yMid - slant / 2}px;clip-path:${clip};-webkit-clip-path:${clip};` +
        `background-image:url("${texUrl}");background-size:${N * 100}% 100%;background-position:${(i / (N - 1)) * 100}% 0;` +
        `transform:rotateY(${th}deg) translateZ(${rMid}px) rotateX(${-alpha}deg);`;
      f.innerHTML = '<i class="sh"></i><i class="hl"></i>';
      root.appendChild(f);
      lit.push({ th, sh: f.children[0], hl: f.children[1], gloss: 1 });
    }
  }
  function addDisc(root, r, y, up, bg, extra) {
    const d = document.createElement('div');
    d.className = 'v3d-cup-disc';
    d.style.cssText = `width:${2 * r}px;height:${2 * r}px;left:${-r}px;top:${y - r}px;background:${bg};` +
      `transform:${extra || ''} rotateX(${up ? 90 : -90}deg);`;
    root.appendChild(d);
    return d;
  }
  function addTube(parent, r, len, N, color, lit, gloss) {
    for (let i = 0; i < N; i++) {
      const th = (i + 0.5) * 360 / N;
      const w = 2 * r * Math.tan(Math.PI / N) + 0.8;
      const f = document.createElement('div');
      f.className = 'v3d-cup-facet';
      f.style.cssText = `width:${w}px;height:${len}px;left:${-w / 2}px;top:${-len}px;background:${color};transform:rotateY(${th}deg) translateZ(${r}px);`;
      f.innerHTML = '<i class="sh"></i><i class="hl"></i>';
      parent.appendChild(f);
      lit.push({ th, sh: f.children[0], hl: f.children[1], gloss });
    }
  }

  // คืน { update(rx, ry) } หรือ null ถ้ารูปไม่ใช่แม่แบบแก้ว
  async function buildCafeCup(card, imageUrl) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.src = imageUrl;
    await im.decode();
    const iw = im.naturalWidth, ih = im.naturalHeight;
    if (!iw || Math.abs(iw / ih - CUP.aspect) > 0.02) return null;
    const cv = document.createElement('canvas'); cv.width = iw; cv.height = ih;
    const cx = cv.getContext('2d');
    cx.drawImage(im, 0, 0);
    const d = cx.getImageData(0, 0, iw, ih).data;
    if (!looksLikeCup(d, iw, ih)) return null;

    const toUrl = c => new Promise(res => c.toBlob(b => res(b ? URL.createObjectURL(b) : c.toDataURL()), 'image/png'));
    const bodyTex = await toUrl(unwrapTexture(d, iw, ih, CUP.body, 1024));
    const lidTex = await toUrl(unwrapTexture(d, iw, ih, CUP.lid, 1024));
    const topColor = pixelAt(d, iw, ih, 0.40, 0.38);
    const bottomColor = pixelAt(d, iw, ih, 0.527, 0.90);

    const size = card.clientHeight || 360;
    const root = document.createElement('div');
    root.className = 'v3d-cup';
    const lit = [];
    // เงาแก้วบนพื้นโต๊ะ (หมุนไปพร้อมแก้ว)
    addDisc(root, CUP.body.rBot * size * 1.9, CUP.body.y1 * size + 3, true, 'radial-gradient(closest-side, rgba(50,0,0,0.5), rgba(50,0,0,0))');
    addCone(root, size, CUP.body, bodyTex, 40, lit);
    addCone(root, size, CUP.lid, lidTex, 40, lit);
    addDisc(root, CUP.body.rBot * size, CUP.body.y1 * size - 1, false, bottomColor);
    addDisc(root, CUP.lid.rBot * size, CUP.lid.y1 * size, false, 'rgba(225,228,232,0.95)');
    // ฝาบน: พลาสติกใสเห็นสีเครื่องดื่มชั้นบนจางๆ + วงขอบ
    addDisc(root, CUP.lid.rTop * size, CUP.lid.y0 * size, true,
      `radial-gradient(circle at 42% 40%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 55%, rgba(210,214,220,0.7) 70%, rgba(255,255,255,0.55) 74%, rgba(190,195,202,0.75) 100%), ${topColor}`);

    // จุกแดงบนฝา
    const plug = document.createElement('div');
    plug.className = 'v3d-cup-part';
    plug.style.transform = `translate3d(${CUP.plug.x * size}px, ${CUP.lid.y0 * size}px, ${CUP.plug.z * size}px)`;
    addTube(plug, CUP.plug.r * size, CUP.plug.h * size, 10, '#e5262f', lit, 0.6);
    addDisc(plug, CUP.plug.r * size, -CUP.plug.h * size, true, 'radial-gradient(circle at 40% 35%, #ff6b6b, #c8151d)');
    root.appendChild(plug);

    // หลอดสีฟ้าใส เอียงไปทางขวา
    const straw = document.createElement('div');
    straw.className = 'v3d-cup-part';
    straw.style.transform = `translate3d(${CUP.straw.x * size}px, ${(CUP.straw.y + 0.02) * size}px, 0) rotateZ(${CUP.straw.tilt}deg)`;
    const sLen = (CUP.straw.len + 0.02) * size;
    addTube(straw, CUP.straw.r * size, sLen, 12, 'rgba(150,200,232,0.82)', lit, 1.2);
    addDisc(straw, CUP.straw.r * size, -sLen, true, 'radial-gradient(circle, rgba(70,120,160,0.9) 55%, rgba(170,215,240,0.95) 60%)');
    root.appendChild(straw);

    card.appendChild(root);

    return {
      update(rx, ry) {
        // แสงหลักมาจากหน้า-ซ้ายบน: ด้านที่หันหาแสงสว่าง ด้านหลังเข้ม + ไฮไลต์พลาสติกเป็นแถบแนวตั้ง
        for (const f of lit) {
          const a = (f.th + ry) * Math.PI / 180;
          const diff = Math.cos(a + 0.55);
          const shade = Math.max(0, 0.5 - diff * 0.42);
          const spec = Math.pow(Math.max(0, Math.cos(a + 0.35)), 28) * 0.55 * f.gloss;
          f.sh.style.opacity = shade.toFixed(3);
          f.hl.style.opacity = spec.toFixed(3);
        }
      }
    };
  }

  // =========================================================================
  // 🥤 แก้ว Cafe แบบ WebGL (three.js): ผิวโค้งเรียบ, พลาสติกใสสะท้อนแสง, หยดน้ำเกาะแก้ว, น้ำข้างในกระเพื่อม
  // โหลด three.js เฉพาะตอนเปิดดูเครื่องดื่มเท่านั้น ถ้าเครื่องไม่รองรับ WebGL จะกลับไปใช้แก้ว CSS ด้านบน
  // =========================================================================
  let threePromise = null;
  function loadThree() {
    if (window.THREE && window.THREE.WebGLRenderer) return Promise.resolve(window.THREE);
    if (!threePromise) {
      threePromise = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
        s.onload = () => (window.THREE ? res(window.THREE) : rej(new Error('three missing')));
        s.onerror = () => { threePromise = null; rej(new Error('three load failed')); };
        document.head.appendChild(s);
      });
    }
    return threePromise;
  }
  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }

  // แผนที่นูน (normal map) จาก "ความสูง" ที่วาดบน canvas
  function heightToNormal(ctx, S, strength) {
    const h = ctx.getImageData(0, 0, S, S).data;
    const out = ctx.createImageData(S, S);
    const H = (x, y) => h[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * S + x) * 4;
        out.data[i] = (-dx / len * 0.5 + 0.5) * 255;
        out.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
        out.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
        out.data[i + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }
  // หยดน้ำเกาะแก้ว: หยดกลมเล็กใหญ่ + บางหยดไหลเป็นทางลง
  function dropletCanvas() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    const drop = (x, y, r, sy) => {
      g.save(); g.translate(x, y); g.scale(1, sy);
      const gr = g.createRadialGradient(-r * 0.2, -r * 0.25, 0, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(200,200,200,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.restore();
    };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) drop(rnd() * S, rnd() * S, 0.8 + rnd() * 2.2, 1);
    for (let i = 0; i < 140; i++) drop(rnd() * S, rnd() * S, 2.5 + rnd() * 4.5, 1 + rnd() * 0.3);
    for (let i = 0; i < 14; i++) { // ทางน้ำไหล
      const x = rnd() * S, y0 = rnd() * S, len = 30 + rnd() * 90, w = 2 + rnd() * 2.5;
      for (let k = 0; k < len; k += 2) drop(x + Math.sin(k * 0.08) * 1.5, (y0 + k) % S, w * (0.7 + 0.3 * Math.sin(k * 0.3)), 1.2);
      drop(x, (y0 + len) % S, w * 1.7, 1.3);
    }
    heightToNormal(g, S, 3.2);
    return c;
  }
  // ผิวน้ำกระเพื่อมเป็นวงๆ
  function rippleCanvas() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * Math.PI * 2, v = y / S * Math.PI * 2;
      const hgt = 0.5 + 0.18 * Math.sin(u * 3 + Math.sin(v * 2) * 1.2) + 0.14 * Math.sin(v * 4 + Math.cos(u * 2)) + 0.08 * Math.sin((u + v) * 7);
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, hgt * 255)); img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    heightToNormal(g, S, 1.6);
    return c;
  }
  // แสงสะท้อนรอบแก้ว: ห้องสตูดิโอมีไฟ softbox + พื้นสีแดงให้เข้ากับฉากหลัง
  // neutral = ฉากสีกลาง (ใช้กับรูปโชว์บนการ์ดพื้นขาว) ไม่งั้นพื้นแดงให้เข้ากับหน้าดู 3D
  function studioEnv(T, renderer, neutral) {
    const pm = new T.PMREMGenerator(renderer);
    const sc = new T.Scene();
    sc.add(new T.Mesh(new T.BoxGeometry(12, 8, 12), new T.MeshBasicMaterial({ color: neutral ? 0x3a3c40 : 0x2a1416, side: T.BackSide })));
    const panel = (w, h, x, y, z, r, gg, b) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(r, gg, b), side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m);
    };
    panel(2.6, 4.5, -3.2, 1.2, 3.2, 7, 7, 7);     // softbox หลัก หน้า-ซ้าย
    panel(1.4, 6, 3.8, 0.4, 0.8, 9, 9, 9.2);      // ไฟแถบยาว ขวา (ทำเส้นวาวแนวตั้งยาวนุ่มๆ บนแก้ว)
    panel(5, 1.2, 0, 3.6, 0, 3, 3, 3);            // ไฟเพดาน
    panel(1.2, 4, 1.5, 0.5, -3.8, 2.6, 2.6, 2.8); // ไฟขอบด้านหลัง
    if (neutral) panel(10, 10, 0, -3.9, 0, 0.55, 0.55, 0.58); // พื้นเทา
    else panel(10, 10, 0, -3.9, 0, 1.6, 0.18, 0.2);    // พื้นแดง
    const rt = pm.fromScene(sc, 0.03);
    pm.dispose();
    return rt;
  }

  // โหลดพิกเซลรูปแก้ว (ต้องเป็นแม่แบบแก้วเดียวกัน) → { d, iw, ih } หรือ null
  async function loadCupPixels(imageUrl) {
    const im = new Image(); im.crossOrigin = 'anonymous'; im.src = imageUrl;
    await im.decode();
    const iw = im.naturalWidth, ih = im.naturalHeight;
    if (!iw || Math.abs(iw / ih - CUP.aspect) > 0.02) return null;
    const cv = document.createElement('canvas'); cv.width = iw; cv.height = ih;
    const cx2 = cv.getContext('2d'); cx2.drawImage(im, 0, 0);
    const d = cx2.getImageData(0, 0, iw, ih).data;
    return looksLikeCup(d, iw, ih) ? { d, iw, ih } : null;
  }

  function setupRenderer(T, renderer) {
    renderer.outputEncoding = T.sRGBEncoding;
    // ไม่ใช้ ACES (ทำสีซีด) ใช้แบบเส้นตรงให้สีเครื่องดื่มตรงกับรูปจริง
    renderer.toneMapping = T.LinearToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0x000000, 0);
  }

  // สีชั้นเครื่องดื่มของแต่ละแถว (อ่านจากขอบข้างแก้วที่ไม่มีโลโก้ ซ้าย+ขวาเฉลี่ยกัน)
  function bandColors(d, iw, ih, y0, y1) {
    const Y0 = Math.round(y0 * ih), Y1 = Math.round(y1 * ih), out = [];
    for (let Yp = Y0; Yp < Y1; Yp++) {
      const yn = Yp / ih;
      const rN = (CUP.body.rTop + (CUP.body.rBot - CUP.body.rTop) * ((yn - CUP.body.y0) / (CUP.body.y1 - CUP.body.y0))) / CUP.aspect;
      let r = 0, g = 0, b = 0;
      [-0.78, 0.78, -0.72, 0.72].forEach(k => {
        const i = (Yp * iw + Math.round((CUP.cxN + rN * k) * iw)) * 4;
        r += d[i]; g += d[i + 1]; b += d[i + 2];
      });
      out.push([r / 4, g / 4, b / 4]);
    }
    return out;
  }

  // ลายน้ำในแก้วแบบนุ่มๆ: ชั้นสีจากรูปจริงเบลอให้กลืนกัน + เมฆนมฟุ้งๆ ผสมไปมา (เหมือนกาแฟนมเย็นจริง ไม่มีขอบชั้นแข็ง)
  function liquidCanvas(bands, U) {
    const Hh = bands.length;
    // 1) เบลอชั้นสีแนวตั้ง 3 รอบ (ใกล้เคียงเกาส์เซียน)
    const r = Math.max(2, Math.round(Hh * 0.035));
    let cols = bands.map(c => c.slice());
    for (let pass = 0; pass < 3; pass++) {
      const out = [];
      for (let v = 0; v < Hh; v++) {
        const acc = [0, 0, 0]; let n = 0;
        for (let k = v - r; k <= v + r; k++) { const c = cols[Math.max(0, Math.min(Hh - 1, k))]; acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; n++; }
        out.push(acc.map(x => x / n));
      }
      cols = out;
    }
    const lum = c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    const milk = cols.reduce((m, c) => (lum(c) > lum(m) ? c : m), cols[0]);
    // 2) noise นุ่มๆ ที่ต่อกันรอบแก้วพอดี (วนกลับมาที่จุดเดิม)
    const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    const vnoise = (x, y, px) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const sm = t => t * t * (3 - 2 * t), w = i => ((i % px) + px) % px;
      const a = hash(w(xi), yi), b = hash(w(xi + 1), yi), c = hash(w(xi), yi + 1), d = hash(w(xi + 1), yi + 1);
      const u = sm(xf), v = sm(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const fbm = (x, y, px) => { let t = 0, amp = 0.5, f = 1; for (let o = 0; o < 4; o++) { t += amp * vnoise(x * f, y * f, px * f); amp *= 0.5; f *= 2; } return t / 0.9375; };
    const c = document.createElement('canvas'); c.width = U; c.height = Hh;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(U, Hh);
    for (let v = 0; v < Hh; v++) {
      for (let u = 0; u < U; u++) {
        const x = u / U * 5, y = v / Hh * 3.2;
        // ชั้นสีไหลเป็นคลื่นนุ่มๆ
        const off = (fbm(x, y, 5) - 0.5) * Hh * 0.16;
        const col = cols[Math.max(0, Math.min(Hh - 1, Math.round(v + off)))];
        // เมฆนมสีอ่อนฟุ้งผสมเข้ามาเป็นหย่อมๆ
        const m = Math.max(0, Math.min(1, (fbm(x * 1.3 + 7.1, y * 1.6 + 3.3, Math.round(5 * 1.3)) - 0.52) * 2.2)) * 0.55;
        const i = (v * U + u) * 4;
        img.data[i] = col[0] + (milk[0] - col[0]) * m;
        img.data[i + 1] = col[1] + (milk[1] - col[1]) * m;
        img.data[i + 2] = col[2] + (milk[2] - col[2]) * m;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // โลโก้พิมพ์บนแก้ว: ดึงเฉพาะพิกเซลสีขาวที่สว่างกว่าสีชั้นเครื่องดื่มแถวเดียวกัน (พื้นโปร่งใส)
  function logoCanvas(d, iw, ih, part, bands, U) {
    const src = unwrapTexture(d, iw, ih, part, U);
    const ctx = src.getContext('2d');
    const img = ctx.getImageData(0, 0, src.width, src.height);
    const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
    const front = SIDE_DEG * 0.95;
    for (let v = 0; v < src.height; v++) {
      const bd = bands[Math.min(bands.length - 1, v)], bl = lum(bd[0], bd[1], bd[2]);
      for (let u = 0; u < src.width; u++) {
        const i = (v * src.width + u) * 4;
        const th = Math.abs(((u + 0.5) / src.width) * 360 - 180);
        const L = lum(img.data[i], img.data[i + 1], img.data[i + 2]);
        let a = th > front ? 0 : Math.max(0, Math.min(1, (L - bl - 22) / 55));
        if (img.data[i] < 170) a = 0; // ลายรถสีเข้มไม่ใช่สีพิมพ์ขาว
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return src;
  }

  // ก้อนน้ำแข็งขอบมน (กล่องที่ดันมุมให้โค้ง)
  function roundedCube(T, size, radius) {
    const g = new T.BoxGeometry(size, size, size, 6, 6, 6);
    const p = g.attributes.position, v = new T.Vector3(), inner = size / 2 - radius;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const c = new T.Vector3(Math.max(-inner, Math.min(inner, v.x)), Math.max(-inner, Math.min(inner, v.y)), Math.max(-inner, Math.min(inner, v.z)));
      v.sub(c).normalize().multiplyScalar(radius).add(c);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  // โมเดลแก้ว 1 ใบ (ไม่ผูกกับ renderer) ใช้ได้ทั้งหน้าดู 3D และรูปโชว์ในกระเป๋า
  // opts: { texSize, aniso, shadow: 'rgb', light: true = วางบนพื้นสว่าง (ลดแสงสะท้อน/ความขุ่นให้สีเครื่องดื่มชัด) }
  // ความแรงของแสงสะท้อน/แสงวาว (พลาสติก ฝา น้ำแข็ง ผิวน้ำ) 1 = เต็ม · 0.3 = ลดลง 70% ตามที่ขอ
  const GLARE = 0.3;
  // ชั้นแสงสะท้อน: บวกแสงอย่างเดียว ไม่แตะค่าความโปร่งใส (ไม่งั้นช่องว่างในแก้วจะกลายเป็นสีดำทึบบน canvas ใส)
  const ADD_LIGHT = { blending: 5 /* CustomBlending */, blendEquation: 100 /* AddEquation */, blendSrc: 201 /* OneFactor */, blendDst: 201,
    blendEquationAlpha: 100, blendSrcAlpha: 200 /* ZeroFactor */, blendDstAlpha: 201 };

  function createCupModel(T, px, opts) {
    const lightBg = !!opts.light;
    const { d, iw, ih } = px;
    const D = Math.PI / 180;
    const Y = yn => 0.5 - yn; // พิกัดรูป (บนลงล่าง) → three (ล่างขึ้นบน), สูง 1 หน่วย = สูงรูป
    const rAt = (part, yn) => part.rTop + (part.rBot - part.rTop) * ((yn - part.y0) / (part.y1 - part.y0));
    const U = opts.texSize || 2048;
    const tex = (canvas, srgb) => {
      const t = new T.CanvasTexture(canvas);
      if (srgb) t.encoding = T.sRGBEncoding;
      t.anisotropy = opts.aniso || 1;
      return t;
    };

    const scene = new T.Scene();
    // แสงสตูดิโอนุ่มๆ (เงาไม่แข็ง)
    scene.add(new T.AmbientLight(0xffffff, 0.55));
    const key = new T.DirectionalLight(0xffffff, 0.7); key.position.set(-2, 2.5, 3); scene.add(key);
    const rim = new T.DirectionalLight(0xffe2e2, 0.6); rim.position.set(2.5, 1, -2.5); scene.add(rim);
    const cupG = new T.Group();
    scene.add(cupG);

    // ---------- น้ำในแก้ว ----------
    const ART = { y0: 0.378, y1: 0.918 };   // แถวในรูปที่เป็นชั้นเครื่องดื่ม
    // น้ำห่างผนังแก้วเล็กน้อย = ที่ของก้อนน้ำแข็งที่แนบผนัง (เหมือนแก้วน้ำแข็งจริง)
    const LIQ_R = 0.94;
    const LEVEL = 0.368;                     // ระดับผิวน้ำ: เต็มแก้ว เกือบถึงขอบฝา
    const bands = bandColors(d, iw, ih, ART.y0, ART.y1);
    const LIQ_BOT = 0.893;                    // ก้นน้ำสูงกว่าก้นแก้ว เห็นฐานพลาสติกใสหนาๆ ด้านล่าง
    const liqTex = tex(liquidCanvas(bands, 512), true);
    liqTex.wrapS = T.RepeatWrapping;
    const liqPts = [];
    for (let k = 0; k <= 24; k++) { const yn = LIQ_BOT - (LIQ_BOT - LEVEL) * k / 24; liqPts.push(new T.Vector2(rAt(CUP.body, yn) * LIQ_R, Y(yn))); }
    cupG.add(new T.Mesh(new T.LatheGeometry(liqPts, 128),
      new T.MeshStandardMaterial({ map: liqTex, roughness: 0.35, metalness: 0, envMapIntensity: lightBg ? 0.3 : 0.6 })));
    const liqBottom = new T.Mesh(new T.CircleGeometry(rAt(CUP.body, LIQ_BOT) * LIQ_R, 64),
      new T.MeshStandardMaterial({ color: new T.Color().setRGB(...bands[bands.length - 1].map(x => x / 255)).convertSRGBToLinear(), roughness: 0.6 }));
    liqBottom.rotation.x = Math.PI / 2; liqBottom.position.y = Y(LIQ_BOT); cupG.add(liqBottom);

    // ผิวน้ำเป็นคลื่นจริง (ขยับจุดทุกเฟรม) + เงาเปียกสะท้อนแสง
    const surfR = rAt(CUP.body, LEVEL) * LIQ_R;
    const surfGeo = new T.RingGeometry(0.0005, surfR, 72, 14);
    const surfBase = Float32Array.from(surfGeo.attributes.position.array);
    // สีผิวน้ำ: สีหลักของเครื่องดื่ม (ช่วงกลางแก้ว) ผสมสีชั้นบน มองจากด้านบนจะเห็นเป็นน้ำจริง ไม่ขาวโล่ง
    const mid = bands.slice(Math.floor(bands.length * 0.35), Math.floor(bands.length * 0.85));
    const avg = [0, 1, 2].map(i => mid.reduce((t, c) => t + c[i], 0) / Math.max(1, mid.length));
    const top = bands[Math.min(bands.length - 1, 6)];
    const topCol = [0, 1, 2].map(i => avg[i] * 0.65 + top[i] * 0.35);
    const surface = new T.Mesh(surfGeo, new T.MeshPhysicalMaterial({
      color: new T.Color().setRGB(topCol[0] / 255, topCol[1] / 255, topCol[2] / 255).convertSRGBToLinear(),
      roughness: 0.06, clearcoat: GLARE, clearcoatRoughness: 0.02, specularIntensity: GLARE, envMapIntensity: 1.1 * GLARE }));
    surface.rotation.x = -Math.PI / 2;
    const surfHold = new T.Group(); surfHold.position.y = Y(LEVEL); cupG.add(surfHold);
    const surfTilt = new T.Group(); surfHold.add(surfTilt);
    surfTilt.add(surface);

    // ---------- น้ำแข็ง ----------
    const dropTex = tex(dropletCanvas(), false);
    dropTex.wrapS = dropTex.wrapT = T.RepeatWrapping; dropTex.repeat.set(3, 1.6);
    // น้ำแข็ง: เนื้อใสอมฟ้า (โปร่งแสง เห็นน้ำด้านหลัง) + ชั้นประกายสะท้อนแสงที่ผิว
    const iceMat = new T.MeshPhysicalMaterial({
      color: 0xeef7ff, metalness: 0, roughness: 0.12, transparent: true, opacity: 0.34,
      clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2, depthWrite: false
    });
    const iceGloss = new T.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: 0.03, clearcoat: GLARE, clearcoatRoughness: 0.02, specularIntensity: GLARE,
      normalMap: dropTex, normalScale: new T.Vector2(0.35, 0.35), envMapIntensity: 2.2 * GLARE,
      transparent: true, depthWrite: false, ...ADD_LIGHT
    });
    const inR = surfR;
    // ก้อนน้ำแข็ง 1 แบบ (ขนาด 1 หน่วย) แล้วย่อ/ขยายต่อก้อน
    const cubeGeo = roundedCube(T, 1, 0.22);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // 1) น้ำแข็งแน่นเต็มแก้ว: เรียงแนบผนังตั้งแต่ก้นถึงปากแก้ว (หันด้านแบนแนบพลาสติก เอียงตามความลาดของแก้ว ไม่ทะลุออกนอกแก้ว)
    //    ใช้ InstancedMesh วาดทุกก้อนในครั้งเดียว (เบาเครื่อง)
    const slope = Math.atan((CUP.body.rTop - CUP.body.rBot) / (CUP.body.y1 - CUP.body.y0));
    const wall = [];
    const ROWS = [0.395, 0.462, 0.528, 0.594, 0.66, 0.726, 0.79, 0.85];
    ROWS.forEach((yn, ri) => {
      const R = rAt(CUP.body, yn);
      const s = 0.068 - ri * 0.0022 + (rnd() - 0.5) * 0.006;     // ก้อนล่างๆ เล็กลงนิดหน่อยตามแก้วที่เรียวลง
      const n = Math.max(6, Math.floor((2 * Math.PI * R) / (s * 1.16)));
      const off = ri * 0.37 + rnd();
      for (let k = 0; k < n; k++) {
        if (rnd() < 0.08) continue; // เว้นช่องบ้าง ให้เห็นสีเครื่องดื่มแทรกระหว่างก้อน (ไม่เรียงเป็นตาราง)
        const a = (k / n) * Math.PI * 2 + off + (rnd() - 0.5) * 0.3;
        const sz = s * (0.86 + rnd() * 0.26);
        const spin = (rnd() - 0.5) * 0.6;
        // ระยะกว้างสุดของหน้าก้อน (รวมมุมที่หมุน) ใช้คำนวณไม่ให้มุมทะลุผนังแก้ว
        const half = sz / 2 * (Math.abs(Math.cos(spin)) + Math.abs(Math.sin(spin)));
        const sag = R - Math.sqrt(Math.max(0, R * R - half * half));   // มุมก้อนแบนจะยื่นเกินผิวโค้ง ต้องหักออก
        const face = R - 0.0006 - sag;                                   // ผิวด้านนอกของก้อน (อยู่ในพลาสติกพอดี)
        const c = face - sz / 2;
        wall.push({ x: Math.sin(a) * c, y: Y(yn + (rnd() - 0.5) * 0.02), z: Math.cos(a) * c, a, s: sz, spin });
      }
    });
    // น้ำแข็งที่แนบผนังให้เห็นจางๆ พอเป็นเงาก้อน (ไม่ทึบเป็นตาราง)
    const wallMat = iceMat.clone(); wallMat.opacity = 0.07;
    const wallGloss = iceGloss.clone(); wallGloss.envMapIntensity = iceGloss.envMapIntensity * 0.45;
    const wallIce = new T.InstancedMesh(cubeGeo, wallMat, wall.length);
    const wallShine = new T.InstancedMesh(cubeGeo, wallGloss, wall.length);
    const mtx = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc3 = new T.Vector3(), p3 = new T.Vector3();
    wall.forEach((w, i) => {
      e.set(slope, w.a, w.spin, 'YXZ');
      q.setFromEuler(e);
      mtx.compose(p3.set(w.x, w.y, w.z), q, sc3.set(w.s, w.s, w.s));
      wallIce.setMatrixAt(i, mtx); wallShine.setMatrixAt(i, mtx);
    });
    wallIce.renderOrder = 1; wallShine.renderOrder = 1;
    cupG.add(wallIce);

    // 2) น้ำแข็งลอยเต็มผิวน้ำ (โผล่พ้นน้ำ โยกตามคลื่น) — เว้นตรงหลอด
    const FLOAT = [[0, 0, 0.07], [30, 0.62, 0.066], [150, 0.6, 0.07], [210, 0.62, 0.064], [270, 0.6, 0.07], [330, 0.62, 0.066], [100, 0.35, 0.05]];
    const ices = FLOAT.map(([deg, rr, size], k) => {
      const m = new T.Mesh(cubeGeo, iceMat);
      m.scale.setScalar(size);
      m.renderOrder = 1;
      const shine = new T.Mesh(cubeGeo, iceGloss); shine.renderOrder = 1; m.add(shine);
      const a = deg * D;
      const rad = Math.min(inR * rr, inR - size * 0.78);
      m.position.set(Math.sin(a) * rad, Y(LEVEL) + size * 0.16, Math.cos(a) * rad);
      m.rotation.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5);
      cupG.add(m);
      return { m, floats: true, base: m.position.clone(), rot: m.rotation.clone(), ph: k * 1.7 };
    });

    // ---------- ตัวแก้วพลาสติกใส: ชั้นขุ่นบางๆ + ชั้นสะท้อนแสง (บวกแสง) มองทะลุเห็นน้ำแข็งได้ ----------
    const by = CUP.body.y1 + 0.004, rb = CUP.body.rBot;
    const shellPts = [new T.Vector2(0.0001, Y(by)), new T.Vector2(rb - 0.014, Y(by)), new T.Vector2(rb - 0.004, Y(by - 0.004)), new T.Vector2(rb, Y(by - 0.014))];
    for (let k = 1; k <= 30; k++) { const yn = (by - 0.014) - ((by - 0.014) - CUP.body.y0) * k / 30; shellPts.push(new T.Vector2(rAt(CUP.body, yn) + 0.002, Y(yn))); }
    const shellGeo = new T.LatheGeometry(shellPts, 128);
    const haze = (opacity) => new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, transparent: true, opacity, depthWrite: false, side: T.DoubleSide });
    const gloss = (strength) => new T.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: 0.1, clearcoat: GLARE, clearcoatRoughness: 0.08, specularIntensity: GLARE,
      normalMap: dropTex, normalScale: new T.Vector2(0.12, 0.12), envMapIntensity: strength * GLARE,
      transparent: true, depthWrite: false, ...ADD_LIGHT, side: T.DoubleSide
    });
    cupG.add(new T.Mesh(shellGeo, haze(lightBg ? 0.02 : 0.035)));
    const shellGloss = new T.Mesh(shellGeo, gloss(lightBg ? 0.6 : 1.15)); shellGloss.renderOrder = 3; cupG.add(shellGloss);

    // ขอบปากแก้วม้วนหนาใส + ฐานพลาสติกหนาขุ่นๆ ด้านล่าง (เหมือนแก้วพลาสติกจริง)
    const lip = new T.Mesh(new T.TorusGeometry(rAt(CUP.body, CUP.body.y0) + 0.004, 0.0058, 16, 128), haze(0.3));
    lip.rotation.x = Math.PI / 2; lip.position.y = Y(CUP.body.y0 + 0.002); lip.renderOrder = 3; cupG.add(lip);
    const lipGloss = new T.Mesh(lip.geometry, gloss(1.4)); lipGloss.rotation.copy(lip.rotation); lipGloss.position.copy(lip.position); lipGloss.renderOrder = 3; cupG.add(lipGloss);
    const basePts = [];
    for (let k = 0; k <= 6; k++) { const yn = by - (by - LIQ_BOT) * k / 6; basePts.push(new T.Vector2(rAt(CUP.body, Math.min(yn, CUP.body.y1)) + 0.0028, Y(yn))); }
    const base = new T.Mesh(new T.LatheGeometry(basePts, 96), haze(0.22)); base.renderOrder = 3; cupG.add(base);
    const baseDisc = new T.Mesh(new T.CircleGeometry(rb, 64), haze(0.18)); baseDisc.rotation.x = Math.PI / 2; baseDisc.position.y = Y(LIQ_BOT) - 0.002; cupG.add(baseDisc);

    // โลโก้พิมพ์สีขาวบนแก้ว (ด้านหน้า)
    const logoPart = { y0: ART.y0, y1: ART.y1, rTop: rAt(CUP.body, ART.y0), rBot: rAt(CUP.body, ART.y1) };
    const logoTex = tex(logoCanvas(d, iw, ih, logoPart, bands, U), true);
    logoTex.wrapS = T.RepeatWrapping; logoTex.offset.x = 0.5;
    const logoPts = [];
    for (let k = 0; k <= 16; k++) { const yn = ART.y1 - (ART.y1 - ART.y0) * k / 16; logoPts.push(new T.Vector2(rAt(CUP.body, yn) + 0.0035, Y(yn))); }
    const logo = new T.Mesh(new T.LatheGeometry(logoPts, 128), new T.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5, depthWrite: false }));
    logo.renderOrder = 2; cupG.add(logo);

    // ---------- ฝาโดมใส (ขุ่นกว่าแก้วนิดหน่อย) ----------
    const lidPts = [[0.1944, 0.36], [0.1962, 0.346], [0.1905, 0.336], [0.171, 0.322], [0.1655, 0.302], [0.162, 0.276], [0.153, 0.263], [0.118, 0.2565], [0.06, 0.2545], [0.0001, 0.254]]
      .map(([r, yn]) => new T.Vector2(r, Y(yn)));
    const lidGeo = new T.LatheGeometry(lidPts, 128);
    const lidHaze = new T.Mesh(lidGeo, haze(lightBg ? 0.12 : 0.2)); lidHaze.renderOrder = 4; cupG.add(lidHaze);
    const lidGloss = new T.Mesh(lidGeo, gloss(lightBg ? 0.55 : 1.0)); lidGloss.renderOrder = 5; cupG.add(lidGloss);

    // จุกแดง
    const plug = new T.Mesh(new T.CylinderGeometry(CUP.plug.r, CUP.plug.r * 1.08, CUP.plug.h, 32),
      new T.MeshPhysicalMaterial({ color: 0xd9202a, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }));
    plug.position.set(CUP.plug.x, Y(0.257) + CUP.plug.h / 2, CUP.plug.z);
    cupG.add(plug);

    // หลอดฟ้าใส (เป็นท่อกลวง เห็นผนังสองชั้น)
    const sLenOut = CUP.straw.len + 0.03, sLenIn = 0.32, sLen = sLenOut + sLenIn;
    const straw = new T.Mesh(new T.CylinderGeometry(CUP.straw.r, CUP.straw.r, sLen, 48, 1, true),
      new T.MeshPhysicalMaterial({ color: 0x6ab6e6, metalness: 0, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.3, side: T.DoubleSide }));
    const strawHold = new T.Group();
    strawHold.position.set(CUP.straw.x, Y(CUP.straw.y), 0);
    strawHold.rotation.z = -CUP.straw.tilt * D;
    straw.position.y = sLen / 2 - sLenIn;
    strawHold.add(straw);
    cupG.add(strawHold);

    // ---------- เงาบนพื้น ----------
    const sh = opts.shadow || '40,0,0';
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const sg = sc.getContext('2d'); const grd = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, `rgba(${sh},0.55)`); grd.addColorStop(0.55, `rgba(${sh},0.25)`); grd.addColorStop(1, `rgba(${sh},0)`);
    sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
    const shadow = new T.Mesh(new T.PlaneGeometry(0.55, 0.55), new T.MeshBasicMaterial({ map: tex(sc, false), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = Y(by) - 0.002;
    cupG.add(shadow);

    // ---------- คลื่น + น้ำกระฉอก ----------
    const floaters = ices.filter(i => i.floats);
    const pos = surfGeo.attributes.position;
    let lastRy = null, lastV = 0, wob = 0, wobV = 0, agit = 0, time = 0;
    function waves(t) {
      const amp = 0.0016 + agit * 0.011;
      for (let i = 0; i < pos.count; i++) {
        const x = surfBase[i * 3], y = surfBase[i * 3 + 1];
        let h = amp * (Math.sin(x * 38 + t * 2.1) * 0.6 + Math.sin((x * 0.5 + y * 0.86) * 52 - t * 2.7) * 0.4 + Math.sin((y - x * 0.3) * 71 + t * 3.4) * 0.25);
        // วงคลื่นเล็กๆ รอบก้อนน้ำแข็งที่ลอยอยู่
        for (const f of floaters) {
          const dd = Math.hypot(x - f.sx, y - f.sy);
          h += 0.0011 * Math.sin(dd * 140 - t * 5 + f.ph) * Math.exp(-dd * 22);
        }
        // ขอบผิวน้ำเกาะผนังแก้วโค้งขึ้นนิดหน่อย (แรงตึงผิว)
        const rr = Math.hypot(x, y) / surfR;
        h += Math.pow(Math.max(0, rr - 0.86) / 0.14, 2) * 0.0025;
        pos.setZ(i, h);
      }
      pos.needsUpdate = true;
      surfGeo.computeVertexNormals();
    }

    return {
      scene,
      // calm = ไม่คำนวณน้ำกระฉอก (รูปโชว์/ภาพนิ่งใช้โมเดลร่วมกันหลายมุม ไม่ใช่การหมุนจริง)
      step(rx, ry, dt, calm) {
        cupG.rotation.set(-rx * D, ry * D, 0, 'XYZ');
        time += dt;
        if (calm) { lastRy = null; lastV = 0; wob = 0; wobV = 0; agit = 0; }
        else {
          // ความเร่งของการหมุน → น้ำกระฉอก + คลื่นแรงขึ้น แล้วค่อยๆ นิ่ง
          const v = lastRy == null ? 0 : (ry - lastRy) / dt;
          const acc = lastRy == null ? 0 : (v - lastV) / dt;
          lastV = v; lastRy = ry;
          wobV += (-120 * wob - 5.5 * wobV - acc * 0.0009) * dt;
          wob += wobV * dt;
          wob = Math.max(-0.22, Math.min(0.22, wob));
          agit = Math.min(1, agit * Math.exp(-dt * 1.6) + Math.abs(acc) * 0.00004 * dt + Math.abs(v) * 0.00012 * dt);
        }
        // ผิวน้ำพยายามอยู่ระนาบ (ชดเชยการเอียงแก้วครึ่งหนึ่ง) + เอียงตามแรงกระฉอก
        surfHold.rotation.y = -ry * D;
        surfTilt.rotation.set(rx * D * 0.45, 0, wob);
        // ตำแหน่งน้ำแข็งในกรอบของผิวน้ำ (ผิวน้ำหมุนสวนกับแก้วเพื่อทรงระนาบ)
        const ca = Math.cos(ry * D), sa = Math.sin(ry * D);
        for (const f of floaters) { f.sx = f.base.x * ca + f.base.z * sa; f.sy = -(-f.base.x * sa + f.base.z * ca); }
        waves(time);
        // น้ำแข็งที่ลอยอยู่โยกขึ้นลงตามคลื่น
        for (const f of floaters) {
          const bob = Math.sin(time * 1.9 + f.ph) * (0.0025 + agit * 0.006);
          f.m.position.y = f.base.y + bob;
          f.m.rotation.x = f.rot.x + Math.sin(time * 1.3 + f.ph) * (0.05 + agit * 0.2) + wob * 0.6;
          f.m.rotation.z = f.rot.z + Math.cos(time * 1.1 + f.ph) * (0.05 + agit * 0.2);
        }
      },
      dispose() {
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) { ['map', 'normalMap'].forEach(k => o.material[k] && o.material[k].dispose()); o.material.dispose(); }
        });
      }
    };
  }

  // หน้าดู 3D แบบเต็มจอ: renderer ของตัวเอง ปิดแล้วคืนหน่วยความจำ
  async function buildCafeCupGL(card, imageUrl) {
    if (!webglOk()) return null;
    const [T, px] = await Promise.all([loadThree(), loadCupPixels(imageUrl)]);
    if (!px) return null;
    const D = Math.PI / 180;
    const cw = card.clientWidth, ch = card.clientHeight;
    const W = Math.round(cw * 1.5), H = Math.round(ch * 1.25);
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    setupRenderer(T, renderer);
    const el = renderer.domElement;
    el.className = 'v3d-cup-gl';
    el.style.cssText = `position:absolute;left:${(cw - W) / 2}px;top:${(ch - H) / 2}px;width:${W}px;height:${H}px;pointer-events:none;`;

    // ฉากร้านคาเฟ่ไม่ใช่สีแดง → ใช้แสงสะท้อนสีกลาง ไม่งั้นแก้วติดสีแดง
    const envRT = studioEnv(T, renderer, true);
    const model = createCupModel(T, px, { texSize: 2048, aniso: renderer.capabilities.getMaxAnisotropy(), shadow: '40,20,10' });
    model.scene.environment = envRT.texture;
    const camera = new T.PerspectiveCamera(26, W / H, 0.05, 20);
    camera.position.set(0, 0, (1.25 / 2) / Math.tan(13 * D));
    camera.lookAt(0, 0, 0);
    card.appendChild(el);

    let t0 = performance.now();
    return {
      gl: true,
      update(rx, ry) {
        const now = performance.now(), dt = Math.min(0.05, (now - t0) / 1000) || 0.016; t0 = now;
        model.step(rx, ry, dt);
        renderer.render(model.scene, camera);
      },
      dispose() {
        model.dispose();
        envRT.dispose();
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* ปิดไปแล้ว */ }
        el.remove();
      }
    };
  }

  // =========================================================================
  // 🥤 รูปโชว์สินค้าในกระเป๋าเป็นแก้ว 3D หมุนช้าๆ
  // ใช้ renderer เดียวร่วมกันทุกใบ (เบราว์เซอร์จำกัดจำนวน WebGL ต่อหน้า) วาดแล้วคัดลอกลง canvas ของแต่ละการ์ด
  // หมุนเฉพาะใบที่เห็นบนจอ, 30fps, ไม่รองรับ WebGL ก็ใช้รูปเดิม
  // ใช้: blm48CupThumb(imgElement, imageUrl, { style })  (style = CSS ของ canvas ถ้าไม่ใช้ขนาดเต็มกรอบ)
  // =========================================================================
  const TH = { ready: null, T: null, renderer: null, env: null, camera: null, models: new Map(), items: [], io: null, raf: 0, last: 0 };

  function thumbSetup() {
    if (!TH.ready) {
      TH.ready = loadThree().then(T => {
        TH.T = T;
        const r = new T.WebGLRenderer({ antialias: true, alpha: true });
        r.setPixelRatio(1);
        setupRenderer(T, r);
        TH.renderer = r;
        TH.env = studioEnv(T, r, true);
        TH.camera = new T.PerspectiveCamera(24, 1, 0.05, 20);
        TH.io = new IntersectionObserver(entries => entries.forEach(e => {
          const it = TH.items.find(x => x.canvas === e.target);
          if (it) it.visible = e.isIntersecting;
        }), { rootMargin: '80px' });
      }).catch(err => { TH.ready = null; throw err; });
    }
    return TH.ready;
  }
  function thumbModel(url) {
    if (!TH.models.has(url)) {
      TH.models.set(url, loadCupPixels(url).then(px => {
        if (!px) return null;
        const m = createCupModel(TH.T, px, { texSize: 1024, aniso: TH.renderer.capabilities.getMaxAnisotropy(), shadow: '0,0,0', light: true });
        m.scene.environment = TH.env.texture;
        return m;
      }).catch(() => null));
    }
    return TH.models.get(url);
  }
  function thumbTick(now) {
    TH.raf = requestAnimationFrame(thumbTick);
    if (now - TH.last < 33) return;
    const dt = Math.min(0.1, (now - (TH.last || now)) / 1000) || 0.033;
    TH.last = now;
    TH.items = TH.items.filter(it => { if (it.canvas.isConnected) return true; TH.io.unobserve(it.canvas); return false; });
    if (!TH.items.length) { cancelAnimationFrame(TH.raf); TH.raf = 0; TH.last = 0; return; }
    const T = TH.T, r = TH.renderer, cam = TH.camera;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = r.getSize(new T.Vector2());
    for (const it of TH.items) {
      if (!it.visible) continue;
      const w = Math.round(it.canvas.clientWidth * dpr), h = Math.round(it.canvas.clientHeight * dpr);
      if (!w || !h) continue;
      if (it.canvas.width !== w || it.canvas.height !== h) { it.canvas.width = w; it.canvas.height = h; }
      if (size.x !== w || size.y !== h) { r.setSize(w, h, false); size.set(w, h); }
      // จัดกล้องให้แก้วเต็มกรอบพอดีเหมือนรูปเดิม (สูงรูป = 1 หน่วย)
      const ext = 1.06;
      cam.aspect = w / h;
      cam.position.set(0, 0, (ext / 2) / Math.tan(12 * Math.PI / 180));
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      it.ry += dt * 26;
      it.model.step(-10, it.ry, dt, true);
      r.setClearColor(it.bg, 1);
      r.render(it.model.scene, cam);
      it.ctx.clearRect(0, 0, w, h);
      it.ctx.drawImage(r.domElement, 0, 0);
    }
  }
  // 📸 ภาพนิ่งความละเอียดสูงของแก้ว 3D (มุมเฉียงสวยๆ พื้นสตูดิโอสีเทาอ่อน) สำหรับปุ่ม Save → Promise<Blob PNG> หรือ null
  window.blm48CupSnapshot = async function (imageUrl, opts) {
    if (!webglOk()) return null;
    try {
      await thumbSetup();
      const model = await thumbModel(imageUrl);
      if (!model) return null;
      const T = TH.T, r = TH.renderer, cam = TH.camera;
      const w = (opts && opts.width) || 1200, h = (opts && opts.height) || 1500;
      r.setSize(w, h, false);
      cam.aspect = w / h;
      cam.position.set(0, 0, (1.12 / 2) / Math.tan(12 * Math.PI / 180));
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      model.step(-12, (opts && opts.angle != null) ? opts.angle : 28, 0.016, true);
      r.setClearColor(new T.Color((opts && opts.background) || '#f4f4f7'), 1);
      r.render(model.scene, cam);
      // คัดลอกทันทีหลังวาด (บัฟเฟอร์ WebGL จะถูกล้างเมื่อจบเฟรม)
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      out.getContext('2d').drawImage(r.domElement, 0, 0);
      return await new Promise(res => out.toBlob(res, 'image/png'));
    } catch (err) {
      console.warn('cup snapshot:', err);
      return null;
    }
  };

  window.blm48CupThumb = async function (img, imageUrl, opts) {
    if (!img || !webglOk() || !window.IntersectionObserver) return false;
    try {
      await thumbSetup();
      const model = await thumbModel(imageUrl);
      if (!model || !img.isConnected) return false;
      // ระหว่างโหลด รูปอาจถูกเปลี่ยนเป็นไอเทมอื่นแล้ว (เช่นหน้าพรีวิวเปิดชิ้นใหม่) → ไม่ต้องใส่แก้ว
      if (img.src !== new URL(imageUrl, location.href).href) return false;
      const canvas = document.createElement('canvas');
      canvas.className = img.className + ' is-3d-cup';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', img.alt || '');
      canvas.style.cssText = (opts && opts.style) || 'width:100%;height:100%;display:block;';
      img.style.display = 'none';
      img.parentNode.insertBefore(canvas, img);
      // แต่ละใบเริ่มมุมต่างกันนิดหน่อย ไม่หมุนพร้อมกันเป๊ะ
      // วาดบนสีพื้นของการ์ดเลย (ชั้นแสงสะท้อนของพลาสติกต้องมีพื้นให้ผสม ไม่งั้นบนพื้นขาวจะดูซีดจาง)
      const bgOf = el => { const c = el && getComputedStyle(el).backgroundColor; return c && !/^rgba\(.*,\s*0\)$|transparent/.test(c) ? c : null; };
      const bg = new TH.T.Color().setStyle(bgOf(canvas) || bgOf(canvas.parentElement) || '#f6f6f8');
      const it = { canvas, ctx: canvas.getContext('2d'), model, bg, ry: -30 + TH.items.length * 47, visible: true };
      TH.items.push(it);
      TH.io.observe(canvas);
      if (!TH.raf) TH.raf = requestAnimationFrame(thumbTick);
      return true;
    } catch (err) {
      console.warn('cup thumb 3d:', err);
      return false;
    }
  };

  window.blm48Open3DViewer = function (opts) {
    injectStyles();
    const o = document.createElement('div');
    o.className = 'v3d-overlay';
    const backArt = backFor(opts);
    const backClass = backArt ? ' is-art' + (backArt === BG_PHOTOCARD ? ' is-card' : '') : '';
    o.innerHTML = `
      <div class="v3d-title"></div>
      <button type="button" class="v3d-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="v3d-scene">
        <div class="v3d-card${opts.isSSR ? ' is-ssr' : ''}">
          <div class="v3d-face v3d-front"><img alt="" draggable="false"></div>
          <div class="v3d-face v3d-back${backClass}"><img src="${backArt || BACK_LOGO}" alt="" draggable="false"></div>
        </div>
      </div>
      <div class="v3d-hint">Drag to rotate · Double-tap to flip</div>
      <div class="v3d-actions">
        <button type="button" class="v3d-btn" data-act="flip"><i class="fa-solid fa-rotate"></i> Flip</button>
        <button type="button" class="v3d-btn" data-act="reset"><i class="fa-solid fa-arrows-to-dot"></i> Reset</button>
      </div>`;
    const titleEl = o.querySelector('.v3d-title');
    titleEl.textContent = opts.label || '';
    if (opts.isSSR) titleEl.insertAdjacentHTML('beforeend', '<span class="ssr">SSR</span>');
    const card = o.querySelector('.v3d-card');
    const img = o.querySelector('.v3d-front img');
    let cupMode = isCafeDrink(opts);
    let cup = null, closed = false;
    card.style.aspectRatio = cupMode ? String(CUP.aspect) : '5 / 7';
    img.onload = () => { if (!cup && img.naturalWidth && img.naturalHeight) card.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight; };
    img.src = opts.image || '';
    if (cupMode) {
      o.classList.add('is-cafe');
      card.classList.add('is-cup');
      o.querySelector('.v3d-hint').textContent = 'Drag to rotate · Double-tap to spin';
      o.querySelector('[data-act="flip"]').innerHTML = '<i class="fa-solid fa-rotate"></i> Spin';
    }
    document.body.appendChild(o);
    // สร้างแก้ว 3D หลังวางลงหน้าแล้ว (ต้องรู้ขนาดจริง) ถ้าไม่สำเร็จก็แสดงเป็นการ์ดแบนเหมือนเดิม
    if (cupMode) {
      const asCard = () => { // สร้างแก้วไม่ได้ → กลับเป็นการ์ดแบน (พลิกดูด้านหลังได้ตามปกติ)
        cupMode = false;
        card.classList.remove('is-cup');
        o.querySelector('.v3d-hint').textContent = 'Drag to rotate · Double-tap to flip';
        o.querySelector('[data-act="flip"]').innerHTML = '<i class="fa-solid fa-rotate"></i> Flip';
      };
      const useCup = c => {
        if (!c) { asCard(); return; }
        if (closed) { if (c.dispose) c.dispose(); return; }
        cup = c;
        card.style.aspectRatio = String(CUP.aspect);
        card.classList.add('cup-ready');
      };
      // WebGL (ผิวเรียบ สะท้อนแสง มีน้ำ) → ไม่ได้ก็แก้วแบบ CSS → ไม่ได้อีกก็การ์ดแบน
      buildCafeCupGL(card, opts.image || '')
        .catch(err => { console.warn('cafe cup webgl:', err); return null; })
        .then(c => c || buildCafeCup(card, opts.image || ''))
        .then(useCup)
        .catch(err => { console.warn('cafe cup 3d:', err); asCard(); });
    }
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => o.classList.add('show'));

    let rx = -8, ry = -18;          // มุมปัจจุบัน
    let vx = 0, vy = 0;             // ความเร็วหลังปล่อยนิ้ว (เฉื่อย)
    let dragging = false, lastX = 0, lastY = 0, lastT = 0;
    let touched = false, idleT = 0, raf = 0, target = null;

    function apply() {
      // แก้ว WebGL หมุนตัวโมเดลเอง (การ์ดไม่ต้องหมุนด้วย CSS)
      card.style.transform = cup && cup.gl ? 'none' : `rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (cup) { cup.update(rx, ry); return; }
      // แสงสะท้อนตามมุมเอียง (SSR วาวกว่า)
      const tilt = Math.sin(ry * Math.PI / 180) * 0.6 + Math.sin(rx * Math.PI / 180) * 0.4;
      card.style.setProperty('--br', (1 + tilt * (opts.isSSR ? 0.28 : 0.16)).toFixed(3));
      card.style.setProperty('--sat', (1 + Math.abs(tilt) * (opts.isSSR ? 0.5 : 0.15)).toFixed(3));
    }

    function loop(t) {
      if (target) { // หมุนไปมุมเป้าหมาย (พลิก / จัดตรง)
        rx += (target.rx - rx) * 0.14; ry += (target.ry - ry) * 0.14;
        if (Math.abs(target.rx - rx) < 0.2 && Math.abs(target.ry - ry) < 0.2) { rx = target.rx; ry = target.ry; target = null; }
      } else if (!dragging) {
        if (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02) { ry += vy; rx += vx; vx *= 0.94; vy *= 0.94; }
        else if (!touched && cupMode) { idleT += 0.016; ry = -18 + idleT * 28; rx = -12 + Math.sin(idleT * 0.9) * 4; } // แก้ว: หมุนช้าๆ บนแท่นก่อนผู้ใช้แตะ
        else if (!touched) { idleT += 0.016; ry = -18 + Math.sin(idleT * 1.2) * 16; rx = -8 + Math.sin(idleT * 0.9) * 5; } // โยกเบาๆ ก่อนผู้ใช้แตะ
        rx = Math.max(-40, Math.min(40, rx));
      }
      apply();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    let lastTap = 0;
    function flip() {
      touched = true; vx = vy = 0;
      // แก้ว: หมุนรอบหนึ่งรอบ / การ์ด: พลิกดูด้านหลัง
      target = cupMode ? { rx: -10, ry: Math.round(ry / 360) * 360 + 360 } : { rx: 0, ry: Math.round((ry + 180) / 180) * 180 };
    }

    o.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const now = Date.now();
      if (now - lastTap < 300) { flip(); lastTap = 0; return; }
      lastTap = now;
      dragging = true; touched = true; target = null; vx = vy = 0;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
      o.setPointerCapture(e.pointerId);
    });
    o.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      ry += dx * 0.45; rx = Math.max(-40, Math.min(40, rx - dy * 0.35));
      const now = Date.now(), dt = Math.max(16, now - lastT);
      vy = dx * 0.45 * (16 / dt); vx = -dy * 0.35 * (16 / dt);
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    });
    const end = () => { dragging = false; };
    o.addEventListener('pointerup', end);
    o.addEventListener('pointercancel', end);

    o.querySelector('[data-act="flip"]').addEventListener('click', flip);
    o.querySelector('[data-act="reset"]').addEventListener('click', () => { touched = true; vx = vy = 0; target = { rx: 0, ry: Math.round(ry / 360) * 360 }; });

    function close() {
      closed = true;
      cancelAnimationFrame(raf);
      if (cup && cup.dispose) setTimeout(() => cup.dispose(), 260);
      document.removeEventListener('keydown', onKey);
      o.classList.remove('show');
      document.documentElement.style.overflow = '';
      setTimeout(() => o.remove(), 250);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    o.querySelector('.v3d-close').addEventListener('click', close);
  };
})();
