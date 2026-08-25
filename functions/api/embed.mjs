// El embed de bge-m3 del edge (captura-web): el mismo runtime contra el que
// CI hornea el índice. Devuelve null si Workers AI no responde — quien llama
// decide qué significa (guardar sin vector, publicar sin fusión): un fallo
// del embed nunca tumba la ficha.
import { MODELO } from "../rank.mjs";

export async function embedTexto(env, texto) {
  try {
    const { data } = await env.AI.run(MODELO, { text: [texto ?? ""] });
    return JSON.stringify(data[0]);
  } catch {
    return null;
  }
}
