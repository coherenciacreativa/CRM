#!/usr/bin/env bash
set -euo pipefail

: "${DEBUG_TOKEN?Set DEBUG_TOKEN before running this script}"
URL="https://crm-manychat-webhook.vercel.app/api/manychat-webhook?simulate=1&dry=1"

curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Debug-Token: $DEBUG_TOKEN" \
  -d '{
  "subscriber": { "name": "Paola Castañeda", "username": "paolacast___" },
  "contact": { "email": "saludoalsol+paola.test@gmail.com" },
  "message": { "text": "Mi correo es..." }
 }' | jq .
