// Embedding contra Workers AI (bge-m3, sin prefijos): el runtime real del
// sitio público. Lo comparten el harness, el build del índice, la
// calibración del umbral y el replay del re-rank. Requiere CF_API_TOKEN y
// CF_ACCOUNT_ID.
const BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`;

export async function embed(texts) {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ text: texts }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`Workers AI: ${JSON.stringify(j.errors)}`);
  return j.result.data;
}
