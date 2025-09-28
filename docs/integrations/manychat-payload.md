# ManyChat → CRM Webhook (Instagram) — Payload Minimal

**Estado vigente (NO CAMBIAR sin motivo):**
```json
{
  "contact_id": "Contact Id",                 // EncodeToJSON OFF
  "instagram_username": "Instagram Username", // EncodeToJSON OFF
  "full_name": "Full Name",                   // EncodeToJSON OFF
  "last_text_input": Last Text Input,          // EncodeToJSON ON (sin comillas)
  "channel": "instagram"
}
```

Notas:
- `last_text_input` con EncodeToJSON **ON** garantiza que mensajes multilínea lleguen bien escapados.
- El backend persiste primero (`webhook_events`) y luego procesa (idempotencia por dedupe key).
- Endpoints útiles:
  - `/api/healthz` — verifica que las credenciales estén listas.
  - `/api/debug/last?limit=20` — lista los últimos eventos capturados.
  - `/api/reprocess-events` — reintenta eventos en estados `NEW` o `FAILED` (requiere `x-api-token` si se configuró).
