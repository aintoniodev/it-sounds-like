// Rank público (functions/rank.mjs): cosine con filtros, sin HTTP ni bindings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankear, pasaFiltros, calcularDimensiones } from "../functions/rank.mjs";

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

test("calcularDimensiones: rango de numéricas y solo categóricas filtrables", () => {
  const masiva = ["v0", "v1", "v2", "v3", "v4", "v5", "v6"].map((v, n) => ({
    slug: `m${n}`,
    titulo: "M",
    dims: { masiva: v }, // 7 valores: demasiado vocabulario para filtrar
  }));
  const d = calcularDimensiones([
    ...fichas,
    { slug: "d", titulo: "D", dims: { energia: 5, unica: "aparece-una-sola-vez" } },
    ...masiva,
  ]);
  assert.deepEqual(
    d.numericas.find((n) => n.key === "energia"),
    { key: "energia", min: 2, max: 8 },
  );
  const cats = new Set(d.categoricas.map((c) => c.key));
  assert.ok(cats.has("momento_del_dia")); // 2 valores: filtra
  assert.ok(!cats.has("unica"), "un solo valor: no sirve para filtrar");
  assert.ok(!cats.has("masiva"), "más de 6 valores: tampoco");
});
