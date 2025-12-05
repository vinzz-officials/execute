import fetch from "node-fetch";

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // ==========================
  // ROUTE /api/webhook/:token
  // ==========================
  if (path.startsWith("/api/webhook/")) {
    const BOT_TOKEN = path.replace("/api/webhook/", "").trim();
    const update = req.body;

    if (!update?.message?.text) return res.json({ ok: true });

    const chat_id = update.message.chat.id;
    const text = update.message.text.trim();

    // ==========================
    // COMMAND HANDLER
    // ==========================
    if (text.startsWith("/run ")) {
      const code = text.slice(5);
      try {
        let result;
        // langsung eval (hati-hati)
        result = eval(code); 
        await send(chat_id, "OUTPUT:\n" + String(result), BOT_TOKEN);
      } catch (e) {
        await send(chat_id, "ERROR RUN: " + e.toString(), BOT_TOKEN);
      }
      return res.json({ ok: true });
    }

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

    if (text.startsWith("/post ")) {
      try {
        const content = text.slice(6);
        const space = content.indexOf(" ");
        if (space === -1) throw new Error("Format salah: /post <url> <json>");
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

  // ==========================
  // DEFAULT ROOT / atau route lain
  // ==========================
  return res.json({ ok: true, info: "Server aktif. Gunakan /api/webhook/<token>" });
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
