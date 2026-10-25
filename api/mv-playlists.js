// GET /api/mv-playlists → { updated, videos: [{ id, title, date, image, link, views? }] }
// คลิปทั้งหมดในหน้า Discography ของ BLM48 Official Website:
//   - ลิงก์เพลย์ลิสต์/พอดแคสต์ (playlist?list=...) → ดึงทุกคลิปในเพลย์ลิสต์จาก YouTube
//   - ลิงก์คลิปเดี่ยว (youtu.be/ID, watch?v=ID) → ใช้คลิปนั้นตรงๆ
// วันที่ = วันอัปโหลดจาก RSS ของเพลย์ลิสต์ (ถ้ามี) ไม่งั้นใช้วันวางจำหน่ายของ Discography นั้น
const vm = require("vm");

const SHEET_DATA = "https://blm48.vercel.app/assets/js/sheet-data.js";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const textOf = (t) => (t ? t.simpleText || (t.runs || []).map((r) => r.text).join("") : "");
const unxml = (s) => String(s).replace(/&(amp|lt|gt|quot|#39|apos);/g, (m, e) => ({ amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", apos: "'" }[e]));

const loadDiscography = async () => {
  const r = await fetch(SHEET_DATA);
  if (!r.ok) throw new Error("sheet-data " + r.status);
  const sandbox = { window: {} };
  vm.runInNewContext(await r.text(), sandbox, { timeout: 1000 });
  const d = sandbox.window.BLM48_STATIC_SHEETS && sandbox.window.BLM48_STATIC_SHEETS.Discography;
  return Array.isArray(d) ? d : [];
};

// RSS ของเพลย์ลิสต์ (สูงสุด 15 คลิปล่าสุด) — มีวันอัปโหลดและยอดวิว
const fromRss = async (list) => {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${list}`, { headers: { "user-agent": UA } });
  if (!r.ok) return [];
  const xml = await r.text();
  return [...xml.matchAll(/<entry>([^]*?)<\/entry>/g)].map(([, e]) => ({
    id: (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1],
    title: unxml((e.match(/<title>([^]*?)<\/title>/) || [])[1] || ""),
    date: ((e.match(/<published>([^<]+)<\/published>/) || [])[1] || "").slice(0, 10),
    views: Number((e.match(/<media:statistics views="(\d+)"/) || [])[1]) || null,
  })).filter((v) => v.id);
};

// หน้าเพลย์ลิสต์ผ่าน youtubei (ได้ทุกคลิปในหน้าแรก สูงสุด ~100) — ไม่มีวันที่
const fromBrowse = async (list) => {
  const r = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify({ browseId: "VL" + list, context: { client: { clientName: "WEB", clientVersion: "2.20240726.00.00", hl: "en", gl: "US" } } }),
  });
  if (!r.ok) return [];
  const out = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    const v = o.playlistVideoRenderer;
    if (v && v.videoId && v.isPlayable !== false) out.push({ id: v.videoId, title: textOf(v.title) });
    for (const k in o) walk(o[k]);
  };
  walk(await r.json());
  return out;
};

const playlistVideos = async (list) => {
  const [rss, browse] = await Promise.all([fromRss(list).catch(() => []), fromBrowse(list).catch(() => [])]);
  const byId = new Map(rss.map((v) => [v.id, v]));
  const ordered = browse.length ? browse.map((v) => ({ ...v, ...byId.get(v.id) })) : rss;
  return ordered.filter((v) => v.title && !/^\[(deleted|private) video\]$/i.test(v.title));
};

const oembedTitle = async (id) => {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}`);
    return r.ok ? (await r.json()).title || "" : "";
  } catch { return ""; }
};

module.exports = async (req, res) => {
  try {
    const releases = await loadDiscography();
    const seen = new Set();
    const groups = await Promise.all(releases.map(async (rel) => {
      const link = String(rel.link || "");
      const list = (link.match(/[?&]list=([\w-]+)/) || [])[1];
      const single = (link.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/) || [])[1];
      const items = list ? await playlistVideos(list).catch(() => []) : [];
      if (!items.length && single) items.push({ id: single, title: (await oembedTitle(single)) || String(rel.title || "") });
      return items.map((v) => ({ ...v, date: v.date || rel.date || "" }));
    }));
    const videos = [];
    for (const v of groups.flat()) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      videos.push({ id: v.id, title: v.title, date: v.date, image: thumb(v.id), link: "https://youtu.be/" + v.id, ...(v.views != null ? { views: v.views } : {}) });
    }
    if (!videos.length) throw new Error("no videos");
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json({ updated: new Date().toISOString(), videos });
  } catch (e) {
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(502).json({ error: String(e.message || e) });
  }
};
