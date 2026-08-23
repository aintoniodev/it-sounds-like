// Gate de calidad del servicio real: la suite de 19 consultas contra
// server/servicio.mjs (el seam, no una copia). recall@3 mínimo: 0.75
// (suelo medido del cuerpo completo sin prepend: 0.754).
// Uso: npm run eval (o node eval/recall.mjs)
import { crearServicio } from "../server/servicio.mjs";
import { suite } from "./suite.mjs";
import { fileURLToPath } from "node:url";

const SUELO = 0.75;
const carpeta = fileURLToPath(new URL("../catalogo", import.meta.url));

console.log(`indexando ${carpeta} (la primera vez descarga el modelo, ~120 MB)…`);
const servicio = await crearServicio({ carpeta });

let suma = 0;
const detalle = [];
for (const { q, expected } of suite) {
  const top = (await servicio.buscar(q)).map((r) => r.ficha.slug);
  const aciertos = expected.filter((e) => top.includes(e)).length;
  suma += aciertos / expected.length;
  detalle.push({ q, expected, top, ok: aciertos === expected.length });
}
const recall = suma / suite.length;

console.log(`\nrecall@3: ${recall.toFixed(3)} (suelo ${SUELO})\n`);
for (const d of detalle) {
  console.log(`  ${d.ok ? "✓" : "✗"} ${d.q}`);
  if (!d.ok) console.log(`      esperado: ${d.expected.join(" | ")}\n      top3:     ${d.top.join(" | ")}`);
}

if (recall < SUELO) {
  console.error(`\nrecall ${recall.toFixed(3)} por debajo del suelo ${SUELO}: no se puede barajar el ranking`);
  process.exit(1);
}
