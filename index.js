import fetch from "node-fetch";

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // ==========================
  // AMBIL TOKEN DARI URL
  // ==========================
  if (path.startsWith("/api/webhook/")) {
    const BOT_TOKEN = path.replace("/api/webhook/", "").trim();

    const update = req.body;

    if (!update || !update.message || !update.message.text) {
      return res.json({ ok: true, info: "No message or text" });
    }

    const chat_id = update.message.chat.id;
    const text = update.message.text.trim();

    // ==========================
    // COMMAND HANDLER
    // ==========================

    // /run <code>
    if (text.startsWith("/run ")) {
      const code = text.slice(5).trim();
      try {
        const resp = await fetch(`${url.origin}/api/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        const out = await resp.text();
        await send(chat_id, "OUTPUT:\n" + out, BOT_TOKEN);
      } catch (e) {
        await send(chat_id, "ERROR RUN: " + e.toString(), BOT_TOKEN);
      }
      return res.json({ ok: true });
    }

    // /get <url>
    if (text.startsWith("/get ")) {
      const target = text.slice(5).trim();
      try {
        const resp = await fetch(`${url.origin}/api/get?url=${encodeURIComponent(target)}`);
        const out = await resp.text();
        await send(chat_id, out, BOT_TOKEN);
      } catch (e) {
        await send(chat_id, "ERROR GET: " + e.toString(), BOT_TOKEN);
      }
      return res.json({ ok: true });
    }

    // /post <url> <json>
    if (text.startsWith("/post ")) {
      try {
        const content = text.slice(6).trim();
        const space = content.indexOf(" ");
        if (space === -1) throw new Error("Format salah: /post <url> <json>");
        const target = content.substring(0, space);
        const jsonTxt = content.substring(space + 1);

        const resp = await fetch(`${url.origin}/api/post`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: target,
            body: JSON.parse(jsonTxt)
          })
        });
        const out = await resp.text();
        await send(chat_id, out, BOT_TOKEN);
      } catch (e) {
        await send(chat_id, "ERROR POST: " + e.toString(), BOT_TOKEN);
      }
      return res.json({ ok: true });
    }

    // Command tidak dikenali
    await send(chat_id, "Command tidak dikenal.", BOT_TOKEN);
    return res.json({ ok: true });
  }

  // Default response untuk route lain
  return res.json({ ok: true, info: "Webhook aktif. Gunakan /api/webhook/<token>" });
}

// ==========================
// FUNCTION SEND TELEGRAM
// ==========================
async function send(chat, msg, token) {
  try {
    return await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: msg })
    });
  } catch (e) {
    console.error("ERROR SEND TELEGRAM:", e.toString());
  }
}
