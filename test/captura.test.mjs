// Test del seam de captura: el formulario escribe ficheros markdown al
// catálogo (nunca a una BBDD propia) y lo escrito es indexable al instante.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crearFicha } from "../server/captura.mjs";
import { crearServicio } from "../server/servicio.mjs";

const embed = (texts) => Promise.resolve(texts.map(() => [1, 0, 0]));

async function montar() {
  const carpeta = mkdtempSync(join(tmpdir(), "isl-captura-"));
  cpSync(new URL("./fixtures/ok", import.meta.url).pathname, carpeta, { recursive: true });
  return carpeta;
}

const fichaValida = {
  titulo: "Teen Age Riot",
  artista: "Sonic Youth",
  fecha: "2026-03-14",
  spotify: "https://open.spotify.com/track/abc",
  claves: [
    { clave: "energia", valor: "7" },
    { clave: "momento_del_dia", valor: "amanecer" },
  ],
  cuerpo: "## Por qué esta canción\n\nRuido azul para despertar lentamente.",
};

test("escribe una ficha con nombre normalizado y núcleo completo", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  const { slug } = await crearFicha({ carpeta, ficha: fichaValida });
  assert.equal(slug, "2026-03-14-sonic-youth-teen-age-riot");
  assert.ok(existsSync(join(carpeta, `${slug}.md`)));
});

test("lo escrito es indexable al instante: guardar → actualizar → encontrar", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  const s = await crearServicio({ carpeta, embed });
  const { slug, ruta } = await crearFicha({ carpeta, ficha: fichaValida });
  await s.actualizar(ruta);
  const f = s.fichas.find((x) => x.slug === slug);
  assert.ok(f, "la ficha nueva está en el índice");
  assert.equal(f.titulo, "Teen Age Riot");
  assert.equal(f.dims.energia, 7); // numérica escrita sin comillas
  assert.equal(f.dims.momento_del_dia, "amanecer");
  assert.match(f.body, /Ruido azul/);
});

test("núcleo incompleto o fecha mal escrita se rechazan sin escribir nada", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  await assert.rejects(() => crearFicha({ carpeta, ficha: { ...fichaValida, titulo: "" } }), /titulo/);
  await assert.rejects(() => crearFicha({ carpeta, ficha: { ...fichaValida, artista: "" } }), /artista/);
  await assert.rejects(
    () => crearFicha({ carpeta, ficha: { ...fichaValida, fecha: "14/03/2026" } }),
    /AAAA-MM-DD/,
  );
  assert.equal(existsSync(join(carpeta, "2026-03-14-sonic-youth-teen-age-riot.md")), false);
});

test("una ficha con el mismo nombre no se machaca: error claro", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  await crearFicha({ carpeta, ficha: fichaValida });
  await assert.rejects(
    () => crearFicha({ carpeta, ficha: fichaValida }),
    /ya existe una ficha/,
  );
});
