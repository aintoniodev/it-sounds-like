// Feedback público (functions/feedback.mjs): la tupla que viaja a D1 y sus
// reglas de validez, sin HTTP ni base de datos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarEvento, ACCIONES, RETENCION_MS } from "../functions/feedback.mjs";

const base = {
  query: "algo tranquilo para cerrar la noche",
  ficha: "2026-08-22-brian-eno-an-ending-ascent",
  accion: "clavo",
  ts: 1770000000000,
  rank_pre_boost: 1,
  visitante: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
};

test("un evento bien formado pasa y se normaliza a la tupla exacta", () => {
  const e = validarEvento(base);
  assert.deepEqual(e, {
    query: base.query,
    ficha: base.ficha,
    accion: "clavo",
    ts: base.ts,
    rank_pre_boost: 1,
    visitante: base.visitante,
  });
});

test("rechaza lo que no es la tupla: campos de menos, de más, o mal tipados", () => {
  const casos = [
    undefined,
    {},
    { ...base, accion: "meh" },
    { ...base, accion: 3 },
    { ...base, query: "" },
    { ...base, query: 42 },
    { ...base, ficha: "" },
    { ...base, ts: "ayer" },
    { ...base, ts: Infinity },
    { ...base, visitante: "" },
    { ...base, rank_pre_boost: "primero" },
    { ...base, sorpresa: true },
  ];
  for (const c of casos) assert.equal(validarEvento(c), null, JSON.stringify(c));
});

test("rank_pre_boost es opcional (sorpréndeme no tiene rank)", () => {
  const { rank_pre_boost, ...sinRank } = base;
  assert.equal(validarEvento(sinRank).rank_pre_boost, undefined);
});

test("ACCIONES es exactamente el par de botones y la retención son 90 días", () => {
  assert.deepEqual([...ACCIONES].sort(), ["clavo", "no-encaja"]);
  assert.equal(RETENCION_MS, 90 * 24 * 60 * 60 * 1000);
});
