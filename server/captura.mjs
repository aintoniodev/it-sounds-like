// Captura del autor: valida la ficha y la escribe como markdown en la
// carpeta del catálogo — la única fuente de verdad, nunca una BBDD propia.
// El watcher la indexa al instante.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// nombre de fichero: AAAA-MM-DD-artista-cancion, minúsculas, sin acentos
export function slugDe(ficha) {
  const norm = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${ficha.fecha}-${norm(ficha.artista)}-${norm(ficha.titulo)}`;
}

const quoted = (v) => `"${String(v).replace(/"/g, "")}"`;

export async function crearFicha({ carpeta, ficha }) {
  const faltan = ["titulo", "artista", "fecha"].filter((k) => !String(ficha[k] ?? "").trim());
  if (faltan.length) throw new Error(`falta el núcleo: ${faltan.join(", ")}`);
  if (!FECHA.test(ficha.fecha)) throw new Error("la fecha debe ir como AAAA-MM-DD");

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
