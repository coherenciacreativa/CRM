CRM Automation Toolkit
======================

This repository bundles the building blocks that power our Instagram→ManyChat→Supabase→MailerLite CRM flow together with supporting CLIs. It now covers three main areas:

- A Python CLI for MailerLite operations (token storage, people lookups, group membership).
- A set of Instagram Graph helpers for token management and troubleshooting.
- A production Vercel webhook that receives DMs from ManyChat, enriches/normalises the lead, syncs Supabase, pushes MailerLite, and raises alerts when something looks suspicious.

Quick Start
-----------

1) Ensure Python 3.10+ is available.

2) Set your API key (stored in Keychain):

   - Prompted entry:
     `python mlite.py auth set`

   - Or provide inline:
     `python mlite.py auth set --key YOUR_API_KEY`

3) Verify:
   `python mlite.py auth show`

4) Call endpoints:

   - Account info: `python mlite.py account get`
   - List subscribers: `python mlite.py subscribers list --limit 25 --page 1`
   - Get one subscriber: `python mlite.py subscribers get SUBSCRIBER_ID`
   - Create a subscriber: `python mlite.py subscribers create --email test@example.com --name Testy --fields '{"country":"US"}'`

People (Power Helpers)
----------------------

- Find by tokens/email:
  `python mlite.py people find --tokens "natalia cardenas bedout" --use-search --show-groups`

- Show by id/email:
  `python mlite.py people show --email someone@example.com`

- Update fields:
  `python mlite.py people set-fields --email someone@example.com --fields '{"phone":"+57...","city":"Cali"}'`

- Add/remove group by name:
  `python mlite.py people group-add --email someone@example.com --group "Group Name"`
  `python mlite.py people group-remove --email someone@example.com --group "Group Name"`

Notes
-----

- Credentials are stored under a generic password item in the macOS Keychain using the `security` command with service `CRM-MailerLite` and account `default`.
- If the Keychain is unavailable, the CLI falls back to the `MAILERLITE_API_KEY` environment variable for the current process.
- Base URL: `https://connect.mailerlite.com/api`. Authorization: `Authorization: Bearer <API_KEY>`.
- No external dependencies are required (uses Python stdlib `urllib`).

Extending
--------

Endpoints are wrapped in `mailerlite_cli/client.py`. Add new commands in `mailerlite_cli/cli.py` following the existing patterns.

Instagram Integration
---------------------

The repo also includes a minimal Instagram Graph API CLI with Keychain and `.env` support.

- Entry: `ig.py`
- Code: `instagram_cli/*`

Tokens & .env
- You can store your access token either in macOS Keychain or in `.env`.
- Supported keys in `.env`: `IG_ACCESS_TOKEN`, `IG_LONG_LIVED_TOKEN`, `FB_USER_TOKEN`, `IG_APP_ID`, `IG_APP_SECRET`.
 - To get started, copy `.env.example` to `.env` and fill the placeholders: `cp .env.example .env`

Auth commands
- Store token in Keychain: `python ig.py auth set --token YOUR_TOKEN`
- Store token in .env: `python ig.py auth set --token YOUR_TOKEN --store env`
- Show masked: `python ig.py auth show`
- Exchange short→long (Facebook):
  `python ig.py auth exchange --mode facebook --app-id $IG_APP_ID --app-secret $IG_APP_SECRET --token SHORT --save`
- Exchange short→long (Basic Display):
  `python ig.py auth exchange --mode basic --app-secret $IG_APP_SECRET --token SHORT --save`
- Debug token: `python ig.py auth debug --app-id $IG_APP_ID --app-secret $IG_APP_SECRET`

Pages and IG user
- List pages: `python ig.py pages list [--kc-account your_account | --token YOUR_TOKEN]`
- Get IG user id for a page: `python ig.py pages ig PAGE_ID [--kc-account ... | --token ...]`

Instagram user/media
- User info: `python ig.py ig user IG_USER_ID [--kc-account ... | --token ...]`
- List media: `python ig.py ig media IG_USER_ID --limit 25 [--kc-account ... | --token ...]`
- Comments for media: `python ig.py ig comments MEDIA_ID --limit 25 [--kc-account ... | --token ...]`

Notes
- For Business/Creator accounts, use the Graph API (via Facebook app) and connect your IG account to a Facebook Page.
- For personal accounts and read-only media, the Basic Display API uses `graph.instagram.com` and its own token exchange.
- This CLI assumes you have a valid access token with sufficient permissions. Provide credentials and tokens in Keychain or `.env` as outlined above.

ManyChat Webhook (Vercel)
------------------------

- Endpoint: `https://crm-manychat-webhook.vercel.app/api/manychat-webhook` (POST only, JSON body from ManyChat).
- Security: include header `x-webhook-secret` with the value stored in the `MANYCHAT_WEBHOOK_SECRET` env var (configured in Vercel and `.env`).
- Behaviour: upserts the contact into Supabase (`contacts` table), records the payload in `interactions`, runs multilingual heuristics over the DM to extract name/email/phone/city/country/message, and mirrors the lead into MailerLite (adds to the welcome groups and updates custom fields). If Supabase or MailerLite are unreachable the function logs the failure, emits an alert (see below), and returns a 5xx so ManyChat retries.
- Contact reconciliation: duplicate inserts are now merged by `manychat_contact_id`, `ig_user_id`, Instagram usernames, or email. The webhook patches the existing Supabase row (respecting manual name overrides) instead of failing when ManyChat replays older contacts.
- Deployment: Vercel project `crm-manychat-webhook`. Manage env vars via `vercel env add <KEY> production|preview` and redeploy with `npx vercel deploy --prod --token $VERCEL_ACCESS_TOKEN`.
- Dependencies: requires `SUPABASE_URL_CRM` and `SUPABASE_SERVICE_ROLE_CRM`; make sure the Supabase URL resolves publicly before pointing ManyChat at the webhook.
- MailerLite env vars:
  - `MAILERLITE_API_KEY` (or fallback `ML_API_KEY` for backwards compatibility)
  - `MAILERLITE_GROUP_IDS` (comma-separated numeric IDs; fallback `ML_GROUPS` supported)
  - Optional `MAILERLITE_DEFAULT_NOTES` for the leading part of the notes field.
- Alerts / Observability env vars:
  - `ALERT_WEBHOOK_URL` – optional Slack/Teams/webhook endpoint that receives JSON alerts.
  - `ALERT_WEBHOOK_CHANNEL` – optional channel/group identifier (defaults to `crm-alerts`).
- Quick test:
  ```bash
  curl -X POST \
    -H 'Content-Type: application/json' \
    -H 'x-webhook-secret: $MANYCHAT_WEBHOOK_SECRET' \
    -d '{"event":"ping","contact":{"id":"test","emails":["test@example.com"]}}' \
    https://crm-manychat-webhook.vercel.app/api/manychat-webhook
  ```

Workflow Overview
-----------------

- **Contacts**: `contacts` rows are keyed by `manychat_contact_id`; the Vercel webhook upserts a record for every inbound ManyChat event, so duplicates just update the existing contact and timestamps.
- **Interactions log**: every webhook call creates an entry in `interactions` with `contact_id`, `platform='instagram'`, and `external_id` of the form `manychat:<contact_id>:<timestamp>` so you can easily query a person’s full DM history.
- **Parsing heuristics**: the webhook recognises phrasing such as “me llamo…”, “mi nombre es…”, “aquí te escribe…”, “soy de…”, “estamos en…”, etc. Cities/countries are normalised (e.g. “de la paz Bolivia” → `city=La Paz`, `country=Bolivia`) and names are humanised from email/Instagram when users omit them.
- **Location upgrades**: the extractor ignores trailing contact-info phrases (`mi correo es…`) so that multi-line messages still resolve to clean `city` / `country` values (e.g. “Vivo en Bogotá mi correo es…” → `city=Bogotá`, `country=Colombia`).
- **Etiquetas con “País y ciudad:”**: también interpreta líneas con formato `País y ciudad: Colombia, Medellín` u otras variantes con dos puntos, eliminando conectores finales como “en” y normalizando la ciudad con nuestro índice LATAM.
- **Alerts**: low-confidence extractions or sync failures trigger a POST to `ALERT_WEBHOOK_URL` so we can follow-up manually. Alerts include the matched sources and identifiers to speed up triage.
- **Querying history**:
  - Supabase REST: `curl -H "apikey: $SUPABASE_SERVICE_ROLE_CRM" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_CRM" "$SUPABASE_URL_CRM/rest/v1/interactions?select=occurred_at,content,meta&contact_id=eq.CONTACT_UUID&order=occurred_at.desc"`
  - SQL editor: `select i.occurred_at, i.content from interactions i join contacts c on c.id = i.contact_id where c.manychat_contact_id = '563924665' order by occurred_at desc;`
- **Triage tip**: create a Supabase view joining `contacts` + latest interaction for fast browsing in the dashboard.

ManyChat configuration guide
----------------------------

- **Send full contact data**: in ManyChat, enable “Send full contact data” on the External Request step that targets this webhook. The payload should include `Full_Contact_Data.custom_fields.last_dm_text` so we capture multi-line replies, emails and phone numbers even when the main message bubble is short.
- **Buffer enrichment**: if the automation needs to pre-process raw text before sending it to us, call the lightweight helper endpoint `POST https://crm-manychat-webhook.vercel.app/api/detect-email` with `{ "buffer": "Texto libre" }`. The response returns `{ hasEmail, email, emails }` and is safe to use inside ManyChat JSON actions.
- **Simulation / debugging**:
  - `scripts/test-sim-daniel.sh` / `scripts/test-sim-paola.sh` post sample payloads against the production webhook with `?simulate=1&dry=1`. Set `DEBUG_TOKEN` before running.
  - You can also replay real payloads from Supabase (`webhook_events.raw_payload`) by piping them back to the webhook with the `x-webhook-secret` header.
- **Retry behaviour**: the webhook returns 5xx on downstream failures (Supabase/MailerLite) so ManyChat retries automatically. Duplicate submissions are merged, so replays are safe.

Serverless API reference
------------------------

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/healthz` | GET | Readiness check; includes MailerLite group count and Supabase connectivity signal. |
| `/api/manychat-webhook` | POST | Primary ingestion pipeline (ManyChat → Supabase → MailerLite). Requires `x-webhook-secret`. Supports `simulate=1` + `dry=1` for dry runs. |
| `/api/detect-email` | POST | Helper for ManyChat automations. Parses the provided `buffer` text and returns `{ hasEmail, email, emails }`. No auth required. |
| `/api/debug/last` | GET | Lists the most recent ingestion events (for troubleshooting). |
| `/api/search-contact` | GET | Fuzzy search across `contacts` (name, email, IG). Query param `q` (min 2 chars). |
| `/api/contact-details` | GET | Consolidated `{ contact, interactions, mailerlite }` view given `id` or `email`. Includes MailerLite groups via HTTP/2 fallback. |

CRM Lookup UI (`/search`)
-------------------------

- URL: `https://crm-manychat-webhook.vercel.app/search`
- Funcionalidades clave:
  - Campo único de búsqueda con resultados en vivo (nombre, correo o usuario de Instagram).
  - Tarjetas de resultados que muestran correo y ubicación rápida; selección abre detalles.
  - Panel de detalles con datos Supabase (contacto + notas), últimas interacciones y snapshot de MailerLite (estado, campos, grupos). Si MailerLite bloquea el filtro por email, el endpoint usa un fallback `curl --http2` para obtener los grupos.
- Mobile-friendly → añade la página a la pantalla de inicio para usarla como app.
- APIs de soporte: `GET /api/search-contact?q=…` y `GET /api/contact-details?id=…` o `?email=…`.

Gmail Feed (beta)
-----------------

- Credenciales: define `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (OAuth 2.0 Web app).
- Filtrado: usa `GMAIL_SYNC_ALIAS` (ej. `notasdealejandro@coherenciacreativa.com`) para que sólo se procesen mensajes **dirigidos a** esa dirección en `INBOX` y **enviados desde** esa dirección en `SENT`. Si necesitas expresiones avanzadas, sobreescribe `GMAIL_SYNC_QUERY_INBOX` / `GMAIL_SYNC_QUERY_SENT`.
- OAuth start: visita `https://crm-manychat-webhook.vercel.app/api/google/oauth/start` (o `http://localhost:3000/...` en dev) y concede acceso con la cuenta que quieras monitorear.
- Callback: `/api/google/oauth/callback` guarda `access_token`/`refresh_token` en Supabase (`gmail_tokens`) junto con el email de la cuenta.
- Sync endpoint: `POST /api/gmail/sync` (Auth: `Authorization: Bearer $CRONJOB_API_KEY`). Extrae los últimos mensajes `INBOX` + `SENT` (30 días) y los normaliza en `gmail_messages`.
  ```bash
  curl -X POST \
    -H "Authorization: Bearer $CRONJOB_API_KEY" \
    https://crm-manychat-webhook.vercel.app/api/gmail/sync
  ```
- Cron sugerido (cada 15 min): crea un job en cron-job.org apuntando al endpoint anterior usando el header `Authorization: Bearer $CRONJOB_API_KEY`.
- Datos almacenados: asunto, snippet, fecha, dirección derivada (inbound/outbound) y JSON metadata por si queremos enriquecer el dashboard.

Lead enrichment pipeline
------------------------

1. **Payload normalisation** – merge top-level `contact`, `subscriber`, and `Full_Contact_Data` into a single record. Emails / phones can arrive in custom fields, direct keys, or nested arrays.
2. **Deduplication** – before inserting we check Supabase for matches by `manychat_contact_id`, `ig_user_id`, Instagram usernames (`instagram_username` and `ig_username`), and email. Existing contacts are patched instead of rejected, preserving manual `name` updates when `name_source = 'manual'`.
3. **Field derivation** – heuristics fill gaps via:
   - `bestName()` and `deriveName()` for human-readable names from DMs, email locals, or IG handles.
   - `extractLocationFromText()` for cities/countries with noise filtering and alias mapping across LATAM locales.
   - Email/phone extraction using regex + punctuation cleanup, reused by the `/api/detect-email` helper.
4. **Persistence** – we upsert into Supabase and append an interaction log with the full original payload (for replay) plus the parsed summary.
5. **Fan-out** – MailerLite is updated (idempotent, handles 409/422 gracefully). Optional alerting fires when parsing confidence drops below threshold or external APIs fail.

Release log highlights (2025-Q3)
--------------------------------

- Added `/api/detect-email` for ManyChat buffer parsing (enables on-platform validation before hitting the main webhook).
- Hardened contact reconciliation in the webhook to resolve duplicates by IG identifiers and email while respecting manual data curation.
- Expanded location/name heuristics para quitar conectores finales, interpretar etiquetas con colon (e.g. “País y ciudad: Colombia, Medellín”) y normalizar nombres/ciudades con alias LATAM.
- Added simulation scripts and Supabase replay strategy for debugging ManyChat automations without affecting production data.
- Introduced `/search` UI + serverless endpoints para consultar rápidamente contactos y detalles cruzados con MailerLite.
