// BLM48 <-> Supabase bridge for the high-traffic systems: give cookie, buy
// items, gacha, redeem code, inventory. These now write straight to
// Supabase instead of going through Apps Script, so they don't queue up
// behind Google Sheets' single global lock when many members act at once.
//
// This uses the public anon key only. Every table behind it is locked down
// with Row Level Security and zero policies, so the anon key can never
// read/write a table directly - it can only call the RPC functions below,
// each of which validates balances and ownership server-side before
// touching anything. Catalog data (Collections/Items/GiftCatalog/codes)
// is still edited in Google Sheets by the admin and synced in from there.
const BLM48_SUPABASE_URL = 'https://rqhwzbrcgnpxtuaeoxml.supabase.co';
const BLM48_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxaHd6YnJjZ25weHR1YWVveG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMjczNjAsImV4cCI6MjEwMDgwMzM2MH0.J0iiUikxLoJKZ5SF9KSz86yf2LU89z8NdPb9rEB89Gw';

const blm48Supabase = window.supabase.createClient(BLM48_SUPABASE_URL, BLM48_SUPABASE_ANON_KEY);

async function blm48Rpc(fnName, params) {
  try {
    const { data, error } = await blm48Supabase.rpc(fnName, params);
    if (error) {
      console.error('blm48Rpc ' + fnName + ' error:', error);
      return { status: 'error', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ' };
    }
    return data;
  } catch (e) {
    console.error('blm48Rpc ' + fnName + ' exception:', e);
    return { status: 'error', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ' };
  }
}

function blm48GiveCookie(username, memberName, amount) {
  return blm48Rpc('give_cookie', { p_username: username, p_member_name: memberName, p_amount: amount });
}
function blm48BuyGachaItem(username, collectionId) {
  return blm48Rpc('buy_gacha_item', { p_username: username, p_collection_id: collectionId });
}
function blm48BuyDirectItem(username, itemId) {
  return blm48Rpc('buy_direct_item', { p_username: username, p_item_id: itemId });
}
function blm48RedeemCode(username, code) {
  return blm48Rpc('redeem_code', { p_username: username, p_code: code });
}
function blm48GetInventory(username) {
  return blm48Rpc('get_inventory', { p_username: username });
}
function blm48GetWallet(username) {
  return blm48Rpc('get_wallet', { p_username: username });
}
// yearMonth is 'YYYY-MM'; omit it to get the current month
function blm48GetRanking(yearMonth) {
  return blm48Rpc('get_ranking', { p_year_month: yearMonth || null });
}
function blm48GetRankingMonths() {
  return blm48Rpc('get_ranking_months', {});
}
// full ranking board for one month: name, photo, status, group, monthly + all-time cookies, kami/oshi counts
function blm48GetRankingFull(yearMonth) {
  return blm48Rpc('get_ranking_full', { p_year_month: yearMonth || null });
}

// Live-updates whenever anyone's monthly cookie total changes (give_cookie, likePost).
// onChange is called with no arguments — caller decides what to re-fetch/re-render.
// Debounced so a burst of cookies within the same window only triggers one refresh.
function blm48SubscribeRanking(onChange, debounceMs) {
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, debounceMs || 400);
  };
  return blm48Supabase
    .channel('ranking-monthly-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_monthly' }, trigger)
    .subscribe();
}
