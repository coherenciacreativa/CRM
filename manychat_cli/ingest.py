from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

from supabase_cli.client import get as supa_get, get_env_creds, insert_interaction, upsert_contact
from .client import subscriber_find_by_name, subscriber_get_info, subscriber_find_by_name, subscriber_get_info, subscriber_find_by_name, subscriber_get_info, subscriber_find_by_name, subscriber_get_info, subscriber_find_by_name, subscriber_get_info  # noqa: F401 (for potential future use)
from .client import subscriber_find_by_name as _unused  # silence lints in some IDEs
from .client import subscriber_find_by_name as _unused2
from .client import subscriber_find_by_name as _unused3
from .client import subscriber_find_by_system_field  # added in client


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ingest_by_emails_from_supabase(*, limit: int = 100, delay_ms: int = 50) -> Dict[str, Any]:
    url, key = get_env_creds()
    if not url or not key:
        return {"error": "missing_supabase_creds"}

    # Pull contacts with emails
    st, rows = supa_get(
        url,
        key,
        "rest/v1/contacts",
        {
            "select": "id,email,name,instagram_username,ig_user_id,updated_at",
            "email": "not.is.null",
            "order": "updated_at.desc",
            "limit": limit,
        },
    )
    if st != 200:
        return {"error": "contacts_fetch_failed", "status": st, "payload": rows}

    contacts: List[Dict[str, Any]] = rows if isinstance(rows, list) else []
    results: List[Dict[str, Any]] = []
    created = 0
    updated_contacts = 0
    scanned = 0

    for c in contacts:
        email = (c.get("email") or "").strip()
        if not email:
            continue
        scanned += 1
        st_mc, payload = subscriber_find_by_system_field(email=email)
        data = payload.get("data") if isinstance(payload, dict) else None
        if st_mc != 200 or not data:
            results.append({"email": email, "status": st_mc, "found": False})
            time.sleep(delay_ms / 1000.0)
            continue

        # Upsert contact with IG details from ManyChat if present
        ig_username = data.get("ig_username")
        ig_id = data.get("ig_id")
        if ig_username or ig_id:
            stc, payload_c = upsert_contact(
                url,
                key,
                {
                    "email": email,
                    "instagram_username": ig_username,
                    "ig_user_id": str(ig_id) if ig_id else None,
                    "source": "manychat",
                },
            )
            if 200 <= stc < 300:
                updated_contacts += 1

        last_text = data.get("last_input_text")
        last_interaction = data.get("last_interaction")  # ISO W3C per schema
        sub_id = data.get("id")
        external_id = f"manychat:{sub_id}:{last_interaction}" if sub_id and last_interaction else f"manychat:{sub_id}:last"
        if last_text:
            record = {
                "platform": "instagram" if (ig_username or ig_id) else "other",
                "direction": "inbound",
                "type": "manychat_last_input",
                "external_id": external_id,
                "content": last_text,
                "meta": data,
            }
            sti, payload_i = insert_interaction(url, key, record)
            if 200 <= sti < 300:
                created += 1
                results.append({
                    "email": email,
                    "subscriber_id": sub_id,
                    "last_input_text": last_text,
                    "last_interaction": last_interaction,
                })
        time.sleep(delay_ms / 1000.0)

    return {
        "scanned_contacts": scanned,
        "interactions_created": created,
        "contacts_updated": updated_contacts,
        "samples": results[:5],
    }


def ingest_by_email_file(path: str, *, delay_ms: int = 50) -> Dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            emails = [l.strip() for l in f if l.strip() and not l.strip().startswith("#")]
    except Exception as e:
        return {"error": "cannot_read_file", "path": path, "detail": str(e)}

    url, key = get_env_creds()
    if not url or not key:
        return {"error": "missing_supabase_creds"}

    scanned = 0
    created = 0
    updated_contacts = 0
    results: List[Dict[str, Any]] = []

    for email in emails:
        scanned += 1
        st_mc, payload = subscriber_find_by_system_field(email=email)
        data = payload.get("data") if isinstance(payload, dict) else None
        if st_mc != 200 or not data:
            results.append({"email": email, "status": st_mc, "found": False})
            time.sleep(delay_ms / 1000.0)
            continue

        ig_username = data.get("ig_username")
        ig_id = data.get("ig_id")
        if ig_username or ig_id:
            stc, payload_c = upsert_contact(
                url,
                key,
                {
                    "email": email,
                    "instagram_username": ig_username,
                    "ig_user_id": str(ig_id) if ig_id else None,
                    "source": "manychat",
                },
            )
            if 200 <= stc < 300:
                updated_contacts += 1

        last_text = data.get("last_input_text")
        last_interaction = data.get("last_interaction")
        sub_id = data.get("id")
        external_id = f"manychat:{sub_id}:{last_interaction}" if sub_id and last_interaction else f"manychat:{sub_id}:last"
        if last_text:
            sti, _ = insert_interaction(
                url,
                key,
                {
                    "platform": "instagram" if (ig_username or ig_id) else "other",
                    "direction": "inbound",
                    "type": "manychat_last_input",
                    "external_id": external_id,
                    "content": last_text,
                    "meta": data,
                },
            )
            if 200 <= sti < 300:
                created += 1
                results.append({
                    "email": email,
                    "subscriber_id": sub_id,
                    "last_input_text": last_text,
                    "last_interaction": last_interaction,
                })
        time.sleep(delay_ms / 1000.0)

    return {
        "scanned_emails": scanned,
        "interactions_created": created,
        "contacts_updated": updated_contacts,
        "samples": results[:5],
    }
