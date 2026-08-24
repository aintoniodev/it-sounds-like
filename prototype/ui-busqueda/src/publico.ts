// Prototipo (ticket 06, mapa de publicación): el sitio público.
// Es el Escenario ganador del 07 con las diferencias de lo público: sin
// captura ni watcher, botones de feedback "clavo"/"no me encaja" por
// resultado (stub: el cable a Worker+D1 llega en la construcción), enlace al
// soundprint con firma del canal del autor, y la privacidad de cinco líneas
// en el footer. En el prototipo la query se embedea local (e5-small);
// en producción la embede Workers AI (bge-m3) — el estado de carga es el mismo.
import * as THREE from "three";
import { loadIndex, getExtractor, rank, type Ficha, type Filtros } from "./lib/api";

const css = `
.publico { position: fixed; inset: 0; background: #0d0b09; color: #efe9df; overflow: hidden; font-family: "Departure Mono", ui-monospace, monospace; }
.publico .tapa { position: absolute; inset: 0; display: grid; place-items: start center; padding-top: 5vh; z-index: 2; pointer-events: none; }
.publico input {
  width: min(640px, 80vw); font: inherit; font-size: 20px; text-align: center;
  background: rgba(239,233,223,.08); border: 1px solid rgba(239,233,223,.25);
  border-radius: 999px; padding: 12px 22px; color: inherit; outline: none; backdrop-filter: blur(6px); pointer-events: auto;
}
.publico input::placeholder { color: rgba(239,233,223,.4); }
.publico .lista { position: absolute; left: 24px; bottom: 88px; font-size: 13px; display: grid; gap: 8px; max-width: 380px; }
.publico .resu { background: rgba(13,11,9,.72); border: 1px solid rgba(239,233,223,.2); border-radius: 8px; padding: 8px 12px; }
.publico .resu .titulo { display: block; text-align: left; margin-bottom: 6px; }
.publico .fb { display: flex; gap: 8px; }
.publico .fb button {
  font: inherit; font-size: 11px; background: transparent; color: inherit;
  border: 1px solid rgba(239,233,223,.3); border-radius: 999px; padding: 2px 10px;
}
.publico .fb button:hover { background: rgba(239,233,223,.14); }
.publico .fb button[aria-pressed="true"] { background: var(--acento, #b3541e); border-color: transparent; }
.publico .estado { position: absolute; top: 12px; right: 16px; font-size: 11px; opacity: .6; }
.publico .panel {
  position: absolute; right: 24px; top: 50%; transform: translateY(-50%);
  width: min(360px, 80vw); max-height: 58vh; overflow: auto;
  background: rgba(13,11,9,.78); border: 1px solid rgba(239,233,223,.2); border-radius: 12px; padding: 18px 20px;
  font-size: 14px; display: none; backdrop-filter: blur(8px);
}
.publico .panel h3 { margin: 0 0 10px; font-weight: 400; font-size: 18px; }
.publico .panel .cuerpo { white-space: pre-line; opacity: .9; }
.publico .panel a { color: #e8b17d; }
.publico .panel .fb { margin-top: 12px; }
.publico .pie {
  position: absolute; left: 0; right: 0; bottom: 30px; text-align: center; font-size: 10px; opacity: .45; line-height: 1.8;
}
.publico .pie a { text-decoration: none; border-bottom: 1px solid rgba(239,233,223,.4); margin-left: 12px; }
`;

function texturaFallback(titulo: string, artista: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 600; c.height = 600;
  const g = c.getContext("2d")!;
  g.fillStyle = "#241d16"; g.fillRect(0, 0, 600, 600);
  g.fillStyle = "#efe9df"; g.font = "500 44px monospace"; g.textAlign = "center";
  g.fillText(titulo.slice(0, 22), 300, 290);
  g.font = "300 26px monospace"; g.fillStyle = "rgba(239,233,223,.6)";
  g.fillText(artista, 300, 350);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// stub del Worker de feedback (ticket 02/03): en la construcción será un POST
// a /api/feedback con {query, ficha, acción, ts, rank_pre_boost, visitante}.
function feedback(ficha: Ficha, accion: "clavo" | "no-encaja", rank: number, q: string) {
  const evento = { query: q, ficha: ficha.slug, accion, ts: Date.now(), rank_pre_boost: rank };
  let log: unknown[] = [];
  try { log = JSON.parse(localStorage.getItem("feedback-log") ?? "[]"); } catch {}
  log.push(evento);
  try { localStorage.setItem("feedback-log", JSON.stringify(log)); } catch {}
  console.info("feedback (stub, irá a Worker + D1):", evento);
}

export async function mount(root: HTMLElement) {
  const style = document.createElement("style");
  style.textContent = css;
  style.dataset.variant = "1";
  document.head.appendChild(style);

  const cuenta = new URLSearchParams(location.search).get("cuenta") ?? "lacuentadelautor";
  const index: Ficha[] = await loadIndex();
  const caja = document.createElement("div");
  caja.className = "publico";
  caja.innerHTML = `
    <div class="tapa"><input placeholder="¿cómo quieres que te suene?" autocomplete="off" /></div>
    <div class="estado"></div>
    <div class="lista"></div>
    <div class="panel"></div>
    <div class="pie">
      guardamos tu búsqueda y tu clavo/no-encaja durante 90 días, sin IP ni cookies, para aprender a recomendar mejor<br>
      tu identificador es un número aleatorio en tu navegador: bórralo y desapareces · <a href="soundprint.html?cuenta=${encodeURIComponent(cuenta)}">tu soundprint</a>
    </div>`;
  root.appendChild(caja);
  const input = caja.querySelector<HTMLInputElement>("input")!;
  const estado = caja.querySelector<HTMLElement>(".estado")!;
  const lista = caja.querySelector<HTMLElement>(".lista")!;
  const panel = caja.querySelector<HTMLElement>(".panel")!;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  caja.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0b09, 8, 26);
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1.2, 10);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const paneles: { mesh: THREE.Mesh; ficha: Ficha }[] = [];
  const geometria = new THREE.PlaneGeometry(2.4, 2.4);
  index.forEach((f, i) => {
    const tex = f.cover ? loader.load(f.cover) : texturaFallback(f.titulo, f.artista);
    if (f.cover) tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(geometria, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55 }));
    const fila = Math.floor(i / 6);
    mesh.position.set(((i % 6) - 2.5) * 3.1 + (fila % 2) * 1.5, 1.6 - fila * 3.4, -Math.abs(i % 3) * 1.8);
    scene.add(mesh);
    paneles.push({ mesh, ficha: f });
  });

  estado.textContent = "cargando el modelo…";
  const extractor = await getExtractor((s) => (estado.textContent = `${s} · en producción esto lo embede el edge`));
  estado.textContent = `listo · ${index.length} fichas`;

  const filtros: Filtros = { max: {}, en: {} };
  let timer: ReturnType<typeof setTimeout>;
  input.oninput = () => { clearTimeout(timer); timer = setTimeout(buscar, 250); };

  async function buscar() {
    const q = input.value.trim();
    panel.style.display = "none";
    if (!q) {
      paneles.forEach((p) => ((p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55));
      lista.innerHTML = "";
      return;
    }
    estado.textContent = "preguntando…";
    const qvec = await extractor(q);
    const res = rank(index, qvec, filtros);
    estado.textContent = `listo · ${index.length} fichas`;
    const top = new Map(res.map((r) => [r.ficha.slug, r.score]));
    paneles.forEach((p) => {
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = top.has(p.ficha.slug) ? 1 : 0.12;
    });
    lista.innerHTML = "";
    res.forEach((r, i) => {
      const div = document.createElement("div");
      div.className = "resu";
      div.innerHTML = `
        <button class="titulo">${i + 1}. ${r.ficha.titulo} — ${r.ficha.artista}</button>
        <div class="fb"><button data-a="clavo">clavo</button><button data-a="no-encaja">no me encaja</button></div>`;
      div.querySelector<HTMLButtonElement>(".titulo")!.onclick = () => {
        const p = paneles.find((x) => x.ficha.slug === r.ficha.slug)!;
        objetivo.lerp(p.mesh.position.clone().setZ(2.2), 1);
        panel.style.display = "block";
        panel.innerHTML = `<h3>${r.ficha.titulo} — ${r.ficha.artista}</h3>
          <div class="cuerpo">${r.ficha.body.replace(/^## .+$/gm, "").trim()}</div>
          ${r.ficha.spotify ? `<p><a href="${r.ficha.spotify}" target="_blank">escuchar</a></p>` : ""}`;
        // el panel lleva sus propios botones de feedback
        const fbPanel = document.createElement("div");
        fbPanel.className = "fb";
        fbPanel.innerHTML = `<button data-a="clavo">clavo</button><button data-a="no-encaja">no me encaja</button>`;
        panel.appendChild(fbPanel);
        cablear(fbPanel, r.ficha, i, q);
      };
      cablear(div.querySelector<HTMLElement>(".fb")!, r.ficha, i, q);
      lista.appendChild(div);
    });
    if (res[0]) {
      const p = paneles.find((x) => x.ficha.slug === res[0].ficha.slug)!;
      objetivo.lerp(p.mesh.position.clone().setZ(2.2), 1);
    }
  }

  function cablear(fb: HTMLElement, ficha: Ficha, rankPos: number, q: string) {
    for (const b of fb.querySelectorAll<HTMLButtonElement>("button")) {
      b.onclick = () => {
        feedback(ficha, b.dataset.a as "clavo" | "no-encaja", rankPos + 1, q);
        for (const otro of fb.querySelectorAll("button")) otro.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-pressed", "true");
      };
    }
  }

  const objetivo = new THREE.Vector3(0, 0.8, 0);
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
    paneles.forEach((p, i) => {
      if ((p.mesh.material as THREE.MeshBasicMaterial).opacity > 0.5) p.mesh.position.y += Math.sin(t * 0.8 + i) * 0.0012;
    });
    renderer.render(scene, camera);
    requestAnimationFrame(anima);
  })();
}

void mount(document.getElementById("app")!);
