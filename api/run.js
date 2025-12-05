export default async function handler(req, res) {
  try {
    const code = req.body.code;
    const out = await eval(`(async()=>{ ${code} })()`);
    res.json({ ok: true, result: out });
  } catch (e) {
    res.json({ ok: false, error: e.toString() });
  }
}
