// Test del contrato de la ficha entrante (functions/ficha.mjs): el módulo
// puro que comparten el server local, el edge de la web pública y el
// cliente — las reglas del slug y el 400 claro viven una sola vez.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nucleoCompleto, errorDeFicha, slugDe } from "../functions/ficha.mjs";

const valida = { titulo: "Teen Age Riot", artista: "Sonic Youth", fecha: "2026-03-14" };

test("el slug es fecha-artista-cancion, minúsculas y sin acentos", () => {
  assert.equal(slugDe(valida), "2026-03-14-sonic-youth-teen-age-riot");
  assert.equal(
    slugDe({ titulo: "La Bicileta", artista: "Blondie/Parra", fecha: "2020-01-02" }),
    "2020-01-02-blondie-parra-la-bicileta",
  );
  assert.equal(
    slugDe({ titulo: "Canción — ¡ya!", artista: "Ñoño", fecha: "1999-12-31" }),
    "1999-12-31-nono-cancion-ya",
  );
});

test("el núcleo completo exige titulo, artista y fecha con valor", () => {
  assert.ok(nucleoCompleto(valida));
  assert.ok(!nucleoCompleto({ ...valida, titulo: "" }));
  assert.ok(!nucleoCompleto({ ...valida, artista: undefined }));
  assert.ok(!nucleoCompleto(undefined));
});

test("errorDeFicha: mensaje claro para el 400, null cuando todo va bien", () => {
  assert.equal(errorDeFicha(valida), null);
  assert.equal(errorDeFicha({ ...valida, titulo: "" }), "falta el núcleo: titulo, artista y fecha");
  assert.equal(errorDeFicha(undefined), "falta el núcleo: titulo, artista y fecha");
  assert.equal(errorDeFicha({ ...valida, fecha: "14/03/2026" }), "la fecha debe ir como AAAA-MM-DD");
});
