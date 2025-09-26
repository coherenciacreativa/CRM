from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict, List

from .client import (
    get_api_key,
    page_get_info,
    set_api_key,
    subscriber_find_by_name,
    subscriber_get_info,
    profile_generate_single_use_link,
)
from .ingest import ingest_by_emails_from_supabase
from .ingest import ingest_by_email_file


def _print(data: Any) -> None:
    print(json.dumps(data, indent=2, ensure_ascii=False))


def cmd_auth_set(args: argparse.Namespace) -> int:
    key = args.api_key
    if not key:
        print("--api-key is required", file=sys.stderr)
        return 1
    set_api_key(key)
    print("Stored ManyChat API key in Keychain (CRM-ManyChat)")
    return 0


def cmd_auth_show(_: argparse.Namespace) -> int:
    tok = get_api_key()
    if not tok:
        print("No ManyChat API key found (Keychain or .env).")
        return 1
    masked = tok[:6] + "*" * max(0, len(tok) - 12) + tok[-6:]
    print(f"ManyChat API key: {masked}")
    return 0


def cmd_auth_check(_: argparse.Namespace) -> int:
    # Try Page API
    st_page, _ = page_get_info()
    # Try Profile API (expect 400 for bad template id if token is profile-scoped)
    st_prof, _ = profile_generate_single_use_link(0)
    result = {
        "page_api_status": st_page,
        "profile_api_status": st_prof,
        "hint": (
            "Use a Page-scoped API key (Settings → Page → Public API)"
            if st_page == 401 and st_prof in (200, 400)
            else "Token appears Page-scoped" if st_page == 200 else "Token invalid"
        ),
    }
    print(json.dumps(result, indent=2))
    return 0

def cmd_page_info(_: argparse.Namespace) -> int:
    status, payload = page_get_info()
    print(f"HTTP {status}")
    _print(payload)
    return 0 if status == 200 else 2


def _summarize_subscriber(s: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": s.get("id"),
        "name": s.get("name"),
        "ig_username": s.get("ig_username"),
        "last_input_text": s.get("last_input_text"),
        "last_interaction": s.get("last_interaction"),
        "live_chat_url": s.get("live_chat_url"),
    }


def cmd_inbound_by_name(args: argparse.Namespace) -> int:
    name = args.name
    if not name:
        print("--name is required (search substring)", file=sys.stderr)
        return 1
    status, payload = subscriber_find_by_name(name)
    print(f"HTTP {status}")
    if status != 200:
        _print(payload)
        return 2
    data = payload.get("data") if isinstance(payload, dict) else None
    if not data:
        print("No subscribers found")
        return 0
    out: List[Dict[str, Any]] = []
    for sub in data:
        out.append(_summarize_subscriber(sub))
    _print(out)
    return 0


def cmd_inbound_by_id(args: argparse.Namespace) -> int:
    sid = args.subscriber_id
    status, payload = subscriber_get_info(sid)
    print(f"HTTP {status}")
    if status != 200:
        _print(payload)
        return 2
    data = payload.get("data") if isinstance(payload, dict) else None
    if not data:
        print("No data")
        return 1
    _print(_summarize_subscriber(data))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="ManyChat API CLI (Keychain + .env)")
    sub = p.add_subparsers(dest="cmd", required=True)

    # auth
    pa = sub.add_parser("auth", help="API key storage and utilities")
    suba = pa.add_subparsers(dest="subcmd", required=True)

    pa_set = suba.add_parser("set", help="Store API key in Keychain")
    pa_set.add_argument("--api-key", required=True, help="ManyChat API key value")
    pa_set.set_defaults(func=cmd_auth_set)

    pa_show = suba.add_parser("show", help="Show masked API key from Keychain/.env")
    pa_show.set_defaults(func=cmd_auth_show)
    pa_chk = suba.add_parser("check", help="Check whether token is Page- or Profile-scoped")
    pa_chk.set_defaults(func=cmd_auth_check)

    # page info (simple connectivity test)
    pp = sub.add_parser("page", help="Page endpoints")
    subp = pp.add_subparsers(dest="subcmd", required=True)
    ppi = subp.add_parser("info", help="Get page info to verify connectivity")
    ppi.set_defaults(func=cmd_page_info)

    # inbound messages (via subscribers' last input)
    pin = sub.add_parser("inbound", help="Fetch inbound text from subscribers")
    subin = pin.add_subparsers(dest="subcmd", required=True)

    pin_name = subin.add_parser("by-name", help="Search subscribers by name and show last inbound text")
    pin_name.add_argument("--name", required=True, help="Substring of the subscriber's full name")
    pin_name.set_defaults(func=cmd_inbound_by_name)

    pin_id = subin.add_parser("by-id", help="Get a subscriber by id and show last inbound text")
    pin_id.add_argument("subscriber_id", help="ManyChat subscriber id")
    pin_id.set_defaults(func=cmd_inbound_by_id)

    # ingest
    pig = sub.add_parser("ingest", help="Ingest ManyChat signals into Supabase")
    subig = pig.add_subparsers(dest="subcmd", required=True)
    pig_se = subig.add_parser("supa-emails", help="Scan Supabase contacts' emails and attach ManyChat last inbound text to interactions")
    pig_se.add_argument("--limit", type=int, default=100)
    pig_se.set_defaults(func=lambda args: (print(json.dumps(ingest_by_emails_from_supabase(limit=args.limit), indent=2)) or 0))
    pig_file = subig.add_parser("emails-file", help="Scan a newline-delimited email file and insert ManyChat last inbound text into interactions")
    pig_file.add_argument("path", help="Path to file with one email per line")
    pig_file.set_defaults(func=lambda args: (print(json.dumps(ingest_by_email_file(args.path), indent=2)) or 0))

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    func = getattr(args, "func", None)
    if not func:
        parser.print_help()
        return 1
    return int(func(args))


if __name__ == "__main__":
    raise SystemExit(main())
