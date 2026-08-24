// Pasada DEFINITIVA de la suite (ticket 04/05 del mapa de publicación):
// la misma suite de eval/, pero fichas y queries embedeadas contra Workers AI
// (@cf/baai/bge-m3, sin prefijos), que es el runtime real del sitio público.
// Estrategia decidida en el mapa v1: un embedding por ficha del cuerpo
// completo, sin prepend. El suelo a comparar es el recall@3 de e5-small: 0.754.
// Requiere CF_API_TOKEN y CF_ACCOUNT_ID en el entorno.
import { readdirSync, readFileSync, appendFileSync } from "node:fs";
import { join, basename } from "node:path";
import { suite } from "./suite.mjs";
import { embed } from "./embed.mjs";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");
const SUELO = 0.754;

const fichas = readdirSync(CATALOGO)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .map((f) => {
    const raw = readFileSync(join(CATALOGO, f), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    return { slug: basename(f, ".md"), body: m[2].trim() };
  });

console.log(`fichas: ${fichas.length}, consultas: ${suite.length}, modelo: @cf/baai/bge-m3 (Workers AI)`);

const pasajes = await embed(fichas.map((f) => f.body)); // sin prefijos (bge-m3)
const queries = await embed(suite.map((s) => s.q));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

let total = 0;
const detalle = [];
suite.forEach((s, qi) => {
  const top3 = pasajes
    .map((v, i) => [fichas[i].slug, dot(v, queries[qi])])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([slug]) => slug);
  const hits = s.expected.filter((e) => top3.includes(e)).length;
  total += hits / s.expected.length;
  detalle.push(`  ${hits ? "✓" : "✗"} ${s.q} → ${top3.join(" | ")}`);
});
const recall = total / suite.length;

console.log(`\nrecall@3 contra Workers AI: ${recall.toFixed(3)} (suelo e5-small: ${SUELO})`);
console.log(detalle.join("\n"));
if (recall < SUELO) {
  console.log("\n⚠ por debajo del suelo: la decisión de modelo público es del usuario (aceptar, híbrido, o e5-small en cliente). No rompo el deploy.");
}

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### suite eval/ contra Workers AI (bge-m3)\n\n- recall@3: **${recall.toFixed(3)}** (suelo e5-small: ${SUELO})\n- ${recall >= SUELO ? "supera el suelo" : "por debajo del suelo — decisión pendiente del usuario"}\n`,
  );
}
