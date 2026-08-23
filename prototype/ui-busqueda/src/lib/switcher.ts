// Barra cambiadora flotante (disciplina de prototipo UI): flechas, etiqueta,
// ?variant= en la URL, flechas del teclado, invisible en build de producción.
export interface VariantDef {
  key: string;
  name: string;
  mount: (el: HTMLElement) => Promise<void> | void;
  unmount?: () => void;
}

export function variantFromURL(defs: VariantDef[]): string {
  const v = new URLSearchParams(location.search).get("variant") ?? defs[0].key;
  return defs.some((d) => d.key === v) ? v : defs[0].key;
}

export function mountSwitcher(root: HTMLElement, defs: VariantDef[], current: () => string, go: (key: string) => void) {
  const bar = document.createElement("div");
  bar.className = "proto-switcher";
  const label = () => {
    const d = defs.find((x) => x.key === current())!;
    return `${d.key.toUpperCase()} · ${d.name}`;
  };
  bar.innerHTML = `
    <button aria-label="anterior">←</button>
    <span class="proto-label"></span>
    <button aria-label="siguiente">→</button>`;
  const [prev, next] = [...bar.querySelectorAll("button")];
  const cycle = (dir: 1 | -1) => {
    const i = defs.findIndex((d) => d.key === current());
    go(defs[(i + dir + defs.length) % defs.length].key);
  };
  prev.onclick = () => cycle(-1);
  next.onclick = () => cycle(1);
  const sync = () => (bar.querySelector(".proto-label")!.textContent = label());
  sync();
  root.appendChild(bar);
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "ArrowLeft") cycle(-1);
    if (e.key === "ArrowRight") cycle(1);
  };
  window.addEventListener("keydown", onKey);
  return { sync };
}
