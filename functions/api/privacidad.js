// POST /api/privacidad — el borrado del ticket 06: elimina las filas de
// feedback que llevan el hash del visitante. El hash solo lo conoce su
// navegador (UUID local), así que pedirlo es prueba suficiente a esta
// escala; sin IP, sin cookies, sin user-agent, igual que el resto.
export async function onRequestPost(context) {
  const { request, env } = context;
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return new Response("cuerpo no es JSON", { status: 400 });
  }
  const visitante = typeof cuerpo?.visitante === "string" ? cuerpo.visitante.trim() : "";
  if (!visitante || visitante.length > 100) return new Response("visitante malformado", { status: 400 });

  const r = await env.DB.prepare("DELETE FROM feedback WHERE visitante = ?").bind(visitante).run();
  return Response.json({ ok: true, borradas: r.meta.changes });
}
