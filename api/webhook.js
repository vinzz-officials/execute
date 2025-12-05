let BOT_TOKEN = null;

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // ==========================
  // SET TOKEN OTOMATIS
  // ==========================
  if (path.startsWith("/api/webhook/")) {
    BOT_TOKEN = path.replace("/api/webhook/", "").trim();
    return res.json({ ok: true, token_saved: BOT_TOKEN });
  }

  if (!BOT_TOKEN) return res.json({ error: "Token belum di set" });

  const update = req.body;

  if (!update || !update.message) {
    return res.json({ ok: true });
  }

  const chat_id = update.message.chat.id;
  const text = update.message.text || "";

  // ==========================
  // COMMAND HANDLER
  // ==========================

  // /run <code>
  if (text.startsWith("/run ")) {
    const code = text.replace("/run ", "");
    const resp = await fetch(`${url.origin}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const out = await resp.text();

    await send(chat_id, "OUTPUT:\n" + out);
    return res.json({ ok: true });
  }

  // /get <url>
  if (text.startsWith("/get ")) {
    const target = text.replace("/get ", "");
    const resp = await fetch(`${url.origin}/api/get?url=${encodeURIComponent(target)}`);
    const out = await resp.text();
    await send(chat_id, out);
    return res.json({ ok: true });
  }

  // /post <url> <json>
  if (text.startsWith("/post ")) {
    try {
      const content = text.replace("/post ", "").trim();
      const space = content.indexOf(" ");
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
      await send(chat_id, out);
    } catch (e) {
      await send(chat_id, "ERROR: " + e.toString());
    }

    return res.json({ ok: true });
  }

  await send(chat_id, "Command tidak dikenal.");
  res.json({ ok: true });

  // ==========================
  // FUNCTION SEND TELEGRAM
  // ==========================
  async function send(chat, msg) {
    return await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: msg })
    });
  }
      }
