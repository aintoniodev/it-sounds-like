// Captura del autor: valida la ficha y la escribe como markdown en la
// carpeta del catálogo — la única fuente de verdad, nunca una BBDD propia.
// El watcher la indexa al instante. La validación y el slug viven en el
// módulo compartido functions/ficha.mjs (que esto no arrastre embeddings).
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { errorDeFicha, slugDe } from "../functions/ficha.mjs";

const quoted = (v) => `"${String(v).replace(/"/g, "")}"`;

export async function crearFicha({ carpeta, ficha }) {
  const error = errorDeFicha(ficha);
  if (error) throw new Error(error);

  const slug = slugDe(ficha);
  const ruta = join(carpeta, `${slug}.md`);
  if (existsSync(ruta)) throw new Error(`ya existe una ficha con ese nombre: ${slug}`);

  const meta = [
    `titulo: ${quoted(ficha.titulo)}`,
    `artista: ${quoted(ficha.artista)}`,
    `fecha: ${ficha.fecha}`,
  ];
  if (ficha.spotify?.trim()) meta.push(`spotify: ${quoted(ficha.spotify.trim())}`);
  for (const { clave, valor } of ficha.claves ?? []) {
    if (!clave.trim() || !String(valor).trim()) continue;
    const v = String(valor).trim();
    meta.push(`${clave.trim()}: ${/^-?\d+(?:[.,]\d+)?$/.test(v) ? v : quoted(v)}`);
  }

  writeFileSync(ruta, `---\n${meta.join("\n")}\n---\n\n${(ficha.cuerpo ?? "").trim()}\n`);
  return { slug, ruta };
}
