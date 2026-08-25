// La herramienta diaria del autor: escribir una ficha desde el móvil, en la
// web pública (tracer del esfuerzo captura-web). DOM plano — decisión del
// informe docs/research/db-auth-y-ui-de-captura.md: nada de UI-3D para
// formularios. El token del autor viaja como Authorization: Bearer (HTTPS);
// queda en sessionStorage de la pestaña hasta que el ticket 06 lo sustituya
// por una cookie __Host- HttpOnly. La validación del núcleo es el mismo
// módulo compartido que valida el endpoint (functions/ficha.mjs).
import { errorDeFicha, type FichaEntrante } from "../../functions/ficha.mjs";

type FichaWeb = {
  slug: string;
  titulo: string;
  artista: string;
  fecha: string;
  estado: "borrador" | "publicada";
  editada_en: number;
};

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
.fichas li { display: flex; gap: 10px; align-items: baseline; padding: 9px 0; border-bottom: 1px solid rgba(239,233,223,.12); }
.fichas .que { flex: 1; min-width: 0; }
.fichas .titulo { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fichas .meta { font-size: 12px; opacity: .55; }
.estado { font-size: 11px; border: 1px solid rgba(239,233,223,.3); border-radius: 999px; padding: 1px 8px; opacity: .75; white-space: nowrap; }
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
        <textarea id="cuerpo" placeholder="## Por qué esta canción&#10;&#10;## Para cuándo&#10;&#10;## Escucha"></textarea>
        <button type="submit">guardar ficha</button>
        <div class="aviso"></div>
      </form>

      <h2>tus fichas en la web</h2>
      <ul class="fichas"></ul>
      <p class="vacio" hidden>aún no hay fichas escritas desde la web.</p>
      <p class="nota">lo que guardas aquí vive en la web hasta el próximo deploy: el CI lo adopta a
      catalogo/ y pasa a ser del catálogo. nada sale en búsquedas todavía.</p>
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
const vacio = app.querySelector<HTMLElement>(".vacio")!;
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
fecha.value = hoy();

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
  const { fichas } = (await r.json()) as { fichas: FichaWeb[] };
  login.hidden = true;
  salir.hidden = false;
  taller.hidden = false;
  vacio.hidden = fichas.length > 0;
  ulFichas.replaceChildren(
    ...fichas.map((f) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="que">
          <span class="titulo"></span>
          <span class="meta"></span>
        </span>
        <span class="estado"></span>`;
      li.querySelector<HTMLElement>(".titulo")!.textContent = `${f.titulo} — ${f.artista}`;
      li.querySelector<HTMLElement>(".meta")!.textContent = f.fecha;
      li.querySelector<HTMLElement>(".estado")!.textContent = f.estado;
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
  const ficha: FichaEntrante = {
    titulo: titulo.value.trim(),
    artista: artista.value.trim(),
    fecha: fecha.value,
    spotify: spotify.value.trim(), // vacío → null en la fila: link opcional de verdad
    cuerpo: cuerpo.value,
  };
  // el mismo módulo compartido del endpoint: el error se ve aquí, no tras la ida
  const error = errorDeFicha(ficha);
  if (error) return avisa(avisoFicha, error, "err");

  const boton = formFicha.querySelector<HTMLButtonElement>("button")!;
  boton.disabled = true;
  try {
    const r = await api("/api/captura", avisoFicha, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ficha),
    });
    if (!r) return; // red caída: el aviso ya lo dice
    if (r.status === 201) {
      const { slug } = (await r.json()) as { slug: string };
      avisa(avisoFicha, `guardada: ${slug}`, "ok");
      formFicha.reset();
      fecha.value = hoy();
      await pintarSesion();
    } else {
      avisa(avisoFicha, await r.text(), "err");
    }
  } finally {
    boton.disabled = false;
  }
};

if (token) await pintarSesion();
