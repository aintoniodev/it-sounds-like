// Rank público (functions/rank.mjs): cosine con filtros, sin HTTP ni bindings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankear, pasaFiltros } from "../functions/rank.mjs";

const fichas = [
  { slug: "a", titulo: "A", dims: { energia: 8, momento_del_dia: "noche" }, vector: [1, 0] },
  { slug: "b", titulo: "B", dims: { energia: 2, momento_del_dia: "mañana" }, vector: [0, 1] },
  { slug: "c", titulo: "C", dims: {}, vector: [0.6, 0.8] },
];

test("rankea por cosine aunque los vectores no estén normalizados", () => {
  const res = rankear(fichas, [2, 0]); // mismo eje que "a", sin normalizar
  assert.equal(res[0].ficha.slug, "a");
  assert.equal(res[0].score, 1);
});

test("recorta al top pedido y no devuelve vectores", () => {
  const res = rankear(fichas, [1, 1], { top: 2 });
  assert.equal(res.length, 2);
  for (const r of res) assert.equal(r.ficha.vector, undefined);
});

test("un filtro exige la dimensión: sin la clave, la ficha queda fuera", () => {
  assert.equal(pasaFiltros(fichas[0], { min: { energia: 5 } }), true);
  assert.equal(pasaFiltros(fichas[1], { min: { energia: 5 } }), false);
  assert.equal(pasaFiltros(fichas[2], { min: { energia: 5 } }), false);
  assert.equal(pasaFiltros(fichas[1], { en: { momento_del_dia: ["noche"] } }), false);
});

test("rankear respeta los filtros", () => {
  const res = rankear(fichas, [1, 1], { filtros: { en: { momento_del_dia: ["noche"] } } });
  assert.deepEqual(res.map((r) => r.ficha.slug), ["a"]);
});
