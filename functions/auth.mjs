// La puerta del autor: un token secreto de 256 bits (secret AUTH_TOKEN de
// Pages, nunca en el repo) que viaja como Authorization: Bearer sobre HTTPS
// — HTTPS obligatorio y automático en *.pages.dev. Prácticas verificadas del
// informe docs/research/auth-token-secreto.md (rama research/auth-token-secreto):
// comparación timing-safe de los digests SHA-256 (el digest iguala longitudes,
// que es lo que timingSafeEqual exige), AUTH_TOKEN_PREVIOUS mantiene el token
// anterior válido durante una rotación, y el 401 es único y genérico — ni el
// mensaje ni ningún log distinguen token ausente de token erróneo, y el valor
// recibido no se loguea nunca.

const digest = (texto) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));

// timing-safe: la extensión del runtime de Workers sobre los digests; fuera
// de él (Node, tests) el XOR constante de siempre — mismo tiempo sobre los
// 32 bytes fijos del digest
function iguales(a, b) {
  if (typeof crypto.subtle.timingSafeEqual === "function") return crypto.subtle.timingSafeEqual(a, b);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let dif = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}

// true solo si el Bearer recibido es el token vigente (o el anterior, durante
// una rotación). Ausente, malformado o erróneo: false — el caller responde el
// 401 genérico.
export async function autorizado(request, env) {
  const m = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/);
  if (!m) return false;
  const recibido = await digest(m[1]);
  for (const secreto of [env.AUTH_TOKEN, env.AUTH_TOKEN_PREVIOUS]) {
    if (secreto && iguales(recibido, await digest(secreto))) return true;
  }
  return false;
}

// el 401 único y genérico: se construye por llamada (el scope global del
// runtime de Workers no permite construir Response, y una compartida solo
// podría consumirse una vez)
export const noAutorizado = () => new Response("no autorizado", { status: 401 });
