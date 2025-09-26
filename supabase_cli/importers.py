from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from mailerlite_cli.client import get as ml_get, MailerLiteError
from supabase_cli.client import (
    add_member,
    ensure_group,
    upsert_contact,
)


def _field(d: dict, *keys: str) -> Optional[str]:
    for k in keys:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def import_mailerlite(url: str, key: str, *, limit: int = 100, max_pages: int = 100, delay_s: float = 0.2) -> Dict[str, Any]:
    created = 0
    updated = 0
    grouped = 0
    page = 1
    while page <= max_pages:
        try:
            resp = ml_get("/subscribers", params={"limit": limit, "page": page})
        except MailerLiteError as e:
            if getattr(e, "status", 0) == 429:
                time.sleep(delay_s * 2)
                continue
            raise
        items = resp.get("data") or []
        if not items:
            break
        for s in items:
            fields = s.get("fields") or {}
            name = _field(fields, "name", "first_name")
            last_name = _field(fields, "last_name")
            email = s.get("email")
            phone = _field(fields, "phone")
            city = _field(fields, "city")
            country = _field(fields, "country")
            notes = _field(fields, "notas")
            record: Dict[str, Any] = {
                "email": email,
                "phone": phone,
                "name": name,
                "last_name": last_name,
                "city": city,
                "country": country,
                "notes": notes,
                "source": "mailerlite",
            }
            st, payload = upsert_contact(url, key, record)
            if 200 <= st < 300:
                data = payload[0] if isinstance(payload, list) and payload else payload
                cid = str((data or {}).get("id"))
                if cid:
                    # groups
                    for g in (s.get("groups") or []):
                        gname = g.get("name")
                        if not gname:
                            continue
                        sg, gp = ensure_group(url, key, gname)
                        if 200 <= sg < 300:
                            gid = str(((gp or [])[0] if isinstance(gp, list) else gp).get("id"))
                            if gid:
                                add_member(url, key, cid, gid)
                                grouped += 1
                # heuristics for created/updated
                if isinstance(payload, list) and payload:
                    created += 1
                else:
                    updated += 1
        if len(items) < limit:
            break
        page += 1
        time.sleep(delay_s)
    return {"created": created, "updated": updated, "group_links": grouped}

