// 🏆 Member Cookie Campaign - ตัวช่วยวาดการ์ด/แถบ Tier ใช้ร่วมกันใน index.html, campaign.html, campaign_detail.html, member.html
// ต้องโหลดหลัง common.js (ใช้ escapeHtml / escapeAttr)

const CAMPAIGN_GOAL = 100000;
// desc = ข้อความรายละเอียด Tier ตามที่ออฟฟิเชียลกำหนด (ใช้ทั้งหน้าเปิด Campaign และหน้า Campaign Detail)
const CAMPAIGN_TIERS = [
  { tier: 1, name: 'Junior Cookie',  amount: 10000,  refund: 5,
    desc: 'Tier 1 : Get Junior Cookie เมื่อซัพพอร์ทคุกกี้ครบ 10,000 เมมเบอร์จะได้ขึ้น Splash Screen in BLM48 Web Application และแฟนคลับที่ซัพพอร์ตจะได้รับคุกกี้คืน 5%' },
  { tier: 2, name: 'Deluxe Cookie',  amount: 30000,  refund: 10,
    desc: 'Tier 2 : Get Deluxe Cookie เมื่อซัพพอร์ทคุกกี้ครบ 30,000 เมมเบอร์จะได้ Splash Screen in BLM48 Web Application, Theme of BLM48 Web Application และแฟนคลับที่ซัพพอร์ตจะได้รับคุกกี้คืน 10%' },
  { tier: 3, name: 'Premium Cookie', amount: 50000,  refund: 15,
    desc: 'Tier 3 : Get Premium Cookie เมื่อซัพพอร์ทคุกกี้ครบ 50,000 เมมเบอร์จะได้ Splash Screen in BLM48 Web Application, Theme of BLM48 Web Application และแฟนคลับที่ซัพพอร์ตจะได้รับคุกกี้คืน 15%' },
  { tier: 4, name: 'Luxury Cookie',  amount: 100000, refund: 25,
    desc: 'Tier 4 : Get Luxury Cookie เมื่อซัพพอร์ทคุกกี้ครบ 100,000 เมมเบอร์จะได้ Splash Screen in BLM48 Web Application, Theme of BLM48 Web Application และแฟนคลับที่ซัพพอร์ตจะได้รับคุกกี้คืน 25%' }
];

// 🎨 รายการ Tier แบบการ์ด (ติ๊กถูกเมื่อยอดถึง) ใช้ร่วมกันหน้าเปิด Campaign / Campaign Detail
function renderCampaignTierList(total) {
  total = Number(total || 0);
  return CAMPAIGN_TIERS.map(t => {
    const reached = total >= t.amount;
    return `<div style="padding: 12px 14px; border-radius: 12px; margin-bottom: 10px; border: 1px solid ${reached ? '#fcc419' : '#f0f0f0'}; background: ${reached ? '#fffbea' : '#fff'}; font-size: 14.5px; line-height: 1.7; color: #333;">
      ${reached ? '<i class="fa-solid fa-circle-check" style="color:#fcc419;"></i> ' : ''}${escapeHtml(t.desc)}</div>`;
  }).join('');
}

(function injectCampaignStyles() {
  if (document.getElementById('mc-campaign-styles')) return;
  const css = `
  .mc-card { flex: 0 0 280px; width: 280px; background: #fff; border: 1px solid #ececec; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; text-decoration: none; color: #222; margin-bottom: 10px; transition: transform .2s ease; box-sizing: border-box; }
  .mc-card:active { transform: scale(0.98); }
  .mc-card.mc-full { flex: none; width: 100%; }
  .mc-cover { position: relative; width: 100%; aspect-ratio: 1320 / 662; overflow: hidden; background: linear-gradient(135deg, #ffeef2, #e7f1ff); }
  .mc-cover img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; pointer-events: none; -webkit-touch-callout: none; user-select: none; }
  .mc-body { padding: 12px 14px 14px; display: flex; flex-direction: column; }
  .mc-title { font-size: 15px; font-weight: 600; line-height: 1.4; color: #222; min-height: 42px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .mc-stats { display: flex; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5; margin: 10px 0 12px; padding: 8px 0; }
  .mc-stat { flex: 1; text-align: center; }
  .mc-stat b { display: block; font-size: 16px; font-weight: 500; color: #222; }
  .mc-stat span { font-size: 12px; color: #555; }
  .mc-progress { position: relative; height: 26px; margin: 0 4px; }
  .mc-track { position: absolute; left: 0; right: 14px; top: 50%; height: 8px; transform: translateY(-50%); background: #e9e9e9; border-radius: 8px; overflow: hidden; }
  .mc-fill { height: 100%; background: linear-gradient(90deg, #ffd43b, #fcc419); border-radius: 8px; min-width: 6px; transition: width .6s ease; }
  .mc-marker { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 22px; height: 22px; border-radius: 50%; background: #ececec; color: #888; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  .mc-marker.reached { background: #fcc419; color: #fff; }
  .mc-heart { position: absolute; right: -4px; top: 50%; transform: translateY(-50%); font-size: 24px; color: #222; }
  .mc-heart.reached { color: #ff6b8b; }
  .mc-progress-labels { display: flex; justify-content: space-between; font-size: 13px; color: #222; margin-top: 4px; }
  .mc-marker.reached i { font-size: 11px; color: #222; }
  .mc-heart.full { color: #fcc419; -webkit-text-stroke: 1.5px #222; }
  /* ยังไม่เต็มหลอด: หัวใจพื้นขาว ขอบดำ (ไม่ให้หลอดสีเทาโผล่ทะลุตรงกลาง) */
  .mc-heart.empty { color: #fff; -webkit-text-stroke: 1.5px #222; }
  .mc-stamp { position: absolute; left: 6%; bottom: 6%; width: 30%; max-width: 120px; transform: rotate(-14deg); pointer-events: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
  .mc-stamp svg { width: 100%; height: auto; display: block; }
  `;
  const style = document.createElement('style');
  style.id = 'mc-campaign-styles';
  style.textContent = css;
  document.head.appendChild(style);
})();

// ชื่อเมมเบอร์ + ชื่อวงต่อท้าย เช่น "Emmy BLM48" (ใช้ทุกจุดที่แสดงชื่อเมมเบอร์ในส่วน Campaign)
function campaignMemberLabel(c) {
  return c.groupName ? `${c.memberName} ${c.groupName}` : c.memberName;
}

function campaignTitle(c) {
  return `ซัพพอร์ตคุกกี้ให้ ${campaignMemberLabel(c)} ขึ้น Champ of the Month`;
}

function campaignTimeLeft(endAt) {
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return { value: 0, unit: 'Min to go', text: 'Ended' };
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days >= 1) return { value: days, unit: 'Days to go', text: `${days} days ${hrs} hrs ${mins} mins` };
  if (hrs >= 1) return { value: hrs, unit: 'Hrs to go', text: `${hrs} hrs ${mins} mins` };
  return { value: mins, unit: 'Mins to go', text: `${mins} mins` };
}

function campaignFundedPct(c) {
  const pct = (Number(c.totalCookies || 0) / (c.goal || CAMPAIGN_GOAL)) * 100;
  return Math.round(pct * 100) / 100;
}

// แถบความคืบหน้า + ปุ่ม Tier 1/2/3 + หัวใจ (Tier 4 = 100,000)
function renderCampaignProgress(c) {
  const goal = c.goal || CAMPAIGN_GOAL;
  const total = Number(c.totalCookies || 0);
  const fill = Math.min(100, (total / goal) * 100);
  const markers = CAMPAIGN_TIERS.slice(0, 3).map(t => {
    const ratio = t.amount / goal;
    const reached = total >= t.amount;
    return `<div class="mc-marker ${reached ? 'reached' : ''}" style="left: calc((100% - 14px) * ${ratio});">${reached ? '<i class="fa-solid fa-check"></i>' : t.tier}</div>`;
  }).join('');
  return `
    <div class="mc-progress">
      <div class="mc-track"><div class="mc-fill" style="width: ${fill}%;"></div></div>
      ${markers}
      <i class="fa-solid ${total >= goal ? 'full' : 'empty'} fa-heart mc-heart"></i>
    </div>
    <div class="mc-progress-labels">
      <span>${total.toLocaleString()} Funded</span>
      <span>${goal.toLocaleString()}</span>
    </div>`;
}

function isCampaignEnded(c) {
  return c.status !== 'active' || new Date(c.endAt).getTime() <= Date.now();
}

// 💗 ตราหัวใจบนรูปปก: ครบ 100,000 = CAMPAIGN SUCCESS! (ขึ้นทันทีแม้ยังไม่จบ) / จบแล้วได้ Tier = TIER X SUCCESS
function renderCampaignStamp(c) {
  const total = Number(c.totalCookies || 0);
  const goal = c.goal || CAMPAIGN_GOAL;
  let line1, line2;
  if (total >= goal) { line1 = 'CAMPAIGN'; line2 = 'SUCCESS!'; }
  else if (isCampaignEnded(c) && Number(c.tier) >= 1) { line1 = `TIER ${c.tier}`; line2 = 'SUCCESS'; }
  else return '';
  return `
    <div class="mc-stamp">
      <svg viewBox="0 0 120 108" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 104 C20 76 4 56 4 32 C4 15 17 4 32 4 C44 4 54 11 60 21 C66 11 76 4 88 4 C103 4 116 15 116 32 C116 56 100 76 60 104 Z" fill="#fff" stroke="#e64980" stroke-width="5"/>
        <path d="M60 96 C25 71 12 53 12 33 C12 20 22 12 33 12 C44 12 53 19 60 30 C67 19 76 12 87 12 C98 12 108 20 108 33 C108 53 95 71 60 96 Z" fill="none" stroke="#f783ac" stroke-width="1.5" stroke-dasharray="3 3"/>
        <text x="60" y="46" text-anchor="middle" font-family="Kanit, sans-serif" font-weight="700" font-size="${line1.length > 7 ? 15 : 19}" fill="#d6336c">${line1}</text>
        <text x="60" y="68" text-anchor="middle" font-family="Kanit, sans-serif" font-weight="700" font-size="17" fill="#d6336c">${line2}</text>
      </svg>
    </div>`;
}

// 🖼️ Banner ปก Campaign แบบสร้างอัตโนมัติ ตามธีมประจำเดือน (เดือนที่ไม่มีธีม = ใช้รูปปกเดิม cover_url / รูปโปรไฟล์)
// ธีมของเดือนมาก่อน cover_url ที่แอดมินอัปโหลด / เมมเบอร์ที่เปิดในเดือนเกิด = แบบ Birthday Campaign, นอกนั้น = Champ Campaign
// รูปเมมเบอร์ในกรอบโค้ง = รูปโปรไฟล์ล่าสุดจากเว็บ BLM48 Official (ตัวเดียวกับ Splash Champ ใน champ-splash.js)
// ค่าในตาราง = ชื่อธีม หรือฟังก์ชันเลือกธีมรายเมมเบอร์ (ธีมที่มี: magichour / sakura / ocean)
const CAMPAIGN_BANNER_THEMES = {
  // ตุลาคม 2026: BLM48 รุ่น 5 = Ocean, รุ่นอื่น = Sakura
  '2026-10': c => String(c.generation || '').trim() === '5' ? 'ocean' : 'sakura',
  // พฤศจิกายน 2026: ทุกรุ่นใช้ Magic Hour (ตรงกับธีมแอปที่เปลี่ยนเป็น Magic Hour ตั้งแต่ 1 พ.ย.)
  '2026-11': 'magichour'
};
// ชื่อที่ต้องตัดบรรทัดตามแบบที่ออกแบบไว้ (ธีม Magic Hour, ชื่ออื่นแสดงบรรทัดเดียว ย่อขนาดตามความยาว)
const CAMPAIGN_BANNER_NAME_LINES = { bumblebee: ['Bum', 'BleBee'] };
const CAMPAIGN_BANNER_MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const CAMPAIGN_BANNER_FONTS = {
  magichour: 'family=Cinzel:wght@500;600;700&family=Cinzel+Decorative:wght@700',
  sakura: 'family=Playfair+Display:wght@500;600',
  ocean: 'family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@800'
};

function campaignBannerTheme(c) {
  const t = c && CAMPAIGN_BANNER_THEMES[c.yearMonth];
  return (typeof t === 'function' ? t(c) : t) || null;
}

function loadCampaignBannerFont(theme) {
  const id = 'cb-font-' + theme;
  if (!CAMPAIGN_BANNER_FONTS[theme] || document.getElementById(id)) return;
  const font = document.createElement('link');
  font.id = id;
  font.rel = 'stylesheet';
  font.href = `https://fonts.googleapis.com/css2?${CAMPAIGN_BANNER_FONTS[theme]}&display=swap`;
  document.head.appendChild(font);
}

// วันที่ที่ใช้บน Banner: เดือน Campaign / วันเกิด / ช่วงวันที่เปิด Campaign ถึงสิ้นเดือน (เวลาไทย)
function campaignBannerDates(c) {
  const ym = String(c.yearMonth || '');
  const year = ym.slice(0, 4);
  const mIdx = parseInt(ym.slice(5, 7), 10) - 1;
  const month = `${CAMPAIGN_BANNER_MONTHS[mIdx] || ''} ${year}`;
  const b = String(c.birthday || '').match(/^\d{4}-(\d{2})-(\d{2})/);
  const birthday = b ? `${parseInt(b[2], 10)} ${CAMPAIGN_BANNER_MONTHS[parseInt(b[1], 10) - 1]} ${year}` : month;
  const startDay = c.startedAt ? parseInt(new Date(c.startedAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric' }), 10) : 1;
  const lastDay = new Date(parseInt(year, 10), mIdx + 1, 0).getDate();
  return { month, birthday, period: `${startDay} – ${lastDay} ${month}` };
}

// ชื่อบรรทัดเดียว: ย่อตัวอักษรจากขนาดในแบบ ให้พอดีความกว้างช่อง (charW = ความกว้างเฉลี่ยต่อตัวอักษร เทียบขนาดฟอนต์)
function campaignBannerNameSize(name, max, boxW, charW) {
  return Math.min(max, Math.floor(boxW / (Math.max(String(name).length, 1) * charW)));
}

(function injectCampaignBannerStyles() {
  if (document.getElementById('cb-banner-styles')) return;
  // ขนาดทุกอย่างอิงแบบ 1320x662: 1 หน่วย (--u) = ความกว้างปก / 1320 -> ย่อขยายตามการ์ดได้ทุกขนาด
  const css = `
  .cb-root { position: absolute; inset: 0; container-type: inline-size; overflow: hidden; background: #1A0508; font-family: 'Cinzel', serif; color: #F4EEEE; pointer-events: none; user-select: none; -webkit-user-select: none; }
  .cb-root > * { --u: calc(100cqw / 1320); }
  .cb-root .cb-abs { position: absolute; inset: 0; width: 100%; height: 100%; }
  .cb-root img.cb-bg { object-fit: cover; object-position: center 45%; }
  .cb-shade-x { background: linear-gradient(90deg, rgba(18,2,6,0.88) 0%, rgba(18,2,6,0.55) 24%, rgba(18,2,6,0) 36%, rgba(18,2,6,0) 64%, rgba(18,2,6,0.55) 76%, rgba(18,2,6,0.88) 100%); }
  .cb-shade-r { background: radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(10,0,3,0.6) 100%); }
  .cb-left { position: absolute; left: calc(var(--u) * 24); width: calc(var(--u) * 356); display: flex; flex-direction: column; align-items: center; gap: calc(var(--u) * 14); text-align: center; }
  .cb-title { font-family: 'Cinzel Decorative', serif; font-weight: 700; font-size: calc(var(--u) * 50); line-height: 1.05; color: #F4EEEE; text-shadow: 0 0 calc(var(--u) * 22) #E0283C, 0 calc(var(--u) * 2) calc(var(--u) * 6) rgba(0,0,0,0.8); }
  .cb-sub { font-size: calc(var(--u) * 15); font-weight: 600; letter-spacing: 0.34em; color: #F3D9A4; text-shadow: 0 calc(var(--u) * 2) calc(var(--u) * 10) rgba(0,0,0,0.8); }
  .cb-pillrow { display: flex; align-items: center; gap: calc(var(--u) * 12); }
  .cb-line { width: calc(var(--u) * 34); height: max(1px, calc(var(--u) * 1)); background: #CFC6C9; }
  .cb-pill { padding: calc(var(--u) * 9) calc(var(--u) * 26); border-radius: 999px; background: rgba(120,8,22,0.75); border: calc(var(--u) * 1.5) solid #D9D0D3; font-size: calc(var(--u) * 17); font-weight: 700; letter-spacing: 0.24em; white-space: nowrap; }
  .cb-arch { position: absolute; left: calc(var(--u) * 410); top: calc(var(--u) * 30); width: calc(var(--u) * 500); height: calc(var(--u) * 602); box-sizing: border-box; border-radius: calc(var(--u) * 250) calc(var(--u) * 250) calc(var(--u) * 18) calc(var(--u) * 18); overflow: hidden; border: calc(var(--u) * 3) solid #DCD4D6; box-shadow: 0 0 0 calc(var(--u) * 8) rgba(30,3,8,0.55), 0 0 calc(var(--u) * 70) calc(var(--u) * 10) #E0283C; background: #2a0a10; }
  .cb-root .cb-arch img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
  .cb-arch-shade { background: linear-gradient(180deg, rgba(160,20,40,0.12) 0%, rgba(0,0,0,0) 45%, rgba(110,8,24,0.35) 100%); }
  .cb-right { position: absolute; left: calc(var(--u) * 935); top: 0; bottom: 0; width: calc(var(--u) * 370); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--u) * 16); text-align: center; }
  .cb-right svg { width: calc(var(--u) * 120); height: calc(var(--u) * 14); display: block; }
  /* ไอคอนเค้กมุมซ้ายบน = อันใน logos.png เท่านั้น (ทุกธีม) -> แบบ Champ (ไม่ใช่เดือนเกิด) ตัดมุมนั้นทิ้ง (ไอคอนอยู่ช่วง 14-101px จาก 1320x662) */
  .cb-root .cb-no-cake { clip-path: polygon(8.4% 0, 100% 0, 100% 100%, 0 100%, 0 16.7%, 8.4% 16.7%); }
  .cb-name { font-family: 'Cinzel Decorative', serif; font-weight: 700; line-height: 1.02; color: #F4EEEE; white-space: nowrap; text-shadow: 0 0 calc(var(--u) * 22) #E0283C, 0 calc(var(--u) * 2) calc(var(--u) * 6) rgba(0,0,0,0.8); }

  /* ===== Sakura ===== */
  .cb-sakura { background: #F9D3E0; font-family: 'Playfair Display', serif; color: #FFFFFF; }
  .cb-root img.cb-sk-bg { object-fit: cover; object-position: center 30%; filter: blur(calc(var(--u) * 26)) saturate(1.1); transform: scale(1.15); }
  .cb-sk-tint { background: linear-gradient(180deg, rgba(255,226,236,0.55) 0%, rgba(250,196,216,0.5) 100%); }
  .cb-sk-glow { position: absolute; left: calc(var(--u) * 260); top: calc(var(--u) * -120); width: calc(var(--u) * 800); height: calc(var(--u) * 900); border-radius: 50%; background: radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 65%); }
  .cb-sk-left { position: absolute; left: calc(var(--u) * 30); top: calc(var(--u) * 222); width: calc(var(--u) * 340); display: flex; flex-direction: column; align-items: center; gap: calc(var(--u) * 6); text-align: center; text-shadow: 0 calc(var(--u) * 2) calc(var(--u) * 14) #C2557D; }
  .cb-sk-title { font-weight: 500; font-size: calc(var(--u) * 52); line-height: 1; letter-spacing: 0.02em; display: flex; align-items: center; gap: calc(var(--u) * 8); }
  .cb-sk-title svg { width: calc(var(--u) * 26); height: calc(var(--u) * 26); }
  .cb-sk-period { font-size: calc(var(--u) * 16); font-weight: 600; letter-spacing: 0.18em; white-space: nowrap; }
  .cb-sk-frame { position: absolute; left: calc(var(--u) * 398); top: calc(var(--u) * 40); width: calc(var(--u) * 524); height: calc(var(--u) * 582); box-sizing: border-box; padding: calc(var(--u) * 10); border-radius: calc(var(--u) * 28); background: rgba(255,255,255,0.5); box-shadow: 0 0 calc(var(--u) * 40) calc(var(--u) * 6) rgba(255,255,255,0.75); }
  .cb-root .cb-sk-frame img { width: 100%; height: 100%; object-fit: cover; object-position: center 30%; display: block; border-radius: calc(var(--u) * 20); }
  .cb-sk-right { position: absolute; left: calc(var(--u) * 960); top: 0; bottom: 0; width: calc(var(--u) * 340); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--u) * 12); text-align: center; }
  .cb-sk-name { font-weight: 500; line-height: 1; letter-spacing: 0.04em; white-space: nowrap; text-shadow: 0 calc(var(--u) * 2) calc(var(--u) * 14) #C2557D; }
  /* โลโก้เพลง Sustainable (BLM48 10th Single) มุมขวาบน: ไฟล์ 2000x2000 พื้นใส ตัวโลโก้อยู่ช่วง x144-1862 y772-1150 -> ครอปด้วย CSS */
  .cb-sk-logo { position: absolute; right: calc(var(--u) * 46); top: calc(var(--u) * 36); width: calc(var(--u) * 160); aspect-ratio: 1718 / 378; overflow: hidden; filter: drop-shadow(0 0 calc(var(--u) * 1) rgba(255,255,255,0.9)) drop-shadow(0 calc(var(--u) * 1) calc(var(--u) * 2) rgba(130,25,70,0.6)); }
  .cb-root .cb-sk-logo img { position: absolute; width: 116.41%; height: auto; left: -8.38%; top: -204.23%; max-width: none; object-fit: contain; filter: brightness(1.12) saturate(1.3) contrast(1.1); }

  /* ===== Ocean ===== */
  .cb-ocean { background: #8FDBFA; font-family: 'M PLUS Rounded 1c', sans-serif; font-weight: 800; color: #1B2F6B; }
  .cb-oc-rays { position: absolute; left: calc(var(--u) * -40); top: calc(var(--u) * -369); width: calc(var(--u) * 1400); height: calc(var(--u) * 1400); border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.38) 0deg 7.5deg, rgba(255,255,255,0) 7.5deg 15deg); }
  .cb-oc-dots { background-image: radial-gradient(circle, rgba(255,255,255,0.7) calc(var(--u) * 2.6), rgba(255,255,255,0) calc(var(--u) * 3.2)); background-size: calc(var(--u) * 22) calc(var(--u) * 22); -webkit-mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, #000 100%); mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, #000 100%); }
  .cb-oc-bar { position: absolute; left: 0; top: 0; width: 100%; height: calc(var(--u) * 38); background: #1B2F6B; color: #FFFFFF; font-size: calc(var(--u) * 17); line-height: calc(var(--u) * 38); letter-spacing: 0.1em; white-space: nowrap; overflow: hidden; }
  .cb-oc-stroke { font-family: 'Dela Gothic One', sans-serif; font-weight: 400; color: #FFFFFF; -webkit-text-stroke: calc(var(--u) * 7) #1B2F6B; paint-order: stroke fill; text-shadow: calc(var(--u) * 5) calc(var(--u) * 5) 0 #1B2F6B; }
  .cb-oc-left { position: absolute; left: calc(var(--u) * 24); top: calc(var(--u) * 200); width: calc(var(--u) * 330); display: flex; flex-direction: column; align-items: center; gap: calc(var(--u) * 14); text-align: center; }
  .cb-oc-title { font-size: calc(var(--u) * 56); line-height: 1.02; transform: rotate(-4deg); }
  .cb-oc-jp { font-size: calc(var(--u) * 17); letter-spacing: 0.12em; }
  .cb-oc-pill { padding: calc(var(--u) * 9) calc(var(--u) * 28); border-radius: 999px; background: #FFE45C; border: calc(var(--u) * 3) solid #1B2F6B; box-shadow: calc(var(--u) * 4) calc(var(--u) * 4) 0 #1B2F6B; font-size: calc(var(--u) * 18); letter-spacing: 0.08em; white-space: nowrap; }
  .cb-oc-photo { position: absolute; left: calc(var(--u) * 378); top: calc(var(--u) * 58); width: calc(var(--u) * 564); height: calc(var(--u) * 564); box-sizing: border-box; border-radius: calc(var(--u) * 30); overflow: hidden; border: calc(var(--u) * 8) solid #FFFFFF; outline: calc(var(--u) * 4) solid #1B2F6B; box-shadow: calc(var(--u) * 14) calc(var(--u) * 14) 0 calc(var(--u) * 4) #1B2F6B; transform: rotate(-2deg); background: #fff; }
  .cb-root .cb-oc-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; display: block; }
  .cb-oc-right { position: absolute; left: calc(var(--u) * 975); top: calc(var(--u) * 200); height: calc(var(--u) * 210); width: calc(var(--u) * 330); display: flex; align-items: center; justify-content: center; text-align: center; }
  .cb-oc-name { line-height: 1.05; white-space: nowrap; transform: rotate(3deg); }
  `;
  const style = document.createElement('style');
  style.id = 'cb-banner-styles';
  style.textContent = css;
  document.head.appendChild(style);
})();

function renderCampaignBanner(c) {
  const theme = campaignBannerTheme(c);
  loadCampaignBannerFont(theme);
  setTimeout(hydrateCampaignBannerPhotos, 0);
  if (theme === 'sakura') return renderCampaignBannerSakura(c);
  if (theme === 'ocean') return renderCampaignBannerOcean(c);
  return renderCampaignBannerMagicHour(c);
}

// รูปเมมเบอร์บน Banner: เริ่มจากรูปโปรไฟล์ในแอป แล้ว hydrateCampaignBannerPhotos เปลี่ยนเป็นรูปจากเว็บ Official
// รูปที่บันทึกไว้กับ Campaign (bannerPhoto) = ล็อกตั้งแต่เปิด Campaign -> ใช้รูปนี้ตลอด ไม่เปลี่ยนตามรูปใหม่บนเว็บ
function campaignBannerPhoto(c, cls) {
  const frozen = !!c.bannerPhoto;
  return `<img class="${cls}" data-cb-member="${escapeAttr(String(c.memberName || '').trim())}" data-cb-campaign="${escapeAttr(c.id)}" data-cb-saved="${escapeAttr(c.bannerPhoto || '')}"${frozen ? ' data-cb-done="1"' : ''} src="${escapeAttr(c.bannerPhoto || c.profileImage || 'assets/images/default-profile.png')}" alt="" referrerpolicy="no-referrer" draggable="false">`;
}
const CAMPAIGN_BANNER_LOGOS = 'assets/img/campaign-banner/magic-hour/logos.png';
const CAMPAIGN_BANNER_SPARK = 'M0 -16 C1.5 -4 4 -1.5 16 0 C4 1.5 1.5 4 0 16 C-1.5 4 -4 1.5 -16 0 C-4 -1.5 -1.5 -4 0 -16Z';

// 🌸 Sakura: พื้นหลัง = รูปเมมเบอร์เบลอ + ม่านชมพู, กรอบรูปขาวโปร่ง (แบบ Birthday Campaign — Sakura)
function renderCampaignBannerSakura(c) {
  const name = String(c.memberName || '').trim().toUpperCase();
  const isBday = !!c.isBirthMonth;
  const d = campaignBannerDates(c);
  const sp = (x, y, s, o) => `<path d="${CAMPAIGN_BANNER_SPARK}" transform="translate(${x} ${y}) scale(${s})" opacity="${o}"/>`;
  return `
    <div class="cb-root cb-sakura" aria-label="${escapeAttr((isBday ? 'Birthday Campaign ' : 'Champ Campaign ') + c.memberName)}">
      ${campaignBannerPhoto(c, 'cb-abs cb-sk-bg')}
      <div class="cb-abs cb-sk-tint"></div>
      <div class="cb-sk-glow"></div>
      <svg class="cb-abs" viewBox="0 0 1320 662" aria-hidden="true"><g fill="#FFFFFF">${sp(150, 150, 0.7, 0.9)}${sp(340, 470, 0.6, 0.8)}${sp(1000, 150, 0.8, 0.9)}${sp(1250, 120, 0.55, 0.8)}${sp(980, 470, 0.6, 0.8)}<circle cx="90" cy="420" r="2" opacity="0.8"/><circle cx="270" cy="90" r="1.6" opacity="0.8"/><circle cx="1100" cy="560" r="2" opacity="0.8"/><circle cx="1180" cy="230" r="1.6" opacity="0.8"/></g></svg>
      <div class="cb-sk-left">
        <div class="cb-sk-title">${isBday ? 'BIRTHDAY' : 'CHAMP'}</div>
        <div class="cb-sk-title">CAMPAIGN<svg viewBox="-16 -16 32 32" aria-hidden="true"><path d="${CAMPAIGN_BANNER_SPARK}" fill="#FFFFFF"/></svg></div>
        <div class="cb-sk-period">${escapeHtml(d.period)}</div>
      </div>
      <div class="cb-sk-frame">${campaignBannerPhoto(c, 'cb-photo')}</div>
      <div class="cb-sk-logo"><img src="assets/img/campaign-banner/sakura/sustainable-logo.webp" alt="BLM48 10th Single Sustainable" draggable="false"></div>
      <div class="cb-sk-right">
        <div class="cb-sk-name" style="font-size: calc(var(--u) * ${campaignBannerNameSize(name, 74, 330, 0.72)});">${escapeHtml(name)}</div>
      </div>
      <img class="cb-abs${isBday ? '' : ' cb-no-cake'}" src="${CAMPAIGN_BANNER_LOGOS}" alt="" draggable="false">
    </div>`;
}

// 🌊 Ocean: ฟ้าสดแบบป๊อป รัศมีแสง คลื่น ดาว แถบตัววิ่งด้านบน (แบบ Champ Campaign — Ocean)
function renderCampaignBannerOcean(c) {
  const name = String(c.memberName || '').trim().toUpperCase();
  const isBday = !!c.isBirthMonth;
  const d = campaignBannerDates(c);
  const label = isBday ? 'BIRTHDAY CAMPAIGN' : 'CHAMP CAMPAIGN';
  const jp = isBday ? 'バースデー キャンペーン' : 'チャンプ キャンペーン';
  const barDate = isBday ? d.birthday : d.month;
  const bar = Array(3).fill(`★ ${label} ★ ${jp} ★ ${barDate} `).join('') + '★';
  const star = (x, y, r, s) => `<path d="M0 -20 L5.9 -8.1 L19 -6.2 L9.5 3.1 L11.8 16.2 L0 10 L-11.8 16.2 L-9.5 3.1 L-19 -6.2 L-5.9 -8.1 Z" transform="translate(${x} ${y}) rotate(${r}) scale(${s})"/>`;
  const sp = (x, y, s) => `<path d="${CAMPAIGN_BANNER_SPARK}" transform="translate(${x} ${y}) scale(${s})"/>`;
  const wave = (y, a, b, fill) => `<path d="M0 ${y} C110 ${a} 220 ${b} 330 ${y} C440 ${a} 550 ${b} 660 ${y} C770 ${a} 880 ${b} 990 ${y} C1100 ${a} 1210 ${b} 1320 ${y} L1320 662 L0 662Z" fill="${fill}" stroke="#FFFFFF" stroke-width="5"/>`;
  return `
    <div class="cb-root cb-ocean" aria-label="${escapeAttr((isBday ? 'Birthday Campaign ' : 'Champ Campaign ') + c.memberName)}">
      <div class="cb-oc-rays"></div>
      <div class="cb-abs cb-oc-dots"></div>
      <svg class="cb-abs" viewBox="0 0 1320 662" aria-hidden="true">
        ${wave(520, 490, 550, '#4CC3EE')}${wave(568, 540, 596, '#2196D6')}${wave(614, 590, 638, '#1B5FA8')}
        <g fill="#FFE45C" stroke="#1B2F6B" stroke-width="3" stroke-linejoin="round">${star(70, 120, -12, 1.4)}${star(330, 150, 14, 0.9)}${star(1000, 130, 10, 1.2)}${star(1270, 220, -18, 1.5)}${star(300, 470, -8, 1.1)}</g>
        <g fill="#FFFFFF">${sp(150, 460, 1.1)}${sp(1060, 450, 1.3)}${sp(1180, 110, 0.8)}${sp(230, 80, 0.7)}</g>
      </svg>
      <div class="cb-oc-bar" aria-hidden="true">${escapeHtml(bar)}</div>
      <div class="cb-oc-left">
        <div class="cb-oc-title cb-oc-stroke">${isBday ? 'Birthday' : 'Champ'}<br>Campaign</div>
        <div class="cb-oc-jp">${jp}</div>
        <div class="cb-oc-pill">${escapeHtml(isBday ? d.birthday : d.month)}</div>
      </div>
      <div class="cb-oc-photo">${campaignBannerPhoto(c, 'cb-photo')}</div>
      <div class="cb-oc-right"><div class="cb-oc-name cb-oc-stroke" style="font-size: calc(var(--u) * ${campaignBannerNameSize(name, 52, 310, 0.98)});">${escapeHtml(name)}</div></div>
      <img class="cb-abs${isBday ? '' : ' cb-no-cake'}" src="${CAMPAIGN_BANNER_LOGOS}" alt="" draggable="false">
    </div>`;
}

// 🌙 Magic Hour (แบบเดิม): ห้องโถงพระจันทร์แดง กรอบโค้ง
function renderCampaignBannerMagicHour(c) {
  const name = String(c.memberName || '').trim();
  const isBday = !!c.isBirthMonth;
  const d = campaignBannerDates(c);
  const pill = isBday ? d.birthday : d.month;
  const lines = CAMPAIGN_BANNER_NAME_LINES[name.toLowerCase()] || [name];
  // ช่องชื่อกว้าง 370 หน่วย: ชื่อยาวย่อตัวอักษรลงจาก 58 ให้พอดีบรรทัด
  const longest = Math.max(...lines.map(l => l.length), 1);
  const nameSize = Math.min(58, Math.floor(340 / (longest * 0.78)));
  const ornament = '<svg viewBox="0 0 120 14" aria-hidden="true"><path d="M0 7h50M70 7h50" stroke="#D6CDD0" stroke-width="1"></path><path d="M60 0l6 7-6 7-6-7z" fill="#D6CDD0"></path></svg>';
  const base = 'assets/img/campaign-banner/magic-hour/';
  return `
    <div class="cb-root" aria-label="${escapeAttr((isBday ? 'Birthday Campaign ' : 'Champ Campaign ') + name)}">
      <img class="cb-abs cb-bg" src="${base}bg.jpg" alt="" draggable="false">
      <div class="cb-abs cb-shade-x"></div>
      <div class="cb-abs cb-shade-r"></div>
      <svg class="cb-abs" viewBox="0 0 1320 662" aria-hidden="true"><g fill="#FFB27A"><circle cx="120" cy="96" r="1.6" opacity="0.7"/><circle cx="300" cy="140" r="1.2" opacity="0.6"/><circle cx="250" cy="560" r="1.5" opacity="0.6"/><circle cx="1050" cy="90" r="1.4" opacity="0.7"/><circle cx="1200" cy="200" r="1.1" opacity="0.6"/><circle cx="1010" cy="520" r="1.6" opacity="0.6"/><circle cx="70" cy="470" r="1.2" opacity="0.5"/><circle cx="1280" cy="120" r="1.3" opacity="0.6"/></g></svg>
      <div class="cb-left" style="top: calc(var(--u) * ${isBday ? 214 : 236});">
        <div class="cb-title">${isBday ? 'Birthday' : 'Champ'}<br>Campaign</div>
        ${isBday ? '<div class="cb-sub">HAPPY BIRTHDAY</div>' : ''}
        <div class="cb-pillrow"><div class="cb-line"></div><div class="cb-pill">${escapeHtml(pill)}</div><div class="cb-line"></div></div>
      </div>
      <div class="cb-arch">
        ${campaignBannerPhoto(c, 'cb-photo')}
        <div class="cb-abs cb-arch-shade"></div>
      </div>
      <div class="cb-right">
        ${ornament}
        <div class="cb-name" style="font-size: calc(var(--u) * ${nameSize});">${lines.map(escapeHtml).join('<br>')}</div>
        ${ornament}
      </div>
      <img class="cb-abs${isBday ? '' : ' cb-no-cake'}" src="${base}logos.png" alt="" draggable="false">
    </div>`;
}

// รูปปกของ Campaign: ธีมประจำเดือน -> Banner อัตโนมัติ / ไม่มีธีม -> รูปปก (cover_url หรือรูปโปรไฟล์)
function renderCampaignCoverArt(c) {
  if (campaignBannerTheme(c)) return renderCampaignBanner(c);
  return `<img src="${escapeAttr(c.coverImage || 'assets/images/default-profile.png')}" alt="" loading="lazy" draggable="false" oncontextmenu="return false">`;
}

// โหลด champ-splash.js (ตัวดึงรูปจากเว็บ Official + แคช) เฉพาะตอนที่มี Banner ต้องใช้
let campaignOfficialLib = null;
function loadCampaignOfficialPhotoLib() {
  if (window.BLM48ChampSplash) return Promise.resolve(window.BLM48ChampSplash);
  if (campaignOfficialLib) return campaignOfficialLib;
  campaignOfficialLib = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'assets/js/champ-splash.js';
    s.onload = () => resolve(window.BLM48ChampSplash || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return campaignOfficialLib;
}

// เปลี่ยนรูปเมมเบอร์เป็นรูปล่าสุดจากเว็บ Official (ระหว่างรอ/ดึงไม่ได้ = รูปที่บันทึกไว้ หรือรูปโปรไฟล์ในแอป)
// แล้วบันทึกรูปนั้นไว้กับ Campaign ครั้งเดียว (เซิร์ฟเวอร์รับเฉพาะตอนยังไม่มีรูป) -> ล็อกถาวร
const campaignBannerPhotoSaved = {};
function hydrateCampaignBannerPhotos() {
  const imgs = document.querySelectorAll('img[data-cb-member]:not([data-cb-done])');
  if (!imgs.length) return;
  imgs.forEach(img => img.setAttribute('data-cb-done', '1'));
  loadCampaignOfficialPhotoLib().then(lib => {
    if (!lib) return;
    imgs.forEach(img => {
      lib.getChampPhoto(img.getAttribute('data-cb-member'), 6000).then(url => {
        if (!url) return;
        const id = img.getAttribute('data-cb-campaign');
        if (id && url !== img.getAttribute('data-cb-saved') && campaignBannerPhotoSaved[id] !== url && typeof blm48SetCampaignBannerPhoto === 'function') {
          campaignBannerPhotoSaved[id] = url;
          blm48SetCampaignBannerPhoto(id, url);
        }
        if (img.src === url) return;
        const probe = new Image();
        probe.referrerPolicy = 'no-referrer';
        probe.onload = () => { img.src = url; };
        probe.src = url;
      });
    });
  });
}

function renderMemberCampaignCard(c, opts) {
  opts = opts || {};
  const left = campaignTimeLeft(c.endAt);
  const href = `campaign_detail?id=${encodeURIComponent(c.id)}`;
  return `
    <a class="mc-card ${opts.full ? 'mc-full' : ''}" href="${href}">
      <div class="mc-cover">
        ${renderCampaignCoverArt(c)}
        ${renderCampaignStamp(c)}
      </div>
      <div class="mc-body">
        <div class="mc-title">${escapeHtml(campaignTitle(c))}</div>
        <div class="mc-stats">
          <div class="mc-stat"><b>${campaignFundedPct(c)}%</b><span>Funded</span></div>
          <div class="mc-stat"><b>${Number(c.supporters || 0).toLocaleString()}</b><span>Supporters</span></div>
          <div class="mc-stat"><b>${left.value}</b><span>${left.unit}</span></div>
        </div>
        ${renderCampaignProgress(c)}
      </div>
    </a>`;
}

// 🛟 โหลดข้อมูล Campaign แบบทนทาน: ช่วงคนใช้งานเยอะ RPC อาจ timeout ชั่วคราว (networkError จาก blm48Rpc)
// ลองใหม่อัตโนมัติก่อน แทนที่จะโชว์ error ทันที
async function campaignFetchWithRetry(fetchFn, tries) {
  tries = tries || 3;
  const delays = [700, 1800, 3500];
  let res = null;
  for (let i = 0; i < tries; i++) {
    try { res = await fetchFn(); } catch (e) { res = { status: 'error', networkError: true }; }
    const failed = !res || (res.networkError === true);
    if (!failed) return res;
    if (i < tries - 1) await new Promise(r => setTimeout(r, delays[i] || 2000));
  }
  return res;
}

// 🔴 อัปเดตสดตาม Ranking แบบไม่ถล่มฐานข้อมูล: รวบเหตุการณ์ที่เข้ามาติดๆ กัน (กดใจรัวๆ) เป็นรีเฟรชเดียว,
// ไม่รีเฟรชตอนแท็บถูกซ่อน (ค่อยรีเฟรชตอนกลับมาดู), และรีเฟรชตอนกดย้อนกลับมาหน้านี้ (bfcache)
function subscribeCampaignLive(onChange) {
  let pending = false;
  const run = () => {
    if (document.hidden) { pending = true; return; }
    pending = false;
    onChange();
  };
  if (typeof blm48SubscribeRanking === 'function') blm48SubscribeRanking(run, 2500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && pending) run(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) run(); });
}
