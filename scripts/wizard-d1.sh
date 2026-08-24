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
# ──────────────────────────────────────────────────────────────────────────
# STAGES: wizard D1 + cron de purge (ticket 03 de publicación)
# Lo único humano es editar el token en el dashboard; el resto lo ejecuta
# este wizard con las credenciales de .env. Efímero: bórralo cuando el
# esfuerzo de publicación cierre.
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=6

if [[ ! -f "wrangler.toml" || ! -f ".env" ]]; then
  echo "ejecuta este script desde la raíz del repo (ahí viven .env y wrangler.toml)" >&2
  exit 1
fi

# shellcheck disable=SC1091
source .env
export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

banner "D1 + cron de purge para it sounds like"

# ── 1. Token: permisos de D1 y Workers Scripts ───────────────────────────
stage "Cloudflare: ampliar el token (solo esto es humano)"
open_url "https://dash.cloudflare.com/profile/api-tokens"
step "En la fila del token que uses para este repo (el de CF_API_TOKEN en .env): tres puntos → Edit."
step "En Permissions añade dos filas con los tres desplegables:"
note "  Account · D1 · Edit"
note "  Account · Workers Scripts · Edit"
step "Continue to summary → Save. El valor del token NO cambia: .env y los secrets de GitHub siguen valiendo."
pause "Cuando esté guardado, Enter para verificar."

# ── 2. Verificar el token contra la API de D1 ────────────────────────────
stage "Verificar permisos"
if curl -s "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/d1/database" \
     -H "Authorization: Bearer $CF_API_TOKEN" | grep -q '"success":true'; then
  say "El token ya ve D1. ✓"
else
  warn "El token sigue sin permisos de D1. Vuelve a la etapa anterior y reintenta."
  exit 1
fi
pause "Enter para crear la base."

# ── 3. Crear la base de feedback y dejar el id en los configs ────────────
stage "Crear D1 it-sounds-like-feedback"
D1_ID=$(_existing D1_DATABASE_ID || true)
if [[ -z "$D1_ID" ]]; then
  SALIDA=$(npx --yes wrangler d1 create it-sounds-like-feedback 2>&1) || { echo "$SALIDA"; exit 1; }
  D1_ID=$(printf '%s' "$SALIDA" | grep -oE '[0-9a-f]{32}' | head -n1)
  [[ -n "$D1_ID" ]] || { echo "$SALIDA"; warn "no pude extraer el database_id; créala a mano y re-ejecuta"; exit 1; }
  write_env D1_DATABASE_ID "$D1_ID"
else
  say "La base ya estaba creada (D1_DATABASE_ID en .env). ✓"
fi
sed -i "s|^database_id = .*|database_id = \"$D1_ID\"|" wrangler.toml cron/wrangler.toml
sed -i "s|^# feedback público: la tupla del ticket 03\. .*|# feedback público: la tupla del ticket 03 (base D1 it-sounds-like-feedback).|" wrangler.toml
say "database_id = $D1_ID escrito en wrangler.toml y cron/wrangler.toml."

# ── 4. Esquema remoto ────────────────────────────────────────────────────
stage "Aplicar el esquema (d1/schema.sql)"
npx --yes wrangler d1 execute it-sounds-like-feedback --remote --file d1/schema.sql

# ── 5. Cron worker + CI + commit ─────────────────────────────────────────
stage "Desplegar el cron y dejar el CI a cargo"
npx --yes wrangler deploy --config cron/wrangler.toml
if ! grep -q "cron de purge" .github/workflows/deploy.yml; then
  cat >> .github/workflows/deploy.yml <<'CI'

      - name: desplegar el cron de purge (worker con binding D1)
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: npx --yes wrangler deploy --config cron/wrangler.toml
CI
  say "Añadido el paso de deploy del cron al workflow."
fi
if [[ -n $(git status --porcelain wrangler.toml cron/wrangler.toml .github/workflows/deploy.yml) ]]; then
  git add wrangler.toml cron/wrangler.toml .github/workflows/deploy.yml
  git commit -m "publicación: D1 real — binding del sitio, id del cron y su paso de CI (ticket 03)"
  git push
  say "Commiteado y empujado: el CI redespliega el sitio con el binding."
else
  say "Los configs ya estaban al día. ✓"
fi

# ── 6. Verificar en producción ───────────────────────────────────────────
stage "Verificar el feedback en producción"
pause "Dale un minuto al CI (deploy de sitio + cron) y Enter para probar."
TS=$(date +%s%3N)
PRUEBA=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://it-sounds-like.pages.dev/api/feedback \
  -H 'content-type: application/json' \
  -d "{\"query\":\"wizard d1\",\"ficha\":\"wizard\",\"accion\":\"clavo\",\"ts\":$TS,\"rank_pre_boost\":1,\"visitante\":\"wizard-d1-check\"}")
if [[ "$PRUEBA" == "200" ]]; then
  say "POST válido → 200. La tupla ya persiste en D1. ✓"
  npx --yes wrangler d1 execute it-sounds-like-feedback --remote \
    --command "SELECT query, accion, visitante FROM feedback WHERE visitante='wizard-d1-check'"
  say "Esa fila de prueba puedes borrarla cuando quieras:"
  note "  npx wrangler d1 execute it-sounds-like-feedback --remote --command \"DELETE FROM feedback WHERE visitante='wizard-d1-check'\""
else
  warn "El POST devolvió $PRUEBA — puede ser propagación del edge; reintenta en un minuto:"
  note "  curl -s -X POST https://it-sounds-like.pages.dev/api/feedback -H 'content-type: application/json' -d '{\"query\":\"x\",\"ficha\":\"f\",\"accion\":\"clavo\",\"ts\":1770000000000,\"visitante\":\"v\"}'"
fi

finish
