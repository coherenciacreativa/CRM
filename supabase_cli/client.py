from __future__ import annotations

import json
import os
import shutil
import subprocess
from typing import Any, Dict, Optional, Tuple

from instagram_cli.env import load_env, save_env
from mailerlite_cli.keychain import get_api_key as kc_get, set_api_key as kc_set


def _curl_available() -> bool:
    return shutil.which("curl") is not None


def get_env_creds() -> Tuple[Optional[str], Optional[str]]:
    env = load_env()
    # Prefer CRM-specific keys if present; fall back to generic
    url = (
        env.get("SUPABASE_URL_CRM")
        or env.get("SUPABASE_URL")
        or os.environ.get("SUPABASE_URL_CRM")
        or os.environ.get("SUPABASE_URL")
    )
    key = (
        env.get("SUPABASE_SERVICE_ROLE_CRM")
        or env.get("SUPABASE_SERVICE_ROLE")
        or env.get("SUPABASE_ANON_KEY_CRM")
        or env.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_CRM")
        or os.environ.get("SUPABASE_SERVICE_ROLE")
        or os.environ.get("SUPABASE_ANON_KEY_CRM")
        or os.environ.get("SUPABASE_ANON_KEY")
    )
    return url, key


def set_keychain_key(key: str, account: str = "service_role") -> None:
    kc_set(key, service="CRM-Supabase", account=account)


def get_keychain_key(account: str = "service_role") -> Optional[str]:
    try:
        return kc_get(service="CRM-Supabase", account=account)
    except Exception:
        return None


def _headers(key: str) -> Dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "crm-cli/0.1",
    }


def _curl_json(method: str, url: str, *, headers: Dict[str, str], data: Optional[dict] = None) -> Tuple[int, Dict[str, Any]]:
    if not _curl_available():
        return 0, {"error": "curl not available"}
    cmd = [
        "curl",
        "--http2",
        "--silent",
        "--show-error",
        "--compressed",
        "-X",
        method.upper(),
    ]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    if data is not None:
        cmd += ["--data-binary", "@-"]
    cmd += [url, "-w", "\n__HTTP_STATUS:%{http_code}__\n"]

    proc = subprocess.run(cmd, input=json.dumps(data) if data is not None else None, text=True, capture_output=True)
    out = proc.stdout
    if "__HTTP_STATUS:" not in out:
        return 0, {"error": "malformed response"}
    body, _, tail = out.rpartition("__HTTP_STATUS:")
    status_str, _, _ = tail.partition("__")
    try:
        status = int(status_str.strip())
    except Exception:
        status = 0
    body = body.strip()
    try:
        payload = json.loads(body) if body else {}
    except json.JSONDecodeError:
        payload = {"raw": body}
    return status, payload


def _base(url: str) -> str:
    return url.rstrip("/")


def get(url: str, key: str, path: str, params: Optional[Dict[str, Any]] = None) -> Tuple[int, Dict[str, Any]]:
    h = _headers(key)
    if path.startswith("/"):
        path = path[1:]
    if params:
        import urllib.parse as up

        qs = up.urlencode(params, doseq=True)
        return _curl_json("GET", f"{_base(url)}/{path}?{qs}", headers=h)
    return _curl_json("GET", f"{_base(url)}/{path}", headers=h)


def post(url: str, key: str, path: str, body: dict) -> Tuple[int, Dict[str, Any]]:
    h = _headers(key)
    return _curl_json("POST", f"{_base(url)}/{path}", headers=h, data=body)


def upsert_contact(url: str, key: str, record: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    # Requires table contacts with RLS allowing service role
    h = _headers(key)
    h["Prefer"] = "resolution=merge-duplicates,return=representation"
    return _curl_json("POST", f"{_base(url)}/rest/v1/contacts", headers=h, data=[record])


def test_contacts_head(url: str, key: str) -> int:
    st, _ = get(url, key, "rest/v1/contacts", {"select": "id", "limit": 1})
    return st


def auth_health(url: str, key: Optional[str] = None) -> Tuple[int, Dict[str, Any]]:
    headers = {"Accept": "application/json"}
    if key:
        headers.update({"apikey": key, "Authorization": f"Bearer {key}"})
    return _curl_json("GET", f"{_base(url)}/auth/v1/health", headers=headers)


def ensure_group(url: str, key: str, name: str) -> Tuple[int, Dict[str, Any]]:
    h = _headers(key)
    h["Prefer"] = "resolution=merge-duplicates,return=representation"
    body = [{"name": name}]
    return _curl_json("POST", f"{_base(url)}/rest/v1/contact_groups", headers=h, data=body)


def add_member(url: str, key: str, contact_id: str, group_id: str) -> Tuple[int, Dict[str, Any]]:
    h = _headers(key)
    h["Prefer"] = "return=representation"
    body = [{"contact_id": contact_id, "group_id": group_id}]
    return _curl_json("POST", f"{_base(url)}/rest/v1/contact_group_members", headers=h, data=body)


def insert_interaction(url: str, key: str, record: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    h = _headers(key)
    h["Prefer"] = "return=representation"
    return _curl_json("POST", f"{_base(url)}/rest/v1/interactions", headers=h, data=[record])
