// Entrada del producto (npm start): indexa el catálogo con el servicio de
// búsqueda y sirve la web + el API. Todo local, sin cuentas.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crearServicio } from "./servicio.mjs";

const CATALOGO = fileURLToPath(new URL("../catalogo", import.meta.url));
const WEB = fileURLToPath(new URL("../web/index.html", import.meta.url));
const PUERTO = Number(process.env.PORT ?? 3000);

console.log(`indexando ${CATALOGO} (la primera vez descarga el modelo, ~120 MB)…`);
const servicio = await crearServicio({ carpeta: CATALOGO });
console.log(`${servicio.fichas.length} fichas indexadas`);

// vigilancia del catálogo: alta, cambio o borrado de una ficha se refleja
// en la búsqueda sin reiniciar; una ficha rota se rechaza y el índice queda intacto
let reloj;
watch(CATALOGO, (_evento, nombre) => {
  if (!nombre?.endsWith(".md")) return;
  clearTimeout(reloj);
  reloj = setTimeout(async () => {
    try {
      const r = await servicio.actualizar(join(CATALOGO, nombre));
      if (r.accion !== "ignorada") console.log(`watcher: ${r.accion} — ${r.slug}`);
    } catch (e) {
      console.error(`watcher: ${e.message}`);
    }
  }, 200);
});

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(await readFile(WEB, "utf8"));
    }
    if (req.method === "POST" && req.url === "/api/buscar") {
      const cuerpo = await leerCuerpo(req);
      const { q, filtros, top } = JSON.parse(cuerpo);
      if (typeof q !== "string" || !q.trim()) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        return res.end("falta la consulta (q)");
      }
      const resultados = (await servicio.buscar(q, { filtros, top })).map(({ ficha, score }) => {
        const { vector, ...publica } = ficha;
        return { ...publica, score };
      });
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ resultados }));
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
