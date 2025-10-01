#!/usr/bin/env bash
set -euo pipefail

: "${DEBUG_TOKEN?Set DEBUG_TOKEN before running this script}"
URL="https://crm-manychat-webhook.vercel.app/api/manychat-webhook?simulate=1&dry=1"

curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Debug-Token: $DEBUG_TOKEN" \
  -d '{
  "subscriber": { "name": "Daniel Barraza Valencia", "username": "daann21" },
  "fields": { "email": "saludoalsol+daniel.test@gmail.com" }
 }' | jq .
