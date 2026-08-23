// Test del render de caption: función pura ficha → texto pegable para
// Instagram. Los snapshots esperados se escriben a mano siguiendo la spec:
// gancho = primera frase del "Por qué", resto, Para cuando, Escucha,
// firma, link, 4 hashtags. Cero emojis.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCaption } from "../server/caption.mjs";

const completa = {
  slug: "2026-01-01-ejemplo",
  titulo: "Naima",
  artista: "John Coltrane",
  fecha: "2026-01-01",
  spotify: "https://open.spotify.com/track/naima",
  body: `## Por qué esta canción

Una bola de luz quieta. Cuando la escucho, la habitación respira más despacio. El saxo no explica nada y lo dice todo.

## Para cuándo

Escribir de noche con la lluvia fuera.

## Escucha

El piano de Tyner, amplio y suspendido, en el segundo minuto.`,
};

test("ficha completa: gancho, cuerpo, para cuando, escucha, firma, link, hashtags", () => {
  assert.deepEqual(renderCaption(completa), [
    "Una bola de luz quieta.",
    "",
    "Cuando la escucho, la habitación respira más despacio. El saxo no explica nada y lo dice todo.",
    "",
    "Para cuando: escribir de noche con la lluvia fuera.",
    "",
    "Escucha: el piano de Tyner, amplio y suspendido, en el segundo minuto.",
    "",
    "Naima — John Coltrane",
    "https://open.spotify.com/track/naima",
    "",
    "#canciondeldia #itsoundslike #naima #johncoltrane",
  ].join("\n"));
});

test("ficha sin secciones ni link: gancho del intro, sin líneas opcionales", () => {
  const minimal = {
    slug: "2026-01-02-min",
    titulo: "Algo",
    artista: "Alguien",
    fecha: "2026-01-02",
    spotify: null,
    body: "Una frase sola que dice lo importante. Y otra que sigue.",
  };
  assert.deepEqual(renderCaption(minimal), [
    "Una frase sola que dice lo importante.",
    "",
    "Y otra que sigue.",
    "",
    "Algo — Alguien",
    "",
    "#canciondeldia #itsoundslike #algo #alguien",
  ].join("\n"));
});

test("ficha con secciones pero sin link: sin línea de link", () => {
  const sinLink = {
    ...completa,
    slug: "2026-01-03-sin-link",
    spotify: null,
  };
  const caption = renderCaption(sinLink);
  assert.ok(!caption.includes("open.spotify"));
  assert.ok(caption.includes("Naima — John Coltrane"));
  assert.ok(caption.includes("Escucha:"));
});

test("cero emojis en cualquier render", () => {
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  for (const f of [completa, { ...completa, spotify: null }]) {
    assert.ok(!EMOJI.test(renderCaption(f)));
  }
});
