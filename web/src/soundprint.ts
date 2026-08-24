// Soundprint: la firma sonora de quien busca, pintada con las palabras del
// autor. Tres capas (palabras / dimensiones / lienzo generativo), historial
// por navegador (localStorage) y export PNG. Input pasivo: el buscador
// registra sus matches y esto solo pinta.
//
// Issue conocido del prototipo, corregido aquí: el lienzo apenas cambiaba
// entre búsquedas con resultados solapados. Fixes: fondo sembrado por el
// hash de la query, pulso de frescura en los últimos matches, entrada
// animada de manchas nuevas y más contraste.
import * as THREE from "three";
import { CANAL_IG } from "./canal";

export interface MatchSoundprint {
  slug: string;
  frase: string; // primera frase del "Por qué", congelada al buscar
  dims: Record<string, string | number>;
}

// la frase con la que una ficha entra al soundprint: la primera del
// "Por qué esta canción" (o la intro del cuerpo si no hay secciones)
export function fraseDe(f: { body: string }): string {
  const secs: Record<string, string> = {};
  let intro = "";
  for (const block of f.body.split(/(?=^##\s)/m)) {
    const h = block.match(/^##\s+(.+)$/m);
    if (h) secs[h[1].trim().toLowerCase()] = block.replace(/^##\s+.*$/m, "").trim();
    else if (block.trim() && !intro) intro = block.trim();
  }
  const porque = secs["por qué esta canción"] || intro || f.body;
  return porque.match(/^[^.!?]+[.!?]/)?.[0] ?? porque;
}

const LS = "soundprint-historial";
const MAX_MANCHAS = 32;

export function registrarBusqueda(q: string, matches: MatchSoundprint[]) {
  if (!matches.length) return;
  const historial = leerHistorial();
  historial.push({ q, matches, t: Date.now() });
  try {
    localStorage.setItem(LS, JSON.stringify(historial.slice(-64)));
  } catch {}
}

function leerHistorial(): { q: string; matches: MatchSoundprint[]; t: number }[] {
  try {
    return JSON.parse(localStorage.getItem(LS) ?? "[]");
  } catch {
    return [];
  }
}

function hash01(s: string, sal = 0): number {
  let h = 2166136261 ^ sal;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const css = `
.soundprint { position: fixed; inset: 0; z-index: 7; background: #0b0a0d; color: #ece7db; overflow: hidden; }
.soundprint canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.sp-marco {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: min(88vmin, 780px); aspect-ratio: 1; border: 1px solid rgba(236,231,219,.22);
}
.sp-cabecera {
  position: absolute; top: 26px; left: 0; right: 0; text-align: center;
  font-size: 13px; letter-spacing: .28em; text-transform: uppercase; opacity: .65;
}
.sp-frases { position: absolute; bottom: 64px; left: 0; right: 0; text-align: center; font-size: 15px; line-height: 1.9; padding: 0 24px; }
.sp-frases .frase { opacity: .9; }
.sp-frases .frase:nth-child(2) { opacity: .62; }
.sp-frases .frase:nth-child(3) { opacity: .42; }
.sp-dims { position: absolute; bottom: 26px; left: 0; right: 0; text-align: center; font-size: 12px; opacity: .5; letter-spacing: .06em; padding: 0 16px; }
.sp-controles { position: absolute; top: 26px; right: 30px; display: grid; gap: 8px; }
.sp-controles button {
  font-size: 12px; background: transparent; color: inherit;
  border: 1px solid rgba(236,231,219,.3); border-radius: 4px; padding: 6px 10px;
}
.sp-controles button:hover { background: rgba(236,231,219,.12); }
.sp-vacio { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); opacity: .4; font-size: 14px; }
.sp-canal { position: absolute; bottom: 26px; right: 30px; opacity: .45; font-size: 12px; text-decoration: none; }
`;

export function abrirSoundprint() {
  const root = document.createElement("div");
  root.className = "soundprint";
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  root.innerHTML = `
    <div class="sp-controles">
      <button class="sp-export">exportar png</button>
      <button class="sp-reset">reset</button>
      <button class="sp-cerrar">cerrar</button>
    </div>
    <div class="sp-marco">
      <div class="sp-cabecera">tu soundprint</div>
      <div class="sp-frases"></div>
      <div class="sp-dims"></div>
    </div>
    <a class="sp-canal" href="https://${CANAL_IG}" target="_blank">${CANAL_IG}</a>`;
  document.body.appendChild(root);
  const frasesEl = root.querySelector<HTMLElement>(".sp-frases")!;
  const dimsEl = root.querySelector<HTMLElement>(".sp-dims")!;

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const lado = 1024;
  renderer.setSize(lado, lado, false);
  root.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uT: { value: 0 },
    uSeed: { value: 0 }, // hash de la última query: el fondo cambia con ella
    uCount: { value: 0 },
    uStains: { value: Array.from({ length: MAX_MANCHAS }, () => new THREE.Vector4()) },
    uBirth: { value: new Float32Array(MAX_MANCHAS) },
  };
  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }",
        fragmentShader: `
          varying vec2 vUv;
          uniform float uT; uniform float uSeed; uniform int uCount;
          uniform vec4 uStains[${MAX_MANCHAS}]; uniform float uBirth[${MAX_MANCHAS}];
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
          }
          float fbm(vec2 p){ float v=0.0,a=0.5; for(int k=0;k<4;k++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
          void main(){
            vec2 uv = vUv*2.0-1.0;
            vec3 col = vec3(0.043,0.039,0.051);
            // fondo sembrado por la query: cada búsqueda pinta su propia base
            float base = fbm(uv*2.2 + uSeed*37.0);
            col += vec3(0.10,0.09,0.13) * base * 0.30;
            for(int i=0;i<${MAX_MANCHAS};i++){
              if(i>=uCount) break;
              vec4 s = uStains[i];
              float age = uT - uBirth[i];
              float aparece = smoothstep(0.0, 1.2, age);           // entrada animada
              float frescura = exp(-age*0.45);                     // pulso que decae
              vec2 d = uv - s.xy;
              float ang = s.z*6.2831;
              d = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*d;
              float r = length(d) / (0.75 + 0.25*aparece);
              float blob = smoothstep(0.55, 0.05, r + (fbm(d*4.0 + s.z*17.0 + uT*0.03)-0.5)*0.38);
              vec3 c = mix(vec3(0.30,0.36,0.52), vec3(0.92,0.58,0.26), s.w);
              float pulso = 1.0 + frescura*0.8*(0.7 + 0.3*sin(uT*3.2 + s.z*9.0));
              col += c * blob * 0.17 * aparece * pulso;
            }
            col += (hash(uv*537.0 + fract(uT) + uSeed)-0.5)*0.025;
            col *= 1.0 - 0.20*dot(uv,uv);
            col = pow(col, vec3(0.92));                            // más contraste
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    ),
  );

  function pinta() {
    const historial = leerHistorial();
    if (!historial.length) {
      const vacio = document.createElement("div");
      vacio.className = "sp-vacio";
      vacio.textContent = "cada búsqueda deja marca";
      root.appendChild(vacio);
      return;
    }
    root.querySelector(".sp-vacio")?.remove();

    // una mancha por canción única; el grosor crece con la repetición;
    // birth = cuándo se matcheó por última vez (las recientes pulsan)
    const pesos = new Map<string, { n: number; ultima: number; energia: number | null }>();
    let t = 0;
    for (const h of historial) {
      for (const m of h.matches) {
        const prev = pesos.get(m.slug) ?? { n: 0, ultima: 0, energia: null };
        if (typeof m.dims["energia"] === "number") prev.energia = m.dims["energia"] as number;
        pesos.set(m.slug, { ...prev, n: prev.n + 1, ultima: t });
      }
      t++;
    }
    // el color por energia se normaliza al rango observado: las claves son
    // inventables y su escala no se puede asumir (no siempre 0–10)
    const conEnergia = [...pesos.values()].filter((p) => p.energia !== null).map((p) => p.energia!);
    const eMin = conEnergia.length ? Math.min(...conEnergia) : 0;
    const eMax = conEnergia.length ? Math.max(...conEnergia) : 1;
    const colorDe = (slug: string, energia: number | null) => {
      if (energia === null) return hash01(slug, 7);
      return eMax > eMin ? (energia - eMin) / (eMax - eMin) : 0.5;
    };
    const entradas = [...pesos.entries()].slice(-MAX_MANCHAS);
    uniforms.uCount.value = entradas.length;
    entradas.forEach(([slug, info], i) => {
      const escala = 0.62 + Math.min(info.n, 4) * 0.09;
      uniforms.uStains.value[i].set(
        (hash01(slug, 1) * 2 - 1) * 0.62,
        (hash01(slug, 2) * 2 - 1) * 0.52,
        hash01(slug, 3) * escala,
        colorDe(slug, info.energia),
      );
      // la mancha nace cuando su canción volvió a matchear: las del último
      // top pulsan, las antiguas llevan siglos (3s por búsqueda de edad)
      const edad = (t - 1 - info.ultima) * 3;
      uniforms.uBirth.value[i] = uniforms.uT.value - edad;
    });
    uniforms.uSeed.value = hash01(historial.at(-1)?.q ?? "", 11);

    // palabras del autor: la primera frase del "Por qué" del último top 3
    const frases = (historial.at(-1)?.matches ?? []).map((m) => m.frase).filter(Boolean);
    frasesEl.innerHTML =
      frases.slice(0, 3).map((f) => `<div class="frase">${f}</div>`).join("") ||
      `<div class="frase" style="opacity:.35">cada búsqueda deja marca</div>`;

    // dimensiones: media de numéricas, valor dominante de categóricas
    const partes: string[] = [`${historial.length} búsquedas · ${pesos.size} canciones`];
    const nums = new Map<string, number[]>();
    const cats = new Map<string, Map<string, number>>();
    const vistos = new Set<string>();
    for (const h of historial) {
      for (const m of h.matches) {
        if (vistos.has(m.slug)) continue;
        vistos.add(m.slug);
        for (const [k, v] of Object.entries(m.dims)) {
          if (typeof v === "number") (nums.get(k) ?? nums.set(k, []).get(k)!).push(v);
          else {
            const mm = cats.get(k) ?? cats.set(k, new Map()).get(k)!;
            mm.set(v, (mm.get(v) ?? 0) + 1);
          }
        }
      }
    }
    for (const [k, vs] of nums)
      partes.push(`${k.replace(/_/g, " ")} ${(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1)}`);
    for (const [k, mm] of cats) {
      const top = [...mm.entries()].sort((a, b) => b[1] - a[1])[0];
      partes.push(`${k.replace(/_/g, " ")}: ${top[0]}${top[1] > 1 ? ` ×${top[1]}` : ""}`);
    }
    dimsEl.textContent = partes.join("  ·  ");
  }

  const reloj = new THREE.Clock();
  let vivo = true;
  (function anima() {
    if (!vivo) return;
    uniforms.uT.value = reloj.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(anima);
  })();
  pinta();

  function cerrar() {
    vivo = false;
    renderer.dispose();
    root.remove();
    style.remove();
  }
  root.querySelector<HTMLButtonElement>(".sp-cerrar")!.onclick = cerrar;
  root.querySelector<HTMLButtonElement>(".sp-reset")!.onclick = () => {
    try {
      localStorage.removeItem(LS);
    } catch {}
    pinta();
  };
  root.querySelector<HTMLButtonElement>(".sp-export")!.onclick = async () => {
    await document.fonts.ready;
    const L = 1200;
    const out = document.createElement("canvas");
    out.width = L;
    out.height = L;
    const g = out.getContext("2d")!;
    g.fillStyle = "#0b0a0d";
    g.fillRect(0, 0, L, L);
    g.drawImage(renderer.domElement, 0, 0, L, L);
    const mono = (px: number) => `${px}px "Departure Mono", monospace`;
    g.textAlign = "center";
    g.fillStyle = "#ece7db";
    g.font = mono(22);
    g.globalAlpha = 0.65;
    g.letterSpacing = "6px";
    g.fillText("TU SOUNDPRINT", L / 2, 84);
    g.letterSpacing = "0px";
    g.globalAlpha = 1;
    g.font = mono(20);
    [...frasesEl.querySelectorAll(".frase")].forEach((e, i) => {
      g.globalAlpha = [0.9, 0.62, 0.42][i] ?? 0.4;
      g.fillText(e.textContent ?? "", L / 2, L - 180 + i * 38);
    });
    g.globalAlpha = 0.5;
    g.font = mono(15);
    g.fillText(dimsEl.textContent ?? "", L / 2, L - 62);
    g.globalAlpha = 0.4;
    g.font = mono(14);
    g.fillText(CANAL_IG, L / 2, L - 30);
    const a = document.createElement("a");
    a.download = "soundprint.png";
    a.href = out.toDataURL("image/png");
    a.click();
  };
}
