// Prototipo UI (ticket 07): tres variantes estructuralmente distintas del flujo
// de búsqueda, cambiables con ?variant= y la barra inferior. PROTOTIPO DESECHABLE.
import "./lib/ui.css";
import { mountSwitcher, variantFromURL, type VariantDef } from "./lib/switcher";
import * as cartel from "./variants/cartel";
import * as escenario from "./variants/escenario";
import * as constelacion from "./variants/constelacion";

const defs: VariantDef[] = [
  { key: "cartel", name: "Cartel editorial", mount: cartel.mount },
  { key: "escenario", name: "Escenario de portadas", mount: escenario.mount },
  { key: "constelacion", name: "Constelación (soundprint en ciernes)", mount: constelacion.mount },
];

const app = document.getElementById("app")!;
let current = variantFromURL(defs);
let unmountPrev: (() => void) | undefined;

function render() {
  unmountPrev?.();
  app.innerHTML = "";
  document.querySelectorAll("style[data-variant]").forEach((s) => s.remove());
  const def = defs.find((d) => d.key === current)!;
  void def.mount(app);
}
function go(key: string) {
  current = key;
  const url = new URL(location.href);
  url.searchParams.set("variant", key);
  history.replaceState(null, "", url);
  render();
  sw.sync();
}

const host = document.createElement("div");
document.body.appendChild(host);
const sw = mountSwitcher(host, defs, () => current, go);
render();
