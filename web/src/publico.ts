// El sitio público: el Escenario de la v1 como cliente fino. Sin modelo en
// el navegador — la query viaja a /api/buscar y el edge la embedea con
// bge-m3 sobre el índice que el CI genera contra el mismo runtime. El
// catálogo ligero (sin vectores) pinta la sala; el rank vive en el edge.
// Referencia visual: el prototipo validado del ticket 06 (mapa de
// publicación). Los botones de feedback son el stub del prototipo: el
// cableado al Worker + D1 llega con su ticket.
import * as THREE from "three";

type FichaLigera = { slug: string; titulo: string; artista: string; cover: string | null };
type Ficha = FichaLigera & {
  fecha: string;
  spotify: string | null;
  body: string;
  dims: Record<string, string | number>;
  score?: number;
};
type DimInfo = {
  numericas: { key: string; min: number; max: number }[];
  categoricas: { key: string; valores: string[] }[];
};
type Filtros = { min: Record<string, number>; max: Record<string, number>; en: Record<string, string[]> };

const css = `
@font-face {
  font-family: "Departure Mono";
  src: url("/fonts/DepartureMono-Regular.woff2") format("woff2");
  font-display: swap;
}
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { font-family: "Departure Mono", ui-monospace, monospace; background: #0d0b09; color: #efe9df; }
button { font: inherit; cursor: pointer; }
a { color: inherit; }

.escenario { position: fixed; inset: 0; overflow: hidden; }
.escenario canvas { position: absolute; inset: 0; }
.tapa { position: absolute; inset: 0; display: grid; place-items: start center; padding-top: 5vh; z-index: 2; }
.tapa form { display: flex; gap: 8px; align-items: center; width: min(760px, 90vw); }
.tapa input {
  flex: 1; font: inherit; font-size: 18px; text-align: center;
  background: rgba(239,233,223,.08); border: 1px solid rgba(239,233,223,.25);
  border-radius: 999px; padding: 12px 22px; color: inherit; outline: none; backdrop-filter: blur(6px);
}
.tapa input::placeholder { color: rgba(239,233,223,.4); }
.tapa .sorprendeme {
  background: rgba(239,233,223,.08); border: 1px solid rgba(239,233,223,.25);
  border-radius: 999px; color: inherit; padding: 10px 16px; font-size: 14px;
}
.tapa .sorprendeme:hover { background: rgba(239,233,223,.18); }
.estado { position: absolute; top: 12px; right: 16px; z-index: 2; font-size: 12px; opacity: .7; }
.aviso {
  position: absolute; left: 50%; top: 22vh; transform: translateX(-50%); z-index: 2;
  background: rgba(13,11,9,.82); border: 1px solid rgba(239,233,223,.2); border-radius: 8px;
  padding: 14px 22px; backdrop-filter: blur(8px); display: none;
}
.lista { position: absolute; left: 24px; bottom: 24px; z-index: 2; font-size: 13px; display: grid; gap: 8px; max-width: 380px; }
.resu { background: rgba(13,11,9,.65); border: 1px solid rgba(239,233,223,.2); border-radius: 8px; padding: 8px 12px; }
.resu .titulo { display: block; text-align: left; background: transparent; border: none; color: inherit; margin-bottom: 6px; }
.resu .titulo:hover { color: #e8b17d; }
.resu .score { opacity: .55; margin-left: 8px; }
.resu .fb { display: flex; gap: 8px; }
.resu .fb button {
  font: inherit; font-size: 11px; background: transparent; color: inherit;
  border: 1px solid rgba(239,233,223,.3); border-radius: 999px; padding: 2px 10px;
}
.resu .fb button:hover { background: rgba(239,233,223,.14); }
.resu .fb button[aria-pressed="true"] { background: #b3541e; border-color: transparent; }

.filtros-btn {
  position: absolute; top: 12px; left: 16px; z-index: 3;
  background: rgba(13,11,9,.65); border: 1px solid rgba(239,233,223,.25); border-radius: 6px;
  color: inherit; padding: 8px 12px; font-size: 13px;
}
.filtros {
  position: absolute; top: 52px; left: 16px; z-index: 3; width: 260px;
  background: rgba(13,11,9,.85); border: 1px solid rgba(239,233,223,.2); border-radius: 10px;
  padding: 14px 16px; font-size: 13px; display: none; max-height: 70vh; overflow: auto;
  backdrop-filter: blur(8px);
}
.filtros.abierto { display: block; }
.filtros h4 { margin: 12px 0 6px; font-weight: 400; opacity: .7; letter-spacing: .08em; }
.filtros h4:first-child { margin-top: 0; }
.filtros .rango { display: grid; gap: 2px; margin-bottom: 6px; }
.filtros .rango label { opacity: .8; }
.filtros input[type="range"] { width: 100%; accent-color: #e8b17d; }
.filtros .chips { display: flex; flex-wrap: wrap; gap: 4px; }
.filtros .chips button {
  background: transparent; border: 1px solid rgba(239,233,223,.25); border-radius: 999px;
  color: inherit; padding: 2px 10px; font-size: 12px;
}
.filtros .chips button.activo { background: rgba(232,177,125,.25); border-color: #e8b17d; }
.filtros .top { display: flex; align-items: center; gap: 8px; }
.filtros .top button { width: 26px; height: 26px; border-radius: 6px; background: transparent; border: 1px solid rgba(239,233,223,.25); color: inherit; }

.panel {
  position: absolute; right: 24px; top: 50%; transform: translateY(-50%); z-index: 2;
  width: min(380px, 85vw); max-height: 68vh; overflow: auto;
  background: rgba(13,11,9,.82); border: 1px solid rgba(239,233,223,.2); border-radius: 12px;
  padding: 18px 20px; font-size: 14px; line-height: 1.6; display: none; backdrop-filter: blur(8px);
}
.panel h3 { margin: 0 0 4px; font-weight: 400; font-size: 18px; }
.panel .meta { opacity: .55; font-size: 12px; margin-bottom: 12px; }
.panel .cuerpo { white-space: pre-line; opacity: .9; }
.panel a { color: #e8b17d; }
`;

function texturaFallback(titulo: string, artista: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 600;
  const g = c.getContext("2d")!;
  g.fillStyle = "#241d16";
  g.fillRect(0, 0, 600, 600);
  g.fillStyle = "#efe9df";
  g.font = '36px "Departure Mono", monospace';
  g.textAlign = "center";
  const lineas: string[] = [];
  let actual = "";
  for (const p of titulo.split(" ")) {
    if ((actual + " " + p).trim().length > 16) {
      lineas.push(actual.trim());
      actual = p;
    } else actual += " " + p;
  }
  lineas.push(actual.trim());
  lineas.forEach((l, i) => g.fillText(l.toUpperCase(), 300, 280 + i * 44 - (lineas.length - 1) * 22));
  g.font = '24px "Departure Mono", monospace';
  g.fillStyle = "rgba(239,233,223,.6)";
  g.fillText(artista, 300, 470);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function pedirJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

// dimensiones del catálogo: numéricas con su rango, categóricas con su
// vocabulario (misma regla que la v1: más de un valor, pocas opciones)
function calcularDimensiones(fichas: Ficha[]): DimInfo {
  const nums = new Map<string, { min: number; max: number }>();
  const cats = new Map<string, Set<string>>();
  for (const f of fichas) {
    for (const [k, v] of Object.entries(f.dims)) {
      if (typeof v === "number") {
        const info = nums.get(k) ?? { min: v, max: v };
        nums.set(k, { min: Math.min(info.min, v), max: Math.max(info.max, v) });
      } else if (typeof v === "string") {
        if (!cats.has(k)) cats.set(k, new Set());
        cats.get(k)!.add(v);
      }
    }
  }
  return {
    numericas: [...nums.entries()].map(([key, { min, max }]) => ({ key, min, max })),
    categoricas: [...cats.entries()]
      .filter(([, vs]) => vs.size > 1 && vs.size <= 6)
      .map(([key, vs]) => ({ key, valores: [...vs] })),
  };
}

// stub del Worker de feedback: en el build real será un POST a /api/feedback
// con {query, ficha, acción, ts, rank_pre_boost, visitante}
function feedback(ficha: Ficha, accion: "clavo" | "no-encaja", rank: number, q: string) {
  const evento = { query: q, ficha: ficha.slug, accion, ts: Date.now(), rank_pre_boost: rank };
  let log: unknown[] = [];
  try {
    log = JSON.parse(localStorage.getItem("feedback-log") ?? "[]");
  } catch {}
  log.push(evento);
  try {
    localStorage.setItem("feedback-log", JSON.stringify(log));
  } catch {}
  console.info("feedback (stub, irá a Worker + D1):", evento);
}

const app = document.getElementById("app")!;
const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

const escena = document.createElement("div");
escena.className = "escenario";
escena.innerHTML = `
  <div class="tapa">
    <form>
      <input placeholder="¿cómo quieres que te suene?" autocomplete="off" autofocus />
      <button type="button" class="sorprendeme">sorpréndeme</button>
    </form>
  </div>
  <div class="estado"></div>
  <div class="aviso"></div>
  <button class="filtros-btn" type="button">filtros</button>
  <div class="filtros"></div>
  <div class="lista"></div>
  <div class="panel"></div>`;
app.appendChild(escena);

const input = escena.querySelector<HTMLInputElement>("input")!;
const estado = escena.querySelector<HTMLElement>(".estado")!;
const aviso = escena.querySelector<HTMLElement>(".aviso")!;
const lista = escena.querySelector<HTMLElement>(".lista")!;
const panel = escena.querySelector<HTMLElement>(".panel")!;
const filtrosPanel = escena.querySelector<HTMLElement>(".filtros")!;
const filtrosBtn = escena.querySelector<HTMLButtonElement>(".filtros-btn")!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
escena.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d0b09, 8, 26);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 10);
const objetivo = new THREE.Vector3(0, 0.8, 0);

estado.textContent = "cargando el catálogo…";
const fichas = await pedirJSON<Ficha[]>("/catalogo.json");
await document.fonts.load('16px "Departure Mono"').catch(() => {});

// un panel por ficha, en filas que se pierden en la niebla
const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");
const geometria = new THREE.PlaneGeometry(2.4, 2.4);
const paneles = new Map<string, { mesh: THREE.Mesh; ficha: FichaLigera }>();
fichas.forEach((f, i) => {
  const tex = f.cover ? loader.load(f.cover) : texturaFallback(f.titulo, f.artista);
  if (f.cover) tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55 });
  const mesh = new THREE.Mesh(geometria, mat);
  const fila = Math.floor(i / 6);
  mesh.position.set(((i % 6) - 2.5) * 3.1 + (fila % 2) * 1.5, 1.6 - fila * 3.4, -Math.abs(i % 3) * 1.8);
  scene.add(mesh);
  paneles.set(f.slug, { mesh, ficha: f });
});
estado.textContent = `${fichas.length} fichas en sala`;

// ---- filtros auto-descubiertos + top ajustable ----
const filtros: Filtros = { min: {}, max: {}, en: {} };
let top = 3;
filtrosBtn.onclick = () => filtrosPanel.classList.toggle("abierto");

const tituloBloque = (t: string) => {
  const h = document.createElement("h4");
  h.textContent = t;
  filtrosPanel.appendChild(h);
  return h;
};
for (const d of calcularDimensiones(fichas).numericas) {
  tituloBloque(`${d.key.replace(/_/g, " ")} (${d.min}–${d.max})`);
  const rango = document.createElement("div");
  rango.className = "rango";
  const haceSlider = (esMin: boolean) => {
    const etiqueta = document.createElement("label");
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(d.min);
    slider.max = String(d.max);
    slider.step = "1";
    slider.value = String(esMin ? d.min : d.max);
    slider.setAttribute("aria-label", `${d.key} ${esMin ? "mínimo" : "máximo"}`);
    const pondera = () => {
      const v = Number(slider.value);
      const libre = esMin ? v <= d.min : v >= d.max;
      const lado = esMin ? filtros.min : filtros.max;
      if (libre) delete lado[d.key];
      else lado[d.key] = v;
      etiqueta.textContent = `${esMin ? "desde" : "hasta"} ${v}`;
      buscar();
    };
    slider.oninput = pondera;
    etiqueta.textContent = `${esMin ? "desde" : "hasta"} ${esMin ? d.min : d.max}`;
    const celda = document.createElement("div");
    celda.append(etiqueta, slider);
    return celda;
  };
  rango.append(haceSlider(true), haceSlider(false));
  filtrosPanel.appendChild(rango);
}
for (const d of calcularDimensiones(fichas).categoricas) {
  tituloBloque(d.key.replace(/_/g, " "));
  const chips = document.createElement("div");
  chips.className = "chips";
  for (const valor of d.valores) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = valor;
    b.onclick = () => {
      b.classList.toggle("activo");
      const sel = [...chips.querySelectorAll(".activo")].map((x) => (x as HTMLElement).textContent!);
      if (sel.length) filtros.en[d.key] = sel;
      else delete filtros.en[d.key];
      buscar();
    };
    chips.appendChild(b);
  }
  filtrosPanel.appendChild(chips);
}
tituloBloque("resultados");
const filaTop = document.createElement("div");
filaTop.className = "top";
const menos = document.createElement("button");
const etiquetaTop = document.createElement("span");
const mas = document.createElement("button");
menos.textContent = "−";
mas.textContent = "+";
etiquetaTop.textContent = `top ${top}`;
const cambiaTop = (d: number) => {
  top = Math.min(10, Math.max(1, top + d));
  etiquetaTop.textContent = `top ${top}`;
  buscar();
};
menos.onclick = () => cambiaTop(-1);
mas.onclick = () => cambiaTop(1);
filaTop.append(menos, etiquetaTop, mas);
filtrosPanel.appendChild(filaTop);

// ---- búsqueda y pintado ----
function opacidad(sel: (slug: string) => number | undefined) {
  paneles.forEach(({ mesh, ficha }) => {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const s = sel(ficha.slug);
    mat.opacity = s !== undefined ? 1 : 0.12;
  });
}

function resetPaneles() {
  paneles.forEach(({ mesh }) => {
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
  });
}

function viajarA(slug: string) {
  const p = paneles.get(slug);
  if (p) objetivo.copy(p.mesh.position).setZ(2.2);
}

function cablearFeedback(fb: HTMLElement, ficha: Ficha, rankPos: number, q: string) {
  for (const b of fb.querySelectorAll<HTMLButtonElement>("button")) {
    b.onclick = () => {
      feedback(ficha, b.dataset.a as "clavo" | "no-encaja", rankPos + 1, q);
      for (const otro of fb.querySelectorAll("button")) otro.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-pressed", "true");
    };
  }
}

function abrirPanel(f: Ficha, rankPos: number, q: string) {
  panel.style.display = "block";
  panel.innerHTML = `
    <h3>${f.titulo} — ${f.artista}</h3>
    <div class="meta">${f.fecha}${f.score !== undefined ? ` · match ${f.score.toFixed(3)}` : ""}</div>
    <div class="cuerpo">${f.body.replace(/^## .+$/gm, "").trim()}</div>
    ${f.spotify ? `<p><a href="${f.spotify}" target="_blank">escuchar en Spotify</a></p>` : ""}
    <div class="fb"><button data-a="clavo">clavo</button><button data-a="no-encaja">no me encaja</button></div>`;
  cablearFeedback(panel.querySelector<HTMLElement>(".fb")!, f, rankPos, q);
}

let timer: ReturnType<typeof setTimeout>;
input.oninput = () => {
  clearTimeout(timer);
  timer = setTimeout(buscar, 300);
};
input.closest("form")!.onsubmit = (e) => {
  e.preventDefault();
  clearTimeout(timer);
  buscar();
};

// salir de la burbuja: una ficha al azar del catálogo, sin query de por medio
escena.querySelector<HTMLButtonElement>(".sorprendeme")!.onclick = async () => {
  const { ficha } = await pedirJSON<{ ficha: Ficha }>("/api/sorpresa");
  input.value = "";
  aviso.style.display = "none";
  lista.replaceChildren();
  opacidad((slug) => (slug === ficha.slug ? 1 : 0.1));
  viajarA(ficha.slug);
  abrirPanel(ficha, -1, "sorpréndeme");
  estado.textContent = `sorpréndeme: ${ficha.titulo} — ${ficha.artista}`;
};

async function buscar() {
  const q = input.value.trim();
  panel.style.display = "none";
  aviso.style.display = "none";
  if (!q) {
    resetPaneles();
    lista.replaceChildren();
    return;
  }
  estado.textContent = "buscando…";
  const { resultados, umbral } = await pedirJSON<{ resultados: Ficha[]; umbral: number }>("/api/buscar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q, filtros, top }),
  });
  estado.textContent = `${fichas.length} fichas en sala`;
  if (!resultados.length) {
    opacidad(() => undefined);
    aviso.textContent = "nada del catálogo pasa esos filtros";
    aviso.style.display = "block";
    lista.replaceChildren();
    return;
  }
  // línea honesta: el edge dice cuánto es "fuerte" para este espacio; por
  // debajo no se disfraza un mal match de respuesta
  if (resultados[0].score! < umbral) {
    opacidad(() => undefined);
    aviso.textContent = "el catálogo aún no tiene nada fuerte para eso";
    aviso.style.display = "block";
    lista.replaceChildren();
    return;
  }
  opacidad((slug) => resultados.find((r) => r.slug === slug)?.score);
  lista.replaceChildren(
    ...resultados.map((r, i) => {
      const div = document.createElement("div");
      div.className = "resu";
      div.innerHTML = `
        <button type="button" class="titulo">${i + 1}. ${r.titulo} — ${r.artista}<span class="score">${r.score!.toFixed(3)}</span></button>
        <div class="fb"><button type="button" data-a="clavo">clavo</button><button type="button" data-a="no-encaja">no me encaja</button></div>`;
      div.querySelector<HTMLButtonElement>(".titulo")!.onclick = () => {
        viajarA(r.slug);
        abrirPanel(r, i, q);
      };
      cablearFeedback(div.querySelector<HTMLElement>(".fb")!, r, i, q);
      return div;
    }),
  );
  viajarA(resultados[0].slug);
}

// ---- cámara: deriva suave hacia el objetivo + parallax con el ratón ----
const mouse = new THREE.Vector2();
addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 0.6;
  mouse.y = (e.clientY / innerHeight - 0.5) * 0.4;
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const reloj = new THREE.Clock();
(function anima() {
  const t = reloj.getElapsedTime();
  camera.position.x += (objetivo.x + mouse.x + Math.sin(t * 0.3) * 0.15 - camera.position.x) * 0.03;
  camera.position.y += (objetivo.y - mouse.y - camera.position.y) * 0.03;
  camera.lookAt(objetivo.x, objetivo.y, -2);
  let i = 0;
  paneles.forEach(({ mesh }) => {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    if (mat.opacity > 0.5) mesh.position.y += Math.sin(t * 0.8 + i) * 0.0012;
    i++;
  });
  renderer.render(scene, camera);
  requestAnimationFrame(anima);
})();
