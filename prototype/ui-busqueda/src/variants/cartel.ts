// Variante A · Cartel editorial: la palabra es la protagonista. Papel, tinta,
// tipografía grande, resultados como un índice numerado. Sin 3D.
import { loadIndex, getExtractor, rank, dimensiones, secciones, type Ficha, type Filtros } from "../lib/api";

const css = `
.cartel { min-height: 100%; padding: 8vh 8vw 14vh; }
.cartel .marca { font-size: 13px; letter-spacing: 0.35em; text-transform: uppercase; opacity: 0.55; }
.cartel h1 { font-size: clamp(34px, 6vw, 72px); font-weight: 400; margin: 4vh 0 1vh; }
.cartel .pregunta {
  width: 100%; font: inherit; font-size: clamp(20px, 3vw, 34px);
  border: 0; border-bottom: 1px solid rgba(22,19,15,.35); background: transparent;
  padding: 8px 2px; outline: none;
}
.cartel .pregunta::placeholder { color: rgba(22,19,15,.3); }
.cartel .filtros { margin: 14px 0 0; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; display: flex; gap: 18px; flex-wrap: wrap; opacity: .85; }
.cartel .filtros label { display: inline-flex; gap: 8px; align-items: center; }
.cartel .chip { border: 1px solid rgba(22,19,15,.25); background: none; border-radius: 999px; padding: 2px 12px; }
.cartel .chip[aria-pressed="true"] { background: var(--tinta); color: var(--papel); }
.cartel .resultados { margin-top: 7vh; }
.cartel .res { display: grid; grid-template-columns: 72px 1fr; gap: 20px; padding: 4vh 0; border-top: 1px solid rgba(22,19,15,.18); }
.cartel .num { font-size: 30px; opacity: .35; }
.cartel .res h3 { font-size: clamp(22px, 2.6vw, 34px); font-weight: 400; margin: 0 0 6px; }
.cartel .res .cita { font-size: clamp(16px, 1.6vw, 20px); max-width: 62ch; margin: 0; white-space: pre-line; }
.cartel .res .meta { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; margin-top: 14px; opacity: .75; }
.cartel .res .meta a { text-decoration: none; border-bottom: 1px solid rgba(22,19,15,.4); }
.cartel .regla { height: 2px; background: var(--acento); margin-top: 14px; }
`;

export async function mount(root: HTMLElement) {
  const style = document.createElement("style");
  style.textContent = css;
  style.dataset.variant = "1";
  document.head.appendChild(style);

  const index: Ficha[] = await loadIndex();
  const dims = dimensiones(index);
  const filtros: Filtros = { max: {}, en: {} };

  root.innerHTML = `
  <div class="cartel">
    <div class="marca">it sounds like</div>
    <h1>¿Cómo quieres que te suene?</h1>
    <input class="pregunta" placeholder="descríbelo: algo triste para un domingo de lluvia…" autocomplete="off" />
    <div class="filtros"></div>
    <div class="resultados"></div>
  </div>`;
  const input = root.querySelector<HTMLInputElement>(".pregunta")!;
  const out = root.querySelector<HTMLElement>(".resultados")!;
  const estado = document.createElement("div");
  estado.className = "estado";
  root.querySelector(".filtros")!.after(estado);

  const extractor = await getExtractor((s) => (estado.textContent = s));
  estado.textContent = `modelo listo · ${index.length} fichas`;

  // filtros: slider por dimensión numérica, chips por categórica
  const froot = root.querySelector<HTMLElement>(".filtros")!;
  for (const d of dims.numericas) {
    const lab = document.createElement("label");
    lab.innerHTML = `${d.key} ≤ <span></span><input type="range" min="${d.min}" max="${d.max}" value="${d.max}" step="1" />`;
    const rng = lab.querySelector<HTMLInputElement>("input")!;
    const val = lab.querySelector("span")!;
    rng.oninput = () => {
      val.textContent = rng.value;
      filtros.max[d.key] = Number(rng.value) === d.max ? undefined as never : Number(rng.value);
      if (Number(rng.value) === d.max) delete filtros.max[d.key];
      buscar();
    };
    froot.appendChild(lab);
  }
  for (const d of dims.categoricas) {
    for (const v of d.valores) {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = v;
      b.setAttribute("aria-pressed", "false");
      b.onclick = () => {
        const on = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", String(!on));
        const set = new Set(filtros.en[d.key] ?? []);
        on ? set.delete(v) : set.add(v);
        if (set.size) filtros.en[d.key] = [...set];
        else delete filtros.en[d.key];
        buscar();
      };
      froot.appendChild(b);
    }
  }

  let timer: ReturnType<typeof setTimeout>;
  input.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(buscar, 250);
  };

  async function buscar() {
    const q = input.value.trim();
    if (!q) { out.innerHTML = ""; return; }
    estado.textContent = "buscando…";
    const qvec = await extractor(q);
    const res = rank(index, qvec, filtros);
    estado.textContent = `modelo listo · ${index.length} fichas`;
    out.innerHTML = "";
    res.forEach((r, i) => {
      const s = secciones(r.ficha.body);
      const cita = s["por qué"] ?? s["intro"] ?? r.ficha.body;
      const div = document.createElement("div");
      div.className = "res";
      div.innerHTML = `
        <div class="num">${i + 1}</div>
        <div>
          <h3>${r.ficha.titulo} — ${r.ficha.artista}</h3>
          <p class="cita">${cita}</p>
          ${s["escucha"] ? `<p class="cita" style="font-style:italic; opacity:.8">Escucha: ${s["escucha"]}</p>` : ""}
          <div class="meta">
            ${r.ficha.spotify ? `<a href="${r.ficha.spotify}" target="_blank">escuchar</a> · ` : ""}
            ${Object.entries(r.ficha.dims).map(([k, v]) => `${k}: ${v}`).join(" · ")}
          </div>
          <div class="regla" style="width:${Math.max(4, Math.round(r.score * 100))}%"></div>
        </div>`;
      out.appendChild(div);
    });
  }
}
