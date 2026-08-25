#!/usr/bin/env bash
#
# Wizard de captura-web (ticket 01 del esfuerzo): sube la base al sitio
# público — el token del autor como secret de Pages, la tabla fichas_web en
# el D1 remoto, y la verificación del tracer contra producción.
# Lo único humano de verdad: guardar el token en el gestor de contraseñas.
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

TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '  %s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

say()  { printf '  %s\n' "$1"; }
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

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

pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# ask VAR "Prompt" reads a visible value into $VAR; offers the .dev.vars
# value as the default on re-runs (Enter keeps it)
ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing .dev.vars "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret VAR "Prompt" is like ask, but input is hidden
ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing .dev.vars "$key" || true)
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

_existing() {
  [[ -f "$1" ]] || return 1
  local line; line=$(grep -E "^${2}=" "$1" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

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

finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} Pages secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────
# STAGES: subir la captura web (token secret + tabla fichas_web + verificación)
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=6
SITIO="https://it-sounds-like.pages.dev"
PROYECTO="it-sounds-like"

if [[ ! -f "wrangler.toml" || ! -f ".env" ]]; then
  echo "ejecuta este script desde la raíz del repo (ahí viven .env y wrangler.toml)" >&2
  exit 1
fi

# shellcheck disable=SC1091
source .env
export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

banner "Captura web: el autor escribe fichas desde el sitio público"

# ── 1. El token del autor ─────────────────────────────────────────────────
stage "El token del autor (256 bits)"
ACTUAL=$(_existing .dev.vars AUTH_TOKEN || true)
VIEJO=""
if [[ -n "$ACTUAL" ]] && confirm "Ya hay token en .dev.vars — ¿rotarlo? (el actual queda como AUTH_TOKEN_PREVIOUS)"; then
  VIEJO="$ACTUAL"
  TOKEN=$(openssl rand -base64 32)
elif [[ -n "$ACTUAL" ]]; then
  TOKEN="$ACTUAL"
  say "Reusando el token de .dev.vars. ✓"
else
  TOKEN=$(openssl rand -base64 32)
fi
if [[ "$TOKEN" != "$ACTUAL" ]]; then
  [[ -n "$VIEJO" ]] && printf 'AUTH_TOKEN_PREVIOUS=%s\n' "$VIEJO" >> .dev.vars
  if [[ -f .dev.vars ]] && grep -q '^AUTH_TOKEN=' .dev.vars; then
    tmp=$(mktemp); grep -v '^AUTH_TOKEN=' .dev.vars > "$tmp"; printf 'AUTH_TOKEN=%s\n' "$TOKEN" >> "$tmp"; mv "$tmp" .dev.vars
  else
    printf 'AUTH_TOKEN=%s\n' "$TOKEN" >> .dev.vars
  fi
  chmod 600 .dev.vars
  say "Token nuevo generado y guardado en .dev.vars (gitignored; sirve para wrangler pages dev local)."
fi
step "GUARDA EL TOKEN en tu gestor de contraseñas — es lo que el autor teclea en /captura."
note "  para verlo: cat .dev.vars   (no se imprime aquí para no dejarlo en scrolls ni logs)"

# ── 2. Secret de Pages ────────────────────────────────────────────────────
stage "Subir AUTH_TOKEN como secret cifrado de Pages"
if [[ -n "$VIEJO" ]]; then
  printf '%s' "$VIEJO" | npx --yes wrangler pages secret put AUTH_TOKEN_PREVIOUS --project-name "$PROYECTO"
  WRITTEN_SECRET+=("AUTH_TOKEN_PREVIOUS")
fi
printf '%s' "$TOKEN" | npx --yes wrangler pages secret put AUTH_TOKEN --project-name "$PROYECTO"
WRITTEN_SECRET+=("AUTH_TOKEN")
note "el secret aplica al próximo deploy de Pages (el que dispara el push de abajo)"

# ── 3. Tabla fichas_web en el D1 remoto ───────────────────────────────────
# ── 3. Turnstile e Instagram (opcionales; Enter = por ahora no) ──────────
stage "Turnstile del login e Instagram (opcional)"
open_url "https://dash.cloudflare.com/?to=/:account/turnstile"
step "Turnstile → Add widget: nombre 'captura', hostname it-sounds-like.pages.dev, modo Managed → Create."
note "  copia la Site Key y la Secret Key que te enseña al crearlo"
step "Instagram (si ya tienes la cuenta Business y el token de Graph): ten a mano IG_USER_ID e IG_TOKEN."
ask TURNSTILE_SITE "Turnstile: Site Key (Enter para saltar)"
ask_secret TURNSTILE_SECRET "Turnstile: Secret Key (Enter para saltar)"
ask_secret IG_USER_ID "Instagram: IG_USER_ID (Enter para saltar)"
ask_secret IG_TOKEN "Instagram: token de Graph de larga vida (Enter para saltar)"

SUBIDOS=0
subir_secret() {
  local nombre="$1" valor="$2"
  [[ -z "$valor" ]] && return 0
  printf '%s' "$valor" | npx --yes wrangler pages secret put "$nombre" --project-name "$PROYECTO"
  WRITTEN_SECRET+=("$nombre")
  SUBIDOS=$((SUBIDOS + 1))
  # también en .dev.vars: wrangler pages dev local con lo mismo que producción
  local tmp
  tmp=$(mktemp)
  [[ -f .dev.vars ]] && grep -vE "^${nombre}=" .dev.vars > "$tmp" || true
  printf '%s=%s\n' "$nombre" "$valor" >> "$tmp"
  mv "$tmp" .dev.vars
  chmod 600 .dev.vars
}
subir_secret TURNSTILE_SITE "$TURNSTILE_SITE"
subir_secret TURNSTILE_SECRET "$TURNSTILE_SECRET"
subir_secret IG_USER_ID "$IG_USER_ID"
subir_secret IG_TOKEN "$IG_TOKEN"
if (( SUBIDOS )); then
  say "$SUBIDOS secret(s) subidos a Pages (y anotados en .dev.vars para local)."
  note "aplican con el deploy de la etapa siguiente; el token de Instagram caduca a los ~60 días — re-ejecuta este wizard y reintenta desde /captura"
else
  say "Nada por ahora: el login queda con token + lockout, e Instagram en pendiente. ✓"
fi

# ── 4. Tabla fichas_web en el D1 remoto ───────────────────────────────────
stage "Aplicar d1/schema.sql (idempotente) al D1 remoto"
npx --yes wrangler d1 execute it-sounds-like-feedback --remote --file d1/schema.sql

# ── 5. Deploy: push y CI ──────────────────────────────────────────────────
stage "Deploy: push y CI"
if [[ -n $(git log @{u}..HEAD --oneline 2>/dev/null) ]]; then
  git push
  say "Push hecho: el CI hornea y despliega (suite, build público, functions)."
elif [[ "$TOKEN" != "$ACTUAL" || "$SUBIDOS" -gt 0 ]]; then
  # un secret de Pages solo liga con un deploy nuevo: rotar sin cambios que
  # empujar necesita este commit vacío para que el token nuevo arranque
  git commit --allow-empty -m "captura-web: redeploy — secret AUTH_TOKEN actualizado (wizard)"
  git push
  say "Token nuevo sin cambios de código: commit vacío para que el deploy lo ligue."
else
  say "No hay commits por subir; el deployed actual ya lleva la captura. ✓"
fi
say "Esperando a que el deploy publique /captura…"
for _ in $(seq 1 32); do
  CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "$SITIO/captura" || true)
  [[ "$CODIGO" == "200" ]] && break
  sleep 15
done
if [[ "$CODIGO" == "200" ]]; then
  say "$SITIO/captura responde 200. ✓"
else
  warn "/captura sigue en $CODIGO tras ~8 min — mira el CI y re-ejecuta este wizard."
  exit 1
fi

# ── 6. Verificar el tracer en producción ──────────────────────────────────
stage "Verificar el tracer en producción"
# el deploy publica estáticos y functions en momentos ligeramente distintos:
# esperar a que el POST sin token dé el 401 de NUESTRA puerta, no el 405 de
# los estáticos sin function — eso prueba que /api/captura está viva
for _ in $(seq 1 32); do
  SIN=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$SITIO/api/captura" \
    -H 'content-type: application/json' -d '{"titulo":"x","artista":"y","fecha":"2026-08-25"}')
  [[ "$SIN" == "401" ]] && break
  sleep 15
done
[[ "$SIN" == "401" ]] && say "POST sin token → 401 genérico. ✓" || { warn "POST sin token devolvió $SIN (esperaba 401)"; exit 1; }

# el login cuenta su sitekey: si Turnstile quedó configurado, el widget ya
# guarda la puerta; si no, lo de siempre (token + lockout)
SITE=$(curl -s "$SITIO/api/captura/login" | grep -oE '"site":"[^"]+"' | cut -d'"' -f4)
if [[ -n "$SITE" ]]; then
  say "Turnstile activo en el login (site ${SITE:0:8}…). ✓"
else
  note "Turnstile sin configurar: el login es token + lockout."
fi

HOY=$(date +%F)
RESP=$(curl -s -w '\n%{http_code}' -X POST "$SITIO/api/captura" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"titulo\":\"wizard check\",\"artista\":\"wizard\",\"fecha\":\"$HOY\",\"cuerpo\":\"fila de verificación, se borra al momento\"}")
CODIGO=$(printf '%s' "$RESP" | tail -n1)
SLUG=$(printf '%s' "$RESP" | head -n1 | grep -oE '"slug":"[^"]+"' | cut -d'"' -f4 || true)
if [[ "$CODIGO" == "201" && -n "$SLUG" ]]; then
  say "POST con token → 201, slug $SLUG. La ficha ya vive en fichas_web. ✓"
  npx --yes wrangler d1 execute it-sounds-like-feedback --remote \
    --command "DELETE FROM fichas_web WHERE slug='$SLUG'" >/dev/null
  RESTO=$(npx --yes wrangler d1 execute it-sounds-like-feedback --remote \
    --command "SELECT COUNT(*) AS n FROM fichas_web" --json | grep -oE '"n": *[0-9]+' | grep -oE '[0-9]+')
  say "Fila de verificación borrada; fichas_web queda con $RESTO fila(s). ✓"
else
  warn "POST con token devolvió $CODIGO — revisa el secret AUTH_TOKEN y re-ejecuta."
  note "  respuesta: $(printf '%s' "$RESP" | head -n1)"
fi

finish
