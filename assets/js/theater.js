// 🎭 Theaters & Concerts shared helpers (theaters / theater_* pages)
// Shows run online (YouTube Live / Roblox) or on-site; tickets are paid with Tokens only.

const BLM48_THEATER_PLATFORMS = {
  youtube: { label: 'YouTube Live', icon: 'fa-brands fa-youtube', color: '#ff0033', watch: 'Watch on YouTube' },
  roblox:  { label: 'Roblox Concert', icon: 'fa-solid fa-gamepad', color: '#3a3a3a', watch: 'Join on Roblox' },
  onsite:  { label: 'On-site', icon: 'fa-solid fa-location-dot', color: '#8a8a8a', watch: 'Open venue info' },
  other:   { label: 'Online', icon: 'fa-solid fa-globe', color: '#3aa0d8', watch: 'Open watch link' }
};

function theaterPlatform(p) {
  return BLM48_THEATER_PLATFORMS[p] || BLM48_THEATER_PLATFORMS.other;
}

// '2026-10-24' -> '24 Oct 2026'
function theaterDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
  return `${day} ${mon} ${y}`;
}

// ISO timestamp -> '15 Oct 2026 12:00' (Bangkok)
function theaterDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});
  return `${parts.day} ${parts.month} ${parts.year} ${parts.hour}:${parts.minute}`;
}

function theaterTimeRange(e) {
  if (!e.startTime) return '';
  return e.endTime ? `${e.startTime} - ${e.endTime}` : e.startTime;
}

function theaterVenue(e) {
  const p = theaterPlatform(e.platform);
  return e.venue || p.label;
}

function theaterRoundName(kind) {
  return kind === 'express' ? 'Express round' : 'Normal round';
}

// what the list/detail shows for an event: the open round, else the next one, else closed/sold out
function theaterSaleState(e) {
  const rounds = e.rounds || [];
  const open = rounds.find(r => r.state === 'open');
  const soldOut = (e.seatsLeft !== undefined ? Number(e.seatsLeft) : (e.zones || []).reduce((s, z) => s + Number(z.left), 0)) <= 0;
  if (e.status === 'cancelled') return { kind: 'cancelled', text: 'Cancelled', cls: 'is-closed' };
  if (open && soldOut) return { kind: 'soldout', text: 'Sold Out', cls: 'is-soldout', round: open };
  if (open) return { kind: 'open', text: theaterRoundName(open.kind), cls: 'is-open', round: open };
  const next = rounds.find(r => r.state === 'upcoming');
  if (next) return { kind: 'upcoming', text: `${theaterRoundName(next.kind)} open for booking on ${theaterDateTime(next.openAt)}`, cls: 'is-upcoming', round: next };
  return { kind: 'closed', text: 'Booking Closed', cls: 'is-closed' };
}

// event summary block (poster + date/title/time/venue) used on list, checkout and bookings
function theaterEventHead(e, opts) {
  const o = opts || {};
  const p = theaterPlatform(e.platform);
  return `
    <div class="th-event-head">
      ${e.coverUrl
        ? `<img class="th-poster" src="${escapeHtml(e.coverUrl)}" alt="" loading="lazy" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'th-poster is-empty'}))">`
        : '<div class="th-poster is-empty"></div>'}
      <div class="th-event-info">
        <div class="th-event-date">${theaterDate(e.eventDate)}</div>
        <div class="th-event-title">${escapeHtml(e.title)}</div>
        ${e.startTime ? `<div class="th-meta"><i class="fa-regular fa-clock"></i>${theaterTimeRange(e)}</div>` : ''}
        <div class="th-meta"><i class="${p.icon}" style="color:${p.color}"></i>${escapeHtml(theaterVenue(e))}</div>
        ${o.extra || ''}
      </div>
    </div>`;
}

// reward bundle (same shape as shop_order_items.rewards) -> chips
function theaterRewardsHtml(rewards) {
  const list = rewards || [];
  if (!list.length) return '';
  // group identical items so "Poster x2" reads nicely
  const groups = [];
  list.forEach(r => {
    const key = r.kind + '|' + (r.label || '');
    const g = groups.find(x => x.key === key);
    if (g && r.kind === 'item') g.count++;
    else groups.push({ key, r, count: 1 });
  });
  return groups.map(({ r, count }) => {
    if (r.kind === 'cookie') return `<span class="th-reward"><i class="fas fa-cookie-bite" style="color:#d2691e"></i>${Number(r.amount).toLocaleString()} Cookies</span>`;
    if (r.kind === 'ge_token') return `<span class="th-reward"><i class="fas fa-gem"></i>${Number(r.amount).toLocaleString()} GE Token</span>`;
    return `<span class="th-reward">${r.imageUrl ? `<img src="${escapeHtml(r.imageUrl)}" alt="">` : '<i class="fas fa-gift" style="color:#f0a73a"></i>'}${escapeHtml(r.label || 'Item')}${count > 1 ? ' x' + count : ''}</span>`;
  }).join('');
}
