// El cuerpo JSON de un POST, o Response 400 si no lo es: lo comparten
// /api/buscar, /api/feedback y /api/privacidad.
export async function leerCuerpo(request) {
  try {
    return { cuerpo: await request.json() };
  } catch {
    return { error: new Response("cuerpo no es JSON", { status: 400 }) };
  }
}
