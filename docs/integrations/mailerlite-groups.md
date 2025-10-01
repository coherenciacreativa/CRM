# MailerLite — Grupos trigger (NO CAMBIAR sin motivo)

## Fuentes válidas para IDs
- Envs: `MAILERLITE_GROUP_IDS` (coma-separado), `MAILERLITE_GROUP_ID`, `MAILERLITE_ALLOWED_GROUP_ID`, `ML_GROUPS`.
- Constantes legacy en el repo (si existen). El backend intenta cargar módulos como `lib/integrations/ml-constants.js` o `lib/integrations/mailerlite.js`.

El backend combina todas las fuentes (únicas) y envía esos IDs en `body.groups` al crear/actualizar el suscriptor en MailerLite.

> Nota: Los IDs de grupos de MailerLite se manejan como *strings* (no números) para evitar pérdida de precisión en IDs largos. Env var recomendada:
> `MAILERLITE_GROUP_IDS=153400728188094209,154049618670257330`

## Propósito
Añadir **siempre** los 2 grupos trigger que prenden el primer email, sin remover pertenencias existentes (operación no destructiva).

## Validación
- `GET /api/healthz` muestra `ml_groups_count`.
- `GET /api/debug/last?limit=20` lista las últimas ingestas.

## Smoke test sugerido
Usar un correo controlado, por ejemplo `saludoalsol+testcrm11@gmail.com`, para confirmar que los triggers se activan correctamente.
