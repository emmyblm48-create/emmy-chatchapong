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

// ---------------------------------------------------------------------------
// Rest of the system (auth, notifications, major vote, tickets, champ of the
// month, members, oshi, wallet exchange, gacha catalog) - moved off Google
// Apps Script/Sheets onto Supabase. Same "anon key can only call RPCs" lockdown.
// ---------------------------------------------------------------------------

// Auth. login() checks the password; getUserInfo() is the silent session-refresh/
// kill-switch call (no password check) used on every page load.
function blm48Login(username, password) {
  return blm48Rpc('login', { p_username: username, p_password: password });
}
function blm48GetUserInfo(username) {
  return blm48Rpc('get_user_info', { p_username: username });
}

// Notifications - global feed, not per-user. Delete/add/clear are role-gated
// server-side (CEO/ADMIN only) inside the RPCs.
function blm48GetNotifications() {
  return blm48Rpc('get_notifications', {});
}
function blm48AddNotification(username, writer, action, avatar, role) {
  return blm48Rpc('add_notification', { p_username: username, p_writer: writer, p_action: action, p_avatar: avatar, p_role: role });
}
function blm48DeleteNotification(username, id) {
  return blm48Rpc('delete_notification', { p_username: username, p_id: id });
}
function blm48ClearNotifications(username) {
  return blm48Rpc('clear_notifications', { p_username: username });
}

// Major Vote - candidates list already reflects open/closed sort + percentages server-side.
function blm48GetMajorVoteCandidates(collectionId) {
  return blm48Rpc('get_major_vote_candidates', { p_collection_id: collectionId });
}
function blm48SubmitMajorVote(username, collectionId, candidateName, voteAmount, tokenType) {
  return blm48Rpc('submit_major_vote', { p_username: username, p_collection_id: collectionId, p_candidate_name: candidateName, p_vote_amount: voteAmount, p_token_type: tokenType || null });
}
function blm48SendGift(username, collectionId, candidateName, giftId, quantity) {
  return blm48Rpc('send_gift', { p_username: username, p_collection_id: collectionId, p_candidate_name: candidateName, p_gift_id: giftId, p_quantity: quantity });
}

// Tickets
function blm48GetTickets() {
  return blm48Rpc('get_tickets', {});
}
function blm48BuyTicket(username, ticketId, tierName) {
  return blm48Rpc('buy_ticket', { p_username: username, p_ticket_id: ticketId, p_tier_name: tierName });
}

// Champ of the month / nav icon theming - field names match the legacy Apps Script
// response exactly since common.js's applyGroupTheme() and every page depend on them.
function blm48GetChampOfTheMonth() {
  return blm48Rpc('get_champ_of_the_month', {});
}
function blm48GetWinnerTheme() {
  return blm48Rpc('get_winner_theme', {});
}

// Members directory / headline count
function blm48GetAllMembers() {
  return blm48Rpc('get_all_members', {});
}
function blm48GetMemberCount() {
  return blm48Rpc('get_member_count', {});
}

// Kamioshi/oshi - writes straight to user_oshi (the real source of truth now,
// not a mirror). type is 'kami' or anything else (= oshi) for removeOshi.
function blm48SetKamioshi(username, memberName) {
  return blm48Rpc('set_kamioshi', { p_username: username, p_member_name: memberName });
}
function blm48SetOshi(username, memberName) {
  return blm48Rpc('set_oshi', { p_username: username, p_member_name: memberName });
}
function blm48RemoveOshi(username, type, memberName) {
  return blm48Rpc('remove_oshi', { p_username: username, p_type: type, p_member_name: memberName });
}

// Free monthly cookie claim (role='user' only) and token->cookie exchange
// (rate is fixed server-side at 1:10, client-supplied reward is never trusted).
function blm48ClaimMonthlyCookie(username) {
  return blm48Rpc('claim_monthly_cookie', { p_username: username });
}
function blm48ExchangeCookies(username, tokenPrice) {
  return blm48Rpc('exchange_cookies', { p_username: username, p_token_price: tokenPrice });
}

// Gacha machine catalog (shop.html) - reads the already-synced collections/items tables.
function blm48GetGachaCollections() {
  return blm48Rpc('get_gacha_collections', {});
}

// Live-updates a single user's wallet (token/cookie/geToken). Replaces the old
// Firebase users/{username}/wallet subscription now that submitMajorVote/sendGift
// write straight to Supabase instead of mirroring into Firebase.
function blm48SubscribeWallet(username, onChange) {
  if (!username) return null;
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 400);
  };
  return blm48Supabase
    .channel('wallet-changes-' + username)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: 'username=eq.' + username }, trigger)
    .subscribe();
}

// Live-updates a Major Vote campaign's candidate rows. Replaces the old Firebase
// majorVotes/{collectionId} subscription for the same reason as blm48SubscribeWallet.
function blm48SubscribeMajorVoteCandidates(collectionId, onChange) {
  if (!collectionId) return null;
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 400);
  };
  return blm48Supabase
    .channel('major-vote-changes-' + collectionId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'major_vote_candidates', filter: 'vote_collection_id=eq.' + collectionId }, trigger)
    .subscribe();
}
