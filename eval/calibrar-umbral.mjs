// Calibración del umbral de honestidad para el sitio público (ticket 02 de
// publicación): mismo método que la v1 (server/servicio.mjs) — el top-1 de
// las consultas reales de la suite debe quedar por encima del umbral y el de
// las consultas fuera de tema, por debajo — pero en el espacio de bge-m3 de
// Workers AI, que es el runtime real del edge. El umbral resultante vive en
// functions/rank.mjs; este script es la evidencia ejecutable.
// Requiere CF_API_TOKEN y CF_ACCOUNT_ID en el entorno.
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { suite } from "./suite.mjs";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");
const BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`;

// fuera de tema: mismas consultas que motivaron el umbral de la v1
// (recetas, saludos) más variantes cotidianas claramente ajenas al catálogo
const FUERA_DE_TEMA = [
  "receta de tortilla de patatas",
  "hola hola",
  "cómo cambiar la rueda de una bici",
  "previsión del tiempo para mañana",
  "cómo pedir cita en el dentista",
  "declarar la renta paso a paso",
  "cómo desatascar un fregadero",
];

async function embed(texts) {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ text: texts }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`Workers AI: ${JSON.stringify(j.errors)}`);
  return j.result.data;
}

const fichas = readdirSync(CATALOGO)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .map((f) => {
    const raw = readFileSync(join(CATALOGO, f), "utf8");
    return { slug: basename(f, ".md"), body: raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)[2].trim() };
  });

const pasajes = await embed(fichas.map((f) => f.body));
const reales = await embed(suite.map((s) => s.q));
const fuera = await embed(FUERA_DE_TEMA);

const coseno = (a, b) => {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

const top1 = (q) => Math.max(...pasajes.map((v) => coseno(v, q)));
const scores = (vecs) => vecs.map(top1).sort((a, b) => b - a);

console.log(`fichas: ${fichas.length}, consultas reales: ${suite.length}, fuera de tema: ${FUERA_DE_TEMA.length}\n`);
console.log("consultas reales (top-1, descendente):");
suite.forEach((s, i) => console.log(`  ${top1(reales[i]).toFixed(3)}  ${s.q}`));
console.log("\nfuera de tema (top-1, descendente):");
FUERA_DE_TEMA.forEach((q, i) => console.log(`  ${top1(fuera[i]).toFixed(3)}  ${q}`));

const peorReal = Math.min(...reales.map(top1));
const mejorFuera = Math.max(...fuera.map(top1));
console.log(`\npeor top-1 real: ${peorReal.toFixed(3)} · mejor top-1 fuera de tema: ${mejorFuera.toFixed(3)}`);
if (peorReal <= mejorFuera) {
  console.log("⚠ las distribuciones se solapan: no hay umbral limpio, decidir con criterio");
} else {
  console.log(`umbral propuesto (punto medio): ${((peorReal + mejorFuera) / 2).toFixed(3)}`);
}
