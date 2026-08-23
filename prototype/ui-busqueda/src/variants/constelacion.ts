// Variante C · Constelación: todo el catálogo como estrellas; la búsqueda
// acerca e ilumina los matches y deja un resplandor que se apaga despacio
// (primer gesto del soundprint: el cielo recuerda lo que buscaste).
import * as THREE from "three";
import { loadIndex, getExtractor, rank, type Ficha, type Filtros } from "../lib/api";

const css = `
.constelacion { position: fixed; inset: 0; background: #07060a; color: #ece7db; overflow: hidden; }
.constelacion canvas { position: absolute; inset: 0; }
.constelacion input {
  position: absolute; top: 5vh; left: 50%; transform: translateX(-50%);
  width: min(620px, 84vw); font: inherit; font-size: 20px; text-align: center;
  background: transparent; color: inherit; border: 0; border-bottom: 1px solid rgba(236,231,219,.3);
  padding: 10px 6px; outline: none;
}
.constelacion input::placeholder { color: rgba(236,231,219,.35); }
.constelacion .etiquetas { position: absolute; inset: 0; pointer-events: none; }
.constelacion .etiqueta {
  position: absolute; transform: translate(-50%, 14px); text-align: center;
  font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; white-space: nowrap;
}
.constelacion .etiqueta b { display: block; font-weight: 500; }
.constelacion .etiqueta span { opacity: .6; font-size: 11px; }
.constelacion .estado { position: absolute; top: 12px; right: 16px; }
`;

export async function mount(root: HTMLElement) {
  const style = document.createElement("style");
  style.textContent = css;
  style.dataset.variant = "1";
  document.head.appendChild(style);

  const index: Ficha[] = await loadIndex();
  const caja = document.createElement("div");
  caja.className = "constelacion";
  caja.innerHTML = `
    <input placeholder="¿cómo quieres que te suene?" autocomplete="off" />
    <div class="etiquetas"></div>
    <div class="estado"></div>`;
  root.appendChild(caja);
  const input = caja.querySelector<HTMLInputElement>("input")!;
  const estado = caja.querySelector<HTMLElement>(".estado")!;
  const etiquetas = caja.querySelector<HTMLElement>(".etiquetas")!;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  caja.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 11);

  const N = index.length;
  // posiciones base en esfera de Fibonacci, radio con jitter por ficha
  const base: THREE.Vector3[] = [];
  const meta = new Float32Array(N * 2); // tamaño base, brillo
  const posiciones = new Float32Array(N * 3);
  const radios = index.map((_, i) => 4.2 + (((i * 2654435761) % 1000) / 1000) * 1.6);
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = radios[i];
    base.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) * 0.7, r * Math.cos(phi)));
    meta[i * 2] = 18 + (i % 3);
    meta[i * 2 + 1] = 0.35;
    posiciones.set([base[i].x, base[i].y, base[i].z], i * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  geo.setAttribute("punto", new THREE.BufferAttribute(meta, 2)); // [tamañoBase, brillo]
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { px: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute vec2 punto;
      varying float vBrillo;
      void main() {
        vBrillo = punto.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = punto.x * (1.0 + punto.y) * px.value * (220.0 / -mv.z) / 100.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vBrillo;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 frio = vec3(0.62, 0.66, 0.78), calido = vec3(0.95, 0.78, 0.55);
        gl_FragColor = vec4(mix(frio, calido, clamp(vBrillo, 0.0, 1.0)), a * (0.25 + vBrillo * 0.75));
      }`,
  });
  scene.add(new THREE.Points(geo, mat));

  // objetivo por estrella: hacia el centro según similitud, brillo según rank
  const objetivoRadio = new Float32Array(N).fill(1); // 1 = lejos (base), menor = más cerca
  const brillo = new Float32Array(N).fill(0.35);
  const memoria = new Float32Array(N); // resplandor residual (soundprint en ciernes)
  const etiquetasTop = new Map<number, { el: HTMLDivElement; pos: THREE.Vector3 }>();

  const extractor = await getExtractor((s) => (estado.textContent = s));
  estado.textContent = `modelo listo · ${N} fichas`;

  const filtros: Filtros = { max: {}, en: {} };
  let timer: ReturnType<typeof setTimeout>;
  input.oninput = () => { clearTimeout(timer); timer = setTimeout(buscar, 250); };

  async function buscar() {
    const q = input.value.trim();
    etiquetasTop.forEach((t) => t.el.remove());
    etiquetasTop.clear();
    if (!q) {
      objetivoRadio.fill(1);
      return;
    }
    const qvec = await extractor(q);
    const res = rank(index, qvec, filtros);
    const score = new Map(res.map((r) => [r.ficha.slug, r.score]));
    const rankOf = new Map(res.map((r, i) => [r.ficha.slug, i]));
    index.forEach((f, i) => {
      const s = score.get(f.slug);
      if (s !== undefined) {
        const k = 1 - (rankOf.get(f.slug)! / 6);
        objetivoRadio[i] = 0.25 + (1 - k) * 0.4;
        brillo[i] = Math.max(0.5, Math.min(1, (s + 1) * 1.6));
        memoria[i] = Math.min(1, memoria[i] + 0.6);
      } else {
        objetivoRadio[i] = 1;
        brillo[i] = 0.3;
      }
    });
    res.slice(0, 3).forEach((r) => {
      const i = index.indexOf(r.ficha);
      const el = document.createElement("div");
      el.className = "etiqueta";
      el.innerHTML = `<b>${r.ficha.titulo}</b><span>${r.ficha.artista}</span>`;
      etiquetas.appendChild(el);
      etiquetasTop.set(i, { el, pos: new THREE.Vector3() });
    });
  }

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const reloj = new THREE.Clock();
  (function anima() {
    const t = reloj.getElapsedTime();
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const meta = geo.getAttribute("punto") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      memoria[i] = Math.max(0, memoria[i] - 0.0012); // el recuerdo se apaga despacio
      const factor = objetivoRadio[i] + Math.sin(t * 0.5 + i) * 0.015;
      const destino = base[i].clone().multiplyScalar(factor);
      pos.setXYZ(i, pos.getX(i) + (destino.x - pos.getX(i)) * 0.05, pos.getY(i) + (destino.y - pos.getY(i)) * 0.05, pos.getZ(i) + (destino.z - pos.getZ(i)) * 0.05);
      const b = Math.max(brillo[i], 0.3 + memoria[i] * 0.5);
      meta.setXY(i, meta.getX(i), b);
    }
    pos.needsUpdate = true;
    meta.needsUpdate = true;
    // etiquetas de las top 3 proyectadas a pantalla
    const v = new THREE.Vector3();
    etiquetasTop.forEach((e, i) => {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).project(camera);
      e.el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
      e.el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    });
    renderer.render(scene, camera);
    requestAnimationFrame(anima);
  })();
}
