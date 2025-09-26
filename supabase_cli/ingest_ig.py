from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from instagram_cli.client import graph_get, get_keychain_token
from .client import upsert_contact, insert_interaction


EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def _normalize_email_text(text: str) -> List[str]:
    """Return likely emails from a message, including disguised forms like
    "nombre arroba gmail punto com" or "name at domain dot com".
    """
    if not text:
        return []
    t = text
    # Lowercase for detection but keep original too
    tl = t.lower()
    # Replace common disguises (Spanish/English)
    replacements = [
        (r"\s*\(at\)\s*", "@"),
        (r"\s*\[at\]\s*", "@"),
        (r"\bat\b", "@"),
        (r"\barroba\b", "@"),
        (r"\s*\(dot\)\s*", "."),
        (r"\s*\[dot\]\s*", "."),
        (r"\bdot\b", "."),
        (r"\bpunto\b", "."),
    ]
    tmp = tl
    for pat, rep in replacements:
        tmp = re.sub(pat, rep, tmp)
    # Remove spaces around @ and dots
    tmp = re.sub(r"\s*@\s*", "@", tmp)
    tmp = re.sub(r"\s*\.\s*", ".", tmp)
    # Stitch obvious " gmail . com " etc.
    tmp = tmp.replace("gmail . com", "gmail.com").replace("hotmail . com", "hotmail.com").replace("outlook . com", "outlook.com")
    # Collect standard emails from original and normalized text
    emails = set(EMAIL_RE.findall(text)) | set(EMAIL_RE.findall(tmp))
    # Drop trailing punctuation
    cleaned = []
    for e in emails:
        cleaned.append(e.strip().strip('.,;:!'))
    return list({e for e in cleaned if '@' in e and '.' in e.split('@')[-1]})


def ingest_ig_dms(
    *,
    page_id: str,
    kc_account: str = "tranquileza",
    ig_user_id: str | None = None,
    days: int = 7,
    url: str,
    key: str,
    max_conversations: int = 25,
    max_messages: int = 50,
) -> Dict[str, Any]:
    token = get_keychain_token(kc_account)
    if not token:
        return {"error": f"no token in keychain for account '{kc_account}'"}

    since_ts = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp())

    status, conv = graph_get(
        f"/{page_id}/conversations",
        params={
            "limit": max_conversations,
            "fields": "updated_time,participants{id,name}",
        },
        token=token,
    )
    if status != 200:
        return {"error": "conversations_failed", "status": status, "payload": conv}

    conversations = conv.get("data") or []
    created_interactions = 0
    upserted_contacts = 0
    samples: list[dict] = []

    for c in conversations:
        cid = c.get("id")
        st, msgs = graph_get(
            f"/{cid}/messages",
            params={
                "limit": max_messages,
                # Do not rely on 'since' here; some edges ignore it. We'll filter client-side.
                "fields": "id,from,to,created_time,message",
            },
            token=token,
        )
        if st != 200:
            continue
        for m in msgs.get("data") or []:
            text = (m.get("message") or "").strip()
            if not text:
                continue
            # Filter by date window
            try:
                ct = m.get("created_time")
                if ct:
                    dt = datetime.fromisoformat(ct.replace("Z", "+00:00"))
                    if dt < datetime.now(timezone.utc) - timedelta(days=days):
                        continue
            except Exception:
                pass

            emails = _normalize_email_text(text)
            contact_id = None
            primary_email = None
            if emails:
                primary_email = emails[0]
                stc, payload = upsert_contact(
                    url,
                    key,
                    {
                        "email": primary_email,
                        "source": "instagram",
                        "lead_status": "warm",
                    },
                )
                if 200 <= stc < 300:
                    row = payload[0] if isinstance(payload, list) and payload else payload
                    contact_id = row.get("id")
                    upserted_contacts += 1
            record = {
                "platform": "instagram",
                "direction": "inbound",
                "type": "dm",
                "external_id": m.get("id"),
                "thread_id": cid,
                "content": text,
                "extracted_email": primary_email,
                "extraction_confidence": 0.9 if primary_email else None,
                "meta": {},
            }
            if contact_id:
                record["contact_id"] = contact_id
            sti, _ = insert_interaction(url, key, {k: v for k, v in record.items() if v is not None})
            if 200 <= sti < 300:
                created_interactions += 1
                if len(samples) < 3:
                    samples.append({"message": text, "emails": emails, "message_id": m.get("id")})

    return {
        "conversations_scanned": len(conversations),
        "interactions_created": created_interactions,
        "contacts_upserted": upserted_contacts,
        "samples": samples,
    }
