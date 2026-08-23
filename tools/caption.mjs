// PROTOTIPO DESECHABLE (ticket 06): renderiza una ficha del catálogo
// a un caption listo para pegar en Instagram.
// Uso: node tools/caption.mjs <slug> [slug...]
// El slug es el nombre del fichero en catalogo/ sin .md.
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");

function parseFicha(slug, raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_ñ]+):\s*(.*)$/);
    if (kv && kv[2] !== '""') meta[kv[1]] = kv[2].replace(/^"|"$/g, "").replace(/\s*#.*$/, "").trim();
  }
  const secs = {};
  const order = [];
  const body = m[2].trim();
  let intro = [];
  for (const block of body.split(/(?=^##\s)/m)) {
    const h = block.match(/^##\s+(.+)$/m);
    if (h) {
      const key = h[1].trim();
      secs[key] = block.replace(/^##\s+.*$/m, "").trim();
      order.push(key);
    } else if (block.trim()) intro.push(block.trim());
  }
  return { slug, meta, intro: intro.join("\n").trim(), secs, order };
}

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const hashtags = (f) => {
  const tag = (s) => "#" + s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return ["#canciondeldia", "#itsoundslike", tag(f.meta.titulo), tag(f.meta.artista)].join(" ");
};

function render(f) {
  const L = [];
  const porque = f.secs["Por qué esta canción"] || f.intro;
  const paraCuando = f.secs["Para cuándo"];
  const escucha = f.secs["Escucha"];

  // gancho: la primera frase del "por qué"
  const primeraFrase = porque.match(/^[^.!?]+[.!?]/)?.[0] ?? porque;
  L.push(primeraFrase);
  L.push("");
  if (porque.length > primeraFrase.length) L.push(porque.slice(primeraFrase.length).trim(), "");
  if (paraCuando) L.push(`Para cuando: ${lower(paraCuando)}`, "");
  if (escucha) L.push(`🎧 Escucha: ${lower(escucha)}`, "");
  L.push(`${f.meta.titulo} — ${f.meta.artista}`);
  if (f.meta.spotify) L.push(String(f.meta.spotify).replace(/^"|"$/g, ""));
  L.push("");
  L.push(hashtags(f));
  return L.join("\n");
}

const slugs = process.argv.slice(2);
const disponibles = new Map(
  readdirSync(CATALOGO).filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => [basename(f, ".md"), f]),
);

for (const slug of slugs) {
  if (!disponibles.has(slug)) {
    console.error(`no encuentro la ficha: ${slug}`);
    process.exit(1);
  }
  const f = parseFicha(slug, readFileSync(join(CATALOGO, disponibles.get(slug)), "utf8"));
  console.log(`─────── ${slug} ───────`);
  console.log(render(f));
  console.log();
}
