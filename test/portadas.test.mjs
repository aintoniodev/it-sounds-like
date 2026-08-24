// Test del módulo de portadas: resuelve al indexar (oEmbed de Spotify con
// link, iTunes Search sin link o con link roto), descarga la imagen y la
// cachea en disco — la segunda vez no toca la red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crearPortadas } from "../server/portadas.mjs";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function fetcherFake() {
  const llamadas = [];
  const f = async (url) => {
    llamadas.push(String(url));
    if (url.startsWith("https://open.spotify.com/oembed")) {
      if (url.includes("roto")) throw new Error("404");
      return { json: async () => ({ thumbnail_url: "https://img.example/portada.jpg" }) };
    }
    if (url.startsWith("https://itunes.apple.com/search")) {
      return { json: async () => ({ results: [{ artworkUrl100: "https://img.example/100x100bb.jpg" }] }) };
    }
    if (url.startsWith("https://img.example/600x600")) return { arrayBuffer: async () => JPEG };
    return { arrayBuffer: async () => JPEG };
  };
  return { f, llamadas };
}

const conLink = { slug: "a", titulo: "Naima", artista: "Coltrane", fecha: "2026-01-01", spotify: "https://open.spotify.com/track/bueno?si=xyz" };
const sinLink = { slug: "b", titulo: "Eres", artista: "Café Tacvba", fecha: "2026-01-02", spotify: null };
const linkRoto = { slug: "c", titulo: "Malamente", artista: "Rosalía", fecha: "2026-01-03", spotify: "https://open.spotify.com/track/roto" };

async function montar() {
  return mkdtempSync(join(tmpdir(), "isl-portadas-"));
}

test("ficha con link: oEmbed de Spotify + descarga, cacheada en disco", async (t) => {
  const dir = await montar();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { f, llamadas } = fetcherFake();
  const p = crearPortadas({ dir, fetcher: f });

  const r = await p.resolver(conLink);

  assert.ok(r.cover.startsWith("/portadas/"));
  assert.equal(r.deRed, true);
  assert.ok(llamadas.some((u) => u.startsWith("https://open.spotify.com/oembed")));
  assert.ok(llamadas.some((u) => u === "https://img.example/portada.jpg"));
  const archivo = join(dir, r.cover.replace("/portadas/", ""));
  assert.ok(existsSync(archivo));
  assert.deepEqual([...readFileSync(archivo)], [...JPEG]);
});

test("cold start con caché: ninguna petición, misma ruta", async (t) => {
  const dir = await montar();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const primero = fetcherFake();
  const p1 = crearPortadas({ dir, fetcher: primero.f });
  const r1 = await p1.resolver(conLink);

  const segundo = fetcherFake();
  const p2 = crearPortadas({ dir, fetcher: segundo.f });
  const r2 = await p2.resolver(conLink);

  assert.equal(r2.cover, r1.cover);
  assert.equal(r2.deRed, false);
  assert.equal(segundo.llamadas.length, 0);
});

test("ficha sin link: iTunes Search con titulo+artista, artwork en 600x600", async (t) => {
  const dir = await montar();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { f, llamadas } = fetcherFake();
  const p = crearPortadas({ dir, fetcher: f });

  const r = await p.resolver(sinLink);

  assert.ok(r.cover);
  const busca = llamadas.find((u) => u.startsWith("https://itunes.apple.com/search"));
  assert.ok(busca.includes(encodeURIComponent("Eres Café Tacvba")));
  assert.ok(llamadas.includes("https://img.example/600x600bb.jpg"));
});

test("link roto cae a iTunes en vez de quedarse sin portada", async (t) => {
  const dir = await montar();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { f, llamadas } = fetcherFake();
  const p = crearPortadas({ dir, fetcher: f });

  const r = await p.resolver(linkRoto);

  assert.ok(r.cover);
  assert.ok(llamadas.some((u) => u.startsWith("https://itunes.apple.com/search")));
});

test("fallo total devuelve null SIN cachear: la próxima pasada reintenta", async (t) => {
  const dir = await montar();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let roto = true;
  const llamadas = [];
  const f = async (url) => {
    llamadas.push(String(url));
    if (roto) throw new Error("sin red");
    return { json: async () => ({ results: [{ artworkUrl100: "https://img.example/100x100bb.jpg" }] }), arrayBuffer: async () => JPEG };
  };
  const p = crearPortadas({ dir, fetcher: f });

  const fallo = await p.resolver(sinLink);
  assert.equal(fallo.cover, null);

  roto = false;
  const reintento = await p.resolver(sinLink);
  assert.ok(reintento.cover);
  assert.ok(reintento.deRed);
});

test("dos fichas con el mismo link comparten resolución", async (t) => {
  const dir = await montar();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { f, llamadas } = fetcherFake();
  const p = crearPortadas({ dir, fetcher: f });

  const r1 = await p.resolver(conLink);
  const antes = llamadas.length;
  const r2 = await p.resolver({ ...conLink, slug: "otra" });

  assert.equal(r2.cover, r1.cover);
  assert.equal(llamadas.length, antes);
});
