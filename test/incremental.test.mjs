// Test del seam incremental: actualizar(ruta) procesa UNA ficha (alta,
// cambio, borrado) sin re-embedear el catálogo entero ni el vector cuando
// el cuerpo no cambió.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, rmSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crearServicio } from "../server/servicio.mjs";

let llamadas = 0;
const embed = (texts) => {
  llamadas += texts.length;
  return Promise.resolve(
    texts.map((t) =>
      /dormir|calma/i.test(t) ? [1, 0, 0] : /fiesta|bailar/i.test(t) ? [0, 1, 0] : [0, 0, 1],
    ),
  );
};

async function montar() {
  const carpeta = mkdtempSync(join(tmpdir(), "isl-watcher-"));
  cpSync(new URL("./fixtures/ok", import.meta.url).pathname, carpeta, { recursive: true });
  return carpeta;
}

test("una ficha nueva entra al índice embedeando solo esa ficha", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  const s = await crearServicio({ carpeta, embed });
  const antes = llamadas;

  writeFileSync(
    join(carpeta, "2026-02-01-nueva-calma.md"),
    '---\ntitulo: "Otra calma"\nartista: Prueba\nfecha: 2026-02-01\nenergia: 1\n---\n\nPara dormir un rato largo.\n',
  );
  const r = await s.actualizar(join(carpeta, "2026-02-01-nueva-calma.md"));

  assert.equal(r.accion, "creada");
  assert.equal(llamadas, antes + 1);
  assert.equal(s.fichas.length, 3);
  const top = await s.buscar("quiero calma para dormir", { top: 3 });
  assert.ok(top.some((x) => x.ficha.slug === "2026-02-01-nueva-calma"));
});

test("editar solo el front-matter reutiliza el vector; editar el cuerpo re-embedea", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  const s = await crearServicio({ carpeta, embed });
  const ficha = join(carpeta, "2026-01-01-loris-para-dormir.md");
  const original = readFileSync(ficha, "utf8");

  // solo front-matter: sube la energia, cuerpo intacto
  writeFileSync(ficha, original.replace("energia: 2", "energia: 5"));
  const rMeta = await s.actualizar(ficha);
  assert.equal(rMeta.accion, "meta");
  assert.equal(s.fichas.find((f) => f.slug === "2026-01-01-loris-para-dormir").dims.energia, 5);

  // cuerpo nuevo: re-embed
  const antes = llamadas;
  writeFileSync(ficha, original.replace("Una calma azul para dormirse sin resistencia.", "Una tormenta eléctrica para bailar."));
  const rCuerpo = await s.actualizar(ficha);
  assert.equal(rCuerpo.accion, "re-embedeada");
  assert.equal(llamadas, antes + 1);
  const resultados = await s.buscar("quiero bailar", { top: 3 });
  const loris = resultados.find((x) => x.ficha.slug === "2026-01-01-loris-para-dormir");
  assert.equal(loris.score, 1); // el vector nuevo ya apunta a bailar, no a dormir
});

test("borrar la ficha la saca del índice", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  const s = await crearServicio({ carpeta, embed });
  const ficha = join(carpeta, "2026-01-02-sonora-para-fiestar.md");
  unlinkSync(ficha);
  const r = await s.actualizar(ficha);
  assert.equal(r.accion, "borrada");
  assert.equal(s.fichas.length, 1);
  assert.ok(!(await s.buscar("fiesta")).some((x) => x.ficha.slug === "2026-01-02-sonora-para-fiestar"));
});

test("una ficha rota en caliente se rechaza nombrándola y el índice queda intacto", async (t) => {
  const carpeta = await montar();
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  const s = await crearServicio({ carpeta, embed });
  const ficha = join(carpeta, "2026-01-01-loris-para-dormir.md");
  const original = readFileSync(ficha, "utf8");
  writeFileSync(ficha, original.replace("artista: Loris", 'artista: ""'));

  await assert.rejects(() => s.actualizar(ficha), /2026-01-01-loris-para-dormir/);
  assert.equal(s.fichas.length, 2);
  const top = await s.buscar("quiero calma para dormir");
  assert.equal(top[0].ficha.slug, "2026-01-01-loris-para-dormir");
  assert.equal(top[0].ficha.artista, "Loris");
});
