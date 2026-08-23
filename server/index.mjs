// Entrada del producto (npm start): indexa el catálogo con el servicio de
// búsqueda, resuelve portadas, vigila la carpeta y sirve la web + el API.
// Todo local, sin cuentas.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { join, basename, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { crearServicio, UMBRAL } from "./servicio.mjs";
import { crearPortadas } from "./portadas.mjs";
import { crearFicha } from "./captura.mjs";
import { renderCaption } from "./caption.mjs";

const CATALOGO = fileURLToPath(new URL("../catalogo", import.meta.url));
const DIST = fileURLToPath(new URL("../web/dist", import.meta.url));
const CACHE_PORTADAS = fileURLToPath(new URL("../.cache/portadas", import.meta.url));
const PUERTO = Number(process.env.PORT ?? 3000);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const TIPOS_PORTADA = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

console.log(`indexando ${CATALOGO} (la primera vez descarga el modelo, ~120 MB)…`);
const servicio = await crearServicio({ carpeta: CATALOGO });
console.log(`${servicio.fichas.length} fichas indexadas`);

// portadas: se resuelven ahora (una vez) y se sirven en local — la búsqueda
// no toca la red. Pausa de cortesía entre peticiones la primera vez.
const portadas = crearPortadas({ dir: CACHE_PORTADAS });
let deRed = 0;
for (const ficha of servicio.fichas) {
  const r = await portadas.resolver(ficha);
  ficha.cover = r.cover;
  if (r.deRed) {
    deRed++;
    await new Promise((res) => setTimeout(res, 400));
  }
}
const conPortada = servicio.fichas.filter((f) => f.cover).length;
console.log(`portadas: ${conPortada}/${servicio.fichas.length} resueltas (${deRed} consultadas en red, el resto del caché)`);

// vigilancia del catálogo: alta, cambio o borrado de una ficha se refleja
// en la búsqueda sin reiniciar; una ficha rota se rechaza y el índice queda
// intacto. El debounce acumula en un lote: dos fichas cambiadas a la vez
// no se pierden.
let reloj;
const pendientes = new Set();
watch(CATALOGO, (_evento, nombre) => {
  if (!nombre?.endsWith(".md")) return;
  pendientes.add(nombre);
  clearTimeout(reloj);
  reloj = setTimeout(async () => {
    const lote = [...pendientes];
    pendientes.clear();
    for (const nombre of lote) {
      try {
        const r = await servicio.actualizar(join(CATALOGO, nombre));
        if (r.accion === "ignorada") continue;
        const ficha = servicio.fichas.find((f) => f.slug === r.slug);
        if (ficha) ficha.cover = (await portadas.resolver(ficha)).cover;
        console.log(`watcher: ${r.accion} — ${r.slug}`);
      } catch (e) {
        console.error(`watcher: ${e.message}`);
      }
    }
  }, 200);
});

// ficha pública para el API: todo menos el vector
function publica(f) {
  const { vector, ...resto } = f;
  return resto;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PUERTO}`);

    if (req.method === "GET" && url.pathname === "/") {
      const html = await readFile(join(DIST, "index.html"), "utf8");
      res.writeHead(200, { "content-type": MIME[".html"] });
      return res.end(html);
    }

    // estáticos del build de la web (assets con hash, fuentes)
    if (req.method === "GET" && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/"))) {
      const ruta = normalize(join(DIST, decodeURIComponent(url.pathname)));
      if (!ruta.startsWith(DIST + sep)) {
        res.writeHead(403);
        return res.end();
      }
      try {
        const bytes = await readFile(ruta);
        res.writeHead(200, { "content-type": MIME[extname(ruta).toLowerCase()] ?? "application/octet-stream", "cache-control": "immutable" });
        return res.end(bytes);
      } catch {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        return res.end("no existe");
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/portadas/")) {
      const archivo = basename(url.pathname);
      try {
        const bytes = await readFile(join(CACHE_PORTADAS, archivo));
        res.writeHead(200, { "content-type": TIPOS_PORTADA[extname(archivo).toLowerCase()] ?? "image/jpeg", "cache-control": "immutable" });
        return res.end(bytes);
      } catch {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        return res.end("sin portada");
      }
    }

    if (req.method === "POST" && url.pathname === "/api/buscar") {
      const cuerpo = await leerCuerpo(req);
      const { q, filtros, top } = JSON.parse(cuerpo);
      if (typeof q !== "string" || !q.trim()) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        return res.end("falta la consulta (q)");
      }
      const resultados = (await servicio.buscar(q, { filtros, top })).map(({ ficha, score }) => ({
        ...publica(ficha),
        score,
      }));
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ resultados, umbral: UMBRAL }));
    }

    if (req.method === "GET" && url.pathname === "/api/fichas") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ fichas: servicio.fichas.map(({ slug, titulo, artista, cover }) => ({ slug, titulo, artista, cover })) }));
    }

    if (req.method === "GET" && url.pathname === "/api/dimensiones") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(servicio.dimensiones()));
    }

    if (req.method === "GET" && url.pathname === "/api/sorpresa") {
      const ficha = servicio.fichas[Math.floor(Math.random() * servicio.fichas.length)];
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ ficha: publica(ficha) }));
    }

    if (req.method === "GET" && url.pathname === "/api/plantilla") {
      let cuerpo = "## Por qué esta canción\n\n## Para cuándo\n\n## Escucha\n";
      try {
        const raw = await readFile(join(CATALOGO, "_plantilla.md"), "utf8");
        const m = raw.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
        if (m?.[1].trim()) cuerpo = m[1].trim();
      } catch {
        // sin plantilla: las secciones sugeridas por defecto
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ cuerpo }));
    }

    if (req.method === "POST" && url.pathname === "/api/fichas") {
      const ficha = JSON.parse(await leerCuerpo(req));
      try {
        const { slug } = await crearFicha({ carpeta: CATALOGO, ficha });
        res.writeHead(201, { "content-type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ slug, caption: renderCaption(ficha) }));
      } catch (e) {
        const conflicto = /ya existe/.test(e.message);
        res.writeHead(conflicto ? 409 : 400, { "content-type": "text/plain; charset=utf-8" });
        return res.end(e.message);
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/caption/")) {
      const slug = decodeURIComponent(url.pathname.replace("/api/caption/", ""));
      const ficha = servicio.fichas.find((f) => f.slug === slug);
      if (!ficha) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        return res.end(`no encuentro la ficha: ${slug}`);
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ caption: renderCaption(publica(ficha)) }));
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("no existe");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`error: ${e.message}`);
  }
});

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (chunk) => (datos += chunk));
    req.on("end", () => resolve(datos));
    req.on("error", reject);
  });
}

server.listen(PUERTO, () => console.log(`it sounds like — http://localhost:${PUERTO}`));
