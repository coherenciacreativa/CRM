import argparse
import json
import sys
from getpass import getpass
from typing import Any, Dict

from .client import MailerLiteError, get as api_get, post as api_post
from .keychain import clear_api_key, get_api_key, set_api_key
from . import people as ppl


def _print_json(data: Any) -> None:
    print(json.dumps(data, indent=2, ensure_ascii=False))


def cmd_auth_set(args: argparse.Namespace) -> int:
    api_key = args.key or getpass("Enter MailerLite API key: ")
    try:
        set_api_key(api_key)
    except Exception as e:  # noqa: BLE001
        print(f"Failed to store API key: {e}", file=sys.stderr)
        return 1
    print("API key stored in Keychain (or env fallback).")
    return 0


def cmd_auth_show(_: argparse.Namespace) -> int:
    key = get_api_key()
    if not key:
        print("No API key set.")
        return 1
    masked = key[:4] + "*" * max(0, len(key) - 8) + key[-4:]
    print(f"API key: {masked}")
    return 0


def cmd_auth_clear(_: argparse.Namespace) -> int:
    removed = clear_api_key()
    if removed:
        print("API key cleared.")
        return 0
    print("No API key found.")
    return 1


def cmd_account_get(_: argparse.Namespace) -> int:
    try:
        data = api_get("/account")
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.payload:
            _print_json(e.payload)
        return 2
    _print_json(data)
    return 0


def cmd_subscribers_list(args: argparse.Namespace) -> int:
    params: Dict[str, Any] = {"limit": args.limit, "page": args.page}
    try:
        data = api_get("/subscribers", params=params)
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.payload:
            _print_json(e.payload)
        return 2
    _print_json(data)
    return 0


def cmd_subscribers_get(args: argparse.Namespace) -> int:
    try:
        data = api_get(f"/subscribers/{args.id}")
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.payload:
            _print_json(e.payload)
        return 2
    _print_json(data)
    return 0


def cmd_subscribers_create(args: argparse.Namespace) -> int:
    body: Dict[str, Any] = {"email": args.email}
    fields: Dict[str, Any] = {}
    if args.name:
        fields["name"] = args.name
    if args.fields:
        try:
            extra = json.loads(args.fields)
            if not isinstance(extra, dict):
                raise ValueError("fields must be a JSON object")
        except Exception as e:  # noqa: BLE001
            print(f"Invalid fields JSON: {e}", file=sys.stderr)
            return 1
        fields.update(extra)
    if fields:
        body["fields"] = fields

    try:
        data = api_post("/subscribers", body=body)
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.payload:
            _print_json(e.payload)
        return 2
    _print_json(data)
    return 0


def cmd_subscribers_groups(args: argparse.Namespace) -> int:
    sub_id = args.id
    try:
        data = api_get(f"/subscribers/{sub_id}/groups")
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.payload:
            _print_json(e.payload)
        return 2
    _print_json(data)
    return 0


def cmd_raw(args: argparse.Namespace) -> int:
    method = args.method.lower()
    path = args.path
    params = None
    body = None
    if args.params:
        try:
            params = json.loads(args.params)
        except Exception as e:  # noqa: BLE001
            print(f"Invalid params JSON: {e}", file=sys.stderr)
            return 1
    if args.body:
        try:
            body = json.loads(args.body)
        except Exception as e:  # noqa: BLE001
            print(f"Invalid body JSON: {e}", file=sys.stderr)
            return 1
    try:
        if method == "get":
            data = api_get(path, params=params)
        elif method == "post":
            data = api_post(path, body=body, params=params)
        else:
            from .client import put as api_put, delete as api_delete
            if method == "put":
                data = api_put(path, body=body, params=params)
            elif method == "delete":
                data = api_delete(path, params=params)
            else:
                print("Unsupported method:", method, file=sys.stderr)
                return 1
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.payload:
            _print_json(e.payload)
        return 2
    _print_json(data)
    return 0


def _resolve_subscriber_from_args(args: argparse.Namespace) -> dict | None:
    sid = getattr(args, "id", None)
    email = getattr(args, "email", None)
    try:
        if sid:
            return ppl.get_subscriber(sid)
        if email:
            sub = ppl.get_subscriber_by_email(email)
            if not sub:
                return None
            return ppl.get_subscriber(str(sub.get("id")))
    except MailerLiteError:
        return None
    return None


def cmd_people_find(args: argparse.Namespace) -> int:
    tokens = (args.tokens or "").split()
    try:
        matches = ppl.search_candidates(tokens=tokens, email=args.email, limit=args.limit, max_pages=args.max_pages, use_search=args.use_search)
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2

    out = []
    for it in matches:
        fields = it.get("fields") or {}
        entry = {
            "id": it.get("id"),
            "email": it.get("email"),
            "name": fields.get("name") or fields.get("first_name") or it.get("name"),
            "first_name": fields.get("first_name"),
            "last_name": fields.get("last_name"),
            "city": fields.get("city") or it.get("city"),
            "phone": fields.get("phone"),
        }
        if args.show_groups:
            try:
                gresp = api_get(f"/subscribers/{it.get('id')}/groups")
                groups = gresp.get("data") or []
                entry["groups"] = [{"id": g.get("id"), "name": g.get("name")} for g in groups]
            except MailerLiteError:
                entry["groups"] = []
        out.append(entry)
    _print_json(out)
    return 0


def cmd_people_show(args: argparse.Namespace) -> int:
    sub = _resolve_subscriber_from_args(args)
    if not sub:
        print("Subscriber not found.")
        return 1
    _print_json(sub)
    return 0


def cmd_people_group_add(args: argparse.Namespace) -> int:
    sub = _resolve_subscriber_from_args(args)
    if not sub:
        print("Subscriber not found.")
        return 1
    gid = None
    try:
        g = ppl.find_group_by_name(args.group)
        if not g:
            print("Group not found.")
            return 1
        gid = str(g.get("id"))
        ppl.add_to_group(str(sub.get("id")), gid)
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2
    print(json.dumps({"ok": True, "subscriber_id": sub.get("id"), "group_id": gid}, indent=2))
    return 0


def cmd_people_group_remove(args: argparse.Namespace) -> int:
    sub = _resolve_subscriber_from_args(args)
    if not sub:
        print("Subscriber not found.")
        return 1
    gid = None
    try:
        g = ppl.find_group_by_name(args.group)
        if not g:
            print("Group not found.")
            return 1
        gid = str(g.get("id"))
        ppl.remove_from_group(str(sub.get("id")), gid)
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2
    print(json.dumps({"ok": True, "subscriber_id": sub.get("id"), "group_id": gid}, indent=2))
    return 0


def cmd_people_set_fields(args: argparse.Namespace) -> int:
    sub = _resolve_subscriber_from_args(args)
    if not sub:
        print("Subscriber not found.")
        return 1
    try:
        fields = json.loads(args.fields)
        if not isinstance(fields, dict):
            raise ValueError("fields must be a JSON object")
    except Exception as e:  # noqa: BLE001
        print(f"Invalid fields JSON: {e}", file=sys.stderr)
        return 1
    try:
        data = ppl.update_fields(str(sub.get("id")), fields)
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2
    _print_json(data)
    return 0


def _extract_items(resp: Any) -> list[dict]:
    if isinstance(resp, list):
        return [x for x in resp if isinstance(x, dict)]
    if isinstance(resp, dict):
        for key in ("data", "subscribers", "items", "results"):
            val = resp.get(key)
            if isinstance(val, list):
                return [x for x in val if isinstance(x, dict)]
    return []


def _match_name(item: dict, needle: str, *, exact: bool = False, case_sensitive: bool = False) -> bool:
    candidates: list[str] = []
    fields = item.get("fields") if isinstance(item, dict) else None
    if isinstance(fields, dict):
        for k in ("name", "first_name", "last_name"):
            v = fields.get(k)
            if isinstance(v, str):
                candidates.append(v)
        # combined full name if available
        fn = fields.get("first_name")
        ln = fields.get("last_name")
        if isinstance(fn, str) and isinstance(ln, str):
            candidates.append(f"{fn} {ln}")
    # top-level fallbacks
    for k in ("name", "first_name", "last_name"):
        v = item.get(k)
        if isinstance(v, str):
            candidates.append(v)
    if not candidates:
        return False

    if not case_sensitive:
        needle_cmp = needle.lower()
        def norm(s: str) -> str: return s.lower()
    else:
        needle_cmp = needle
        def norm(s: str) -> str: return s

    for c in candidates:
        c_norm = norm(c)
        if exact:
            if c_norm == needle_cmp:
                return True
        else:
            if needle_cmp in c_norm:
                return True
    return False


def cmd_subscribers_find(args: argparse.Namespace) -> int:
    needle = args.name
    limit = args.limit
    page = 1
    matches: list[dict] = []
    try:
        while page <= args.max_pages:
            params: Dict[str, Any] = {"limit": limit, "page": page}
            # Use API-side search if available to reduce payload
            if args.use_search:
                params["search"] = needle
            resp = api_get("/subscribers", params=params)
            items = _extract_items(resp)
            if not items:
                break
            for it in items:
                if not _match_name(it, needle, exact=args.exact, case_sensitive=args.case_sensitive):
                    continue
                if args.city:
                    f = it.get("fields") or {}
                    city_val = f.get("city") or it.get("city")
                    if not isinstance(city_val, str):
                        continue
                    if city_val.strip().lower() != args.city.strip().lower():
                        continue
                matches.append(it)
            if len(items) < limit:
                break
            page += 1
    except MailerLiteError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.payload:
            _print_json(e.payload)
        return 2

    _print_json(matches)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="MailerLite CLI integration (Keychain + API)")
    sub = p.add_subparsers(dest="cmd", required=True)

    # auth
    pa = sub.add_parser("auth", help="Manage API credentials")
    suba = pa.add_subparsers(dest="subcmd", required=True)

    pa_set = suba.add_parser("set", help="Store API key in Keychain")
    pa_set.add_argument("--key", help="API key value (use prompt if omitted)")
    pa_set.set_defaults(func=cmd_auth_set)

    pa_show = suba.add_parser("show", help="Show masked API key")
    pa_show.set_defaults(func=cmd_auth_show)

    pa_clear = suba.add_parser("clear", help="Remove API key from Keychain")
    pa_clear.set_defaults(func=cmd_auth_clear)

    # account
    pacct = sub.add_parser("account", help="Account endpoints")
    subacct = pacct.add_subparsers(dest="subcmd", required=True)
    pacct_get = subacct.add_parser("get", help="Get account info")
    pacct_get.set_defaults(func=cmd_account_get)

    # subscribers
    psubs = sub.add_parser("subscribers", help="Subscribers endpoints")
    subsubs = psubs.add_subparsers(dest="subcmd", required=True)

    psubs_list = subsubs.add_parser("list", help="List subscribers")
    psubs_list.add_argument("--limit", type=int, default=25, help="Items per page (default 25)")
    psubs_list.add_argument("--page", type=int, default=1, help="Page number (default 1)")
    psubs_list.set_defaults(func=cmd_subscribers_list)

    psubs_get = subsubs.add_parser("get", help="Get subscriber by ID")
    psubs_get.add_argument("id", help="Subscriber ID")
    psubs_get.set_defaults(func=cmd_subscribers_get)

    psubs_create = subsubs.add_parser("create", help="Create subscriber")
    psubs_create.add_argument("--email", required=True, help="Subscriber email")
    psubs_create.add_argument("--name", help="Subscriber name (stored in fields.name)")
    psubs_create.add_argument("--fields", help="Additional fields as JSON object")
    psubs_create.set_defaults(func=cmd_subscribers_create)

    psubs_find = subsubs.add_parser("find", help="Find subscribers by name")
    psubs_find.add_argument("name", help="Name to search for")
    psubs_find.add_argument("--exact", action="store_true", help="Exact match instead of contains")
    psubs_find.add_argument("--case-sensitive", action="store_true", help="Case-sensitive matching")
    psubs_find.add_argument("--city", help="Filter by city (case-insensitive equals)")
    psubs_find.add_argument("--limit", type=int, default=100, help="Items per page while scanning")
    psubs_find.add_argument("--max-pages", type=int, default=50, help="Maximum pages to scan")
    psubs_find.add_argument("--use-search", action="store_true", help="Use API-side search parameter if available")
    psubs_find.set_defaults(func=cmd_subscribers_find)

    praw = sub.add_parser("raw", help="Low-level API call for power users")
    praw.add_argument("method", choices=["get", "post", "put", "delete"], help="HTTP method")
    praw.add_argument("path", help="API path, e.g. /subscribers")
    praw.add_argument("--params", help="Query params as JSON object")
    praw.add_argument("--body", help="JSON body for POST/PUT")
    praw.set_defaults(func=cmd_raw)

    # subscribers groups
    psubs_groups = subsubs.add_parser("groups", help="List groups for a subscriber")
    psubs_groups.add_argument("id", help="Subscriber ID")
    psubs_groups.set_defaults(func=cmd_subscribers_groups)

    # people (higher-level helpers)
    ppeople = sub.add_parser("people", help="Find, show, update, and manage groups by name/email")
    subpeople = ppeople.add_subparsers(dest="subcmd", required=True)

    pfind = subpeople.add_parser("find", help="Find subscribers by tokens and/or email")
    pfind.add_argument("--tokens", help="Space-separated tokens to match across name/email/city")
    pfind.add_argument("--email", help="Exact email to match")
    pfind.add_argument("--limit", type=int, default=100, help="Page size while scanning")
    pfind.add_argument("--max-pages", type=int, default=10, help="Max pages to scan if needed")
    pfind.add_argument("--use-search", action="store_true", help="Use API-side search first")
    pfind.add_argument("--show-groups", action="store_true", help="Include group names for each match")
    pfind.set_defaults(func=cmd_people_find)

    pshow = subpeople.add_parser("show", help="Show a subscriber by id or email")
    pshow.add_argument("--id", help="Subscriber ID")
    pshow.add_argument("--email", help="Subscriber email")
    pshow.set_defaults(func=cmd_people_show)

    paddg = subpeople.add_parser("group-add", help="Add a subscriber to a group by name")
    paddg.add_argument("--id", help="Subscriber ID")
    paddg.add_argument("--email", help="Subscriber email")
    paddg.add_argument("--group", required=True, help="Group name to add")
    paddg.set_defaults(func=cmd_people_group_add)

    prmg = subpeople.add_parser("group-remove", help="Remove a subscriber from a group by name")
    prmg.add_argument("--id", help="Subscriber ID")
    prmg.add_argument("--email", help="Subscriber email")
    prmg.add_argument("--group", required=True, help="Group name to remove")
    prmg.set_defaults(func=cmd_people_group_remove)

    psetf = subpeople.add_parser("set-fields", help="Update fields for a subscriber")
    psetf.add_argument("--id", help="Subscriber ID")
    psetf.add_argument("--email", help="Subscriber email")
    psetf.add_argument("--fields", required=True, help="JSON object of fields to set")
    psetf.set_defaults(func=cmd_people_set_fields)

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
