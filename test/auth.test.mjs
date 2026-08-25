// Test de la puerta del autor (functions/auth.mjs): Bearer sobre el token
// secreto de Pages, comparación timing-safe de digests SHA-256, el 401
// genérico, la cookie de sesión __Host- firmada (ticket 06), la rotación
// con solapamiento y el lockout por IP. Corre en Node (el XOR constante
// cubre lo que en Workers hace crypto.subtle.timingSafeEqual).
import { test } from "node:test";
import assert from "node:assert/strict";
import { autorizado, noAutorizado, tokenValido, sesionValida, cookieDeSesion, puerta } from "../functions/auth.mjs";

const SECRETO = "tok-" + "a".repeat(40);
const ANTERIOR = "tok-" + "b".repeat(40);
const env = () => ({ AUTH_TOKEN: SECRETO, AUTH_TOKEN_PREVIOUS: ANTERIOR });
const peticion = (token) =>
  new Request("https://it-sounds-like.pages.dev/api/captura", {
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  });

test("sin Authorization, con Bearer malformado o con token erróneo: false", async () => {
  assert.equal(await autorizado(peticion(null), env()), false);
  assert.equal(await autorizado(peticion(""), env()), false);
  assert.equal(
    await autorizado(
      new Request("https://x.dev/", { headers: { authorization: `Basic ${SECRETO}` } }),
      env(),
    ),
    false,
  );
  assert.equal(await autorizado(peticion("tok-" + "a".repeat(39) + "b"), env()), false);
});

test("el token vigente pasa; el anterior también (rotación con solapamiento)", async () => {
  assert.equal(await autorizado(peticion(SECRETO), env()), true);
  assert.equal(await autorizado(peticion(ANTERIOR), env()), true);
});

test("sin secret configurado no entra nadie, ni con el valor que fuera", async () => {
  assert.equal(await autorizado(peticion(SECRETO), {}), false);
  assert.equal(await autorizado(peticion(SECRETO), { AUTH_TOKEN: undefined }), false);
});

test("el 401 es uno y genérico: mismo cuerpo para token ausente y erróneo", async () => {
  const r = noAutorizado();
  assert.equal(r.status, 401);
  assert.equal(await r.text(), "no autorizado");
  // y del token no queda rastro: la respuesta no lo menciona
  assert.ok(!(await noAutorizado().text()).includes(SECRETO.slice(4)));
});

test("la cookie de sesión: la que emite el login valida, y caduca sola", async () => {
  const cookie = await cookieDeSesion(env());
  assert.match(cookie, /^__Host-sesion=\d+\.[0-9a-f]{64}; Max-Age=\d+; Path=\/; Secure; HttpOnly; SameSite=Strict$/);
  const conCookie = new Request("https://x.dev/", { headers: { cookie } });
  assert.ok(await sesionValida(conCookie, env()));
  assert.ok(await autorizado(conCookie, env())); // vale por cookie sin Bearer
  const valor = cookie.slice(0, cookie.indexOf(";")); // solo el par nombre=valor
  const expirada = valor.replace(/\d+\./, "1000.");
  assert.ok(!(await sesionValida(new Request("https://x.dev/", { headers: { cookie: expirada } }), env())));
  const manipulada = valor.slice(0, -2) + "00"; // el MAC tocado
  assert.ok(!(await sesionValida(new Request("https://x.dev/", { headers: { cookie: manipulada } }), env())));
});

test("rotación con solapamiento: la cookie firmada con el viejo sigue viva tras rotar", async () => {
  const antes = { AUTH_TOKEN: ANTERIOR };
  const cookie = await cookieDeSesion(antes); // sesión abierta con el token de entonces
  const trasRotar = { AUTH_TOKEN: SECRETO, AUTH_TOKEN_PREVIOUS: ANTERIOR };
  const req = new Request("https://x.dev/", { headers: { cookie } });
  assert.ok(await sesionValida(req, trasRotar)); // retirar el viejo no desloguea
  assert.ok(!(await sesionValida(req, { AUTH_TOKEN: SECRETO }))); // sin el viejo ya declarado, expira
});

test("puerta: lockout por IP tras 5 fallos, y el acierto limpia el contador", async () => {
  // D1 de mentira: solo la semántica que la puerta usa (first/run del upsert)
  const mkDb = (sembradas = new Map()) => {
    const filas = sembradas;
    return {
      filas,
      prepare(sql) {
        const estado = { sql, args: [] };
        return {
          bind(...args) {
            estado.args = args;
            return this;
          },
          async first() {
            return filas.get(estado.args[0]) ?? null;
          },
          async run() {
            const ip = estado.args[0];
            if (sql.startsWith("DELETE")) filas.delete(ip);
            else {
              const prev = filas.get(ip);
              const ahora = Date.now();
              if (!prev || ahora - prev.ventana_desde > 10 * 60 * 1000) filas.set(ip, { fallos: 1, ventana_desde: ahora });
              else filas.set(ip, { fallos: prev.fallos + 1, ventana_desde: prev.ventana_desde });
            }
            return { meta: { changes: 1 } };
          },
        };
      },
    };
  };

  const db = mkDb();
  const e = { ...env(), DB: db };
  for (let i = 0; i < 4; i++) {
    const r = await puerta(peticion("mal-" + i), e);
    assert.equal(r.status, 401);
  }
  assert.equal(db.filas.get("local").fallos, 4);
  assert.equal((await puerta(peticion(SECRETO), e)), null); // acierto: pasa y limpia
  assert.ok(!db.filas.has("local"));
  db.filas.set("local", { fallos: 5, ventana_desde: Date.now() });
  const bloqueado = await puerta(peticion(SECRETO), e); // 5 fallos: ni el bueno entra
  assert.equal(bloqueado.status, 429);
  assert.equal(db.filas.get("local").fallos, 5); // no escribió: el bloqueo no infla el contador
});

test("tokenValido discrimina igual que autorizado, sin tocar cookies", async () => {
  assert.ok(await tokenValido(peticion(SECRETO), env()));
  assert.ok(!(await tokenValido(peticion(null), env())));
});
