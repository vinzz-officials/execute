export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.json({ error: "url kosong" });

  try {
    const r = await fetch(url);
    const t = await r.text();
    res.json({ ok: true, status: r.status, data: t });
  } catch (e) {
    res.json({ error: e.toString() });
  }
}
