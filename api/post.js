export default async function handler(req, res) {
  try {
    const { url, body, headers } = req.body;
    if (!url) return res.json({ error: "url kosong" });

    const r = await fetch(url, {
      method: "POST",
      headers: headers || { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : null
    });

    const t = await r.text();
    res.json({ ok: true, status: r.status, data: t });
  } catch (e) {
    res.json({ error: e.toString() });
  }
}
