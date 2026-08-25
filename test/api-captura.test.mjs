// Test de la validación de tipos del POST de captura (functions/api/captura.js):
// el núcleo lo valida el módulo compartido (ficha.test.mjs); esto frena las
// formas de JSON inesperadas en lo opcional antes de tocar la base.
import { test } from "node:test";
import assert from "node:assert/strict";
import { errorDeTipos } from "../functions/api/captura.js";

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
