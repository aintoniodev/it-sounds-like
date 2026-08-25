// La página de privacidad del sitio público: la verdad de las tablas de D1
// en lenguaje claro, campo por campo, y el borrado del identificador del
// visitante — que elimina el hash del navegador, su historial local y las
// filas de D1 que lo llevan. Sin frases legales. Actualizada con lo que
// guarda la captura del autor (captura-web) sin tocar la promesa al
// visitante: seguirá sin haber IP, cookies ni user-agent para quien busca.
import { leerVisitante, borrarVisitante } from "./identidad";

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
  background: #0d0b09; color: #efe9df; line-height: 1.7;
}
main { max-width: 640px; margin: 0 auto; padding: 48px 24px 80px; font-size: 14px; }
h1 { font-weight: 400; font-size: 20px; letter-spacing: .12em; text-transform: uppercase; }
h2 { font-weight: 400; font-size: 15px; margin: 36px 0 8px; opacity: .85; }
p { opacity: .85; }
a { color: #e8b17d; }
dl { margin: 0; }
dl div { display: flex; gap: 16px; padding: 9px 0; border-bottom: 1px solid rgba(239,233,223,.12); }
dt { flex: 0 0 150px; opacity: 1; }
dt code { font: inherit; color: #e8b17d; }
dd { margin: 0; opacity: .75; }
.borrar {
  font: inherit; font-size: 14px; cursor: pointer; margin-top: 8px;
  background: rgba(179,84,30,.25); border: 1px solid #b3541e; border-radius: 999px;
  color: inherit; padding: 10px 22px;
}
.borrar:hover { background: rgba(179,84,30,.45); }
.hecho { margin-top: 16px; padding: 12px 16px; border: 1px solid rgba(239,233,223,.25); border-radius: 8px; opacity: .85; display: none; }
.volver { display: inline-block; margin-top: 40px; font-size: 13px; opacity: .6; }
`;

app.innerHTML = `
  <style>${css}</style>
  <main>
    <h1>privacidad</h1>
    <p>Esto es todo lo que este sitio guarda de ti. Lo demás —tu IP, cookies,
    user-agent— no se guarda: no existen en la tabla.</p>

    <h2>qué se guarda cada vez que marcas clavo o no me encaja</h2>
    <dl>
      <div><dt><code>query</code></dt><dd>lo que escribiste al buscar, en claro. Es sentimiento, y así se usa: búsquedas parecidas refuerzan fichas parecidas.</dd></div>
      <div><dt><code>ficha</code></dt><dd>la canción que marcaste.</dd></div>
      <div><dt><code>accion</code></dt><dd>clavo o no me encaja.</dd></div>
      <div><dt><code>ts</code></dt><dd>cuándo, en milisegundos. Todo se borra a los 90 días, solito.</dd></div>
      <div><dt><code>rank_pre_boost</code></dt><dd>tu puesto en el top cuando marcaste.</dd></div>
      <div><dt><code>visitante</code></dt><dd>un hash aleatorio generado por tu navegador. Es la única identidad: sin cuenta, sin email, sin nada que te señale.</dd></div>
      <div><dt><code>qvec</code></dt><dd>tu búsqueda convertida a 1024 números (un embedding), para calcular parecido entre búsquedas. No identifica a nadie.</dd></div>
    </dl>

    <h2>quién ve esto</h2>
    <p>El autor del catálogo, y nadie más: no hay telemetría de terceros, no
    hay analítica aparte de esta tabla. Con ella el sitio aprende qué fichas
    clavan y cuáles no.</p>

    <h2>lo que guarda la captura del autor</h2>
    <p>Si solo buscas, nada de esto te toca. El autor escribe fichas desde
    <code>/captura</code> con un token privado, y eso guarda tres cosas más:</p>
    <dl>
      <div><dt><code>fichas_web</code></dt><dd>las fichas que el autor escribe desde el móvil, con su contenido, hasta el próximo deploy las adopta el catálogo (git). Borrarlas está en su mano, desde la propia captura.</dd></div>
      <div><dt><code>intentos_login</code></dt><dd>si alguien intenta entrar con tokens equivocados, tu IP y un contador durante una ventana de 10 minutos. Es la puerta anti-fuerza-bruta: a los cinco fallos se bloquea y la fila se purga al día.</dd></div>
      <div><dt><code>publicaciones</code></dt><dd>si un post a Instagram (del autor, al guardar una ficha) salió, quedó pendiente o falló, y con qué portada y caption. Del autor, para el autor.</dd></div>
    </dl>
    <p>La sesión del autor es una cookie <code>__Host-</code> HttpOnly que caduca sola
    en 12 horas. Para quien busca sigue sin haber cookies, IP ni user-agent.</p>

    <h2>borrar tu identificador</h2>
    <p>Elimina el hash de tu navegador y borra las filas que lo llevan. Tus
    próximas visitas empiezan de cero.</p>
    <button class="borrar" type="button">borrar mi identificador</button>
    <div class="hecho"></div>

    <a class="volver" href="/">← volver</a>
  </main>`;

const hecho = app.querySelector<HTMLElement>(".hecho")!;
app.querySelector<HTMLButtonElement>(".borrar")!.onclick = async () => {
  const visitante = leerVisitante();
  borrarVisitante();
  let filas: number | null = null;
  if (visitante) {
    try {
      const r = await fetch("/api/privacidad", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitante }),
      });
      if (r.ok) filas = (await r.json()).borradas ?? 0;
    } catch {}
  }
  hecho.style.display = "block";
  if (!visitante) {
    hecho.textContent =
      "no había identificador guardado en este navegador. si alguna vez marcó algo sin poder guardarlo, esas filas no llevan tu huella y se purgan a los 90 días.";
    return;
  }
  hecho.textContent =
    filas === null
      ? "tu hash y tu historial local ya no están; no pude alcanzar al servidor para borrar tus filas — se purgan solas a los 90 días."
      : filas > 0
        ? `hecho: tu hash y tu historial local borrados, y ${filas} ${filas === 1 ? "marca tuya eliminada" : "marcas tuyas eliminadas"} de la base. si vuelves, empiezas de cero.`
        : "hecho: tu hash y tu historial local borrados. no había marcas tuyas en la base (se purgan a los 90 días).";
};
