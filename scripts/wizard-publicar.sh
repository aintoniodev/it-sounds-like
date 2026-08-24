#!/usr/bin/env bash
#
# Wizard de publicación de it sounds like (ticket 05 del mapa de publicación).
# Camina por los pasos que solo un humano puede hacer: cuenta y token de
# Cloudflare, Account ID, y la creación del repo + push + secrets.
# Generado con la skill /wizard. Efímero: bórralo cuando el mapa cierre.
#
# Everything above the "STAGES" marker is the wizard library: do not hand-edit
# it. Author the per-step stages below the marker.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library: delightful, consistent UX, identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

# Author sets this at the top of the stages section.
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

# _clear wipes the terminal so only the current step is on screen. No-op when
# output isn't a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

# banner "Title" shows the opening frame: what this wizard does.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" clears the screen, then announces a stage and shows progress.
# Clearing keeps only the current step on screen.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." prints a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." is a numbered-feeling action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL opens it in the human's browser, cross-platform incl. WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else warn "couldn't open a browser; visit it manually: $url"; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser, so visit it manually: $url"
}

# pause "msg" waits for the human to confirm they've done the manual part.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" is a y/N gate; returns success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY: current value of KEY in ENV_FILE, if any.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

# ask KEY "Prompt" reads a value into $KEY. Offers the existing .env value as
# a default on re-runs (Enter keeps it). Visible input (non-secret).
ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" is like ask, but input is hidden.
ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE upserts KEY=VALUE into ENV_FILE (creates it; replaces
# any existing line). Idempotent.
write_env() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE sets a GitHub Actions repo secret via gh. Falls back
# to a warning (and records it) if gh is unavailable or unauthenticated.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name: gh not ready; set it later"
}

# set_var NAME VALUE sets a GitHub Actions repo variable (non-secret).
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name, gh not ready; set it later"
}

# finish clears, then shows a closing summary of everything configured.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES: wizard de publicación de it sounds like
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=8

# El wizard escribe .env relativo al repo: ejecútalo desde la raíz.
if [[ ! -d ".scratch/publicacion" ]]; then
  echo "ejecuta este script desde la raíz del repo (ahi vive .env y .scratch/)" >&2
  exit 1
fi

banner "Publicar it sounds like (Cloudflare + GitHub)"

# ── 1. Decisiones del repo ────────────────────────────────────────────────
stage "Repo: nombre y visibilidad"
say "El repo remoto se crea en tu cuenta de GitHub (aintoniodev) con gh, ya autenticado."
ask REPO_NAME "Nombre del repo [it-sounds-like]:"
[[ -z "$REPO_NAME" ]] && REPO_NAME="it-sounds-like"
REPO_VISIBILITY=$(_existing REPO_VISIBILITY || true)
while [[ ! "$REPO_VISIBILITY" =~ ^(privado|publico)$ ]]; do
  printf '  %sVisibilidad: privado o publico? %s[recomendado: privado — las fichas son sentimientos personales; el deploy funciona igual]%s ' "$BOLD" "$DIM" "$RESET"
  read -r REPO_VISIBILITY || true
done
write_env REPO_NAME "$REPO_NAME"
write_env REPO_VISIBILITY "$REPO_VISIBILITY"
if [[ "$REPO_VISIBILITY" == "publico" ]]; then
  warn "publico: cualquiera podra leer las fichas del catalogo. Cambialo despues con: gh repo edit --visibility private"
fi

# ── 2. Cloudflare: cuenta ─────────────────────────────────────────────────
stage "Cloudflare: entra o crea la cuenta"
open_url "https://dash.cloudflare.com/login"
step "Inicia sesion o create una cuenta (el plan Free sirve para todo lo de este mapa)."
note "No hay nada que copiar en esta etapa."
pause "Cuando estes dentro del dashboard, Enter para continuar."

# ── 3. Cloudflare: API token ──────────────────────────────────────────────
stage "Cloudflare: API token"
open_url "https://dash.cloudflare.com/profile/api-tokens"
step "Create Token (boton arriba a la derecha)."
step "Baja hasta 'Custom token' y 'Get started'."
step "Nombre: it-sounds-like (el que quieras, es solo etiqueta)."
step "Permisos (tres desplegables):"
note "  Account · Cloudflare Pages · Edit"
note "  Account · Workers AI · Edit"
step "Continuar hasta el final y 'Create Token'."
step "Copia el token que se muestra UNA sola vez."
ask_secret CF_API_TOKEN "Pega el token:"
write_env CF_API_TOKEN "$CF_API_TOKEN"

# ── 4. Cloudflare: Account ID ─────────────────────────────────────────────
stage "Cloudflare: Account ID"
open_url "https://dash.cloudflare.com/"
step "En la pagina de inicio de la cuenta, el Account ID esta en la columna derecha ('Account ID')."
step "Click en 'Copy' (o copialo a mano). Es un hex de 32 caracteres; no es secreto."
ask CF_ACCOUNT_ID "Pega el Account ID:"
write_env CF_ACCOUNT_ID "$CF_ACCOUNT_ID"

# ── 5. Verificación del token ─────────────────────────────────────────────
stage "Verificar token contra Workers AI"
say "Llamo al endpoint de embeddings de bge-m3 con un input de prueba. Si falla, revisa los permisos del token."
if RESP=$(CF_API_TOKEN="$CF_API_TOKEN" CF_ACCOUNT_ID="$CF_ACCOUNT_ID" node --input-type=module -e '
const [tok, acc] = [process.env.CF_API_TOKEN, process.env.CF_ACCOUNT_ID];
const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acc}/ai/run/@cf/baai/bge-m3`, {
  method: "POST", headers: { Authorization: `Bearer ${tok}`, "content-type": "application/json" },
  body: JSON.stringify({ text: ["prueba"] }),
});
const j = await r.json();
if (!j.success) { console.error(JSON.stringify(j.errors)); process.exit(1); }
const dims = j.result.data[0].length;
console.log(dims === 1024 ? "OK 1024 dims" : `responde pero con ${dims} dims (esperaba 1024)`);
' 2>&1); then
  printf '  %s✓ %s%s\n' "$GREEN" "$RESP" "$RESET"
else
  printf '  %s✗ %s%s\n' "$RED" "$RESP" "$RESET"
  warn "El token no funciona con Workers AI. Vuelve a la etapa anterior (re-ejecuta el wizard) y revisa el permiso Account/Workers AI/Edit."
  exit 1
fi
set_secret CF_API_TOKEN "$CF_API_TOKEN"
set_secret CF_ACCOUNT_ID "$CF_ACCOUNT_ID"

# ── 6. Proyecto de Pages ──────────────────────────────────────────────────
stage "Crear el proyecto de Cloudflare Pages"
say "Con el token verificado, creo el proyecto con wrangler (via npx, se baja solo)."
if CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" \
     npx --yes wrangler pages project create "$REPO_NAME" --production-branch main 2>&1 | tail -3; then
  printf '  %s✓ proyecto creado%s\n' "$GREEN" "$RESET"
else
  warn "wrangler no pudo crearlo. Si el error dice que ya existe, sigue: es idempotente."
  confirm "El proyecto ya existia (o lo creas a mano en el dashboard) y seguimos?" || exit 1
fi

# ── 7. Repo + push + secrets ──────────────────────────────────────────────
stage "Repo GitHub, push y secrets"
if git remote get-url origin >/dev/null 2>&1; then
  say "El remoto origin ya existe; no creo nada nuevo."
else
  FLAG="--private"; [[ "$REPO_VISIBILITY" == "publico" ]] && FLAG="--public"
  say "Voy a crear $REPO_NAME ($REPO_VISIBILITY) en tu cuenta y hacer push de la rama main."
  confirm "Crear el repo y hacer push?" || exit 1
  gh repo create "$REPO_NAME" $FLAG --source=. --remote=origin --push
fi
set_secret CF_API_TOKEN "$CF_API_TOKEN"
set_secret CF_ACCOUNT_ID "$CF_ACCOUNT_ID"
set_var PAGES_PROJECT "$REPO_NAME"
if git push origin main 2>&1 | tail -2; then
  printf '  %s✓ push hecho; el workflow de CI corre con los secrets ya puestos%s\n' "$GREEN" "$RESET"
else
  warn "push fallido (quizas el otro chat ya empujo un commit): revisa y empuja a mano."
fi

# ── 8. Resumen ────────────────────────────────────────────────────────────
stage "Resumen"
say "Lo que acaba de quedar montado:"
note "  repo GitHub con main empujado y secrets CF_API_TOKEN / CF_ACCOUNT_ID"
note "  proyecto de Pages '$REPO_NAME' esperando el primer deploy del CI"
note "  el CI (en cada push a main) embedea el catalogo contra Workers AI,"
note "  corre la suite (suelo: 0.754), escribe el numero en el summary y despliega."
say "Cuando el workflow termine, la URL publica estara en la pestana de Actions"
say "(y en el dashboard de Pages). Vuelve al chat para verificar el deploy y cerrar el ticket."

finish
