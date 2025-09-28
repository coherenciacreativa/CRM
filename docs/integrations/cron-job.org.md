# cron-job.org — Reprocess cada 15 minutos (FREE plan)

- API base: `https://api.cron-job.org`
- Autenticación: `Authorization: Bearer <API_KEY>`
- Crear job: `PUT /jobs`
- Actualizar job: `PATCH /jobs/<jobId>`
- Listar jobs: `GET /jobs`
- Schedule actual: minutes `[0,15,30,45]`, hours `[-1]`, wdays/mdays/months `[-1]`, TZ `America/Bogota`
- Encabezados extra: `x-api-token` (solo si protegiste `/api/reprocess-events`)

## Setup
```
CRONJOB_API_KEY=...  # API para cronjob (in the console)
API_TOKEN=...        # optional, only if /api/reprocess-events requires it
BASE_URL=https://crm-manychat-webhook.vercel.app

npm run cronjob:setup
```

## Verificación
```
# listar jobs
curl -sS -H "Authorization: Bearer ${CRONJOB_API_KEY}" \
  https://api.cron-job.org/jobs | jq

# confirmar ingestas webhooks recientes
curl -sS "${BASE_URL}/api/debug/last?limit=10" | jq
```
