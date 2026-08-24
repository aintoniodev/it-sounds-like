// Variante B · Escenario: portadas como paneles 3D en una sala oscura,
// la cámara se acerca a los matches. La información vive en overlay HTML.
import * as THREE from "three";
import { loadIndex, getExtractor, rank, type Ficha, type Filtros } from "../lib/api";

const css = `
.escenario { position: fixed; inset: 0; background: #0d0b09; color: #efe9df; overflow: hidden; }
.escenario .tapa { position: absolute; inset: 0; display: grid; place-items: start center; padding-top: 5vh; pointer-events: none; }
.escenario input {
  width: min(640px, 80vw); font: inherit; font-size: 22px; text-align: center;
  background: rgba(239,233,223,.08); border: 1px solid rgba(239,233,223,.25);
  border-radius: 999px; padding: 12px 22px; color: inherit; outline: none; backdrop-filter: blur(6px); pointer-events: auto;
}
.escenario input::placeholder { color: rgba(239,233,223,.4); }
.escenario .lista { position: absolute; left: 24px; bottom: 72px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; display: grid; gap: 6px; }
.escenario .lista button { text-align: left; background: rgba(13,11,9,.65); color: inherit; border: 1px solid rgba(239,233,223,.2); border-radius: 8px; padding: 8px 12px; }
.escenario .lista button:hover { background: rgba(239,233,223,.14); }
.escenario .estado { position: absolute; top: 12px; right: 16px; color: #efe9df; }
.escenario .panel {
  position: absolute; right: 24px; top: 50%; transform: translateY(-50%);
  width: min(360px, 80vw); max-height: 60vh; overflow: auto;
  background: rgba(13,11,9,.78); border: 1px solid rgba(239,233,223,.2); border-radius: 12px; padding: 18px 20px;
  font-size: 15px; display: none; backdrop-filter: blur(8px);
}
.escenario .panel h3 { margin: 0 0 10px; font-weight: 400; font-size: 20px; }
.escenario .panel .cuerpo { white-space: pre-line; opacity: .9; }
.escenario .panel a { color: #e8b17d; }
`;

function texturaFallback(titulo: string, artista: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 600; c.height = 600;
  const g = c.getContext("2d")!;
  g.fillStyle = "#241d16"; g.fillRect(0, 0, 600, 600);
  g.fillStyle = "#efe9df"; g.font = "500 44px Georgia"; g.textAlign = "center";
  const palabras = titulo.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    if ((actual + " " + p).trim().length > 14) { lineas.push(actual.trim()); actual = p; } else actual += " " + p;
  }
  lineas.push(actual.trim());
  lineas.forEach((l, i) => g.fillText(l, 300, 280 + i * 54 - ((lineas.length - 1) * 27)));
  g.font = "300 26px Georgia"; g.fillStyle = "rgba(239,233,223,.6)";
  g.fillText(artista, 300, 460);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function mount(root: HTMLElement) {
  const style = document.createElement("style");
  style.textContent = css;
  style.dataset.variant = "1";
  document.head.appendChild(style);

  const index: Ficha[] = await loadIndex();
  const escena = document.createElement("div");
  escena.className = "escenario";
  escena.innerHTML = `
    <div class="tapa"><input placeholder="¿cómo quieres que te suene?" autocomplete="off" /></div>
    <div class="estado"></div>
    <div class="lista"></div>
    <div class="panel"></div>`;
  root.appendChild(escena);
  const input = escena.querySelector<HTMLInputElement>("input")!;
  const estado = escena.querySelector<HTMLElement>(".estado")!;
  const lista = escena.querySelector<HTMLElement>(".lista")!;
  const panel = escena.querySelector<HTMLElement>(".panel")!;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  escena.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0b09, 8, 26);
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1.2, 10);

  // un panel por ficha, en tres filas que se pierden en la niebla
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const paneles: { mesh: THREE.Mesh; ficha: Ficha }[] = [];
  const geometria = new THREE.PlaneGeometry(2.4, 2.4);
  index.forEach((f, i) => {
    const tex = f.cover ? loader.load(f.cover) : texturaFallback(f.titulo, f.artista);
    if (f.cover) tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55 });
    const mesh = new THREE.Mesh(geometria, mat);
    const fila = Math.floor(i / 6);
    mesh.position.set(((i % 6) - 2.5) * 3.1 + (fila % 2) * 1.5, 1.6 - fila * 3.4, -Math.abs(i % 3) * 1.8);
    scene.add(mesh);
    paneles.push({ mesh, ficha: f });
  });

  const extractor = await getExtractor((s) => (estado.textContent = s));
  estado.textContent = `modelo listo · ${index.length} fichas`;

  const filtros: Filtros = { max: {}, en: {} };
  let timer: ReturnType<typeof setTimeout>;
  input.oninput = () => { clearTimeout(timer); timer = setTimeout(buscar, 250); };

  async function buscar() {
    const q = input.value.trim();
    panel.style.display = "none";
    if (!q) {
      paneles.forEach((p) => { p.mesh.material instanceof THREE.MeshBasicMaterial && (p.mesh.material.opacity = 0.55); });
      lista.innerHTML = "";
      return;
    }
    const qvec = await extractor(q);
    const res = rank(index, qvec, filtros);
    const top = new Map(res.map((r) => [r.ficha.slug, r.score]));
    paneles.forEach((p) => {
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      const s = top.get(p.ficha.slug);
      mat.opacity = s !== undefined ? 1 : 0.12;
    });
    lista.innerHTML = "";
    res.forEach((r, i) => {
      const b = document.createElement("button");
      b.textContent = `${i + 1}. ${r.ficha.titulo} — ${r.ficha.artista}`;
      b.onclick = () => {
        const p = paneles.find((x) => x.ficha.slug === r.ficha.slug)!;
        objetivo.lerp(p.mesh.position.clone().setZ(2.2), 1);
        panel.style.display = "block";
        panel.innerHTML = `
          <h3>${r.ficha.titulo} — ${r.ficha.artista}</h3>
          <div class="cuerpo">${r.ficha.body.replace(/^## .+$/gm, "").trim()}</div>
          ${r.ficha.spotify ? `<p><a href="${r.ficha.spotify}" target="_blank">escuchar</a></p>` : ""}`;
      };
      lista.appendChild(b);
    });
    if (res[0]) {
      const p = paneles.find((x) => x.ficha.slug === res[0].ficha.slug)!;
      objetivo.lerp(p.mesh.position.clone().setZ(2.2), 1);
    }
  }

  // cámara: deriva suave hacia el primer match + parallax con el ratón
  const objetivo = new THREE.Vector3(0, 0.8, 0);
  addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 0.6;
    mouse.y = (e.clientY / innerHeight - 0.5) * 0.4;
  });
  const mouse = new THREE.Vector2();
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  let t0 = 0;
  const reloj = new THREE.Clock();
  (function anima() {
    const t = reloj.getElapsedTime();
    camera.position.x += (objetivo.x + mouse.x + Math.sin(t * 0.3) * 0.15 - camera.position.x) * 0.03;
    camera.position.y += (objetivo.y - mouse.y - camera.position.y) * 0.03;
    camera.lookAt(objetivo.x, objetivo.y, -2);
    paneles.forEach((p, i) => {
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (mat.opacity > 0.5) p.mesh.position.y += Math.sin(t * 0.8 + i) * 0.0012;
    });
    t0++;
    renderer.render(scene, camera);
    if (t0 < Infinity) requestAnimationFrame(anima);
  })();
}
