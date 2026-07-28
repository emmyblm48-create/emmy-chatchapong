// =========================================================================
// BLM48 Membership — Shared Firebase Realtime Database subscriptions.
// Mirrors GAS-driven writes (see รหัส.gs firebaseWrite()) so pages can
// listen live instead of polling/re-fetching the Apps Script backend.
// Loaded as an ES module: <script type="module" src="assets/js/firebase-realtime.js"></script>
// Exposes everything on window.BLM48Realtime for classic (non-module) scripts.
// =========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getDatabase, ref, onValue, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAx5JlVGm_IpuOhksQMTA6qli9vR-5rNas",
  authDomain: "blm48-official-site.firebaseapp.com",
  projectId: "blm48-official-site",
  databaseURL: "https://blm48-official-site-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "blm48-official-site.firebasestorage.app",
  messagingSenderId: "924510827472",
};

const app = initializeApp(firebaseConfig, "blm48-realtime");
export const database = getDatabase(app);

function safeKey(raw) {
  return raw.toString().trim().replace(/[.#$\[\]/]/g, "_");
}

// ยอด Token/Cookie/GEToken ของผู้ใช้ — path: users/{username}/wallet
export function subscribeWallet(username, onUpdate) {
  if (!username) return () => {};
  return onValue(ref(database, `users/${safeKey(username)}/wallet`), (snap) => {
    if (snap.exists()) onUpdate(snap.val());
  });
}

// จำนวนไลค์ของโพสต์ — path: postLikes/{postId}
export function subscribePostLikes(postId, onUpdate) {
  if (!postId) return () => {};
  return onValue(ref(database, `postLikes/${safeKey(postId)}`), (snap) => {
    if (snap.exists()) onUpdate(snap.val());
  });
}

// สัญญาณ "มีโพสต์ใหม่" — path: postEvents/{postId} (เนื้อหาโพสต์ยังต้องดึงจาก GAS ตามปกติ)
export function subscribeNewPosts(sinceTs, onNewPost) {
  return onChildAdded(ref(database, "postEvents"), (snap) => {
    const v = snap.val();
    if (v && v.timestamp > sinceTs) onNewPost(v);
  });
}

// การแจ้งเตือนใหม่ — path: notifications/{timestamp}
export function subscribeNotifications(onAdd) {
  return onChildAdded(ref(database, "notifications"), (snap) => {
    const v = snap.val();
    if (v) onAdd(v);
  });
}

// คะแนนโหวต/ของขวัญ Major Vote ของแคมเปญหนึ่ง ๆ — path: majorVotes/{collectionId}
export function subscribeMajorVotes(collectionId, onUpdate) {
  if (!collectionId) return () => {};
  return onValue(ref(database, `majorVotes/${safeKey(collectionId)}`), (snap) => {
    if (snap.exists()) onUpdate(snap.val());
  });
}

window.BLM48Realtime = {
  database,
  subscribeWallet,
  subscribePostLikes,
  subscribeNewPosts,
  subscribeNotifications,
  subscribeMajorVotes,
};
