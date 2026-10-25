// GET /api/mv-views?ids=ID1,ID2 → { updated, views: { [youtubeId]: count } }
// ยอดวิว Music Video:
//   1) EmmyBLM48 Official Site (/api/views ใช้ YouTube Data API) — ต้องเรียกฝั่งเซิร์ฟเวอร์ เพราะเว็บนั้นไม่ส่ง CORS header
//   2) คลิปใน ids ที่เว็บนั้นไม่มี → อ่านยอดวิวจากหน้า YouTube เอง (วิธีเดียวกับ /api/views ตอนไม่มี API key)
// คลิปที่หาไม่ได้จะไม่มีใน views (หน้าเว็บจะโชว์แค่วันที่)
const SOURCE = "https://emmyblm48.vercel.app/api/views";
const MAX_IDS = 60;

const num = (v) => (v != null && /^\d+$/.test(String(v)) ? Number(v) : null);

const fromWatchPage = async (id) => {
  const r = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en&gl=US`, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "accept-language": "en-US,en;q=0.9", cookie: "CONSENT=YES+1; SOCS=CAI" },
  });
  const html = await r.text();
  const m = html.match(/"videoDetails":\{[^]*?"viewCount":"(\d+)"/) || html.match(/itemprop="interactionCount" content="(\d+)"/);
  return m ? Number(m[1]) : null;
};
const fromPlayer = async (id) => {
  const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip" },
    body: JSON.stringify({ videoId: id, context: { client: { clientName: "ANDROID", clientVersion: "19.09.37", androidSdkVersion: 30, hl: "en", gl: "US" } } }),
  });
  if (!r.ok) return null;
  return num((await r.json())?.videoDetails?.viewCount);
};

// YouTube Data API (ตั้ง YOUTUBE_API_KEY ใน Vercel → Settings → Environment Variables)
// ต้องใช้ทางนี้บน Vercel เพราะ YouTube ไม่ส่งยอดวิวจากหน้าเว็บให้เซิร์ฟเวอร์ของ Vercel
const fromApi = async (ids, key) => {
  const views = {};
  for (let i = 0; i < ids.length; i += 50) {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.slice(i, i + 50).join(",")}&key=${key}`);
    if (!r.ok) throw new Error(`YouTube API ${r.status}`);
    for (const item of (await r.json()).items || []) views[item.id] = Number(item.statistics.viewCount) || 0;
  }
  return views;
};

const fromYoutube = async (ids) => {
  const key = process.env.YOUTUBE_API_KEY;
  if (key && ids.length) {
    try { return await fromApi(ids, key); } catch {}
  }
  const views = {};
  const queue = [...ids];
  const worker = async () => {
    for (let id; (id = queue.shift()); ) {
      for (const get of [fromWatchPage, fromPlayer]) {
        try { const n = await get(id); if (n != null) { views[id] = n; break; } } catch {}
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return views;
};

const fromOfficialSite = async () => {
  try {
    const r = await fetch(SOURCE);
    const d = r.ok ? await r.json() : null;
    return d && d.views ? d : null;
  } catch { return null; }
};

module.exports = async (req, res) => {
  try {
    const ids = [...new Set(String(req.query.ids || "").split(","))].filter((id) => /^[\w-]{11}$/.test(id)).slice(0, MAX_IDS);
    const official = await fromOfficialSite();
    const views = { ...(official ? official.views : {}) };
    const missing = ids.filter((id) => views[id] == null);
    Object.assign(views, await fromYoutube(missing));
    if (!Object.keys(views).length) throw new Error("no view counts");
    const complete = ids.every((id) => views[id] != null);
    res.setHeader("Cache-Control", complete ? "public, s-maxage=3600, stale-while-revalidate=86400" : "public, s-maxage=600, stale-while-revalidate=3600");
    res.status(200).json({
      updated: official ? official.updated : new Date().toISOString(),
      views: ids.length ? Object.fromEntries(ids.filter((id) => views[id] != null).map((id) => [id, views[id]])) : views,
    });
  } catch (e) {
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(502).json({ error: String(e.message || e) });
  }
};
