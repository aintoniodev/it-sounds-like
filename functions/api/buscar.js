// POST /api/buscar — el edge de la web pública. Recibe {q, filtros, top},
// embedea la query con bge-m3 en el mismo runtime contra el que CI embebeó
// el índice, y devuelve el ranking con las fichas (sin vectores) y su score.
// El índice viaja como asset estático junto al sitio; se cachea en el edge.
import { rankear, UMBRAL } from "../rank.mjs";
import { cargarIndice } from "./indice.mjs";

const MODELO = "@cf/baai/bge-m3";

export async function onRequestPost(context) {
  const { request, env } = context;
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return new Response("cuerpo no es JSON", { status: 400 });
  }
  const q = typeof cuerpo?.q === "string" ? cuerpo.q.trim() : "";
  if (!q) return new Response("falta la query", { status: 400 });

  const [{ data: qvecs }, indice] = await Promise.all([
    env.AI.run(MODELO, { text: [q] }),
    cargarIndice(request),
  ]);

  const resultados = rankear(indice, qvecs[0], {
    filtros: cuerpo.filtros ?? {},
    top: Math.min(10, Math.max(1, cuerpo.top ?? 3)),
  }).map(({ ficha, score }) => ({ ...ficha, score }));
  return Response.json({ resultados, umbral: UMBRAL });
}