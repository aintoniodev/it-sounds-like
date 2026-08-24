// Carga del índice público (index.json, asset estático del propio sitio)
// con cacheo en el edge: lo comparten /api/buscar y /api/sorpresa.
export async function cargarIndice(request) {
  const url = new URL("/index.json", request.url);
  let r = await caches.default.match(url);
  if (!r) {
    r = await fetch(url);
    if (r.ok) await caches.default.put(url, r.clone());
  }
  return r.json();
}
