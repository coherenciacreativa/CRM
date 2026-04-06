#!/usr/bin/env python3
"""Create/refresh MailerLite automation for Perfect Week email-0 + 24h handoff.

Flow:
- Trigger: subscriber joins Perfect Week group
- Step 1: send Email 0 (guide delivery + expectation setting)
- Step 2: wait 24 hours
- Step 3: copy to leads_instagram.csv (onboarding trigger)
- Step 4: copy to will get first email (kickoff condition)
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List

BASE = "https://connect.mailerlite.com/api"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


def req(method: str, path: str, token: str, body: Dict[str, Any] | None = None) -> Dict[str, Any] | List[Any] | None:
    url = f"{BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = response.read().decode("utf-8", errors="ignore")
        if not payload:
            return None
        return json.loads(payload)


def list_automations_by_name(name: str, token: str) -> List[Dict[str, Any]]:
    encoded = urllib.parse.quote(name)
    out: List[Dict[str, Any]] = []
    page = 1
    while True:
        data = req("GET", f"/automations?limit=100&page={page}&filter[name]={encoded}", token)
        rows = (data or {}).get("data") or []
        out.extend(rows)
        if len(rows) < 100:
            break
        page += 1
    return [a for a in out if (a.get("name") or "").strip() == name]


def disable_automation(automation_id: str, token: str) -> None:
    try:
        req("POST", f"/automations/{automation_id}/disable", token, {})
    except Exception:
        pass


def main() -> int:
    load_env_file(Path(".env.local"))

    token = (
        os.getenv("MAILERLITE_API_KEY")
        or os.getenv("MAILERLITE_TOKEN")
        or os.getenv("ML_API_KEY")
        or ""
    ).strip()
    if not token:
        print("Missing MailerLite API key", file=sys.stderr)
        return 1

    perfect_week_group = (os.getenv("PERFECT_WEEK_GROUP_ID") or "").strip()
    leads_group = (os.getenv("PERFECT_WEEK_TRIGGER_GROUP_ID") or "153400728188094209").strip()
    kickoff_group = (os.getenv("PERFECT_WEEK_ONBOARDING_GROUP_ID") or "154049618670257330").strip()

    if not perfect_week_group:
        print("Missing PERFECT_WEEK_GROUP_ID", file=sys.stderr)
        return 1

    automation_name = (os.getenv("PERFECT_WEEK_AUTOMATION_NAME") or "Perfect Week — Email 0 + handoff 24h").strip()
    sender_name = (os.getenv("PERFECT_WEEK_SENDER_NAME") or "Alejandro Gómez").strip()
    sender_email = (os.getenv("PERFECT_WEEK_SENDER_EMAIL") or "notasdealejandro@coherenciacreativa.com").strip()
    reply_to = (os.getenv("PERFECT_WEEK_REPLY_TO") or "respuestas@coherenciacreativa.com").strip()

    # 1) disable previous automations with same exact name
    existing = list_automations_by_name(automation_name, token)
    for a in existing:
        disable_automation(str(a.get("id")), token)

    # 2) create draft automation
    created = req("POST", "/automations", token, {"name": automation_name}) or {}
    automation = created.get("data") or {}
    aid = str(automation.get("id") or "")
    if not aid:
        print("Could not create automation", file=sys.stderr)
        return 1

    # 3) trigger: subscriber joins Perfect Week group
    req(
        "POST",
        f"/automations/{aid}/triggers",
        token,
        {"type": "subscriber_joins_group", "group_ids": [perfect_week_group]},
    )

    # 4) create steps in reverse order so flow becomes:
    # email -> delay -> copy leads -> copy kickoff
    step_copy_kickoff = (req("POST", f"/automations/{aid}/steps", token, {"type": "action"}) or {}).get("data") or {}
    step_copy_leads = (req("POST", f"/automations/{aid}/steps", token, {"type": "action"}) or {}).get("data") or {}
    step_delay = (req("POST", f"/automations/{aid}/steps", token, {"type": "delay"}) or {}).get("data") or {}
    step_email = (req("POST", f"/automations/{aid}/steps", token, {"type": "email"}) or {}).get("data") or {}

    sid_kickoff = str(step_copy_kickoff.get("id") or "")
    sid_leads = str(step_copy_leads.get("id") or "")
    sid_delay = str(step_delay.get("id") or "")
    sid_email = str(step_email.get("id") or "")

    if not all([sid_kickoff, sid_leads, sid_delay, sid_email]):
        print("Failed creating one or more automation steps", file=sys.stderr)
        return 1

    # 5) configure steps
    req(
        "PUT",
        f"/automations/{aid}/steps/{sid_email}",
        token,
        {
            "data": {
                "name": "Perfect Week · Guía de bienvenida",
                "subject": "Tu guía Perfect Week ya está aquí ✅",
                "from": sender_email,
                "from_name": sender_name,
                "reply_to": reply_to,
                "track_opens": True,
                "google_analytics": False,
            }
        },
    )

    # fetch email_id generated by step configuration
    full = req("GET", f"/automations/{aid}", token) or {}
    steps = (full.get("data") or {}).get("steps") or []
    email_step = next((s for s in steps if str(s.get("id")) == sid_email), None) or {}
    email_id = str(email_step.get("email_id") or "")
    if not email_id:
        print("Missing email_id for email step", file=sys.stderr)
        return 1

    plain_text = (
        "Hola,\n\n"
        "¡Bienvenido/a a Perfect Week!\n\n"
        "Aquí tienes tu guía:\n"
        "https://crm-manychat-webhook.vercel.app/perfect-week\n\n"
        "Además, como beneficio extra, durante los próximos días te compartiré artículos de Notas de Alejandro "
        "para acompañarte en la implementación.\n\n"
        "Un abrazo,\n"
        "Alejandro Gómez"
    )

    html = """
<p>Hola,</p>
<p><strong>¡Bienvenido/a a Perfect Week!</strong></p>
<p>Aquí tienes tu guía:</p>
<p><a href=\"https://crm-manychat-webhook.vercel.app/perfect-week\">Abrir guía Perfect Week</a></p>
<p>Además, como beneficio extra, durante los próximos días te compartiré artículos de <strong>Notas de Alejandro</strong> para acompañarte en la implementación.</p>
<p>Un abrazo,<br/>Alejandro Gómez</p>
""".strip()

    req(
        "PUT",
        f"/automations/{aid}/emails/{email_id}",
        token,
        {
            "name": "Perfect Week · Guía de bienvenida",
            "subject": "Tu guía Perfect Week ya está aquí ✅",
            "from": sender_email,
            "from_name": sender_name,
            "reply_to": reply_to,
            "plain_text": plain_text,
            "html": html,
        },
    )

    req(
        "PUT",
        f"/automations/{aid}/steps/{sid_delay}",
        token,
        {"data": {"unit": "hours", "value": "24", "hour": "", "minute": "", "use_timezone": "account"}},
    )

    req(
        "PUT",
        f"/automations/{aid}/steps/{sid_leads}",
        token,
        {"data": {"action_type": "copy_to_group", "group_ids": [leads_group]}},
    )

    req(
        "PUT",
        f"/automations/{aid}/steps/{sid_kickoff}",
        token,
        {"data": {"action_type": "copy_to_group", "group_ids": [kickoff_group]}},
    )

    # 6) enable automation
    req("POST", f"/automations/{aid}/enable", token, {})

    # 7) lightweight validation
    final = req("GET", f"/automations/{aid}", token) or {}
    data = final.get("data") or {}

    print(
        json.dumps(
            {
                "ok": True,
                "automation_id": aid,
                "name": data.get("name"),
                "enabled": data.get("enabled"),
                "trigger_groups": [g for t in (data.get("triggers") or []) for g in (t.get("group_ids") or [])],
                "steps": [
                    {"id": s.get("id"), "type": s.get("type"), "description": s.get("description"), "parent_id": s.get("parent_id")}
                    for s in (data.get("steps") or [])
                ],
            },
            ensure_ascii=False,
        )
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
