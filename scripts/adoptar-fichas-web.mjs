// El sync del CI (captura-web 03/05): adopta las fichas web publicadas al
// catálogo ANTES de hornear — un deploy nunca se come una ficha en camino.
// Lee fichas_web por la API de D1 (nada de bindings: esto corre en el runner,
// no en el edge) y reconcilia con el catálogo según el reducer validado en
// prototype/fichas-desde-la-web:
//
//   publicada, sin fichero   → se adopta: markdown + commit. La FILA QUEDA:
//                              la fusión sigue sirviéndola hasta que el
//                              deploy la hornee; el próximo run la retira.
//   publicada, con fichero   → conflicto potencial: gana la edición más
//                              reciente — la de la web (editada_en) contra
//                              el último commit del fichero (git es la
//                              fuente de verdad y su historia decide).
//   con borrado pedido       → si el fichero existe: git rm + commit, la
//                              fila queda ocultando al índice viejo; si ya
//                              no existe: la fila se retira.
//   borrador                 → ni tocado: espera al autor.
//
// Retirar la fila un run después del commit es lo que cierra la ventana: el
// deploy de este run hornea el catálogo nuevo mientras la fusión tapa con la
// fila vieja — nunca hay un hueco donde nadie sirva la ficha.
// Fuera del CI (invocación manual) el commit no lleva el marcador de salto:
// sin un run que hornee detrás, la ficha quedaría invisible.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { markdownDe } from "../functions/ficha.mjs";
import { fichaDeFila } from "../functions/fichas-web.mjs";

const RAIZ = join(import.meta.dirname, "..");
const CATALOGO = join(RAIZ, "catalogo");
const EN_CI = process.env.CI === "true";

const TOKEN = process.env.CF_API_TOKEN;
const CUENTA = process.env.CF_ACCOUNT_ID;
if (!TOKEN || !CUENTA) {
  console.error("sync: faltan CF_API_TOKEN y CF_ACCOUNT_ID en el entorno");
  process.exit(1);
}
const DB = readFileSync(join(RAIZ, "wrangler.toml"), "utf8").match(/database_id = "([^"]+)"/)?.[1];
if (!DB) {
  console.error("sync: no encuentro database_id en wrangler.toml");
  process.exit(1);
}

async function d1(sql, params = []) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CUENTA}/d1/database/${DB}/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`D1: ${JSON.stringify(j.errors)}`);
  return j.result[0];
}

// el momento de la última edición LOCAL: el commit más reciente que tocó el
// fichero (ms epoch). Fichero sin historia (creado local, sin commitear):
// gana lo local — acaba de nacer en la fuente de verdad
function editadaLocalmente(ruta) {
  let ts = "";
  try {
    ts = execSync(`git log -1 --format=%ct -- ${JSON.stringify(ruta)}`, { cwd: RAIZ, stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
  } catch {}
  return ts ? Number(ts) * 1000 : Infinity;
}

const { results: filas } = await d1(
  "SELECT slug, titulo, artista, fecha, spotify, claves, cuerpo, editada_en, borrado_pedido FROM fichas_web WHERE estado = 'publicada'",
);
if (!filas.length) {
  console.log("sync: nada que hacer; los borradores (si los hay) esperan al autor");
  process.exit(0);
}

// orden por editada_en: el commit del sync queda legible como la cola que era
filas.sort((a, b) => a.editada_en - b.editada_en);
const acciones = []; // líneas del relatorio
const aCommitear = []; // ficheros escritos o borrados, para un solo commit
const retirar = []; // slugs cuya fila ya puede salir del D1

for (const fila of filas) {
  const ruta = join(CATALOGO, `${fila.slug}.md`);
  if (fila.borrado_pedido) {
    if (existsSync(ruta)) {
      rmSync(ruta);
      aCommitear.push(ruta);
      acciones.push(`borró "${fila.titulo}" del catálogo, como pidió el autor (la fila oculta hasta el próximo run)`);
    } else {
      retirar.push(fila.slug);
      acciones.push(`retiró la fila de "${fila.titulo}" (el catálogo ya no la tiene)`);
    }
    continue;
  }
  if (!existsSync(ruta)) {
    writeFileSync(ruta, markdownDe(fichaDeFila(fila)));
    aCommitear.push(ruta);
    acciones.push(`adoptó "${fila.titulo}" al catálogo (la fila tapa con la fusión hasta el deploy)`);
    continue;
  }
  const local = editadaLocalmente(ruta);
  if (fila.editada_en > local) {
    writeFileSync(ruta, markdownDe(fichaDeFila(fila)));
    aCommitear.push(ruta);
    acciones.push(`en "${fila.titulo}" ganó la edición de la web (${new Date(fila.editada_en).toISOString()})`);
  } else {
    retirar.push(fila.slug);
    acciones.push(`en "${fila.titulo}" ganó la edición local; la de la web quedó pisada`);
  }
}

if (aCommitear.length) {
  // commit y push ANTES de retirar nada: si el push falla, el paso muere sin
  // deploy y todo queda como estaba para el próximo run. El mensaje entra
  // por stdin: los títulos pueden traer comillas
  const git = (cmd, input) => execSync(`git ${cmd}`, { cwd: RAIZ, stdio: "pipe", input });
  git("add catalogo");
  const mensaje = [
    `sync: reconcilia fichas web con el catálogo${EN_CI ? " [skip ci]" : ""}`,
    "",
    ...acciones.map((a) => `el sync ${a}`),
  ].join("\n");
  git(
    `-c user.name="sync fichas-web" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" commit -F -`,
    mensaje,
  );
  git("push");
  console.log(`sync: commit con ${aCommitear.length} fichero(s) empujado`);
}

if (retirar.length) {
  const marcas = retirar.map(() => "?").join(", ");
  const { meta } = await d1(`DELETE FROM fichas_web WHERE slug IN (${marcas})`, retirar);
  console.log(`sync: ${meta.changes} fila(s) retirada(s) de fichas_web`);
}
for (const a of acciones) console.log(`sync: el sync ${a}`);
if (!acciones.length) console.log("sync: filas ya reconciliadas, nada que hacer");
