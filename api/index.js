import fetch from "node-fetch";

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

      // ✅ pastikan body sudah JSON
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
      // ✅ /get
      // ======================
      if (text.startsWith("/get ")) {
        const target = text.slice(5);
        try {
          const resp = await fetch(target);
          const out = await resp.text();
          await send(chat_id, out, BOT_TOKEN);
        } catch (e) {
          await send(chat_id, "ERROR GET: " + e.toString(), BOT_TOKEN);
        }
        return res.json({ ok: true });
      }

      // ======================
      // ✅ /post
      // ======================
      if (text.startsWith("/post ")) {
        try {
          const content = text.slice(6);
          const space = content.indexOf(" ");
          if (space === -1) throw new Error("Format: /post <url> <json>");

          const target = content.substring(0, space);
          const jsonTxt = content.substring(space + 1);

          const resp = await fetch(target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(JSON.parse(jsonTxt))
          });

          const out = await resp.text();
          await send(chat_id, out, BOT_TOKEN);
        } catch (e) {
          await send(chat_id, "ERROR POST: " + e.toString(), BOT_TOKEN);
        }
        return res.json({ ok: true });
      }

      await send(chat_id, "Command tidak dikenal.", BOT_TOKEN);
      return res.json({ ok: true });
    }

    // ======================================
    // ✅ API REST MODE
    // ======================================

    // ✅ /api/run  (POST)
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

    // ✅ /api/get?url=xxxx
    if (path === "/api/get" && req.method === "GET") {
      const target = fullUrl.searchParams.get("url");
      if (!target) return res.json({ error: "Missing url" });

      try {
        const resp = await fetch(target);
        const out = await resp.text();
        return res.send(out);
      } catch (e) {
        return res.json({ error: e.toString() });
      }
    }

    // ✅ /api/post (POST BODY)
    // ✅ /api/post?url=xxx&data={}
    if (path === "/api/post") {
      let target, bodyData;

      if (req.method === "POST") {
        const body = typeof req.body === "string"
          ? JSON.parse(req.body)
          : req.body;

        target = body?.url;
        bodyData = body?.body;
      } else {
        target = fullUrl.searchParams.get("url");
        const raw = fullUrl.searchParams.get("data");
        bodyData = raw ? JSON.parse(raw) : null;
      }

      if (!target || !bodyData) {
        return res.json({ error: "Missing url or body" });
      }

      try {
        const resp = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });

        const out = await resp.text();
        return res.send(out);
      } catch (e) {
        return res.json({ error: e.toString() });
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
// ✅ FUNCTION SEND TELEGRAM
// ======================================
async function send(chat, msg, token) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: msg,
        disable_web_page_preview: true
      })
    });
  } catch (e) {
    console.error("ERROR SEND TELEGRAM:", e.toString());
  }
}
