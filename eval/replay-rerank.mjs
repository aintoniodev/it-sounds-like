// Replay del re-ranking con feedback sintético (ticket 05): la suite de
// eval/ contra el mismo pipeline del edge (cosine bge-m3 + shrinkage de
// functions/rank.mjs), con y sin feedback. El feedback sintético es el
// ground truth de la suite: cada ficha esperada marcada como clavo bajo su
// propia consulta. Requiere CF_API_TOKEN y CF_ACCOUNT_ID.
import { readdirSync, readFileSync, appendFileSync } from "node:fs";
import { join, basename } from "node:path";
import { suite } from "./suite.mjs";
import { rankear, rerankear } from "../functions/rank.mjs";
import { embed } from "./embed.mjs";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");

const fichas = readdirSync(CATALOGO)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .map((f) => {
    const raw = readFileSync(join(CATALOGO, f), "utf8");
    return { slug: basename(f, ".md"), body: raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)[2].trim() };
  });

console.log(`fichas: ${fichas.length}, consultas: ${suite.length}`);
const pasajes = await embed(fichas.map((f) => f.body));
const queries = await embed(suite.map((s) => s.q));
const indice = fichas.map((f, i) => ({ slug: f.slug, body: f.body, vector: pasajes[i] }));
const ts = Date.now();

const top3 = (qvec, eventos) =>
  rerankear(rankear(indice, qvec, { top: indice.length }), qvec, eventos)
    .slice(0, 3)
    .map((r) => r.ficha.slug);

const sinFeedback = suite.map((s, i) => top3(queries[i], []));
const eventos = suite.flatMap((s, i) =>
  s.expected.map((ficha) => ({ ficha, accion: "clavo", ts, qvec: queries[i] })),
);
const conFeedback = suite.map((s, i) => top3(queries[i], eventos));

const recall = (tops) =>
  suite.reduce((suma, s, i) => suma + s.expected.filter((e) => tops[i].includes(e)).length / s.expected.length, 0) / suite.length;

const rBase = recall(sinFeedback);
const rFb = recall(conFeedback);
const suben = suite
  .map((s, i) => {
    const ganados = s.expected.filter((e) => conFeedback[i].includes(e) && !sinFeedback[i].includes(e));
    return ganados.length ? `  ↑ ${s.q} → entra ${ganados.join(", ")}` : null;
  })
  .filter(Boolean);

console.log(`\nrecall@3 sin feedback: ${rBase.toFixed(3)}`);
console.log(`recall@3 con feedback de la suite: ${rFb.toFixed(3)}`);
console.log(suben.join("\n") || "  (ningún acierto marcado entró al top 3)");
if (rFb < rBase) {
  console.log("⚠ el feedback BAJÓ el recall: el mecanismo está mal calibrado");
  process.exit(1);
}
if (rFb === rBase) {
  console.log("⚠ el feedback marcado no subió ningún acierto: α no mueve nada con este catálogo");
  process.exit(1);
}
console.log(`✓ el feedback marcado sube el recall (+${(rFb - rBase).toFixed(3)})`);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### re-ranking con feedback (bge-m3)\n\n- recall@3 en frío (suelo público): **${rBase.toFixed(3)}**\n- recall@3 con feedback de la suite: **${rFb.toFixed(3)}** (+${(rFb - rBase).toFixed(3)})\n- el paso falla si el feedback baja el recall o no mueve nada\n`,
  );
}
