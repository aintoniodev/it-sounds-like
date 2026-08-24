// Test del seam principal: el servicio de búsqueda (catálogo → índice → rank).
// Comportamiento externo con un embedder inyectado determinista; el recall
// contra el modelo real lo mide eval/recall.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crearServicio } from "../server/servicio.mjs";

const OK = new URL("./fixtures/ok", import.meta.url).pathname;
const MALO = new URL("./fixtures/malo", import.meta.url).pathname;

// embedder de mentira: vectores [dormir, fiesta, otro] — los valores
// esperados de los tests se deciden a mano, no se recalculan como el servicio
const embed = (texts) =>
  Promise.resolve(
    texts.map((t) =>
      /dormir|calma/i.test(t) ? [1, 0, 0] : /fiesta|bailar/i.test(t) ? [0, 1, 0] : [0, 0, 1],
    ),
  );

test("una ficha con el núcleo incompleto se rechaza nombrando el fichero", async () => {
  await assert.rejects(() => crearServicio({ carpeta: MALO, embed }), /2026-01-03-rota/);
});

test("el catálogo se parsea: la plantilla con `_` no cuenta, el resto sí", async () => {
  const s = await crearServicio({ carpeta: OK, embed });
  assert.equal(s.fichas.length, 2);
  assert.ok(!s.fichas.some((f) => f.slug.startsWith("_")));
  const dormir = s.fichas.find((f) => f.slug === "2026-01-01-loris-para-dormir");
  assert.equal(dormir.titulo, "Canción para dormir");
  assert.equal(dormir.artista, "Loris");
  assert.equal(dormir.fecha, "2026-01-01");
  assert.match(dormir.body, /calma azul/);
  const fiestar = s.fichas.find((f) => f.slug === "2026-01-02-sonora-para-fiestar");
  assert.equal(fiestar.spotify, "https://open.spotify.com/track/xyz");
});

test("las claves custom llegan como dimensiones: numéricas y de vocabulario", async () => {
  const s = await crearServicio({ carpeta: OK, embed });
  const dormir = s.fichas.find((f) => f.slug === "2026-01-01-loris-para-dormir");
  assert.equal(dormir.dims.energia, 2);
  assert.equal(dormir.dims.momento_del_dia, "noche");
  const dims = s.dimensiones();
  const energia = dims.numericas.find((d) => d.key === "energia");
  assert.deepEqual([energia.min, energia.max], [2, 9]);
  const momento = dims.categoricas.find((d) => d.key === "momento_del_dia");
  assert.deepEqual([...momento.valores].sort(), ["dia", "noche"]);
});

test("buscar rankea por similitud y respeta top", async () => {
  const s = await crearServicio({ carpeta: OK, embed });
  const porDormir = await s.buscar("quiero calma para dormir");
  assert.equal(porDormir[0].ficha.slug, "2026-01-01-loris-para-dormir");
  const porFiesta = await s.buscar("fiesta y bailar");
  assert.equal(porFiesta[0].ficha.slug, "2026-01-02-sonora-para-fiestar");
  assert.equal((await s.buscar("fiesta", { top: 1 })).length, 1);
});

test("los filtros por dimensión acotan el retrieve antes de rankear", async () => {
  const s = await crearServicio({ carpeta: OK, embed });
  const conTope = await s.buscar("quiero calma para dormir", { filtros: { max: { energia: 3 } } });
  assert.ok(conTope.every((r) => r.ficha.dims.energia <= 3));
  assert.equal(conTope[0].ficha.slug, "2026-01-01-loris-para-dormir");
  const enMomento = await s.buscar("fiesta", { filtros: { en: { momento_del_dia: ["noche"] } } });
  assert.equal(enMomento.length, 1);
  assert.equal(enMomento[0].ficha.slug, "2026-01-01-loris-para-dormir");
});

test("un filtro exige la dimensión: una ficha sin la clave queda fuera", async () => {
  const s = await crearServicio({ carpeta: OK, embed });
  // ninguna ficha tiene la clave "tematica": el filtro la exige y vacía el retrieve
  const sinClave = await s.buscar("dormir", { filtros: { en: { tematica: ["noche"] } } });
  assert.equal(sinClave.length, 0);
});

test("filtro mínimo numérico: energia alta se puede pedir", async () => {
  const s = await crearServicio({ carpeta: OK, embed });
  const alta = await s.buscar("dormir", { filtros: { min: { energia: 8 } } });
  assert.ok(alta.every((r) => r.ficha.dims.energia >= 8));
  assert.ok(alta.every((r) => r.ficha.slug === "2026-01-02-sonora-para-fiestar"));
});

test("claves con mayúsculas o números y valores negativos se parsean", async () => {
  const carpeta = mkdtempSync(join(tmpdir(), "isl-parser-"));
  writeFileSync(
    join(carpeta, "2026-03-01-rara.md"),
    "---\ntitulo: Rara\nartista: X\nfecha: 2026-03-01\nNivel2: alto\nenergia: -3\n---\n\nTexto libre.\n",
  );
  const s = await crearServicio({ carpeta, embed });
  const f = s.fichas[0];
  assert.equal(f.dims.Nivel2, "alto");
  assert.equal(f.dims.energia, -3);
  rmSync(carpeta, { recursive: true, force: true });
});
