// La puerta del autor (tickets 01 y 06 de captura-web). Prácticas del
// informe docs/research/auth-token-secreto.md:
//   - token de 256 bits como secret AUTH_TOKEN de Pages (nunca en el repo),
//     viaja como Authorization: Bearer UNA VEZ, al abrir sesión;
//   - sesión posterior por cookie __Host-sesion — HttpOnly, Secure,
//     SameSite=Strict — firmada con HMAC del propio secret y caducidad
//     larga (400 días); AUTH_TOKEN_PREVIOUS mantiene token y cookies vigentes durante
//     una rotación;
//   - comparación timing-safe de digests SHA-256;
//   - lockout por IP tras 5 fallos en 10 min (contador en D1, sin escribir
//     cuando ya está bloqueada: un bot no convierte la puerta en DoS de
//     cuota), y el 401 único y genérico — ni mensajes ni logs distinguen
//     token ausente de erróneo, y el valor recibido no se loguea nunca.
const VENTANA_MS = 10 * 60 * 1000;
const BLOQUEO_TRAS = 5;
// 400 días: el techo de Max-Age que los navegadores imponen a las cookies —
// "permanente" en la práctica (la puerta sigue siendo el token, no la sesión)
const SESION_MS = 400 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

const digest = (texto) => crypto.subtle.digest("SHA-256", encoder.encode(texto));

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

async function firma(secreto, dato) {
  const k = await crypto.subtle.importKey("raw", encoder.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, encoder.encode(dato));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── lockout: contador por IP en D1, tolerante a que la base no responda ──
// (una caída del contador no abre la puerta: el token sigue haciendo su trabajo)
export const ipDe = (request) => request.headers.get("cf-connecting-ip") ?? "local";

export async function fallosDe(env, ip) {
  try {
    const fila = await env.DB.prepare("SELECT fallos, ventana_desde FROM intentos_login WHERE ip = ?").bind(ip).first();
    if (!fila) return 0;
    return Date.now() - fila.ventana_desde > VENTANA_MS ? 0 : fila.fallos;
  } catch {
    return 0;
  }
}

export async function contarFallo(env, ip) {
  try {
    await env.DB.prepare(
      `INSERT INTO intentos_login (ip, fallos, ventana_desde) VALUES (?, 1, ?)
       ON CONFLICT(ip) DO UPDATE SET
         fallos = CASE WHEN ? - ventana_desde > ${VENTANA_MS} THEN 1 ELSE fallos + 1 END,
         ventana_desde = CASE WHEN ? - ventana_desde > ${VENTANA_MS} THEN ? ELSE ventana_desde END`,
    )
      .bind(ip, Date.now(), Date.now(), Date.now(), Date.now())
      .run();
  } catch {}
}

export async function limpiarIntentos(env, ip) {
  try {
    await env.DB.prepare("DELETE FROM intentos_login WHERE ip = ?").bind(ip).run();
  } catch {}
}

// la puerta entera para los endpoints de captura: bloqueada → 429 (sin
// escribir en D1: protege el cupo); autorizada → null y a correr; si no,
// cuenta el fallo y devuelve el 401 genérico
export async function puerta(request, env) {
  const ip = ipDe(request);
  if ((await fallosDe(env, ip)) >= BLOQUEO_TRAS)
    return new Response("demasiados intentos; espera unos minutos", { status: 429 });
  if (await autorizado(request, env)) {
    await limpiarIntentos(env, ip);
    return null;
  }
  await contarFallo(env, ip);
  return noAutorizado();
}

// el Bearer de siempre: true si es el token vigente (o el anterior, en
// rotación). Ausente, malformado o erróneo: false, sin más detalle.
export async function tokenValido(request, env) {
  const m = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/);
  if (!m) return false;
  const recibido = await digest(m[1]);
  for (const secreto of [env.AUTH_TOKEN, env.AUTH_TOKEN_PREVIOUS]) {
    if (secreto && iguales(recibido, await digest(secreto))) return true;
  }
  return false;
}

// la cookie de sesión: exp.ms . HMAC(secret, "sesion." + exp) — con el
// vigente o el anterior, para que rotar no desloguee a quien ya entró
export async function sesionValida(request, env) {
  const cruda = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith("__Host-sesion="))
    ?.slice("__Host-sesion=".length);
  if (!cruda) return false;
  const [exp, mac] = cruda.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  for (const secreto of [env.AUTH_TOKEN, env.AUTH_TOKEN_PREVIOUS]) {
    if (secreto && (await firma(secreto, `sesion.${exp}`)) === mac) return true;
  }
  return false;
}

export async function autorizado(request, env) {
  return (await tokenValido(request, env)) || (await sesionValida(request, env));
}

// la cookie que el login entrega: caduca sola, sin estado en el servidor
export async function cookieDeSesion(env, ahora = Date.now()) {
  const exp = ahora + SESION_MS;
  const mac = await firma(env.AUTH_TOKEN, `sesion.${exp}`);
  return `__Host-sesion=${exp}.${mac}; Max-Age=${SESION_MS / 1000}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

export const noAutorizado = () => new Response("no autorizado", { status: 401 });
