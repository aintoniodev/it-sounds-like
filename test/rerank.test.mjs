// Re-ranking con shrinkage (ticket 05): la matemática como función pura,
// sin HTTP ni D1. score = cosine + α·n/(n+K)·(S̄⁺ − γ·S̄⁻), con
// wᵢ = max(0, cos(query_actual, query_pasada)) · decay(90 días) y la
// penalización negativa ponderada por wᵢ²: fuera de su contexto de query
// no actúa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rerankear, RERANK, coseno } from "../functions/rank.mjs";

const AHORA = 1787568000000; // fijo: los tests no dependen del reloj real
const DIA = 24 * 60 * 60 * 1000;
// vectores ortogonales de 2D: ejeX y ejeY son contextos de query distintos
const ejeX = [1, 0];
const ejeY = [0, 1];

const candidatos = [
  { ficha: { slug: "a" }, score: 0.6 },
  { ficha: { slug: "b" }, score: 0.55 },
  { ficha: { slug: "c" }, score: 0.5 },
];

test("señal cero: sin eventos, scores y orden intactos", () => {
  const res = rerankear(candidatos, ejeX, [], { ahora: AHORA });
  assert.deepEqual(res, candidatos);
});

test("α = 0 apaga el mecanismo: ni positivos ni negativos mueven nada", () => {
  const eventos = [
    { ficha: "b", accion: "clavo", ts: AHORA - DIA, qvec: ejeX },
    { ficha: "a", accion: "no-encaja", ts: AHORA - DIA, qvec: ejeX },
  ];
  const res = rerankear(candidatos, ejeX, eventos, { alpha: 0, ahora: AHORA });
  assert.deepEqual(res.map((r) => r.ficha.slug), ["a", "b", "c"]);
  assert.deepEqual(res.map((r) => r.score), [0.6, 0.55, 0.5]);
});

test("un clavo sube exactamente el boost; con señal repetida puede adelantar", () => {
  const uno = rerankear(candidatos, ejeX, [{ ficha: "b", accion: "clavo", ts: AHORA, qvec: ejeX }], { ahora: AHORA });
  const boost = RERANK.alpha * (1 / (1 + RERANK.K)); // n=1: shrinkage máximo
  assert.ok(Math.abs(uno.find((r) => r.ficha.slug === "b").score - (0.55 + boost)) < 1e-9, "b sube exactamente el boost");

  const veinte = rerankear(
    candidatos,
    ejeX,
    Array.from({ length: 20 }, () => ({ ficha: "b", accion: "clavo", ts: AHORA, qvec: ejeX })),
    { ahora: AHORA },
  );
  assert.equal(veinte[0].ficha.slug, "b", "20 clavos en contexto: adelanta a la del cosine");
  assert.ok(veinte[0].score < 0.55 + RERANK.alpha + 1e-9, "acotado por α");
});

test("K domina con pocos eventos y satura con muchos", () => {
  const uno = rerankear(candidatos, ejeX, [{ ficha: "c", accion: "clavo", ts: AHORA, qvec: ejeX }], { ahora: AHORA });
  const muchos = rerankear(
    candidatos,
    ejeX,
    Array.from({ length: 60 }, () => ({ ficha: "c", accion: "clavo", ts: AHORA, qvec: ejeX })),
    { ahora: AHORA },
  );
  const b1 = uno.find((r) => r.ficha.slug === "c").score - 0.5;
  const b60 = muchos.find((r) => r.ficha.slug === "c").score - 0.5;
  assert.ok(b1 < RERANK.alpha * 0.25, `con 1 evento el shrinkage frena (K=${RERANK.K}): ${b1}`);
  assert.ok(b60 > RERANK.alpha * (60 / (60 + RERANK.K)) - 1e-9, "con 60 events: boost = n/(n+K)");
  assert.ok(b1 < b60, "más señal, más boost (hasta el techo)");
  assert.ok(b60 < RERANK.alpha, "nunca supera α");
});

test("la negativa solo actúa dentro de su contexto de query", () => {
  const eventos = [{ ficha: "a", accion: "no-encaja", ts: AHORA, qvec: ejeY }]; // contexto distinto
  const fuera = rerankear(candidatos, ejeX, eventos, { ahora: AHORA });
  assert.equal(fuera.find((r) => r.ficha.slug === "a").score, 0.6, "w≈0 ⇒ w²≈0: sin penalización");

  const unoDentro = rerankear(
    candidatos,
    ejeX,
    [{ ficha: "a", accion: "no-encaja", ts: AHORA, qvec: ejeX }],
    { ahora: AHORA },
  );
  const pena = unoDentro.find((r) => r.ficha.slug === "a").score;
  const esperada = 0.6 - RERANK.gamma * (1 / (1 + RERANK.K)) * RERANK.alpha;
  assert.ok(Math.abs(pena - esperada) < 1e-9, `mismo contexto: penaliza con γ=${RERANK.gamma}`);

  const diezDentro = rerankear(
    candidatos,
    ejeX,
    Array.from({ length: 10 }, () => ({ ficha: "a", accion: "no-encaja", ts: AHORA, qvec: ejeX })),
    { ahora: AHORA },
  );
  assert.notEqual(diezDentro[0].ficha.slug, "a", "señal negativa repetida: baja del primer puesto");
});

test("γ > 1: la negativa pesa más que el positivo simétrico", () => {
  const clavo = rerankear(candidatos, ejeX, [{ ficha: "c", accion: "clavo", ts: AHORA, qvec: ejeX }], { ahora: AHORA });
  const noEncaja = rerankear(candidatos, ejeX, [{ ficha: "c", accion: "no-encaja", ts: AHORA, qvec: ejeX }], { ahora: AHORA });
  const subida = clavo.find((r) => r.ficha.slug === "c").score - 0.5;
  const bajada = 0.5 - noEncaja.find((r) => r.ficha.slug === "c").score;
  assert.ok(bajada > subida, "β = α·γ > α");
});

test("decay de 90 días: el evento viejo pesa menos y el caducado nada", () => {
  const mitad = rerankear(
    candidatos,
    ejeX,
    [{ ficha: "c", accion: "clavo", ts: AHORA - 45 * DIA, qvec: ejeX }],
    { ahora: AHORA },
  );
  const m = mitad.find((r) => r.ficha.slug === "c").score - 0.5;
  assert.ok(Math.abs(m - RERANK.alpha * (1 / (1 + RERANK.K)) * 0.5) < 1e-9, "45 días: mitad de peso");

  const caducado = rerankear(
    candidatos,
    ejeX,
    [{ ficha: "c", accion: "clavo", ts: AHORA - 91 * DIA, qvec: ejeX }],
    { ahora: AHORA },
  );
  assert.equal(caducado.find((r) => r.ficha.slug === "c").score, 0.5, "91 días: cero");
});

test("eventos sin qvec (legados) se ignoran sin romper nada", () => {
  const res = rerankear(candidatos, ejeX, [{ ficha: "b", accion: "clavo", ts: AHORA }], { ahora: AHORA });
  assert.deepEqual(res, candidatos);
});

test("coseno clampado: similitud negativa cuenta como cero, no resta", () => {
  // ejeY invertido tiene cos = -1 con ejeX: w = 0, no un peso negativo
  const res = rerankear(
    candidatos,
    ejeX,
    [{ ficha: "b", accion: "clavo", ts: AHORA, qvec: [-1, 0] }],
    { ahora: AHORA },
  );
  assert.equal(res.find((r) => r.ficha.slug === "b").score, 0.55);
});

test("RERANK expone la config viva: α, γ>1, K", () => {
  assert.ok(RERANK.alpha > 0 && RERANK.alpha <= 0.15, "α acotado al rango del cosine");
  assert.ok(RERANK.gamma > 1);
  assert.ok(RERANK.K >= 3);
});
