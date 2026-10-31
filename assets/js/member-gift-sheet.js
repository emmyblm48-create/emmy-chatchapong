// 🎁 แผงส่งของขวัญให้เมมเบอร์ (หน้าตาเดียวกับแผงของขวัญหน้าโหวต majorvote_detail.html)
// ใช้ร่วมกันในหน้า member.html (ปุ่ม Gift) และ index.html (กดรูปเมมเบอร์ใน Ranking Member)
// ต้องโหลดหลัง common.js + supabase-client.js (+ member-gift-stickers.js สำหรับรูปสติ๊กเกอร์)
//
// เปิดให้ทุกบัญชีที่ล็อกอินแล้ว (User / Member / Admin)
// แท็บ: Normal / BLM48 / Backpack — ไม่แสดงของขวัญ NPT48; แท็บ BLM48 ยังปิดอยู่ (visibleTiers)
// ของขวัญ = การปาคุกกี้รายเดือน: มูลค่าของขวัญ x จำนวน = คุกกี้ที่ปาให้เมมเบอร์ (Ranking / Fan Score / Top Fans /
// Campaign / ภารกิจรายวัน เหมือน give_cookie ทุกอย่าง) — ซื้อแล้วเลือกได้ว่าจะส่งเลยหรือเก็บเข้า Backpack ก่อน — ส่งจาก Backpack ไม่หัก Cookie ซ้ำ; ปาคุกกี้ปกติยังใช้ได้
//
// blm48OpenMemberGift({ name, img, postId, hideRecipient, onAvatarClick, onSent })
//   postId:        ส่งในโพสต์ของเมมเบอร์ (นับยอด Gifts ใต้โพสต์) / hideRecipient: ไม่โชว์รูป+ชื่อเมมเบอร์บนแผง
//   onAvatarClick: กดรูปเมมเบอร์บนแผง (ไม่ใส่ = ไปหน้าโปรไฟล์เมมเบอร์)
//   onSent(res):   ส่งสำเร็จ (res.cost = Cookie ที่นับเป็นยอดซัพพอร์ต)
(function () {
  const CSS = `/* Gift Sheet (แบบแผงส่งของขวัญของแอป: รูปเมมเบอร์ลอยขอบบน > แท็บขีดเส้นใต้ > กริด 4x2 ปัดเปลี่ยนหน้า > ปุ่มจำนวน > แถบ Send) */
.gift-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 2000; align-items: flex-end; justify-content: center; }
.gift-modal-box { background: #ffffff; width: 100%; max-width: none; max-height: calc(100vh - 70px); border-radius: 24px 24px 0 0; display: flex; flex-direction: column; position: relative; animation: gift-modal-slide-up 0.25s ease; }
@keyframes gift-modal-slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.gift-modal-close { position: absolute; top: 12px; right: 14px; background: #f3f3f3; border: none; width: 30px; height: 30px; border-radius: 50%; color: #888; cursor: pointer; font-size: 14px; z-index: 2; }
.gift-modal-recipient { display: flex; flex-direction: column; align-items: center; margin-top: -56px; padding-bottom: 12px; flex-shrink: 0; }
.gift-modal-avatar { width: 112px; height: 112px; border-radius: 50%; object-fit: cover; background: #f5f5f5; border: 4px solid #ffffff; box-shadow: 0 0 0 3px var(--frame, #ffde5b), 0 4px 14px rgba(0,0,0,0.12); }
.gift-modal-target { font-family: 'Quicksand', 'Kanit', sans-serif; font-weight: 700; font-size: 21px; color: #111; text-transform: uppercase; margin-top: 10px; max-width: 80%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* แท็บหมวดของขวัญ + Backpack (ของที่ซื้อเก็บไว้) อยู่แถวเดียวกัน */
.gift-tabs { display: flex; border-top: 1px solid #eeeeee; border-bottom: 1px solid #eeeeee; flex-shrink: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
.gift-tabs::-webkit-scrollbar { display: none; }
.gift-tab { flex: 1 0 auto; min-width: 25%; background: none; border: none; padding: 14px 10px 12px; font-family: 'Quicksand', 'Kanit', sans-serif; font-size: 16px; font-weight: 600; color: #b8b8b8; cursor: pointer; position: relative; white-space: nowrap; }
.gift-tab.active { color: #111; }
.gift-tab.active::after { content: ''; position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); width: 60%; height: 4px; border-radius: 2px; background: #ffd75e; }
/* หน้าละ 8 ชิ้น (4x2) ปัดซ้ายขวาได้ มีจุดบอกหน้าด้านล่าง */
.gift-pager { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; flex-shrink: 1; min-height: 0; }
.gift-pager::-webkit-scrollbar { display: none; }
.gift-page { flex: 0 0 100%; scroll-snap-align: start; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 8px; padding: 12px 10px 4px; align-content: start; min-height: 290px; }
.gift-item-card { background: none; border: 2px solid transparent; border-radius: 12px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; cursor: pointer; min-width: 0; transition: transform 0.1s, background 0.15s, border-color 0.15s; }
.gift-item-card:active { transform: scale(0.96); }
.gift-item-card.selected { border-color: #ffd75e; background: #fffdf4; }
.gift-item-img { width: 70px; height: 70px; object-fit: contain; display: block; }
.gift-item-name { width: 100%; text-align: center; font-size: 12.5px; font-weight: 500; color: #a9a9a9; margin: 6px 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gift-item-cost { width: 100%; background: #ececec; border-radius: 999px; padding: 5px 4px; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 14px; font-weight: 700; color: #333; }
.gift-item-cost i { color: #e2a63b; font-size: 13px; }
.gift-loading, .gift-empty { flex: 0 0 100%; min-height: 290px; display: flex; align-items: center; justify-content: center; text-align: center; color: #999; padding: 30px 24px; font-size: 13.5px; line-height: 1.6; }
.gift-dots { display: flex; justify-content: center; gap: 10px; padding: 6px 0 12px; flex-shrink: 0; min-height: 26px; }
.gift-dot { width: 8px; height: 8px; border-radius: 50%; background: #e3e3e3; transition: background 0.2s; border: none; padding: 0; cursor: pointer; }
/* คอม: เมาส์ปัดหน้าไม่ได้ เลยมีลากด้วยเมาส์ / ล้อเมาส์ / กดจุด / ปุ่มลูกศร (ลูกศรโชว์เฉพาะเครื่องที่มีเมาส์) */
.gift-pager-wrap { position: relative; display: flex; flex-shrink: 1; min-height: 0; }
.gift-pager-wrap .gift-pager { flex: 1; min-width: 0; }
.gift-pager.dragging, .gift-pager.paging { scroll-snap-type: none; }
.gift-pager.dragging { cursor: grabbing; user-select: none; }
.gift-page-arrow { display: none; position: absolute; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.15); color: #555; font-size: 14px; cursor: pointer; z-index: 2; align-items: center; justify-content: center; }
.gift-page-arrow.prev { left: 4px; }
.gift-page-arrow.next { right: 4px; }
@media (hover: hover) and (pointer: fine) { .gift-page-arrow:not([hidden]) { display: flex; } }
.gift-dot.active { background: #9a9a9a; }
.gift-qty-row { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-top: 1px solid #eeeeee; flex-shrink: 0; }
.gift-qty-btn { flex: 1; min-width: 0; background: #ffffff; color: #222; border: 1.5px solid #ececec; padding: 10px 0; border-radius: 999px; font-family: 'Quicksand', 'Kanit', sans-serif; font-size: 16px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.gift-qty-btn.custom { flex: 2; }
.gift-qty-btn.active { border-color: #ffd75e; background: #fffdf4; }
.gift-qty-btn:disabled { color: #cfcfcf; cursor: not-allowed; }
.gift-send-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #f2f2f2; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); flex-shrink: 0; }
.gift-balance-chip { display: flex; align-items: center; gap: 10px; background: #ffffff; border-radius: 999px; padding: 6px 6px 6px 14px; min-width: 0; }
.gift-balance-chip > i { color: #e2a63b; font-size: 20px; }
.gift-balance-chip span { font-family: 'Quicksand', 'Kanit', sans-serif; font-size: 17px; font-weight: 600; color: #222; min-width: 40px; text-align: center; overflow: hidden; text-overflow: ellipsis; }
.gift-topup-btn { width: 34px; height: 34px; border-radius: 50%; background: #ffd36b; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; text-decoration: none; flex-shrink: 0; }
.gift-send-btn { background: #ffd75e; color: #222; border: none; border-radius: 999px; padding: 14px 44px; font-family: 'Quicksand', 'Kanit', sans-serif; font-size: 18px; font-weight: 700; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
.gift-send-btn:active { transform: scale(0.97); }
.gift-send-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
/* ป๊อปอัปยืนยันก่อนส่ง: ของขวัญ x จำนวน = Cookie ที่ต้องจ่าย */
.gift-confirm-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 2100; align-items: center; justify-content: center; padding: 16px; }
.gift-confirm-box { background: #ffffff; width: 100%; max-width: 380px; border-radius: 22px; overflow: hidden; animation: gift-confirm-pop 0.18s ease; }
@keyframes gift-confirm-pop { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.gift-confirm-title { text-align: center; font-size: 18px; font-weight: 700; color: #111; padding: 16px 12px 14px; border-bottom: 1px solid #eeeeee; }
.gift-confirm-body { padding: 22px 28px 18px; display: flex; flex-direction: column; align-items: center; }
.gift-confirm-item { display: flex; align-items: center; gap: 18px; }
.gift-confirm-item-col { display: flex; flex-direction: column; align-items: center; width: 130px; }
.gift-confirm-item-col img { width: 96px; height: 96px; object-fit: contain; }
.gift-confirm-item-col .gift-item-name { font-size: 13px; margin: 6px 0; }
.gift-confirm-qty { font-size: 24px; font-weight: 700; color: #111; white-space: nowrap; }
.gift-confirm-divider { display: flex; align-items: center; gap: 14px; width: 100%; margin: 20px 0 8px; font-size: 17px; font-weight: 700; color: #222; }
.gift-confirm-divider::before, .gift-confirm-divider::after { content: ''; flex: 1; height: 1px; background: #e6e6e6; }
.gift-confirm-total { display: flex; align-items: center; gap: 12px; font-family: 'Quicksand', 'Kanit', sans-serif; font-size: 34px; font-weight: 700; color: #111; }
.gift-confirm-total i { color: #e2a63b; font-size: 30px; }
.gift-confirm-note { font-size: 12.5px; color: #999; margin-top: 4px; text-align: center; }
.gift-confirm-actions { display: flex; gap: 12px; padding: 16px 20px 18px; border-top: 1px solid #eeeeee; }
.gift-confirm-cancel, .gift-confirm-ok { flex: 1; border-radius: 999px; padding: 13px 0; font-family: 'Quicksand', 'Kanit', sans-serif; font-size: 17px; cursor: pointer; }
.gift-confirm-cancel { background: #ffffff; color: #222; border: 1.5px solid #222; font-weight: 500; }
.gift-confirm-ok { flex: 1.5; background: #ffd75e; color: #222; border: none; font-weight: 700; }
.gift-confirm-actions.has-choice { gap: 8px; padding: 16px 14px 18px; }
.gift-confirm-actions.has-choice .gift-confirm-cancel, .gift-confirm-actions.has-choice .gift-confirm-ok { flex: 1; font-size: 15px; padding: 12px 0; }
.gift-confirm-bag { flex: 1; border-radius: 999px; padding: 12px 0; font-family: 'Quicksand', 'Kanit', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; background: #fffdf4; color: #222; border: 1.5px solid #ffd75e; }
/* ป๊อปอัป SweetAlert (เช่น Customize ระบุจำนวน) ต้องอยู่เหนือแผงของขวัญ + หน้ายืนยัน ไม่งั้นโดนบังจนพิมพ์/กดไม่ได้ */
.swal2-container { z-index: 2300 !important; }
@media (max-width: 360px) {
.gift-item-img { width: 56px; height: 56px; }
.gift-qty-btn { font-size: 14px; }
.gift-send-btn { padding: 13px 30px; }
}
/* 📏 หน้า Member: แผงเตี้ยลง ไม่ให้เกือบเต็มจอ (รูปเมมเบอร์/ของขวัญเล็กลง ระยะห่างกระชับขึ้น) */
.gift-modal-box { max-height: 78vh; }
.gift-modal-recipient { margin-top: -40px; padding-bottom: 6px; }
.gift-modal-avatar { width: 80px; height: 80px; border-width: 3px; }
.gift-modal-target { font-size: 17px; margin-top: 6px; }
.gift-tab { padding: 10px 10px 9px; font-size: 15px; }
.gift-tab.active::after { bottom: 5px; height: 3px; }
.gift-page { min-height: 0; gap: 4px 8px; padding: 8px 10px 2px; }
.gift-item-card { padding: 4px 4px 6px; }
.gift-item-img { width: 52px; height: 52px; }
.gift-item-name { margin: 4px 0; font-size: 12px; }
.gift-item-cost { padding: 3px 4px; font-size: 13px; }
.gift-loading, .gift-empty { min-height: 180px; }
.gift-dots { padding: 4px 0 8px; min-height: 18px; }
.gift-qty-row { padding: 8px 12px; }
.gift-qty-btn { padding: 7px 0; font-size: 15px; }
.gift-send-bar { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); }
.gift-balance-chip { padding: 4px 4px 4px 12px; }
.gift-topup-btn { width: 30px; height: 30px; }
.gift-send-btn { padding: 11px 40px; font-size: 17px; }
.gift-modal-avatar { cursor: pointer; }
.gift-modal-box.no-recipient .gift-modal-recipient { display: none; }
.gift-modal-box.no-recipient .gift-tabs { border-top: none; padding-right: 44px; }`;

  const MARKUP = `
  <div id="gift-modal-overlay" class="gift-modal-overlay" onclick="blm48Gift.close()">
    <div class="gift-modal-box" onclick="event.stopPropagation()">
      <button type="button" class="gift-modal-close" onclick="blm48Gift.close()"><i class="fa-solid fa-xmark"></i></button>
      <div class="gift-modal-recipient">
        <img id="gift-modal-avatar" class="gift-modal-avatar" src="assets/images/default-profile.png" alt="" onclick="blm48Gift.avatarClick()">
        <div class="gift-modal-target" id="gift-modal-target"></div>
      </div>
      <div class="gift-tabs" id="gift-tabs"></div>
      <div class="gift-pager-wrap">
        <button type="button" class="gift-page-arrow prev" id="gift-page-prev" onclick="blm48Gift.stepPage(-1)" aria-label="หน้าก่อนหน้า" hidden><i class="fa-solid fa-chevron-left"></i></button>
        <div class="gift-pager" id="gift-pager"></div>
        <button type="button" class="gift-page-arrow next" id="gift-page-next" onclick="blm48Gift.stepPage(1)" aria-label="หน้าถัดไป" hidden><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="gift-dots" id="gift-dots"></div>
      <div class="gift-qty-row" id="gift-qty-row"></div>
      <div class="gift-send-bar">
        <div class="gift-balance-chip">
          <i class="fa-solid fa-cookie-bite"></i>
          <span id="gift-modal-cookie-balance">0</span>
          <a class="gift-topup-btn" href="shop" title="เติม Cookie"><i class="fa-solid fa-plus"></i></a>
        </div>
        <button type="button" class="gift-send-btn" id="gift-send-btn" onclick="blm48Gift.openConfirm()" disabled>Send</button>
      </div>
    </div>
  </div>
  <div id="gift-confirm-overlay" class="gift-confirm-overlay" onclick="blm48Gift.closeConfirm()">
    <div class="gift-confirm-box" onclick="event.stopPropagation()">
      <div class="gift-confirm-title">Confirmation</div>
      <div class="gift-confirm-body" id="gift-confirm-body"></div>
      <div class="gift-confirm-actions" id="gift-confirm-actions"></div>
    </div>
  </div>`;

  const TIER_LABELS = { Normal: 'Normal', MembersDesign: 'BLM48' };
  const TIER_ORDER = ['Normal', 'MembersDesign'];
  const BACKPACK = '__backpack';
  const QTY_PRESETS = [1, 10, 50, 100];
  const PER_PAGE = 8;
  const MAX_CUSTOM_QTY = 9999;
  const BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  let catalog = null;
  let wallet = [];
  let tab = 'Normal';
  let selectedId = null;
  let qty = 1;
  let busy = false;
  let target = { name: '', postId: null, onAvatarClick: null, onSent: null };

  const $ = id => document.getElementById(id);
  const esc = s => (typeof escapeAttr === 'function' ? escapeAttr(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  function ensureDom() {
    if ($('gift-modal-overlay')) return;
    const st = document.createElement('style');
    st.id = 'blm48-gift-sheet-css';
    st.textContent = CSS;
    document.head.appendChild(st);
    document.body.insertAdjacentHTML('beforeend', MARKUP);
    $('gift-pager').addEventListener('scroll', () => {
      clearTimeout($('gift-pager')._dotTimer);
      $('gift-pager')._dotTimer = setTimeout(updateDots, 60);
    }, { passive: true });
  }

  function sessionUser() { return typeof getUserSession === 'function' ? getUserSession() : null; }
  function cookieBalance() { const u = sessionUser(); return Number((u && u.cookie) || 0); }
  function isBackpack() { return tab === BACKPACK; }
  // หมวด BLM48 เมมเบอร์กำลังออกแบบเอง: ตอนนี้เปิดแค่ Normal (send_member_gift เช็คซ้ำ) — เปิดหมวด BLM48 เมื่อพร้อมให้คืนค่า TIER_ORDER
  function visibleTiers() { return ['Normal']; }
  function gridImgSize() { return window.matchMedia('(max-width: 360px)').matches ? 46 : 52; }
  function imageHtml(item, size, imgHtml, opts) {
    return window.blm48GiftImageHtml ? window.blm48GiftImageHtml(item.rawId, item.img, size, imgHtml, opts) : imgHtml;
  }

  async function loadCatalog() {
    if (catalog) return;
    try {
      const [data, members] = await Promise.all([
        blm48GetGiftCatalog(),
        typeof blm48GetAllMembers === 'function' ? blm48GetAllMembers().catch(() => null) : null
      ]);
      catalog = (Array.isArray(data) ? data : []).filter(g => (g.active === true || g.active === undefined) && TIER_ORDER.includes(g.tier));
      sortByGeneration(catalog, members && Array.isArray(members.data) ? members.data : (Array.isArray(members) ? members : []));
    } catch (e) { console.error('Load Gift Catalog Error:', e); catalog = []; }
  }

  // แท็บ BLM48: เรียงของขวัญประจำตัวตามรุ่นของเมมเบอร์ (รุ่นแรกก่อน) แล้วตามรหัสเมมเบอร์ในรุ่นเดียวกัน
  // ชื่อเมมเบอร์ของแต่ละชิ้นมาจากแผนที่สติ๊กเกอร์ (gift_name บางชิ้นเป็นชื่อแฟนด้อม ไม่ใช่ชื่อเมมเบอร์)
  function sortByGeneration(list, members) {
    const info = {};
    members.forEach(m => { if (m && m.name) info[String(m.name).toLowerCase()] = m; });
    const keyOf = g => {
      const name = (window.blm48GiftMemberName && window.blm48GiftMemberName(g.giftId)) || g.giftName || '';
      const m = info[String(name).toLowerCase()];
      return {
        gen: m && Number(m.generation) ? Number(m.generation) : 999,
        id: (m && m.member_id) || 'ZZZ',
        name: String(name).toLowerCase()
      };
    };
    // Normal: ราคาน้อย -> มาก, ราคาเท่ากันเรียงตามชื่อ (ก-ฮ / A-Z)
    const others = list.filter(g => g.tier !== 'MembersDesign')
      .sort((a, b) => Number(a.costCookies || 0) - Number(b.costCookies || 0) || String(a.giftName || '').localeCompare(String(b.giftName || ''), 'th'));
    const designs = list.filter(g => g.tier === 'MembersDesign').map(g => ({ g, k: keyOf(g) }));
    designs.sort((x, y) => x.k.gen - y.k.gen || x.k.id.localeCompare(y.k.id) || x.k.name.localeCompare(y.k.name));
    list.splice(0, list.length, ...others, ...designs.map(x => x.g));
  }

  async function loadWallet() {
    try {
      const data = await blm48GetGiftWallet(sessionUser().username);
      wallet = (Array.isArray(data) ? data : []).filter(g => TIER_ORDER.includes(g.tier)); // ไม่รวม NPT48
    } catch (e) { console.error('Load Gift Wallet Error:', e); wallet = []; }
  }

  function items() {
    if (isBackpack()) {
      return wallet.filter(g => visibleTiers().includes(g.tier)).map(g => ({ id: String(g.giftId), rawId: g.giftId, name: g.giftName, img: g.imageUrl, cost: Number(g.costCookies || 0), owned: Number(g.qty || 0) }));
    }
    return (catalog || []).filter(g => g.tier === tab).map(g => ({
      id: String(g.giftId), rawId: g.giftId, name: g.giftName, img: g.imageUrl, cost: Number(g.costCookies || 0), owned: null
    }));
  }
  function selectedItem() { return items().find(g => g.id === String(selectedId)) || null; }
  function maxQty() { const it = selectedItem(); return (it && it.owned !== null) ? it.owned : MAX_CUSTOM_QTY; }

  async function open(opts) {
    ensureDom();
    target = { name: opts.name || '', postId: opts.postId || null, onAvatarClick: opts.onAvatarClick || null, onSent: opts.onSent || null };
    document.querySelector('#gift-modal-overlay .gift-modal-box').classList.toggle('no-recipient', !!opts.hideRecipient);
    selectedId = null;
    qty = 1;
    $('gift-modal-target').textContent = opts.name;
    const av = $('gift-modal-avatar');
    av.src = opts.img || 'assets/images/default-profile.png';
    av.style.setProperty('--frame', typeof groupFrameColor === 'function' ? groupFrameColor(opts.name) : '#ffde5b');
    $('gift-modal-overlay').style.display = 'flex';
    $('gift-tabs').innerHTML = '';
    $('gift-dots').innerHTML = '';
    $('gift-pager').innerHTML = `<div class="gift-loading"><i class="fa-solid fa-spinner fa-spin"></i>&nbsp; กำลังโหลด...</div>`;
    renderQty();
    updateSendBar();
    await loadCatalog();
    await selectTab('Normal');
  }

  function close() {
    closeConfirm();
    if ($('gift-modal-overlay')) $('gift-modal-overlay').style.display = 'none';
  }

  function avatarClick() {
    if (target.onAvatarClick) { target.onAvatarClick(); return; }
    close();
    window.location.href = `member?name=${encodeURIComponent(target.name)}`;
  }

  function renderTabs() {
    const tabs = visibleTiers().map(t => ({ key: t, label: TIER_LABELS[t] })).concat([{ key: BACKPACK, label: 'Backpack' }]);
    $('gift-tabs').innerHTML = tabs.map(t =>
      `<button type="button" class="gift-tab ${t.key === tab ? 'active' : ''}" onclick="blm48Gift.selectTab('${t.key}')">${t.label}</button>`
    ).join('');
  }

  async function selectTab(t) {
    tab = (t === BACKPACK || visibleTiers().includes(t)) ? t : 'Normal';
    selectedId = null;
    qty = 1;
    renderTabs();
    renderQty();
    updateSendBar();
    if (t === BACKPACK) {
      $('gift-dots').innerHTML = '';
      $('gift-pager').innerHTML = `<div class="gift-loading"><i class="fa-solid fa-spinner fa-spin"></i>&nbsp; กำลังเปิด Backpack...</div>`;
      await loadWallet();
      if (!isBackpack()) return; // สลับแท็บไปแล้วระหว่างรอโหลด
    }
    renderItems();
  }

  function renderItems() {
    const pager = $('gift-pager');
    const dots = $('gift-dots');
    const list = items();
    if (!list.length) {
      pager.innerHTML = isBackpack() ? `<div class="gift-empty">No Gift</div>` : `<div class="gift-empty">ยังไม่มีของขวัญในหมวดนี้</div>`;
      dots.innerHTML = '';
      updateDots();
      return;
    }
    const pages = [];
    for (let i = 0; i < list.length; i += PER_PAGE) pages.push(list.slice(i, i + PER_PAGE));
    pager.innerHTML = pages.map(page => `
      <div class="gift-page">
        ${page.map(item => `
          <div class="gift-item-card ${item.id === String(selectedId) ? 'selected' : ''}" data-gift-id="${esc(item.id)}" onclick="blm48Gift.selectItem('${esc(item.id)}')">
            ${imageHtml(item, gridImgSize(), `<img src="${esc(item.img || BLANK_IMG)}" class="gift-item-img" alt="" onerror="this.src='${BLANK_IMG}'">`)}
            <div class="gift-item-name">${esc(item.name)}</div>
            <div class="gift-item-cost">${item.owned !== null ? `x${item.owned.toLocaleString()}` : `<i class="fa-solid fa-cookie-bite"></i>${item.cost.toLocaleString()}`}</div>
          </div>`).join('')}
      </div>`).join('');
    pager.scrollLeft = 0;
    dots.innerHTML = pages.length > 1
      ? pages.map((_, i) => `<button type="button" class="gift-dot ${i === 0 ? 'active' : ''}" onclick="blm48Gift.goPage(${i})" aria-label="หน้า ${i + 1}"></button>`).join('')
      : '';
    updateDots();
  }

  function pageInfo() {
    const pager = $('gift-pager');
    const width = Math.max(1, pager.clientWidth);
    return { pager, width, count: pager.querySelectorAll('.gift-page').length, page: Math.round(pager.scrollLeft / width) };
  }
  function updateDots() {
    const { count, page } = pageInfo();
    document.querySelectorAll('#gift-dots .gift-dot').forEach((d, i) => d.classList.toggle('active', i === page));
    $('gift-page-prev').hidden = count < 2 || page <= 0;
    $('gift-page-next').hidden = count < 2 || page >= count - 1;
  }
  function goPage(index) {
    const { pager, width, count } = pageInfo();
    if (!count) return;
    pager.scrollTo({ left: Math.max(0, Math.min(count - 1, index)) * width, behavior: 'smooth' });
  }
  function stepPage(delta) { goPage(pageInfo().page + delta); }

  function selectItem(giftId) {
    selectedId = giftId;
    document.querySelectorAll('#gift-pager .gift-item-card').forEach(card => {
      const isSel = card.dataset.giftId === String(giftId);
      if (isSel && card.classList.contains('selected')) { card.classList.remove('selected'); void card.offsetWidth; } // กดซ้ำ = เล่นท่าใหม่
      card.classList.toggle('selected', isSel);
    });
    qty = Math.min(qty, Math.max(1, maxQty()));
    renderQty();
    updateSendBar();
  }

  function renderQty() {
    const max = maxQty();
    const isCustom = !QTY_PRESETS.includes(qty);
    $('gift-qty-row').innerHTML = QTY_PRESETS.map(q =>
      `<button type="button" class="gift-qty-btn ${q === qty ? 'active' : ''}" onclick="blm48Gift.setQty(${q})" ${q > max ? 'disabled' : ''}>×${q}</button>`
    ).join('') + `<button type="button" class="gift-qty-btn custom ${isCustom ? 'active' : ''}" onclick="blm48Gift.customQty()">${isCustom ? `×${qty.toLocaleString()}` : 'Customize'}</button>`;
  }
  function setQty(q) { qty = q; renderQty(); updateSendBar(); }

  async function customQty() {
    const max = maxQty();
    const { value } = await Swal.fire({
      title: 'ระบุจำนวน', input: 'number', inputValue: qty,
      inputAttributes: { min: 1, max: max, step: 1, inputmode: 'numeric' },
      showCancelButton: true, confirmButtonText: 'ตกลง', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#ffd75e',
      inputValidator: (v) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) return 'กรุณาใส่จำนวนเต็มตั้งแต่ 1 ขึ้นไป';
        if (n > max) return `ใส่ได้สูงสุด ${max.toLocaleString()} ชิ้น`;
      }
    });
    if (value) setQty(Number(value));
  }

  function updateSendBar() {
    $('gift-modal-cookie-balance').textContent = cookieBalance().toLocaleString();
    $('gift-send-btn').disabled = !selectedItem() || busy;
  }

  function openConfirm() {
    const item = selectedItem();
    if (!item || busy) return;
    const total = item.cost * qty;
    if (!isBackpack() && cookieBalance() < total) {
      Swal.fire({
        title: 'คุกกี้ไม่พอ', text: `คุณมี ${cookieBalance().toLocaleString()} Cookies แต่ต้องใช้ ${total.toLocaleString()} Cookies`,
        icon: 'warning', showCancelButton: true, confirmButtonText: 'เติม Cookie', cancelButtonText: 'ปิด', confirmButtonColor: '#ffd75e'
      }).then(r => { if (r.isConfirmed) window.location.href = 'shop'; });
      return;
    }
    const pill = isBackpack() ? `มีอยู่ x${item.owned.toLocaleString()}` : `<i class="fa-solid fa-cookie-bite"></i>${item.cost.toLocaleString()}`;
    $('gift-confirm-body').innerHTML = `
      <div class="gift-confirm-item">
        <div class="gift-confirm-item-col">
          ${imageHtml(item, 96, `<img src="${esc(item.img || BLANK_IMG)}" alt="" onerror="this.src='${BLANK_IMG}'">`, { play: true })}
          <div class="gift-item-name">${esc(item.name)}</div>
          <div class="gift-item-cost">${pill}</div>
        </div>
        <div class="gift-confirm-qty">× ${qty.toLocaleString()}</div>
      </div>
      <div class="gift-confirm-divider">Equal</div>
      <div class="gift-confirm-total"><i class="fa-solid fa-cookie-bite"></i>${total.toLocaleString()}</div>
      <div class="gift-confirm-note">${isBackpack()
        ? `เท่ากับปาคุกกี้ ${total.toLocaleString()} ให้ ${esc(target.name)} · ใช้ของจาก Backpack ไม่หัก Cookie ซ้ำ`
        : `Send Now = ส่งให้ ${esc(target.name)} ทันที · Backpack = ซื้อเก็บไว้ก่อน ส่งทีหลังได้`}</div>`;
    // แท็บร้านค้า: ให้ผู้ใช้เลือกเองว่าจะ "ส่งเลย" หรือ "เก็บเข้า Backpack" ก่อน
    const actions = $('gift-confirm-actions');
    actions.classList.toggle('has-choice', !isBackpack());
    actions.innerHTML = `<button type="button" class="gift-confirm-cancel" onclick="blm48Gift.closeConfirm()">Cancel</button>` + (isBackpack()
      ? `<button type="button" class="gift-confirm-ok" onclick="blm48Gift.send('now')">Confirm</button>`
      : `<button type="button" class="gift-confirm-bag" onclick="blm48Gift.send('bag')">Backpack</button>
         <button type="button" class="gift-confirm-ok" onclick="blm48Gift.send('now')">Send Now</button>`);
    $('gift-confirm-overlay').style.display = 'flex';
  }
  function closeConfirm() { if ($('gift-confirm-overlay')) $('gift-confirm-overlay').style.display = 'none'; }

  function setBusy(b) {
    busy = b;
    $('gift-send-btn').innerHTML = b ? '<i class="fa-solid fa-spinner fa-spin"></i>' : 'Send';
    updateSendBar();
  }

  // mode 'now' = ส่งให้เมมเบอร์เลย (แท็บร้านค้า: ซื้อแล้วส่งทันที / แท็บ Backpack: ใช้ของในกระเป๋า)
  // mode 'bag' = แท็บร้านค้า: ซื้อเก็บเข้า Backpack ไว้ก่อน ยังไม่ส่ง
  function send(mode) {
    closeConfirm();
    return (mode === 'bag' && !isBackpack()) ? buyToBackpack() : sendGift();
  }

  async function buyToBackpack() {
    const item = selectedItem();
    const u = sessionUser();
    if (!item || busy || !u) return;
    const buyQty = qty;
    setBusy(true);
    try {
      const res = await blm48BuyGiftWallet(u.username, item.rawId, buyQty);
      if (res && res.status === 'success') {
        if (typeof saveUserSession === 'function') {
          u.cookie = (res.newBalance !== undefined && res.newBalance !== null) ? Number(res.newBalance) : Math.max(0, Number(u.cookie || 0) - item.cost * buyQty);
          saveUserSession(u);
        }
        Swal.fire({ icon: 'success', title: `เก็บ "${item.name}" x${buyQty} เข้า Backpack แล้ว`, text: 'กด Send ในแท็บ Backpack เพื่อส่งให้เมมเบอร์ได้เลย', timer: 1800, showConfirmButton: false });
        // พาไปแท็บ Backpack พร้อมเลือกของที่เพิ่งซื้อไว้ให้ กด Send ต่อได้ทันที
        await selectTab(BACKPACK);
        if (isBackpack() && wallet.some(g => String(g.giftId) === item.id)) {
          selectedId = item.id;
          qty = Math.min(buyQty, Math.max(1, maxQty()));
          renderItems();
          renderQty();
        }
      } else {
        Swal.fire({ title: 'เก็บของขวัญไม่สำเร็จ', text: (res && res.message) || 'กรุณาลองใหม่อีกครั้งค่ะ', icon: 'error', confirmButtonColor: '#ffd75e' });
      }
    } catch (err) {
      console.error('Buy Gift To Backpack Error:', err);
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้ กรุณาลองใหม่ค่ะ', icon: 'error', confirmButtonColor: '#ffd75e' });
    } finally {
      setBusy(false);
    }
  }

  async function sendGift() {
    const item = selectedItem();
    const u = sessionUser();
    if (!item || busy || !u) return;
    const sendQty = qty;
    const fromBackpack = isBackpack();
    setBusy(true);
    try {
      const res = await blm48SendMemberGift(u.username, target.name, item.rawId, sendQty, fromBackpack, target.postId);
      if (res && res.status === 'success') {
        if (res.remainingCookie !== undefined && res.remainingCookie !== null && typeof saveUserSession === 'function') {
          u.cookie = Number(res.remainingCookie);
          if (res.currentToken !== undefined && res.currentToken !== null) u.token = Number(res.currentToken); // โบนัส 10 Token ครั้งแรกของเดือน
          saveUserSession(u);
        }
        Swal.fire({ icon: 'success', title: res.message || 'ส่งของขวัญเรียบร้อย', timer: 1500, showConfirmButton: false });
        if (fromBackpack) await loadWallet();
        selectedId = null;
        qty = 1;
        renderItems();
        renderQty();
        if (target.onSent) { try { target.onSent(res); } catch (e) { console.error(e); } }
      } else {
        Swal.fire({ title: 'ส่งของขวัญไม่สำเร็จ', text: (res && res.message) || 'กรุณาลองใหม่อีกครั้งค่ะ', icon: 'error', confirmButtonColor: '#ffd75e' });
      }
    } catch (err) {
      console.error('Send Member Gift Error:', err);
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้ กรุณาลองใหม่ค่ะ', icon: 'error', confirmButtonColor: '#ffd75e' });
    } finally {
      setBusy(false);
    }
  }

  window.blm48OpenMemberGift = open;
  window.blm48Gift = { close, avatarClick, selectTab, selectItem, setQty, customQty, goPage, stepPage, openConfirm, closeConfirm, send };
})();
