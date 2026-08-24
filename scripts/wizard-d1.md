# D1 + cron de purge: cierre del ticket 03

**Ejecuta `./scripts/wizard-d1.sh`** desde la raíz del repo. Camina la
única parte humana (ampliar el token en el dashboard) y luego hace solo:
crear la base, aplicar `d1/schema.sql` remoto, desplegar el worker del
cron, dejar el paso de CI, commitear los configs y verificar el POST en
producción. Es idempotente: se puede re-ejecutar.

## Qué necesita el token (el paso humano)

`CF_API_TOKEN` nació con solo `Pages · Edit` y `Workers AI · Edit`
(wizard de publicación). El wizard pide añadir en
<https://dash.cloudflare.com/profile/api-tokens> → Edit del token:

- `Account · D1 · Edit`
- `Account · Workers Scripts · Edit`

El valor del token no cambia al editarlo: `.env` y los secrets de
GitHub siguen valiendo sin tocar nada.

## Sin wizard, a mano

```bash
set -a; source .env; set +a
export CLOUDFLARE_API_TOKEN=$CF_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID
npx wrangler d1 create it-sounds-like-feedback        # anota el id en ambos wrangler.toml
npx wrangler d1 execute it-sounds-like-feedback --remote --file d1/schema.sql
npx wrangler deploy --config cron/wrangler.toml
# y en .github/workflows/deploy.yml, un paso:
#   npx --yes wrangler deploy --config cron/wrangler.toml
```

Al terminar: ticket 03 verificable en producción (POST válido → fila en
D1, malformado → 400) y se cierra.
