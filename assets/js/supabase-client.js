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
      // networkError: true = การเรียก RPC เองล้มเหลว (เช่น rate limit/timeout ตอนคนใช้งานพร้อมกันเยอะ)
      // ไม่ใช่คำตอบจริงจากฐานข้อมูล ต้องแยกจาก success:false ที่มาจาก logic จริง (เช่นบัญชีถูกระงับ)
      // เพื่อไม่ให้โค้ดฝั่งหน้าเว็บเข้าใจผิดว่าเป็นการถูกระงับแล้วเตะผู้ใช้ออก
      return { status: 'error', networkError: true, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ' };
    }
    return data;
  } catch (e) {
    console.error('blm48Rpc ' + fnName + ' exception:', e);
    return { status: 'error', networkError: true, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ' };
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

// 🎁 กระเป๋าของขวัญของ Major Vote: ตอนซื้อของขวัญจะเลือกได้ว่าจะ "โหวตให้เลย" หรือ "เก็บเข้ากระเป๋า"
// ไว้ก่อน แล้วค่อยเอาของที่เก็บไว้มาโหวตให้ผู้สมัครในแคมเปญที่เปิดรับของขวัญทีหลังก็ได้
function blm48BuyGiftWallet(username, giftId, quantity) {
  return blm48Rpc('buy_gift_wallet', { p_username: username, p_gift_id: giftId, p_quantity: quantity });
}
function blm48GiveGiftWallet(username, collectionId, candidateName, giftId, quantity) {
  return blm48Rpc('give_gift_wallet', { p_username: username, p_collection_id: collectionId, p_candidate_name: candidateName, p_gift_id: giftId, p_quantity: quantity });
}
function blm48GetGiftWallet(username) {
  return blm48Rpc('get_gift_wallet', { p_username: username });
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

// Uploads a recorded voice-clip Blob straight to the public "post-audio" Storage bucket
// (created 2026-08-05, replaces the old audio pipeline that pointed at a since-abandoned
// Supabase project) and returns its public URL for create_post/edit_post's audio param.
// Same "anon key, no real auth session" trust model as every RPC above - anyone can upload,
// but only into this bucket, capped by its own file_size_limit/allowed_mime_types.
// Retries on transient failures (network blip, rate limit) same as the image upload path in
// post.html. Generates a fresh random filePath per attempt so a lost success response never
// collides with the retry (upsert:false would otherwise error out on an already-existing file).
async function blm48UploadPostAudio(username, blob, retries = 2) {
  const ext = blob.type.includes('mp4') ? 'm4a' : (blob.type.includes('ogg') ? 'ogg' : (blob.type.includes('wav') ? 'wav' : 'webm'));

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const filePath = `${username}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try {
      const { error } = await blm48Supabase.storage.from('post-audio').upload(filePath, blob, {
        contentType: blob.type || 'audio/webm',
        upsert: false
      });
      if (error) throw error;

      const { data } = blm48Supabase.storage.from('post-audio').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw lastError;
      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
}

// Shared upload helper for the image buckets below - same retry-with-fresh-filename pattern as
// blm48UploadPostAudio. `file` can be a File or Blob; extension is guessed from its MIME type
// (falls back to jpg since both callers compress/crop to JPEG client-side before calling this).
async function blm48UploadImageToBucket(bucket, username, file, retries = 2) {
  const type = file.type || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : (type.includes('webp') ? 'webp' : (type.includes('gif') ? 'gif' : 'jpg'));

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const filePath = `${username}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try {
      const { error } = await blm48Supabase.storage.from(bucket).upload(filePath, file, {
        contentType: type,
        upsert: false
      });
      if (error) throw error;

      const { data } = blm48Supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw lastError;
      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
}

// Replaces ImgBB (went down entirely on 2026-08-05, taking every image upload in the app down
// with it) - post.html's gallery images and profile.html's profile picture now go straight to
// Supabase Storage instead of a third-party host with no reliability guarantee.
function blm48UploadPostImage(username, file, retries = 2) {
  return blm48UploadImageToBucket('post-images', username, file, retries);
}
function blm48UploadProfileImage(username, file, retries = 2) {
  return blm48UploadImageToBucket('profile-images', username, file, retries);
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

// Live-updates whenever a new notification is inserted (admin-posted announcements,
// and automatic ones like "a member posted" - see create_post). onInsert gets the raw
// new row (id/writer/action/avatar/role/created_at), not the get_notifications() shape.
function blm48SubscribeNotifications(onInsert) {
  return blm48Supabase
    .channel('notifications-feed-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => onInsert(payload.new))
    .subscribe();
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

// Daily missions (give 10 cookies / like 2 posts / comment 2 posts, all from
// this month, resets 00:00 Asia/Bangkok). Progress is tracked server-side
// inside give_cookie/like_post/add_comment - this is read-only + the claim.
function blm48GetDailyMissions(username) {
  return blm48Rpc('get_daily_missions', { p_username: username });
}
function blm48ClaimDailyMissionReward(username) {
  return blm48Rpc('claim_daily_mission_reward', { p_username: username });
}
function blm48ExchangeCookies(username, tokenPrice) {
  return blm48Rpc('exchange_cookies', { p_username: username, p_token_price: tokenPrice });
}

// Gacha machine catalog (shop.html) - reads the already-synced collections/items tables.
function blm48GetGachaCollections() {
  return blm48Rpc('get_gacha_collections', {});
}

// Best-selling item per shop category (Cookie/Cafe/Gacha), by purchase count in wallet_logs.
function blm48GetShopBestSellers() {
  return blm48Rpc('get_shop_best_sellers', {});
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

// ---------------------------------------------------------------------------
// Admin-only tools (profile.html, gated to role='admin' client-side, and to
// role admin/ceo server-side inside each RPC) - create membership accounts
// and top up a user/member's wallet with a confirmation + slip.
// ---------------------------------------------------------------------------
function blm48AdminSuggestUsername(adminUsername) {
  return blm48Rpc('admin_suggest_username', { p_admin_username: adminUsername });
}
function blm48AdminCreateUser(adminUsername, newUsername, password, role) {
  return blm48Rpc('admin_create_user', { p_admin_username: adminUsername, p_new_username: newUsername, p_password: password, p_role: role });
}
function blm48AdminLookupUser(adminUsername, targetUsername) {
  return blm48Rpc('admin_lookup_user', { p_admin_username: adminUsername, p_target_username: targetUsername });
}
function blm48AdminTransferWallet(adminUsername, targetUsername, token, cookie, geToken) {
  return blm48Rpc('admin_transfer_wallet', { p_admin_username: adminUsername, p_target_username: targetUsername, p_token: token, p_cookie: cookie, p_ge_token: geToken });
}
// Global audit log of every admin's wallet transfers (newest first), used by the "ประวัติการโอน" list.
function blm48AdminGetTransferHistory(adminUsername, limit) {
  return blm48Rpc('admin_get_transfer_history', { p_admin_username: adminUsername, p_limit: limit || 100 });
}

// Pending-account approval queue (admin.html Dashboard) - accounts admin_create_user makes
// start life as status='pending' and are blocked from logging in until an admin approves them
// (business rule: member must join the LINE group "BLM48 Membership" first).
function blm48AdminGetPendingUsers(adminUsername) {
  return blm48Rpc('admin_get_pending_users', { p_admin_username: adminUsername });
}
function blm48AdminApproveUser(adminUsername, targetUsername) {
  return blm48Rpc('admin_approve_user', { p_admin_username: adminUsername, p_target_username: targetUsername });
}
function blm48AdminRejectUser(adminUsername, targetUsername) {
  return blm48Rpc('admin_reject_user', { p_admin_username: adminUsername, p_target_username: targetUsername });
}
function blm48AdminGetDashboardStats(adminUsername) {
  return blm48Rpc('admin_get_dashboard_stats', { p_admin_username: adminUsername });
}

// Per-member engagement stats (Kami-Oshi/Oshi counts, cookie balance, likes/posts/comments)
// for the "Dashboard Member" table in admin.html - scoped to role='member' accounts only.
function blm48AdminGetMemberDashboard(adminUsername) {
  return blm48Rpc('admin_get_member_dashboard', { p_admin_username: adminUsername });
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
