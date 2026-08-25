// Test del contrato de la fusión (functions/fichas-web.mjs): la fila de
// fichas_web convertida a la forma exacta de una entrada del índice horneado
// — misma tarjeta, mismos filtros, sin distinguir procedencia.
import { test } from "node:test";
import assert from "node:assert/strict";
import { entradaDeFila } from "../functions/fichas-web.mjs";
import { rankear, pasaFiltros } from "../functions/rank.mjs";

const fila = {
  slug: "2026-08-25-bonobo-cercle",
  titulo: "Cercle",
  artista: "Bonobo",
  fecha: "2026-08-25",
  spotify: "https://open.spotify.com/track/abc",
  claves: JSON.stringify([
    { clave: "energia", valor: 3 },
    { clave: "momento_del_dia", valor: "madrugada" },
  ]),
  cuerpo: "Electrónica en órbita baja para bajar revoluciones.",
  vector: JSON.stringify([0.1, 0.2, 0.3]),
};

test("la fila se convierte a la forma del índice: spotify tal cual vive en D1 (trimado al insertar), vector parseado", () => {
  const e = entradaDeFila(fila);
  assert.equal(e.slug, fila.slug);
  assert.equal(e.spotify, "https://open.spotify.com/track/abc");
  assert.equal(e.body, fila.cuerpo);
  assert.deepEqual(e.vector, [0.1, 0.2, 0.3]);
  assert.equal(e.cover, null);
});

test("dims en string como el índice horneado: el número 3 llega '3'", () => {
  const e = entradaDeFila(fila);
  assert.deepEqual(e.dims, { energia: "3", momento_del_dia: "madrugada" });
  // y por tanto filtra igual que una entrada del índice
  assert.ok(pasaFiltros(e, { en: { momento_del_dia: ["madrugada"] } }));
  assert.ok(!pasaFiltros(e, { en: { momento_del_dia: ["amanecer"] } }));
});

test("spotify vacío y claves ausentes: null y dims vacías, no excepciones", () => {
  const e = entradaDeFila({ ...fila, spotify: "", claves: null });
  assert.equal(e.spotify, null);
  assert.deepEqual(e.dims, {});
});

test("la ficha web rankea junto al índice: fusión sin distinción de procedencia", () => {
  const indice = [
    { slug: "indice-a", titulo: "A", artista: "X", fecha: "2026-01-01", spotify: null, body: "otro cuerpo", dims: {}, cover: null, vector: [0, 1, 0] },
  ];
  const web = entradaDeFila(fila);
  const qvec = [0.3, 0.2, 0.9]; // más cerca de la ficha web que de la del índice
  const top = rankear([...indice, web], qvec, {});
  assert.equal(top[0].ficha.slug, web.slug);
  assert.ok(top[0].score > 0.9);
});
