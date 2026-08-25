// El sync del CI (captura-web 03): adopta las fichas web publicadas al
// catálogo ANTES de hornear — un deploy nunca se come una ficha en camino.
// Lee fichas_web por la API de D1 (nada de bindings: esto corre en el runner,
// no en el edge), escribe el markdown en catalogo/ con el render compartido
// de functions/ficha.mjs, commitea el "commit del sync" y RECÉN ENTONCES
// retira las filas: si algo falla antes del deploy, la fusión del 02 sigue
// sirviendo la ficha desde D1 y el próximo run reintenta. Los borradores no
// se adoptan: esperan al autor. Fuera del CI (invocación manual) el commit
// no lleva [skip ci]: sin un run que hornee detrás, la ficha quedaría invisible.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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

const { results: filas } = await d1(
  "SELECT slug, titulo, artista, fecha, spotify, claves, cuerpo, editada_en FROM fichas_web WHERE estado = 'publicada' AND borrado_pedido = 0",
);
if (!filas.length) {
  console.log("sync: nada que adoptar; los borradores (si los hay) esperan al autor");
  process.exit(0);
}

// orden por editada_en: el commit del sync queda legible como la cola que era
filas.sort((a, b) => a.editada_en - b.editada_en);
const adoptadas = [];
const yaEnCatalogo = [];
for (const fila of filas) {
  const ruta = join(CATALOGO, `${fila.slug}.md`);
  if (existsSync(ruta)) {
    yaEnCatalogo.push(fila.slug);
    continue;
  }
  writeFileSync(ruta, markdownDe(fichaDeFila(fila)));
  adoptadas.push(fila.slug);
}

if (adoptadas.length) {
  // commit y push ANTES de retirar filas: si el push falla, el paso muere,
  // no hay deploy, y las filas siguen ahí para el próximo run
  const git = (cmd) => execSync(`git ${cmd}`, { cwd: RAIZ, stdio: "pipe" });
  git("add catalogo");
  git(`-c user.name="sync fichas-web" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" commit -m "sync: adopta ${adoptadas.length} ficha(s) web al catálogo${EN_CI ? " [skip ci]" : ""}"`);
  git("push");
  console.log(`sync: adoptadas y empujadas → ${adoptadas.join(", ")}`);
}
for (const slug of yaEnCatalogo) {
  // el slug ya vive en git (adopción previa cuyo borrado falló, o edición
  // local de la misma ficha): gana lo que está en catalogo/, la fila se retira
  console.log(`sync: ${slug} ya estaba en catalogo/ — retiro la fila, gana lo que está en git`);
}

// retirar las filas procesadas recién con el commit a salvo; los borradores
// nunca entraron a `filas` y sobreviven intactos
const marcas = filas.map(() => "?").join(", ");
const { meta } = await d1(`DELETE FROM fichas_web WHERE slug IN (${marcas})`, filas.map((f) => f.slug));
console.log(`sync: ${meta.changes} fila(s) retirada(s) de fichas_web; catalogo/ es la fuente de verdad`);
