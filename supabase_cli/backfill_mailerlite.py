from __future__ import annotations

import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from mailerlite_cli.client import MailerLiteError, get as ml_get
from supabase_cli.client import (
    find_contact_id,
    insert_interaction,
    insert_mailerlite_event,
    patch_mailerlite_event,
    upsert_mailerlite_campaign,
)


EventSpec = Dict[str, Any]


CAMPAIGN_EVENT_SPECS: Dict[str, EventSpec] = {
    "campaign.sent": {
        "endpoint": "/campaigns/{id}/reports/sent",
        "interaction_type": "newsletter_sent",
        "direction": "outbound",
    },
    "campaign.open": {
        "endpoint": "/campaigns/{id}/reports/opens",
        "interaction_type": "newsletter_open",
        "direction": "inbound",
    },
    "campaign.click": {
        "endpoint": "/campaigns/{id}/reports/clicks",
        "interaction_type": "newsletter_click",
        "direction": "inbound",
    },
}

AUTOMATION_EVENT_SPECS: Dict[str, EventSpec] = {}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_timestamp(value: Any) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, (int, float)) and not math.isnan(value):
        seconds = float(value)
        if seconds > 10_000_000_000:
            seconds /= 1000.0
        return datetime.fromtimestamp(seconds, tz=timezone.utc)
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return None
        if trimmed.isdigit():
            return _parse_timestamp(int(trimmed))
        iso = trimmed.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(iso)
        except ValueError:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def _isoformat(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _extract_items(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("data", "items", "subscribers", "logs", "entries", "reports"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def _extract_email(row: Dict[str, Any]) -> Optional[str]:
    fields = [
        (row.get("email")),
        row.get("subscriber", {}).get("email") if isinstance(row.get("subscriber"), dict) else None,
        row.get("subscriber_email"),
        row.get("recipient", {}).get("email") if isinstance(row.get("recipient"), dict) else None,
    ]
    for value in fields:
        if value and isinstance(value, str) and value.strip():
            return value.strip().lower()
    return None


def _extract_subscriber_id(row: Dict[str, Any]) -> Optional[str]:
    for key in ("subscriber_id", "id", "subscriber", "recipient_id"):
        val = row.get(key)
        if isinstance(val, (str, int)):
            return str(val)
        if isinstance(val, dict) and "id" in val:
            return str(val.get("id"))
    return None


def _extract_automation(row: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    automation = row.get("automation")
    if isinstance(automation, dict):
        automation_id = automation.get("id")
        automation_name = automation.get("name") or automation.get("title")
        return (str(automation_id) if automation_id else None, automation_name)
    return (None, None)


def _resolve_occurred_at(row: Dict[str, Any], fallback: Optional[datetime]) -> datetime:
    candidates = [
        row.get("occurred_at"),
        row.get("created_at"),
        row.get("updated_at"),
        row.get("timestamp"),
        row.get("sent_at"),
        row.get("opened_at"),
        row.get("clicked_at"),
        row.get("triggered_at"),
        row.get("completed_at"),
        row.get("date"),
    ]
    for candidate in candidates:
        parsed = _parse_timestamp(candidate)
        if parsed:
            return parsed
    return fallback or _utcnow()


def _build_external_id(event: str, email: Optional[str], row: Dict[str, Any], occurred_at: datetime) -> str:
    for key in ("id", "event_id", "log_id", "history_id", "uuid"):
        val = row.get(key)
        if isinstance(val, (str, int)) and str(val).strip():
            return str(val)
    subscriber_id = _extract_subscriber_id(row) or "anon"
    email_part = email or row.get("subscriber_email") or "unknown"
    ts_part = int(occurred_at.timestamp())
    return f"{event}:{subscriber_id}:{email_part}:{ts_part}"


def _fetch_paginated(path: str, *, params: Optional[Dict[str, Any]] = None, limit: int = 200, max_pages: int = 50, delay: float = 0.25) -> Iterable[Dict[str, Any]]:
    page = 1
    params = dict(params or {})
    while page <= max_pages:
        page_params = dict(params)
        page_params.setdefault("limit", limit)
        page_params["page"] = page
        try:
            payload = ml_get(path, params=page_params)
        except MailerLiteError as error:
            if getattr(error, "status", 0) == 404:
                return
            raise
        items = _extract_items(payload)
        if not items:
            return
        for item in items:
            yield item
        meta = payload.get("meta") if isinstance(payload, dict) else None
        last_page = None
        if isinstance(meta, dict):
            for key in ("last_page", "total_pages"):
                if meta.get(key):
                    last_page = int(meta[key])
                    break
        if last_page and page >= last_page:
            return
        page += 1
        time.sleep(delay)


def _upsert_campaign(url: str, key: str, campaign: Dict[str, Any], *, dry_run: bool) -> Optional[str]:
    campaign_id = str(campaign.get("id")) if campaign.get("id") is not None else None
    if not campaign_id:
        return None
    record = {
        "campaign_id": campaign_id,
        "name": campaign.get("name") or campaign.get("title"),
        "subject": campaign.get("subject"),
        "status": campaign.get("status"),
        "send_at": _isoformat(_parse_timestamp(campaign.get("send_at") or campaign.get("delivered_at"))),
        "archived_at": _isoformat(_parse_timestamp(campaign.get("archived_at"))),
        "data": campaign,
    }
    if dry_run:
        return campaign_id
    upsert_mailerlite_campaign(url, key, record)
    return campaign_id


def _summary_from_event(event: str, campaign_name: Optional[str], row: Dict[str, Any]) -> str:
    pieces: List[str] = [event]
    if campaign_name:
        pieces.append(campaign_name)
    link = row.get("link") or row.get("url")
    if isinstance(link, str) and link.strip():
        pieces.append(link.strip())
    return " — ".join(pieces)


def _insert_event_and_interaction(
    *,
    url: str,
    key: str,
    event: str,
    spec: EventSpec,
    campaign: Dict[str, Any],
    row: Dict[str, Any],
    contact_cache: Dict[str, Optional[str]],
    dry_run: bool,
) -> Tuple[bool, bool]:
    campaign_id = str(campaign.get("id")) if campaign.get("id") is not None else None
    if not campaign_id:
        return False, False
    campaign_name = campaign.get("name") or campaign.get("title")
    email = _extract_email(row)
    if email and email not in contact_cache:
        contact_cache[email] = find_contact_id(url, key, email)
    contact_id = contact_cache.get(email) if email else None
    occurred_at_dt = _resolve_occurred_at(row, _parse_timestamp(campaign.get("send_at")))
    occurred_at = _isoformat(occurred_at_dt)
    external_id = _build_external_id(event, email, row, occurred_at_dt)
    automation_id, automation_name = _extract_automation(row)
    payload = row.copy()
    now_iso = _isoformat(_utcnow())
    event_record = {
        "event": event,
        "campaign_id": campaign_id,
        "automation_id": automation_id,
        "automation_name": automation_name,
        "subscriber_id": _extract_subscriber_id(row),
        "subscriber_email": email,
        "contact_id": contact_id,
        "external_id": external_id,
        "payload": payload,
        "occurred_at": occurred_at,
        "received_at": now_iso,
    }
    if dry_run:
        return bool(campaign_id), bool(contact_id)
    status, inserted = insert_mailerlite_event(url, key, event_record)
    if status == 409:
        return False, bool(contact_id)
    if not (200 <= status < 300):
        raise RuntimeError(f"mailerlite_events insert failed HTTP {status}: {inserted}")
    event_payload = inserted[0] if isinstance(inserted, list) and inserted else inserted
    event_id = str(event_payload.get("id")) if event_payload else None
    interaction_record = {
        "contact_id": contact_id,
        "platform": "mailerlite",
        "direction": spec.get("direction", "inbound"),
        "type": spec.get("interaction_type", event),
        "external_id": external_id,
        "thread_id": campaign_id,
        "content": _summary_from_event(event, campaign_name, row),
        "meta": {
            "event": event,
            "campaign_id": campaign_id,
            "data": row,
        },
        "occurred_at": occurred_at,
    }
    status_i, inserted_interaction = insert_interaction(url, key, interaction_record)
    interaction_id = None
    if 200 <= status_i < 300:
        interaction_payload = (
            inserted_interaction[0]
            if isinstance(inserted_interaction, list) and inserted_interaction
            else inserted_interaction
        )
        interaction_id = interaction_payload.get("id") if isinstance(interaction_payload, dict) else None
    elif status_i != 409:
        raise RuntimeError(f"interactions insert failed HTTP {status_i}: {inserted_interaction}")
    if event_id and interaction_id:
        patch_mailerlite_event(url, key, event_id, {"interaction_id": interaction_id})
    return True, bool(contact_id)


def backfill_mailerlite(
    *,
    url: str,
    key: str,
    since: Optional[datetime] = None,
    days: Optional[int] = 30,
    campaign_limit: int = 100,
    max_pages: int = 10,
    events: Optional[Iterable[str]] = None,
    include_automations: bool = False,
    delay_s: float = 0.3,
    dry_run: bool = False,
) -> Dict[str, Any]:
    if not since and days:
        since = _utcnow() - timedelta(days=days)
    since = since.astimezone(timezone.utc) if since else None
    requested_events = set(events or CAMPAIGN_EVENT_SPECS.keys())
    stats = {
        "campaigns_considered": 0,
        "campaigns_imported": 0,
        "events_inserted": 0,
        "events_duplicate": 0,
        "interactions_inserted": 0,
        "contacts_matched": 0,
    }
    contact_cache: Dict[str, Optional[str]] = {}
    page = 1
    while page <= max_pages:
        params = {"limit": campaign_limit, "page": page}
        try:
            payload = ml_get("/campaigns", params=params)
        except MailerLiteError as error:
            if getattr(error, "status", 0) == 404:
                break
            raise
        campaigns = _extract_items(payload)
        if not campaigns:
            break
        stats["campaigns_considered"] += len(campaigns)
        stop_paging = False
        for campaign in campaigns:
            sent_at = _parse_timestamp(campaign.get("send_at") or campaign.get("delivered_at"))
            if since and sent_at and sent_at < since:
                stop_paging = True
                continue
            campaign_id = _upsert_campaign(url, key, campaign, dry_run=dry_run)
            if not campaign_id:
                continue
            stats["campaigns_imported"] += 1
            for event_name in requested_events:
                spec = CAMPAIGN_EVENT_SPECS.get(event_name)
                if not spec:
                    continue
                endpoint = spec["endpoint"].format(id=campaign_id)
                for row in _fetch_paginated(endpoint, max_pages=max_pages, delay=delay_s):
                    ok, matched = _insert_event_and_interaction(
                        url=url,
                        key=key,
                        event=event_name,
                        spec=spec,
                        campaign=campaign,
                        row=row,
                        contact_cache=contact_cache,
                        dry_run=dry_run,
                    )
                    if ok:
                        stats["events_inserted"] += 1
                        if matched:
                            stats["contacts_matched"] += 1
                        if not dry_run:
                            stats["interactions_inserted"] += 1
                    else:
                        stats["events_duplicate"] += 1
                    time.sleep(delay_s)
        if stop_paging:
            break
        page += 1
        time.sleep(delay_s)
    if include_automations and AUTOMATION_EVENT_SPECS:
        stats["automation_backfill"] = "pending_implementation"
    stats["dry_run"] = dry_run
    stats["since"] = _isoformat(since) if since else None
    return stats
