// CLI de caption: renderiza una ficha del catálogo a un caption listo para
// pegar en Instagram. Uso: node tools/caption.mjs <slug> [slug...]
// El render vive en server/caption.mjs (misma función que el botón de la UI).
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { parseFicha } from "../server/servicio.mjs";
import { renderCaption } from "../server/caption.mjs";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");
const slugs = process.argv.slice(2);
const disponibles = new Map(
  readdirSync(CATALOGO)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => [basename(f, ".md"), f]),
);

for (const slug of slugs) {
  if (!disponibles.has(slug)) {
    console.error(`no encuentro la ficha: ${slug}`);
    process.exit(1);
  }
  const ficha = parseFicha(slug, readFileSync(join(CATALOGO, disponibles.get(slug)), "utf8"));
  console.log(`─────── ${slug} ───────`);
  console.log(renderCaption(ficha));
  console.log();
}
