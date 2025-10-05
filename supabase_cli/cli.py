from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime

from instagram_cli.env import load_env, save_env
from .client import (
    auth_health,
    get_env_creds,
    get_keychain_key,
    set_keychain_key,
    test_contacts_head,
    upsert_contact,
)
from .importers import import_mailerlite
from .backfill_mailerlite import CAMPAIGN_EVENT_SPECS, backfill_mailerlite
from .ingest_ig import ingest_ig_dms


def _print(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def _resolve_creds(args: argparse.Namespace):
    url = args.url
    key = args.key
    if args.kc_account and not key:
        key = get_keychain_key(args.kc_account)
    if not url or not key:
        env_url, env_key = get_env_creds()
        url = url or env_url
        key = key or env_key
    return url, key


def cmd_auth_set(args: argparse.Namespace) -> int:
    if args.store == "keychain":
        set_keychain_key(args.key, account=args.account)
        print(f"Saved key to Keychain account '{args.account}' (service CRM-Supabase)")
        return 0
    # env
    updates = {}
    if args.url:
        updates["SUPABASE_URL"] = args.url
    if args.key:
        updates["SUPABASE_SERVICE_ROLE"] = args.key
    save_env(updates)
    print("Saved credentials to .env")
    return 0


def cmd_ping(args: argparse.Namespace) -> int:
    url, key = _resolve_creds(args)
    if not url:
        print("Missing SUPABASE_URL", file=sys.stderr)
        return 1
    st, payload = auth_health(url, key)
    print(f"auth health HTTP {st}")
    _print(payload)
    if not key:
        print("No key provided. Set it to access PostgREST endpoints.")
        return 0
    st2 = test_contacts_head(url, key)
    print(f"contacts probe HTTP {st2}")
    if st2 == 404:
        print("Table 'contacts' not found. Run the provided SQL in Supabase SQL editor.")
    return 0


def cmd_contacts_upsert(args: argparse.Namespace) -> int:
    url, key = _resolve_creds(args)
    if not url or not key:
        print("Missing URL or key", file=sys.stderr)
        return 1
    record = json.loads(args.json)
    st, payload = upsert_contact(url, key, record)
    print(f"HTTP {st}")
    _print(payload)
    return 0 if 200 <= st < 300 else 2


def cmd_import_mailerlite(args: argparse.Namespace) -> int:
    url, key = _resolve_creds(args)
    if not url or not key:
        print("Missing URL or key", file=sys.stderr)
        return 1
    stats = import_mailerlite(url, key, limit=args.limit, max_pages=args.max_pages)
    _print(stats)
    return 0


def _parse_datetime(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise argparse.ArgumentTypeError(f"Invalid ISO datetime: {value}") from error


def cmd_backfill_mailerlite(args: argparse.Namespace) -> int:
    url, key = _resolve_creds(args)
    if not url or not key:
        print("Missing URL or key", file=sys.stderr)
        return 1
    since = _parse_datetime(args.since) if args.since else None
    stats = backfill_mailerlite(
        url=url,
        key=key,
        since=since,
        days=args.days,
        campaign_limit=args.limit,
        max_pages=args.max_pages,
        events=args.events,
        include_automations=args.include_automations,
        delay_s=args.delay,
        dry_run=args.dry_run,
    )
    _print(stats)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Supabase REST CLI (Keychain + .env)")
    p.add_argument("--url")
    p.add_argument("--key")
    p.add_argument("--kc-account", help="Keychain account name (service CRM-Supabase)")
    sub = p.add_subparsers(dest="cmd", required=True)

    pa = sub.add_parser("auth", help="Store Supabase URL/key")
    suba = pa.add_subparsers(dest="subcmd", required=True)
    pa_set = suba.add_parser("set", help="Save URL/key to Keychain or .env")
    pa_set.add_argument("--url", help="Supabase project URL (https://....supabase.co)")
    pa_set.add_argument("--key", required=True, help="Service role or anon key")
    pa_set.add_argument("--store", choices=["keychain", "env"], default="keychain")
    pa_set.add_argument("--account", default="service_role")
    pa_set.set_defaults(func=cmd_auth_set)

    pp = sub.add_parser("ping", help="Check health and contacts table availability")
    pp.set_defaults(func=cmd_ping)

    pc = sub.add_parser("contacts", help="Contacts operations")
    subc = pc.add_subparsers(dest="subcmd", required=True)
    pc_up = subc.add_parser("upsert", help="Upsert a contact JSON into contacts table")
    pc_up.add_argument("json", help='JSON like {"email":"a@b.com","name":"Name"}')
    pc_up.set_defaults(func=cmd_contacts_upsert)

    pimp = sub.add_parser("import-mailerlite", help="Import subscribers from MailerLite into contacts")
    pimp.add_argument("--limit", type=int, default=100)
    pimp.add_argument("--max-pages", type=int, default=100)
    pimp.set_defaults(func=cmd_import_mailerlite)

    pbf = sub.add_parser("backfill-mailerlite", help="Backfill MailerLite campaign events into Supabase")
    pbf.add_argument("--since", help="ISO timestamp (UTC) to start from")
    pbf.add_argument("--days", type=int, default=30, help="Fallback window if --since is not provided")
    pbf.add_argument("--limit", type=int, default=100, help="Campaign page size")
    pbf.add_argument("--max-pages", type=int, default=10, help="Max pages per campaign + event request")
    pbf.add_argument(
        "--events",
        nargs="*",
        default=list(CAMPAIGN_EVENT_SPECS.keys()),
        help="Event names to backfill (default campaign.sent, campaign.open, campaign.click)",
    )
    pbf.add_argument("--delay", type=float, default=0.3, help="Delay (seconds) between API calls")
    pbf.add_argument("--include-automations", action="store_true", help="Attempt automation backfill (beta)")
    pbf.add_argument("--dry-run", action="store_true", help="Only log stats without writing to Supabase")
    pbf.set_defaults(func=cmd_backfill_mailerlite)

    pig = sub.add_parser("ingest-ig-dms", help="Ingest last N days of Instagram DMs into interactions (extracting emails)")
    pig.add_argument("--page-id", default="333768529823589")
    pig.add_argument("--kc-account", default="tranquileza")
    pig.add_argument("--days", type=int, default=7)
    pig.add_argument("--max-conversations", type=int, default=25)
    pig.add_argument("--max-messages", type=int, default=50)
    pig.set_defaults(func=cmd_ingest_ig_dms)

    return p


def cmd_ingest_ig_dms(args: argparse.Namespace) -> int:
    url, key = _resolve_creds(args)
    if not url or not key:
        print("Missing URL or key", file=sys.stderr)
        return 1
    stats = ingest_ig_dms(
        page_id=args.page_id,
        kc_account=args.kc_account,
        days=args.days,
        url=url,
        key=key,
        max_conversations=args.max_conversations,
        max_messages=args.max_messages,
    )
    _print(stats)
    return 0


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
