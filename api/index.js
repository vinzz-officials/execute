import fetch from "node-fetch";
import FormData from "form-data";
// =============================
// ✅ FETCH DENGAN TIMEOUT 10 DETIK
// =============================
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export default async function handler(req, res) {
  try {
    const host = req.headers.host;
    const fullUrl = new URL(req.url, `http://${host}`);
    const path = fullUrl.pathname;

    // ======================================
    // ✅ WEBHOOK TELEGRAM
    // ======================================
    if (path.startsWith("/api/webhook/")) {
      const BOT_TOKEN = path.replace("/api/webhook/", "").trim();

      const update = typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

      if (!update?.message?.text) {
        return res.status(200).json({ ok: true });
      }

      const chat_id = update.message.chat.id;
      const text = update.message.text.trim();

      // ======================
      // ✅ /run
      // ======================
      if (text.startsWith("/run ")) {
        const code = text.slice(5);
        try {
          let result = eval(code);
          await send(chat_id, "OUTPUT:\n" + String(result), BOT_TOKEN);
        } catch (e) {
          await send(chat_id, "ERROR RUN: " + e.toString(), BOT_TOKEN);
        }
        return res.json({ ok: true });
      }

// ======================
// ======================
// ✅ /get (AUTO FILE JIKA KEPANJANGAN - FIXED)
// ======================
if (text.startsWith("/get ")) {
  const raw = text.slice(5);
  let target = raw.trim();
  let cookie = null;

  if (raw.includes("|")) {
    const split = raw.split("|");
    target = split[0].trim();
    cookie = split[1].trim();
  }

  try {
    const resp = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        ...(cookie ? { "Cookie": cookie } : {})
      }
    });

    const out = await resp.text();

    // ✅ JIKA KEPANJANGAN → KIRIM FILE (FIX REAL)
    if (out.length > 3500) {
      const form = new FormData();
      const filename = `get_result_${Date.now()}.txt`;

      form.append("chat_id", chat_id);
      form.append("caption", "✅ Output kepanjangan, dikirim sebagai file.");
      form.append("document", Buffer.from(out), {
        filename,
        contentType: "text/plain"
      });

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: "POST",
        body: form
      });

    } else {
      await send(chat_id, out, BOT_TOKEN);
    }

  } catch (e) {
    await send(chat_id, "ERROR GET: " + e.toString(), BOT_TOKEN);
  }

  return res.json({ ok: true });
                      }
      
      if (text.startsWith("/post ")) {
  try {
    const content = text.slice(6);
    const parts = content.split("|").map(p => p.trim());

    const target = parts[0].split(" ")[0]; // ambil URL
    const jsonTxt = parts[0].slice(target.length).trim(); // sisanya JSON

    const headers = { "Content-Type": "application/json" };

    for (let i = 1; i < parts.length; i++) {
      const [key, ...rest] = parts[i].split("=");
      if (!key || rest.length === 0) continue;
      const value = rest.join("=").trim();
      switch (key.toLowerCase()) {
        case "cookie":
        case "sessionuser":
          headers["Cookie"] = value;
          break;
        case "auth":
          headers["Authorization"] = value;
          break;
        case "ua":
        case "useragent":
          headers["User-Agent"] = value;
          break;
      }
    }

    const bodyData = JSON.parse(jsonTxt);

    const resp = await fetchWithTimeout(target, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyData),
    }, 10000);

    const out = await resp.text();
    await send(chat_id, out, BOT_TOKEN);
  } catch (e) {
    await send(chat_id, "ERROR POST: " + e.toString(), BOT_TOKEN);
  }
  return res.json({ ok: true });
      }

    // ======================================
    // ✅ API REST MODE
    // ======================================

    // ✅ /api/run (POST)
    if (path === "/api/run" && req.method === "POST") {
      const body = typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

      const { code } = body || {};
      if (!code) return res.json({ error: "Missing code" });

      try {
        const result = eval(code);
        return res.json({ output: String(result) });
      } catch (e) {
        return res.json({ error: e.toString() });
      }
    }

    // ✅ /api/get?url=xxxx&cookie=abcd
if (path === "/api/get" && req.method === "GET") {
  const target = fullUrl.searchParams.get("url");
  const cookie = fullUrl.searchParams.get("cookie");

  if (!target) return res.json({ error: "Missing url" });

  try {
    const resp = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        ...(cookie ? { "Cookie": cookie } : {})
      }
    });

    const out = await resp.text();
    return res.send(out);
  } catch (e) {
    return res.json({ error: e.toString() });
  }
}

    if (path === "/api/post") {
  let target, bodyData, headers = { "Content-Type": "application/json" };

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    target = body?.url;
    bodyData = body?.body;
    if (body?.sessionUser) headers["Cookie"] = body.sessionUser;
    if (body?.cookie) headers["Cookie"] = body.cookie;
    if (body?.auth) headers["Authorization"] = body.auth;
    if (body?.ua) headers["User-Agent"] = body.ua;
  } else {
    target = fullUrl.searchParams.get("url");
    const raw = fullUrl.searchParams.get("data");
    bodyData = raw ? JSON.parse(raw) : null;
    const cookie = fullUrl.searchParams.get("cookie");
    const sessionUser = fullUrl.searchParams.get("sessionUser");
    const auth = fullUrl.searchParams.get("auth");
    const ua = fullUrl.searchParams.get("ua");
    if (cookie) headers["Cookie"] = cookie;
    else if (sessionUser) headers["Cookie"] = sessionUser;
    if (auth) headers["Authorization"] = auth;
    if (ua) headers["User-Agent"] = ua;
  }

  if (!target || !bodyData) return res.json({ error: "Missing url or body" });

  try {
    const resp = await fetchWithTimeout(target, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyData),
    }, 10000);

    const out = await resp.text();
    return res.send(out);
  } catch (e) {
    return res.json({ error: "ERROR POST (TIMEOUT/FAIL): " + e.toString() });
  }
    }

    // ======================================
    // ✅ ROOT
    // ======================================
    return res.json({
      ok: true,
      info: "Server aktif.",
      webhook: "/api/webhook/<TOKEN>",
      api: ["/api/run", "/api/get?url=", "/api/post"]
    });

  } catch (err) {
    console.error("FATAL SERVER:", err);
    return res.status(500).json({ error: "Server crash", detail: err.toString() });
  }
}

// ======================================
// ✅ FUNCTION SEND TELEGRAM (PAKAI TIMEOUT JUGA)
// ======================================
async function send(chat, msg, token) {
  try {
    await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: msg,
        disable_web_page_preview: true
      })
    }, 10000);
  } catch (e) {
    console.error("ERROR SEND TELEGRAM (TIMEOUT):", e.toString());
  }
}
