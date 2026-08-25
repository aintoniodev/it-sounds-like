// Test de la puerta del autor (functions/auth.mjs): Bearer sobre el token
// secreto de Pages, comparación timing-safe de digests SHA-256 y el 401
// genérico. Corre en Node (el XOR constante cubre lo que en Workers hace
// crypto.subtle.timingSafeEqual); las reglas son las mismas en el edge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { autorizado, noAutorizado } from "../functions/auth.mjs";

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
