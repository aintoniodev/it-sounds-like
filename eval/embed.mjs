// Embedding contra Workers AI (bge-m3, sin prefijos): el runtime real del
// sitio público. Lo comparten el harness, el build del índice, la
// calibración del umbral y el replay del re-rank. Requiere CF_API_TOKEN y
// CF_ACCOUNT_ID.
const BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`;

export async function embed(texts, intentos = 4) {
  // El upstream de Workers AI da 7009/errores transitorios de vez en cuando:
  // reintentos con espera — un pico de servicio no puede tumbar un deploy.
  for (let i = 1; i <= intentos; i++) {
    const r = await fetch(BASE, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ text: texts }),
    });
    const j = await r.json();
    if (j.success) return j.result.data;
    if (i === intentos) throw new Error(`Workers AI: ${JSON.stringify(j.errors)}`);
    console.log(`· Workers AI indisponible (intento ${i}/${intentos}), espero y reintento…`);
    await new Promise((res) => setTimeout(res, 10_000 * i));
  }
}
