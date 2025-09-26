#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, Optional, Tuple

from supabase_cli.client import get as supa_get, get_env_creds, insert_interaction, upsert_contact
from supabase_cli.ingest_ig import _normalize_email_text


def _resolve_supabase(url: Optional[str], key: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    if url and key:
        return url, key
    env_url, env_key = get_env_creds()
    return url or env_url, key or env_key


def _json_response(handler: BaseHTTPRequestHandler, status: int, body: Dict[str, Any]) -> None:
    data = json.dumps(body).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def _extract_message(payload: Dict[str, Any]) -> str:
    # New flat shape
    for key in ("last_text_input", "last_input_text", "text", "message"):
        v = payload.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    # Legacy nested
    sub = payload.get("subscriber") or {}
    for key in ("last_text_input", "last_input_text"):
        v = sub.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def _parse_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize ManyChat payload to a flat dict.

    Expected flat keys (preferred):
      contact_id, instagram_username, full_name, last_text_input,
      last_reply_type, last_interaction_instagram, channel

    Legacy support: nested subscriber{}, old key names.
    """
    sub = payload.get("subscriber") or {}
    contact_id = (
        payload.get("contact_id")
        or sub.get("id")
        or payload.get("subscriber_id")
    )
    ig_username = payload.get("instagram_username") or sub.get("ig_username")
    full_name = payload.get("full_name") or payload.get("name") or sub.get("name")
    last_text = _extract_message(payload)
    last_reply_type = payload.get("last_reply_type") or payload.get("channel")
    last_inter = (
        payload.get("last_interaction_instagram")
        or payload.get("last_interaction")
        or sub.get("last_interaction")
    )
    channel = payload.get("channel") or "instagram"
    return {
        "contact_id": str(contact_id) if contact_id is not None else None,
        "instagram_username": ig_username,
        "full_name": full_name,
        "last_text_input": last_text,
        "last_reply_type": last_reply_type,
        "last_interaction_instagram": last_inter,
        "channel": channel,
        "raw": payload,
    }


class ManyChatHandler(BaseHTTPRequestHandler):
    server_version = "ManyChatWebhook/0.1"
    # Will be set at server init
    route_path: str = "/manychat/webhook"
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    log_file: Optional[str] = None
    contacts_has_mc_id_col: Optional[bool] = None

    def log_message(self, format: str, *args: Any) -> None:
        logging.info("%s - %s", self.address_string(), format % args)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith(self.route_path):
            return _json_response(self, 200, {"ok": True, "message": "ManyChat webhook up"})
        return _json_response(self, 404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self.path.startswith(self.route_path):
            return _json_response(self, 404, {"error": "not_found"})
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            payload = {}

        norm = _parse_payload(payload)
        msg = norm.get("last_text_input") or ""
        name = norm.get("full_name")
        ig_username = norm.get("instagram_username")
        contact_id = norm.get("contact_id")
        occurred_at = norm.get("last_interaction_instagram")
        try:
            if occurred_at:
                # normalize to ISO-8601 with timezone if provided
                _ = datetime.fromisoformat(str(occurred_at).replace("Z", "+00:00"))
            else:
                occurred_at = datetime.now(timezone.utc).isoformat()
        except Exception:
            occurred_at = datetime.now(timezone.utc).isoformat()

        # Log to file if requested
        try:
            if self.log_file:
                with open(self.log_file, "a", encoding="utf-8") as f:
                    f.write(
                        json.dumps(
                            {
                                "ts": datetime.now(timezone.utc).isoformat(),
                                "payload": payload,
                                "normalized": {k: v for k, v in norm.items() if k != "raw"},
                            }
                        )
                        + "\n"
                    )
        except Exception as e:
            logging.warning("failed to write log file: %s", e)

        result: Dict[str, Any] = {"received": True}
        # Store to Supabase if configured (even if msg is empty, to not miss image/reaction events)
        if self.supabase_url and self.supabase_key:
            # One-time check for manychat_contact_id column existence
            if self.contacts_has_mc_id_col is None:
                st_probe, _ = supa_get(
                    self.supabase_url,
                    self.supabase_key,
                    "rest/v1/contacts",
                    {"select": "manychat_contact_id", "limit": 1},
                )
                self.contacts_has_mc_id_col = st_probe == 200

            # Upsert contact using ManyChat Contact ID and username
            contact_row_id = None
            contact_record: Dict[str, Any] = {"source": "manychat"}
            if ig_username:
                contact_record["instagram_username"] = ig_username
            if name:
                contact_record["name"] = name
            if self.contacts_has_mc_id_col and contact_id:
                contact_record["manychat_contact_id"] = contact_id

            # Try to extract and attach email if present in the message
            try:
                emails = _normalize_email_text(msg)
                if emails:
                    contact_record["email"] = emails[0]
                    result["extracted_email"] = emails[0]
            except Exception:
                pass

            if contact_record:
                stc, payload_c = upsert_contact(self.supabase_url, self.supabase_key, contact_record)
                result["contact_upsert_status"] = stc
                if 200 <= stc < 300:
                    row = payload_c[0] if isinstance(payload_c, list) and payload_c else payload_c
                    contact_row_id = row.get("id")

            interaction = {
                "platform": "instagram",
                "direction": "inbound",
                "type": "dm",
                "external_id": f"manychat:{contact_id}:{occurred_at}" if contact_id else None,
                "content": msg or "",
                "extracted_email": result.get("extracted_email"),
                "meta": norm.get("raw") or payload,
                "occurred_at": occurred_at,
            }
            if contact_row_id:
                interaction["contact_id"] = contact_row_id
            sti, payload_i = insert_interaction(
                self.supabase_url, self.supabase_key, {k: v for k, v in interaction.items() if v is not None}
            )
            result["interaction_insert_status"] = sti

        return _json_response(self, 200, result)


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Minimal ManyChat webhook receiver -> Supabase")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--path", default="/manychat/webhook")
    ap.add_argument("--supabase-url")
    ap.add_argument("--supabase-key")
    ap.add_argument("--log-file", help="Append raw payload JSONL to this file")
    args = ap.parse_args(argv)

    # Resolve Supabase creds from args or .env
    url, key = _resolve_supabase(args.supabase_url, args.supabase_key)
    if not url or not key:
        print("Warning: Supabase URL/key not configured; will only log requests", file=sys.stderr)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    ManyChatHandler.route_path = args.path
    ManyChatHandler.supabase_url = url
    ManyChatHandler.supabase_key = key
    ManyChatHandler.log_file = args.log_file

    server = HTTPServer((args.host, args.port), ManyChatHandler)
    print(f"Listening on http://{args.host}:{args.port}{args.path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
