// Prototipo (ticket 10): visualización del soundprint.
// Tres capas definidas en el ticket 04: las palabras del autor (significado,
// en Departure Mono), las dimensiones (estructura, resumen tipo ficha técnica)
// y un lienzo generativo (shader) sembrado por los matches acumulados.
// El historial vive en localStorage: cada búsqueda deja mancha. Export a PNG.
import * as THREE from "three";
import { loadIndex, getExtractor, rank, secciones, type Ficha } from "./lib/api";

const css = `
@font-face {
  font-family: "Departure Mono";
  src: url("fonts/DepartureMono-Regular.woff2") format("woff2");
  font-display: swap;
}
.soundprint { position: fixed; inset: 0; background: #0b0a0d; color: #ece7db; overflow: hidden; }
.soundprint canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.sp-marco {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: min(88vmin, 780px); aspect-ratio: 1; border: 1px solid rgba(236,231,219,.22);
}
.sp-cabecera {
  position: absolute; top: 26px; left: 0; right: 0; text-align: center;
  font-family: "Departure Mono", monospace; font-size: 13px; letter-spacing: .28em;
  text-transform: uppercase; opacity: .65;
}
.sp-frases {
  position: absolute; bottom: 64px; left: 0; right: 0; text-align: center;
  font-family: "Departure Mono", monospace; font-size: 15px; line-height: 1.9;
}
.sp-frases .frase { opacity: .9; }
.sp-frases .frase:nth-child(2) { opacity: .62; }
.sp-frases .frase:nth-child(3) { opacity: .42; }
.sp-dims {
  position: absolute; bottom: 26px; left: 0; right: 0; text-align: center;
  font-family: "Departure Mono", monospace; font-size: 12px; opacity: .5; letter-spacing: .06em;
}
.sp-firma {
  position: absolute; bottom: 8px; left: 0; right: 0; text-align: center;
  font-family: "Departure Mono", monospace; font-size: 10px; opacity: .35; letter-spacing: .12em;
}
.sp-controles { position: absolute; top: 26px; right: 30px; display: grid; gap: 8px; }
.sp-controles button {
  font-family: "Departure Mono", monospace; font-size: 12px;
  background: transparent; color: inherit; border: 1px solid rgba(236,231,219,.3);
  border-radius: 4px; padding: 6px 10px;
}
.sp-controles button:hover { background: rgba(236,231,219,.12); }
.sp-input {
  position: absolute; top: 22px; left: 30px; width: min(420px, 50vw);
  font-family: "Departure Mono", monospace; font-size: 15px;
  background: transparent; color: inherit; border: 0; outline: none;
  border-bottom: 1px solid rgba(236,231,219,.3); padding: 6px 2px;
}
.sp-input::placeholder { color: rgba(236,231,219,.35); }
.sp-estado { position: absolute; top: 52px; left: 30px; font-family: "Departure Mono", monospace; font-size: 11px; opacity: .45; }
`;

const MAX_STAINS = 32;
const LS = "soundprint-historial";

function hash01(s: string, sal = 0): number {
  let h = 2166136261 ^ sal;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
const primeraFrase = (t: string) => t.match(/^[^.!?]+[.!?]/)?.[0] ?? t;

async function main() {
  const style = document.createElement("style");
  style.textContent = css;
  style.dataset.variant = "1";
  document.head.appendChild(style);

  const app = document.getElementById("app")!;
  app.innerHTML = `
  <div class="soundprint">
    <input class="sp-input" placeholder="busca y tu soundprint se forma…" autocomplete="off" />
    <div class="sp-estado"></div>
    <div class="sp-controles">
      <button class="sp-export">exportar png</button>
      <button class="sp-reset">reset</button>
    </div>
    <div class="sp-marco">
      <div class="sp-cabecera">tu soundprint</div>
      <div class="sp-frases"></div>
      <div class="sp-dims"></div>
      <div class="sp-firma"></div>
    </div>
  </div>`;
  const cuenta = new URLSearchParams(location.search).get("cuenta");
  const firma = cuenta ? `it sounds like · @${cuenta}` : "it sounds like";
  app.querySelector<HTMLElement>(".sp-firma")!.textContent = firma;
  const root = app.querySelector<HTMLElement>(".soundprint")!;
  const estado = app.querySelector<HTMLElement>(".sp-estado")!;
  const frasesEl = app.querySelector<HTMLElement>(".sp-frases")!;
  const dimsEl = app.querySelector<HTMLElement>(".sp-dims")!;
  const input = app.querySelector<HTMLInputElement>(".sp-input")!;

  // lienzo generativo: shader con fbm, una mancha por canción matcheada
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const lado = 1024;
  renderer.setSize(lado, lado, false);
  const canvasEl = renderer.domElement;
  canvasEl.style.width = "100%";
  canvasEl.style.height = "100%";
  root.prepend(canvasEl);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uT: { value: 0 },
    uCount: { value: 0 },
    uStains: { value: Array.from({ length: MAX_STAINS }, () => new THREE.Vector4()) },
  };
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }",
    fragmentShader: `
      varying vec2 vUv;
      uniform float uT; uniform int uCount; uniform vec4 uStains[${MAX_STAINS}];
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
      }
      float fbm(vec2 p){ float v=0.0,a=0.5; for(int k=0;k<4;k++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      void main(){
        vec2 uv = vUv*2.0-1.0;
        vec3 col = vec3(0.043,0.039,0.051);
        for(int i=0;i<${MAX_STAINS};i++){
          if(i>=uCount) break;
          vec4 s = uStains[i];
          vec2 d = uv - s.xy;
          float ang = s.z*6.2831;
          d = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*d;
          float r = length(d);
          float blob = smoothstep(0.55, 0.05, r + (fbm(d*4.0 + s.z*17.0 + uT*0.03)-0.5)*0.38);
          vec3 c = mix(vec3(0.365,0.42,0.557), vec3(0.851,0.557,0.29), s.w);
          col += c * blob * 0.13 * (0.8 + 0.2*sin(uT*0.7 + s.z*9.0));
        }
        col += (hash(uv*537.0 + fract(uT))-0.5)*0.025;
        col *= 1.0 - 0.18*dot(uv,uv);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })));

  const index: Ficha[] = await loadIndex();
  const extractor = await getExtractor((s) => (estado.textContent = s));
  estado.textContent = `modelo listo · ${index.length} fichas`;

  // historial de matches: {q, slugs}
  type Historial = { q: string; slugs: string[] }[];
  let historial: Historial = [];
  try { historial = JSON.parse(localStorage.getItem(LS) ?? "[]"); } catch {}

  function pinta() {
    // una mancha por canción única; el peso crece si se repite
    const pesos = new Map<string, number>();
    for (const h of historial) for (const s of h.slugs) pesos.set(s, (pesos.get(s) ?? 0) + 1);
    const slugs = [...pesos.keys()].slice(-MAX_STAINS);
    uniforms.uCount.value = slugs.length;
    slugs.forEach((slug, i) => {
      const f = index.find((x) => x.slug === slug);
      const energia = f && typeof f.dims["energia"] === "number" ? (f.dims["energia"] as number) / 10 : hash01(slug, 7);
      const escala = 0.62 + Math.min(pesos.get(slug)!, 4) * 0.09;
      uniforms.uStains.value[i].set(
        (hash01(slug, 1) * 2 - 1) * 0.62,
        (hash01(slug, 2) * 2 - 1) * 0.52,
        hash01(slug, 3) * escala,
        energia,
      );
    });

    // palabras: la primera frase del "por qué" del último top 3
    const ultima = historial.at(-1);
    const frases = (ultima?.slugs ?? [])
      .map((s) => index.find((x) => x.slug === s))
      .filter((f): f is Ficha => !!f)
      .map((f) => primeraFrase(secciones(f.body)["por qué"] ?? secciones(f.body)["intro"] ?? f.body));
    frasesEl.innerHTML = frases.slice(0, 3).map((f) => `<div class="frase">${f}</div>`).join("")
      || `<div class="frase" style="opacity:.35">cada búsqueda deja marca</div>`;

    // dimensiones: media de numéricas y valor más frecuente de categóricas
    const unicos = [...pesos.keys()].map((s) => index.find((x) => x.slug === s)).filter((f): f is Ficha => !!f);
    const partes: string[] = [`${historial.length} búsquedas · ${unicos.length} canciones`];
    const nums = new Map<string, number[]>();
    const cats = new Map<string, Map<string, number>>();
    for (const f of unicos) {
      for (const [k, v] of Object.entries(f.dims)) {
        if (typeof v === "number") (nums.get(k) ?? nums.set(k, []).get(k)!).push(v);
        else {
          const m = cats.get(k) ?? cats.set(k, new Map()).get(k)!;
          m.set(v, (m.get(v) ?? 0) + 1);
        }
      }
    }
    for (const [k, vs] of nums) partes.push(`${k} ${ (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) }`);
    for (const [k, m] of cats) {
      const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      partes.push(`${k}: ${top[0]}${top[1] > 1 ? ` ×${top[1]}` : ""}`);
    }
    dimsEl.textContent = partes.join("  ·  ");
  }
  pinta();

  let timer: ReturnType<typeof setTimeout>;
  input.oninput = () => { clearTimeout(timer); timer = setTimeout(buscar, 250); };
  async function buscar() {
    const q = input.value.trim();
    if (!q) return;
    const qvec = await extractor(q);
    const res = rank(index, qvec, { max: {}, en: {} });
    if (!res.length) return;
    historial.push({ q, slugs: res.map((r) => r.ficha.slug) });
    try { localStorage.setItem(LS, JSON.stringify(historial.slice(-64))); } catch {}
    pinta();
  }

  app.querySelector<HTMLButtonElement>(".sp-reset")!.onclick = () => {
    historial = [];
    try { localStorage.removeItem(LS); } catch {}
    pinta();
  };

  app.querySelector<HTMLButtonElement>(".sp-export")!.onclick = async () => {
    await document.fonts.ready;
    const L = 1200;
    const out = document.createElement("canvas");
    out.width = L; out.height = L;
    const g = out.getContext("2d")!;
    g.fillStyle = "#0b0a0d";
    g.fillRect(0, 0, L, L);
    g.drawImage(renderer.domElement, 0, 0, L, L);
    const mono = (px: number) => `${px}px "Departure Mono", monospace`;
    g.fillStyle = "#ece7db";
    g.textAlign = "center";
    g.font = mono(22);
    g.globalAlpha = 0.65;
    g.letterSpacing = "6px";
    g.fillText("TU SOUNDPRINT", L / 2, 84);
    g.letterSpacing = "0px";
    g.globalAlpha = 1;
    g.font = mono(20);
    const frases = [...frasesEl.querySelectorAll(".frase")].map((e) => e.textContent ?? "");
    frases.forEach((f, i) => {
      g.globalAlpha = [0.9, 0.62, 0.42][i] ?? 0.4;
      g.fillText(f, L / 2, L - 170 + i * 38);
    });
    g.globalAlpha = 0.5;
    g.font = mono(15);
    g.fillText(dimsEl.textContent ?? "", L / 2, L - 52);
    g.globalAlpha = 0.4;
    g.font = mono(13);
    g.letterSpacing = "3px";
    g.fillText(firma.toUpperCase(), L / 2, L - 28);
    g.letterSpacing = "0px";
    const a = document.createElement("a");
    a.download = "soundprint.png";
    a.href = out.toDataURL("image/png");
    a.click();
  };

  const reloj = new THREE.Clock();
  (function anima() {
    uniforms.uT.value = reloj.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(anima);
  })();
}

void main();
