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
  { tier: 4, name: 'Luxury Cookie',  amount: 100000, refund: 20,
    desc: 'Tier 4 : Get Luxury Cookie เมื่อซัพพอร์ทคุกกี้ครบ 100,000 เมมเบอร์จะได้ Splash Screen in BLM48 Web Application, Theme of BLM48 Web Application และแฟนคลับที่ซัพพอร์ตจะได้รับคุกกี้คืน 20%' }
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
  .mc-cover { position: relative; width: 100%; aspect-ratio: 2048 / 1427; overflow: hidden; background: linear-gradient(135deg, #ffeef2, #e7f1ff); }
  .mc-cover img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; display: block; pointer-events: none; -webkit-touch-callout: none; user-select: none; }
  .mc-cover-tag { position: absolute; left: 10px; top: 10px; background: rgba(255,255,255,.92); color: #ff6b8b; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
  .mc-cover-bday { position: absolute; right: 10px; top: 10px; background: #fff4d6; color: #d9480f; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
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
  .mc-stamp { position: absolute; left: 6%; bottom: 6%; width: 30%; max-width: 120px; transform: rotate(-14deg); pointer-events: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
  .mc-stamp svg { width: 100%; height: auto; display: block; }
  `;
  const style = document.createElement('style');
  style.id = 'mc-campaign-styles';
  style.textContent = css;
  document.head.appendChild(style);
})();

function campaignTitle(c) {
  return `ซัพพอร์ตคุกกี้ให้ ${c.memberName} ขึ้น Champ of the Month`;
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
      <i class="${total >= goal ? 'fa-solid full' : 'fa-regular'} fa-heart mc-heart"></i>
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

function renderMemberCampaignCard(c, opts) {
  opts = opts || {};
  const left = campaignTimeLeft(c.endAt);
  const href = `campaign_detail?id=${encodeURIComponent(c.id)}`;
  return `
    <a class="mc-card ${opts.full ? 'mc-full' : ''}" href="${href}">
      <div class="mc-cover">
        <img src="${escapeAttr(c.coverImage || 'assets/images/default-profile.png')}" alt="" loading="lazy" draggable="false" oncontextmenu="return false">
        <span class="mc-cover-tag"><i class="fa-solid fa-trophy"></i> Champ Campaign</span>
        ${c.isBirthMonth ? '<span class="mc-cover-bday"><i class="fa-solid fa-cake-candles"></i> Birthday Month</span>' : ''}
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
