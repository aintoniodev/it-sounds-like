// GET /api/sorpresa — una ficha al azar del índice público (sin vector):
// quien quiere salir de su burbuja recibe algo fuera de lo obvio.
import { cargarIndice } from "./indice.mjs";

export async function onRequestGet(context) {
  const indice = await cargarIndice(context.request);
  const { vector, ...ficha } = indice[Math.floor(Math.random() * indice.length)];
  return Response.json({ ficha });
}
