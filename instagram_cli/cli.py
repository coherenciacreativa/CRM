from __future__ import annotations

import argparse
import json
import sys

from .client import (
    debug_token,
    fb_exchange_short_to_long,
    get_access_token,
    get_keychain_token,
    graph_get,
    ig_exchange_short_to_long,
    set_access_token,
)
from .env import load_env, save_env


def _print(data):
    print(json.dumps(data, indent=2, ensure_ascii=False))


def cmd_auth_set(args: argparse.Namespace) -> int:
    token = args.token
    if not token:
        print("--token is required", file=sys.stderr)
        return 1
    if args.store == "keychain":
        set_access_token(token, account=args.account)
        print("Stored token in Keychain (CRM-Instagram)")
        return 0
    # env
    key = args.env_key or "IG_ACCESS_TOKEN"
    save_env({key: token})
    print(f"Stored token in .env as {key}")
    return 0


def cmd_auth_show(_: argparse.Namespace) -> int:
    tok = get_access_token()
    if not tok:
        print("No token found (Keychain or .env).")
        return 1
    masked = tok[:6] + "*" * max(0, len(tok) - 12) + tok[-6:]
    print(f"Token: {masked}")
    return 0


def cmd_auth_exchange(args: argparse.Namespace) -> int:
    mode = args.mode
    if mode == "basic":
        if not args.app_secret or not args.token:
            print("--app-secret and --token are required for basic display exchange", file=sys.stderr)
            return 1
        status, payload = ig_exchange_short_to_long(args.app_secret, args.token)
    else:  # facebook
        if not args.app_id or not args.app_secret or not args.token:
            print("--app-id, --app-secret and --token are required for facebook exchange", file=sys.stderr)
            return 1
        status, payload = fb_exchange_short_to_long(args.app_id, args.app_secret, args.token)

    print(f"HTTP {status}")
    _print(payload)
    if status == 200 and args.save:
        tok = payload.get("access_token") if isinstance(payload, dict) else None
        if tok:
            if args.store == "keychain":
                set_access_token(tok, account="long_lived")
                print("Saved long-lived token to Keychain (account=long_lived)")
            else:
                save_env({"IG_LONG_LIVED_TOKEN": tok})
                print("Saved long-lived token to .env (IG_LONG_LIVED_TOKEN)")
    return 0 if status == 200 else 2


def cmd_auth_debug(args: argparse.Namespace) -> int:
    if not args.app_id or not args.app_secret:
        print("--app-id and --app-secret required", file=sys.stderr)
        return 1
    tok = args.token or get_access_token()
    if not tok:
        print("No token provided/found", file=sys.stderr)
        return 1
    status, payload = debug_token(args.app_id, args.app_secret, tok)
    print(f"HTTP {status}")
    _print(payload)
    return 0 if status == 200 else 2


def _resolve_token(args: argparse.Namespace) -> str | None:
    if getattr(args, "token", None):
        return args.token
    if getattr(args, "kc_account", None):
        return get_keychain_token(args.kc_account)
    return get_access_token()


def cmd_pages_list(args: argparse.Namespace) -> int:
    tok = _resolve_token(args)
    status, payload = graph_get("/me/accounts", token=tok)
    print(f"HTTP {status}")
    _print(payload)
    return 0 if status == 200 else 2


def cmd_page_ig(args: argparse.Namespace) -> int:
    pid = args.page_id
    tok = _resolve_token(args)
    status, payload = graph_get(f"/{pid}", params={"fields": "instagram_business_account"}, token=tok)
    print(f"HTTP {status}")
    _print(payload)
    return 0 if status == 200 else 2


def cmd_ig_user(args: argparse.Namespace) -> int:
    igid = args.ig_user_id
    fields = (
        "id,username,name,profile_picture_url,followers_count,follows_count,media_count"
    )
    tok = _resolve_token(args)
    status, payload = graph_get(f"/{igid}", params={"fields": fields}, token=tok)
    print(f"HTTP {status}")
    _print(payload)
    return 0 if status == 200 else 2


def cmd_ig_media(args: argparse.Namespace) -> int:
    igid = args.ig_user_id
    fields = (
        "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,comments_count,like_count"
    )
    tok = _resolve_token(args)
    status, payload = graph_get(f"/{igid}/media", params={"fields": fields, "limit": args.limit}, token=tok)
    print(f"HTTP {status}")
    _print(payload)
    return 0 if status == 200 else 2


def cmd_ig_comments(args: argparse.Namespace) -> int:
    media_id = args.media_id
    fields = "id,text,username,timestamp,like_count"
    tok = _resolve_token(args)
    status, payload = graph_get(f"/{media_id}/comments", params={"fields": fields, "limit": args.limit}, token=tok)
    print(f"HTTP {status}")
    _print(payload)
    return 0 if status == 200 else 2


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Instagram Graph API CLI (Keychain + .env)")
    p.add_argument("--token", help="Override access token for this run")
    p.add_argument("--kc-account", help="Read token from Keychain account (service=CRM-Instagram)")
    sub = p.add_subparsers(dest="cmd", required=True)

    # auth
    pa = sub.add_parser("auth", help="Token storage and utilities")
    suba = pa.add_subparsers(dest="subcmd", required=True)

    pa_set = suba.add_parser("set", help="Store access token in Keychain or .env")
    pa_set.add_argument("--token", required=True, help="Access token value")
    pa_set.add_argument("--store", choices=["keychain", "env"], default="keychain")
    pa_set.add_argument("--account", default="access_token", help="Keychain account name (default access_token)")
    pa_set.add_argument("--env-key", help=".env key name (default IG_ACCESS_TOKEN)")
    pa_set.set_defaults(func=cmd_auth_set)

    pa_show = suba.add_parser("show", help="Show masked token from Keychain/.env")
    pa_show.set_defaults(func=cmd_auth_show)

    pa_ex = suba.add_parser("exchange", help="Exchange short-lived to long-lived token")
    pa_ex.add_argument("--mode", choices=["basic", "facebook"], default="facebook")
    pa_ex.add_argument("--app-id", help="App ID (facebook mode)")
    pa_ex.add_argument("--app-secret", help="App secret")
    pa_ex.add_argument("--token", help="Short-lived token to exchange")
    pa_ex.add_argument("--save", action="store_true", help="Save resulting long-lived token")
    pa_ex.add_argument("--store", choices=["keychain", "env"], default="keychain")
    pa_ex.set_defaults(func=cmd_auth_exchange)

    pa_dbg = suba.add_parser("debug", help="Debug token via /debug_token")
    pa_dbg.add_argument("--app-id", required=True)
    pa_dbg.add_argument("--app-secret", required=True)
    pa_dbg.add_argument("--token", help="Token to debug (defaults to stored token)")
    pa_dbg.set_defaults(func=cmd_auth_debug)

    # pages
    pp = sub.add_parser("pages", help="Facebook pages endpoints")
    subp = pp.add_subparsers(dest="subcmd", required=True)
    ppl = subp.add_parser("list", help="List pages for the user token")
    ppl.set_defaults(func=cmd_pages_list)

    ppi = subp.add_parser("ig", help="Get connected IG account (IG user id) for a page")
    ppi.add_argument("page_id", help="Facebook Page ID")
    ppi.set_defaults(func=cmd_page_ig)

    # instagram
    pig = sub.add_parser("ig", help="Instagram endpoints")
    subig = pig.add_subparsers(dest="subcmd", required=True)
    pig_user = subig.add_parser("user", help="Get IG user details")
    pig_user.add_argument("ig_user_id", help="Instagram User ID")
    pig_user.set_defaults(func=cmd_ig_user)

    pig_media = subig.add_parser("media", help="List IG user media")
    pig_media.add_argument("ig_user_id", help="Instagram User ID")
    pig_media.add_argument("--limit", type=int, default=25)
    pig_media.set_defaults(func=cmd_ig_media)

    pig_comments = subig.add_parser("comments", help="List comments on a media item")
    pig_comments.add_argument("media_id", help="Media ID")
    pig_comments.add_argument("--limit", type=int, default=25)
    pig_comments.set_defaults(func=cmd_ig_comments)

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
