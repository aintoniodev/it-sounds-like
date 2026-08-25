// Test de la validación de tipos del POST de captura (functions/api/captura.js):
// el núcleo lo valida el módulo compartido (ficha.test.mjs); esto frena las
// formas de JSON inesperadas en lo opcional antes de tocar la base. Y el
// handler entero corre una vez contra un env de mentira: caza variables
// huérfanas y demás basura de refactor que ni node --check ni los types ven
// (nació de un ReferenceError real en producción: un fix quitó la definición
// y dejó el uso).
import { test } from "node:test";
import assert from "node:assert/strict";
import { errorDeTipos, onRequestPost } from "../functions/api/captura.js";

const SECRETO = "tok-" + "a".repeat(40);

const envDeMentira = () => ({
  AUTH_TOKEN: SECRETO,
  DB: {
    prepare(sql) {
      const args = [];
      return {
        bind(...a) {
          args.push(...a);
          return this;
        },
        async first() {
          return undefined;
        }, // sin duplicados
        async all() {
          return { results: [] };
        },
        async run() {
          return { meta: { changes: 1 } };
        },
      };
    },
  },
  AI: { async run() {
    return { data: [[0.1, 0.2]] };
  } },
});

const valida = { titulo: "Teen Age Riot", artista: "Sonic Youth", fecha: "2026-03-14" };

test("la ficha del tracer y las del formulario completo del 04 pasan limpias", () => {
  assert.equal(errorDeTipos(valida), null);
  assert.equal(errorDeTipos({ ...valida, cuerpo: "## Por qué esta canción" }), null);
  assert.equal(
    errorDeTipos({ ...valida, spotify: "https://open.spotify.com/track/abc", claves: [{ clave: "energia", valor: 3 }] }),
    null,
  );
});

test("tipos inesperados en lo opcional: mensaje claro, no excepción", () => {
  assert.match(errorDeTipos({ ...valida, spotify: 42 }), /spotify/);
  assert.match(errorDeTipos({ ...valida, cuerpo: { texto: "no" } }), /cuerpo/);
  assert.match(errorDeTipos({ ...valida, claves: "energia=baja" }), /claves/);
  assert.match(errorDeTipos({ ...valida, claves: [{ clave: "energia" }] }), /claves/);
});

test("el ciclo borrador/publicada: solo esos dos estados entran (04)", () => {
  assert.equal(errorDeTipos({ ...valida, estado: "borrador" }), null);
  assert.equal(errorDeTipos({ ...valida, estado: "publicada" }), null);
  assert.match(errorDeTipos({ ...valida, estado: "perdida" }), /estado/);
});

test("el POST entero llega a 201 sin excepciones del handler (borrador y publicada)", async () => {
  for (const estado of ["borrador", "publicada"]) {
    const request = new Request("https://it-sounds-like.pages.dev/api/captura", {
      method: "POST",
      headers: { authorization: `Bearer ${SECRETO}`, "content-type": "application/json" },
      body: JSON.stringify({ titulo: "Smoke", artista: "Test", fecha: "2026-08-25", estado, cuerpo: "cuerpo" }),
    });
    const espera = [];
    const r = await onRequestPost({ request, env: envDeMentira(), waitUntil: (p) => espera.push(p) });
    assert.equal(r.status, 201, `estado=${estado}: ${await r.text()}`);
    await Promise.allSettled(espera); // el publicar en diferido tampoco revienta
  }
});
