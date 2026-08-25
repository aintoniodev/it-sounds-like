// POST /api/captura/login — el token se presenta UNA vez aquí (ticket 06):
// Turnstile delante (si el sitio lo tiene configurado), lockout por IP y,
// si todo pasa, cookie __Host- HttpOnly que carga con las siguientes
// peticiones — el token original no vuelve a viajar. El contador y la
// ventana viven en functions/auth.mjs junto al resto de la puerta.
import {
  tokenValido,
  cookieDeSesion,
  noAutorizado,
  puerta,
  ipDe,
  fallosDe,
  contarFallo,
  limpiarIntentos,
} from "../../auth.mjs";

async function turnstilePasa(env, respuesta, ip) {
  if (!env.TURNSTILE_SECRET) return true; // sin widget configurado: solo el token
  if (typeof respuesta !== "string" || !respuesta) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: respuesta, remoteip: ip }),
    });
    return (await r.json()).success === true;
  } catch {
    return false;
  }
}

export async function onRequestGet(context) {
  // el sitekey es público por definición: el cliente lo necesita para pintar
  // el widget. Sin él (local, o el sitio aún sin widget), el login es solo
  // token + lockout.
  return Response.json({ site: context.env.TURNSTILE_SITE ?? null });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = ipDe(request);
  if ((await fallosDe(env, ip)) >= 5)
    return new Response("demasiados intentos; espera unos minutos", { status: 429 });

  let cuerpo = null;
  try {
    cuerpo = await request.json();
  } catch {}
  if (!(await turnstilePasa(env, cuerpo?.turnstile, ip)))
    return new Response("no superaste la verificación humana", { status: 400 });

  // el token llega en el body (el formulario lo manda una vez): digest igual
  // que si viniera en el header, reutilizando la comparación timing-safe
  const presentado = typeof cuerpo?.token === "string" ? cuerpo.token : "";
  const comoBearer = new Request("https://login.interno", { headers: { authorization: `Bearer ${presentado}` } });
  if (presentado && (await tokenValido(comoBearer, env))) {
    await limpiarIntentos(env, ip);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8", "set-cookie": await cookieDeSesion(env) },
    });
  }
  await contarFallo(env, ip);
  return noAutorizado();
}

// DELETE /api/captura/login — cerrar sesión: la cookie es HttpOnly, así que
// la caduca el servidor (Max-Age=0). Sin estado que invalidar: el HMAC ya no
// cuadra con nada porque expira ya.
export async function onRequestDelete(context) {
  const { request, env } = context;
  const fallo = await puerta(request, env);
  if (fallo) return fallo;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": "__Host-sesion=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict",
    },
  });
}
