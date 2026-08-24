# D1 + cron de purge: lo que falta y quién lo hace

El ticket 03 (feedback en D1) está construido y verificado end-to-end con
D1 local. Lo único que bloquea el despliegue es el permiso del token de
Cloudflare: `CF_API_TOKEN` solo tiene `Pages · Edit` y `Workers AI · Edit`.

## Paso humano (una vez)

1. Abre <https://dash.cloudflare.com/profile/api-tokens>.
2. En la fila del token **it-sounds-like** (el que vive en `CF_API_TOKEN` de
   `.env` y del secret de GitHub): **Options → Edit**.
3. Añade dos permisos:
   - `Account · D1 · Edit`
   - `Account · Workers Scripts · Edit`
4. **Save**. El valor del token no cambia; secrets y `.env` quedan como están.

## Pasos del agente (cuando el token tenga los permisos)

```bash
set -a; source .env; set +a
export CLOUDFLARE_API_TOKEN=$CF_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID

# 1. crear la base y anotar database_id
npx wrangler d1 create it-sounds-like-feedback

# 2. poner el id real en wrangler.toml y cron/wrangler.toml (sustituye local-dev)

# 3. aplicar el esquema remoto
npx wrangler d1 execute it-sounds-like-feedback --remote --file d1/schema.sql

# 4. desplegar el cron de purge
npx wrangler deploy --config cron/wrangler.toml
```

Después: commitear los `wrangler.toml` con el id real, añadir a
`.github/workflows/deploy.yml` un paso
`npx --yes wrangler deploy --config cron/wrangler.toml` (mismo token), push,
y verificar en producción: un POST válido a `/api/feedback` → fila en
`wrangler d1 execute it-sounds-like-feedback --remote --command "SELECT ..."`,
un malformado → 400, y el cron visible en el dashboard del worker
`it-sounds-like-purge`.
