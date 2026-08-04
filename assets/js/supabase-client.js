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

// Reference/catalog data synced in from Google Sheets (GiftCatalog/campaign/
// majorVoteCollections/majorVoteCandidates) - read-only, no ownership check needed.
function blm48GetGiftCatalog() {
  return blm48Rpc('get_gift_catalog', {});
}
function blm48GetCampaigns() {
  return blm48Rpc('get_campaigns', {});
}
function blm48GetVoteCollections() {
  return blm48Rpc('get_vote_collections', {});
}
// unified transaction history for history.html: giveLogs, purchaseHistory, voteLogs, giftLogs
function blm48GetMyHistory(username) {
  return blm48Rpc('get_my_history', { p_username: username });
}

// member.html profile stats: total_kami/total_oshi (live count from user_oshi),
// total_likes (live counter bumped on every post like), all_time_total (sum of ranking_monthly)
function blm48GetMemberStats(memberName) {
  return blm48Rpc('get_member_stats', { p_member_name: memberName });
}
// top fans (by all-time cookies given) for one member - used on member.html
function blm48GetMemberTopFans(memberName) {
  return blm48Rpc('get_member_top_fans', { p_member_name: memberName });
}
// top fans for every member at once, keyed by member name - used on index.html's global Top Fans section
function blm48GetTopFans() {
  return blm48Rpc('get_top_fans', {});
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

// ---------------------------------------------------------------------------
// Post system (feed, likes, comments) - moved off Google Apps Script/Sheets
// and Firebase onto Supabase so posting/liking/commenting doesn't queue up
// behind Sheets' single global lock or need a third backend for comments.
// Same "anon key can only call RPCs" lockdown as everything else above.
// ---------------------------------------------------------------------------

// username is optional - pass it to get accurate isLiked flags per viewer.
function blm48GetPosts(username) {
  return blm48Rpc('get_posts', { p_username: username || null });
}
function blm48CreatePost(username, content, imageUrl, audioUrl, videoUrl) {
  return blm48Rpc('create_post', {
    p_username: username,
    p_content: content || '',
    p_image_url: imageUrl || '',
    p_audio_url: audioUrl || '',
    p_video_url: videoUrl || ''
  });
}
function blm48LikePost(username, postId) {
  return blm48Rpc('like_post', { p_username: username, p_post_id: postId });
}
// newImageUrl is the FINAL joined image list (empty string clears all images), not a delta.
function blm48EditPost(username, postId, newContent, newImageUrl) {
  return blm48Rpc('edit_post', { p_username: username, p_post_id: postId, p_new_content: newContent, p_new_image_url: newImageUrl || '' });
}
function blm48DeletePost(username, postId) {
  return blm48Rpc('delete_post', { p_username: username, p_post_id: postId });
}
function blm48AddComment(username, postId, text) {
  return blm48Rpc('add_comment', { p_username: username, p_post_id: postId, p_text: text });
}

// Profile updates - name (role='user' only, same as before) and photo, written straight to Supabase.
function blm48UpdateProfileName(username, newName) {
  return blm48Rpc('update_profile_name', { p_username: username, p_new_name: newName });
}
function blm48UpdateProfileImage(username, imageUrl) {
  return blm48Rpc('update_profile_image', { p_username: username, p_image_url: imageUrl });
}

// Live-updates whenever likes/comments change on any post. onChange gets no arguments -
// caller decides what to re-fetch/re-render (mirrors blm48SubscribeRanking's pattern).
function blm48SubscribePosts(onChange, debounceMs) {
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, debounceMs || 400);
  };
  return blm48Supabase
    .channel('posts-feed-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, trigger)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, trigger)
    .subscribe();
}
