// La herramienta diaria del autor: escribir una ficha desde el móvil, en la
// web pública (esfuerzo captura-web). DOM plano — decisión del informe
// docs/research/db-auth-y-ui-de-captura.md: nada de UI-3D para formularios.
// El token del autor viaja como Authorization: Bearer (HTTPS) mientras
// entra; la validación del núcleo es el mismo módulo compartido que valida
// el endpoint (functions/ficha.mjs). La plantilla es valor editable, no
// placeholder (ticket 12).
import { errorDeFicha, type FichaEntrante } from "../../functions/ficha.mjs";

type FichaWeb = {
  slug: string;
  titulo: string;
  artista: string;
  fecha: string;
  spotify: string | null;
  claves: string | null;
  cuerpo: string;
  estado: "borrador" | "publicada";
  borrado_pedido: number;
  editada_en: number;
};
type ResumenCatalogo = { slug: string; titulo: string; artista: string; fecha: string };
type EntradaIndice = FichaWeb & { body: string; dims: Record<string, string> };

const app = document.getElementById("app")!;

const css = `
@font-face {
  font-family: "Departure Mono";
  src: url("/fonts/DepartureMono-Regular.woff2") format("woff2");
  font-display: swap;
}
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh;
  font-family: "Departure Mono", ui-monospace, monospace;
  background: #0d0b09; color: #efe9df; line-height: 1.6;
}
main { max-width: 560px; margin: 0 auto; padding: 32px 20px calc(48px + env(safe-area-inset-bottom)); font-size: 14px; }
h1 { font-weight: 400; font-size: 20px; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 24px; }
h2 { font-weight: 400; font-size: 13px; margin: 32px 0 10px; opacity: .7; letter-spacing: .1em; text-transform: uppercase; }
label { display: block; margin: 14px 0 4px; opacity: .8; }
input, textarea {
  font: inherit; font-size: 16px; /* 16px: iOS no hace zoom al enfocar */
  width: 100%; color: inherit; background: rgba(239,233,223,.06);
  border: 1px solid rgba(239,233,223,.25); border-radius: 8px; padding: 10px 12px;
  outline: none;
}
input:focus, textarea:focus { border-color: #e8b17d; }
textarea { resize: vertical; min-height: 9em; }
button {
  font: inherit; cursor: pointer; color: inherit;
  background: rgba(239,233,223,.08); border: 1px solid rgba(239,233,223,.3);
  border-radius: 999px; padding: 12px 22px; margin-top: 16px;
}
button:hover { border-color: #e8b17d; color: #e8b17d; }
button:disabled { opacity: .4; cursor: default; }
.aviso {
  margin-top: 14px; padding: 10px 14px; border-radius: 8px; display: none;
  border: 1px solid rgba(239,233,223,.25); opacity: .85; white-space: pre-line;
}
.aviso.err { border-color: #b3541e; }
.aviso.ok { border-color: #7fc79c; }
.cabecera { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.salir { margin: 0; padding: 4px 12px; font-size: 12px; }
.fichas { list-style: none; margin: 0; padding: 0; }
.fichas li { display: flex; gap: 10px; align-items: baseline; padding: 9px 0; border-bottom: 1px solid rgba(239,233,223,.12); flex-wrap: wrap; }
.fichas .que { flex: 1; min-width: 0; }
.fichas .titulo { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fichas li.borrada .titulo { text-decoration: line-through; opacity: .5; }
.fichas .meta { font-size: 12px; opacity: .55; }
.estado { font-size: 11px; border: 1px solid rgba(239,233,223,.3); border-radius: 999px; padding: 1px 8px; opacity: .75; white-space: nowrap; }
.estado.borrador { border-color: #e8b17d; color: #e8b17d; }
.estado.publicada { border-color: #7fc79c; color: #7fc79c; }
.estado.borrado-pedido { border-color: #b3541e; color: #b3541e; }
.acciones { display: flex; gap: 6px; }
.acciones button { margin: 0; padding: 3px 10px; font-size: 12px; }
.claves { display: grid; gap: 6px; }
.claves .clave { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; }
.anadir-clave { margin-top: 8px; padding: 6px 14px; font-size: 12px; }
.fila-botones { display: flex; gap: 10px; }
.secundario { opacity: .75; padding: 12px 16px; font-size: 13px; }
.vacio { opacity: .55; }
.nota { font-size: 12px; opacity: .5; margin-top: 28px; }
.volver { display: inline-block; margin-top: 32px; font-size: 13px; opacity: .6; }
a { color: #e8b17d; }
`;

app.innerHTML = `
  <style>${css}</style>
  <main>
    <div class="cabecera"><h1>captura</h1><button class="salir" type="button" hidden>salir</button></div>

    <form class="login">
      <label for="token">token del autor</label>
      <input id="token" name="token" autocomplete="off" autocapitalize="off" spellcheck="false" />
      <button type="submit">entrar</button>
      <div class="aviso"></div>
    </form>

    <section class="taller" hidden>
      <h2>ficha nueva</h2>
      <form class="ficha">
        <label for="titulo">título</label>
        <input id="titulo" autocomplete="off" />
        <label for="artista">artista</label>
        <input id="artista" autocomplete="off" />
        <label for="fecha">fecha</label>
        <input id="fecha" type="date" />
        <label for="spotify">link de Spotify (opcional)</label>
        <input id="spotify" type="url" inputmode="url" placeholder="https://open.spotify.com/track/…" />
        <label for="cuerpo">la ficha</label>
        <textarea id="cuerpo"></textarea>
        <label>claves libres (las dimensiones: energia, momento_del_dia…)</label>
        <div class="claves"></div>
        <button type="button" class="anadir-clave">añadir clave</button>
        <div class="fila-botones">
          <button type="submit" value="publicada">publicar</button>
          <button type="submit" value="borrador" class="secundario">guardar borrador</button>
          <button type="button" class="secundario cancelar" hidden>cancelar edición</button>
        </div>
        <div class="aviso"></div>
      </form>

      <h2>tus fichas en la web</h2>
      <ul class="fichas"></ul>
      <p class="vacio" hidden>aún no hay fichas escritas desde la web.</p>
      <h2>del catálogo <span class="contador"></span></h2>
      <ul class="fichas catalogo"></ul>
      <p class="nota">lo publicado sale en las búsquedas al instante y el próximo deploy lo adopta a
      catalogo/. el borrador es tuyo: no lo ve nadie hasta que lo publicas. editar o borrar una ficha
      del catálogo abre su sombra en la web: la nueva versión se sirve por delante del deploy.</p>
    </section>

    <a class="volver" href="/">← volver</a>
  </main>`;

const login = app.querySelector<HTMLFormElement>(".login")!;
const loginAviso = login.querySelector<HTMLElement>(".aviso")!;
const taller = app.querySelector<HTMLElement>(".taller")!;
const salir = app.querySelector<HTMLButtonElement>(".salir")!;
const formFicha = app.querySelector<HTMLFormElement>(".ficha")!;
const avisoFicha = formFicha.querySelector<HTMLElement>(".aviso")!;
const ulFichas = app.querySelector<HTMLElement>(".fichas")!;
const ulCatalogo = app.querySelector<HTMLElement>(".catalogo")!;
const contador = app.querySelector<HTMLElement>(".contador")!;
const vacio = app.querySelector<HTMLElement>(".vacio")!;
const cancelar = formFicha.querySelector<HTMLButtonElement>(".cancelar")!;
const divClaves = formFicha.querySelector<HTMLElement>(".claves")!;
const [titulo, artista, fecha, spotify, cuerpo] = ["titulo", "artista", "fecha", "spotify", "cuerpo"].map(
  (id) => app.querySelector<HTMLInputElement>(`#${id}`)!,
);

// el token vive en la pestaña (sessionStorage), no en localStorage: la
// cookie __Host- del ticket 06 será su reemplazo con mejor casa. Storage
// bloqueado: el autor re-entra el token, nada persistido.
const CLAVE_TOKEN = "token-autor";
const leerToken = (): string | null => {
  try {
    return sessionStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
};
const guardarToken = (t: string) => {
  try {
    sessionStorage.setItem(CLAVE_TOKEN, t);
  } catch {}
};
const olvidarToken = () => {
  try {
    sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {}
};
let token: string | null = leerToken();

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2,"0")}`;
};
fecha.value = hoy();
// la plantilla es valor editable, no placeholder que desaparece al entrar:
// el autor parte de las secciones sugeridas y borra o edita lo que quiera
// (sugerencia, nunca obligación — ticket 12)
const PLANTILLA = "## Por qué esta canción\n\n## Para cuándo\n\n## Escucha";
cuerpo.value = PLANTILLA;

const filaClave = (clave = "", valor = "") => {
  const fila = document.createElement("div");
  fila.className = "clave";
  fila.innerHTML = `<input placeholder="energia" /><input placeholder="7" /><button type="button">quitar</button>`;
  const [c, v] = [...fila.querySelectorAll<HTMLInputElement>("input")];
  c.value = clave;
  v.value = valor;
  fila.querySelector("button")!.onclick = () => fila.remove();
  divClaves.appendChild(fila);
};
formFicha.querySelector<HTMLButtonElement>(".anadir-clave")!.onclick = () => filaClave();

// la ficha en edición (05): null = ficha nueva. El índice público alimenta
// el prefill de las adoptadas (cuerpo y claves viven ahí, en claro)
let editando: string | null = null;
let indicePublico: EntradaIndice[] | null = null;
const entradaDeIndice = async (slug: string) => {
  if (!indicePublico) indicePublico = (await (await fetch("/index.json")).json()) as EntradaIndice[];
  return indicePublico.find((e) => e.slug === slug);
};

const botonAccion = (texto: string, haz: () => void) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = texto;
  b.onclick = haz;
  return b;
};

function prefill(f: {
  slug: string;
  titulo: string;
  artista: string;
  fecha: string;
  spotify?: string | null;
  cuerpo?: string;
  claves?: { clave: string; valor: string | number }[] | string | null;
}) {
  editando = f.slug;
  titulo.value = f.titulo;
  artista.value = f.artista;
  fecha.value = f.fecha;
  spotify.value = f.spotify ?? "";
  cuerpo.value = f.cuerpo ?? PLANTILLA;
  divClaves.replaceChildren();
  const claves = typeof f.claves === "string" ? (JSON.parse(f.claves) as { clave: string; valor: string }[]) : f.claves ?? [];
  for (const { clave, valor } of claves) filaClave(clave, String(valor));
  cancelar.hidden = false;
  avisa(avisoFicha, `editando: ${f.slug} — guarda para publicar la nueva versión`, "ok");
  formFicha.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fichaNueva() {
  editando = null;
  cancelar.hidden = true;
  formFicha.reset();
  fecha.value = hoy();
  cuerpo.value = PLANTILLA;
  divClaves.replaceChildren();
  avisoFicha.style.display = "none";
}
cancelar.onclick = fichaNueva;

async function borrar(slug: string) {
  if (!confirm(`¿borrar ${slug}? si ya es del catálogo, deja de salir en las búsquedas ya y el próximo deploy la quita del todo.`)) return;
  const r = await api(`/api/captura?slug=${encodeURIComponent(slug)}`, avisoFicha, { method: "DELETE" });
  if (!r) return;
  if (r.ok) {
    const { oculta } = (await r.json()) as { oculta: boolean };
    avisa(avisoFicha, oculta ? `oculta ya: ${slug} — el próximo deploy la quita del catálogo` : `borrada: ${slug}`, "ok");
    await pintarSesion();
  } else avisa(avisoFicha, await r.text(), "err");
}

function avisa(el: HTMLElement, texto: string, tono: "err" | "ok") {
  el.textContent = texto;
  el.className = `aviso ${tono}`;
  el.style.display = "block";
}

// fetch con el Bearer; si la red falla devuelve null y el aviso ya lo dice
// — marcar/guardar no puede quedar en promesa rechazada sin feedback
async function api(ruta: string, aviso: HTMLElement, init: RequestInit = {}): Promise<Response | null> {
  try {
    return await fetch(ruta, {
      ...init,
      headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` },
    });
  } catch {
    avisa(aviso, "sin respuesta del servidor — prueba otra vez", "err");
    return null;
  }
}

function cerrarSesion() {
  token = null;
  olvidarToken();
  login.hidden = false;
  salir.hidden = true;
  taller.hidden = true;
}

// pinta el taller si el token vale; false si no hay sesión o no es válida
async function pintarSesion(): Promise<boolean> {
  if (!token) return false;
  const r = await api("/api/captura", loginAviso);
  if (!r) return false; // red caída: sesión intacta, el aviso ya lo dice
  if (!r.ok) {
    avisa(loginAviso, "no autorizado", "err");
    cerrarSesion();
    return false;
  }
  const { fichas, catalogo } = (await r.json()) as { fichas: FichaWeb[]; catalogo: ResumenCatalogo[] };
  login.hidden = true;
  salir.hidden = false;
  taller.hidden = false;
  vacio.hidden = fichas.length > 0;
  ulFichas.replaceChildren(
    ...fichas.map((f) => {
      const li = document.createElement("li");
      if (f.borrado_pedido) li.classList.add("borrada");
      const estado = f.borrado_pedido
        ? '<span class="estado borrado-pedido">borrado pedido</span>'
        : `<span class="estado ${f.estado}">${f.estado}</span>`;
      li.innerHTML = `
        <span class="que">
          <span class="titulo"></span>
          <span class="meta"></span>
        </span>
        ${estado}
        <span class="acciones"></span>`;
      li.querySelector<HTMLElement>(".titulo")!.textContent = `${f.titulo} — ${f.artista}`;
      li.querySelector<HTMLElement>(".meta")!.textContent = f.fecha;
      const acciones = li.querySelector<HTMLElement>(".acciones")!;
      if (!f.borrado_pedido) {
        if (f.estado === "borrador")
          acciones.appendChild(
            botonAccion("publicar", async () => {
              const r2 = await api("/api/captura/publicar", avisoFicha, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slug: f.slug }),
              });
              if (r2?.ok) avisa(avisoFicha, `publicada: ${f.slug} — ya sale en las búsquedas`, "ok");
              else if (r2) avisa(avisoFicha, await r2.text(), "err");
              await pintarSesion();
            }),
          );
        acciones.appendChild(botonAccion("editar", () => prefill(f)));
        acciones.appendChild(botonAccion("borrar", () => borrar(f.slug)));
      }
      return li;
    }),
  );
  // el catálogo: adoptadas o nacidas locales — editar abre su sombra en la web
  contador.textContent = catalogo.length ? `(${catalogo.length})` : "";
  ulCatalogo.replaceChildren(
    ...catalogo.map((f) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="que">
          <span class="titulo"></span>
          <span class="meta"></span>
        </span>
        <span class="estado">catálogo</span>
        <span class="acciones"></span>`;
      li.querySelector<HTMLElement>(".titulo")!.textContent = `${f.titulo} — ${f.artista}`;
      li.querySelector<HTMLElement>(".meta")!.textContent = f.fecha;
      const acciones = li.querySelector<HTMLElement>(".acciones")!;
      acciones.appendChild(
        botonAccion("editar", async () => {
          const e = await entradaDeIndice(f.slug);
          if (!e) return avisa(avisoFicha, `no encuentro ${f.slug} en el índice — recarga`, "err");
          prefill({
            slug: f.slug,
            titulo: e.titulo,
            artista: e.artista,
            fecha: e.fecha,
            spotify: e.spotify,
            cuerpo: e.body,
            claves: Object.entries(e.dims ?? {}).map(([clave, valor]) => ({ clave, valor })),
          });
        }),
      );
      acciones.appendChild(botonAccion("borrar", () => borrar(f.slug)));
      return li;
    }),
  );
  return true;
}

login.onsubmit = async (e) => {
  e.preventDefault();
  const t = (app.querySelector<HTMLInputElement>("#token")!.value || "").trim();
  if (!t) return avisa(loginAviso, "pon el token del autor", "err");
  token = t;
  if (await pintarSesion()) {
    guardarToken(t);
    loginAviso.style.display = "none";
  }
};

salir.onclick = cerrarSesion;

formFicha.onsubmit = async (e) => {
  e.preventDefault();
  avisoFicha.style.display = "none";
  const estado = (e.submitter as HTMLButtonElement | null)?.value === "borrador" ? "borrador" : "publicada";
  const ficha: FichaEntrante & { estado: string } = {
    titulo: titulo.value.trim(),
    artista: artista.value.trim(),
    fecha: fecha.value,
    spotify: spotify.value.trim(), // vacío → null en la fila: link opcional de verdad
    cuerpo: cuerpo.value,
    estado,
    claves: [...divClaves.querySelectorAll<HTMLDivElement>(".clave")].map((f) => {
      const [c, v] = [...f.querySelectorAll<HTMLInputElement>("input")];
      return { clave: c.value.trim(), valor: v.value.trim() };
    }),
  };
  // el mismo módulo compartido del endpoint: el error se ve aquí, no tras la ida
  const error = errorDeFicha(ficha);
  if (error) return avisa(avisoFicha, error, "err");

  const boton = e.submitter as HTMLButtonElement;
  boton.disabled = true;
  try {
    const r = await api("/api/captura", avisoFicha, {
      method: editando ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editando ? { slug: editando, ficha } : ficha),
    });
    if (!r) return; // red caída: el aviso ya lo dice
    if (r.status === 201 || r.ok) {
      const { slug } = (await r.json()) as { slug: string };
      avisa(
        avisoFicha,
        editando
          ? `guardada la edición: ${slug} — la nueva versión se sirve ya, por delante del deploy`
          : estado === "borrador"
            ? `borrador guardado: ${slug} — invisible hasta que lo publiques`
            : `publicada: ${slug} — ya sale en las búsquedas`,
        "ok",
      );
      indicePublico = null; // la sombra cambia lo que se sirve: sin caché vieja
      fichaNueva();
      await pintarSesion();
    } else {
      avisa(avisoFicha, await r.text(), "err");
    }
  } finally {
    boton.disabled = false;
  }
};

if (token) await pintarSesion();
