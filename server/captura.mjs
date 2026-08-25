// Captura del autor: valida la ficha y la escribe como markdown en la
// carpeta del catálogo — la única fuente de verdad, nunca una BBDD propia.
// El watcher la indexa al instante. La validación, el slug y el render del
// markdown viven en el módulo compartido functions/ficha.mjs (que esto no
// arrastre embeddings), serializando igual que el sync del CI.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { errorDeFicha, slugDe, markdownDe } from "../functions/ficha.mjs";

export async function crearFicha({ carpeta, ficha }) {
  const error = errorDeFicha(ficha);
  if (error) throw new Error(error);

  const slug = slugDe(ficha);
  const ruta = join(carpeta, `${slug}.md`);
  if (existsSync(ruta)) throw new Error(`ya existe una ficha con ese nombre: ${slug}`);

  writeFileSync(ruta, markdownDe(ficha));
  return { slug, ruta };
}
