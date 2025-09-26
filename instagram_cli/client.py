from __future__ import annotations

import json
import os
import shutil
import subprocess
import urllib.parse
from typing import Any, Dict, Optional, Tuple

from mailerlite_cli.keychain import get_api_key as kc_get, set_api_key as kc_set
from .env import load_env


GRAPH_BASE = "https://graph.facebook.com/v19.0"
IG_BASE = "https://graph.instagram.com"


def _curl_available() -> bool:
    return shutil.which("curl") is not None


def _curl_json(url: str, headers: Optional[Dict[str, str]] = None) -> Tuple[int, Dict[str, Any]]:
    if not _curl_available():
        return 0, {"error": "curl not available"}

    cmd = [
        "curl",
        "--http2",
        "--silent",
        "--show-error",
        "--compressed",
        "-H",
        "Accept: application/json",
        "-H",
        "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:117.0) Gecko/20100101 Firefox/117.0",
        url,
        "-w",
        "\n__HTTP_STATUS:%{http_code}__\n",
    ]
    if headers:
        for k, v in headers.items():
            cmd[cmd.index(url):cmd.index(url)] = ["-H", f"{k}: {v}"]

    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
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


def _env_token() -> Optional[str]:
    env = load_env()
    for k in ("IG_ACCESS_TOKEN", "IG_LONG_LIVED_TOKEN", "FB_USER_TOKEN"):
        v = env.get(k)
        if v:
            return v
    return os.environ.get("IG_ACCESS_TOKEN") or os.environ.get("FB_USER_TOKEN")


def _kc(service: str, account: str) -> Optional[str]:
    try:
        return kc_get(service=service, account=account)
    except Exception:
        return None


def get_access_token() -> Optional[str]:
    # Priority: Keychain > .env > process env
    for account in ("access_token", "long_lived", "user_token"):
        v = _kc("CRM-Instagram", account)
        if v:
            return v
    return _env_token()


def get_keychain_token(account: str) -> Optional[str]:
    try:
        return kc_get(service="CRM-Instagram", account=account)
    except Exception:
        return None


def set_access_token(token: str, *, account: str = "access_token") -> None:
    kc_set(token, service="CRM-Instagram", account=account)


def graph_get(path: str, *, params: Optional[Dict[str, Any]] = None, token: Optional[str] = None, base: str = GRAPH_BASE) -> Tuple[int, Dict[str, Any]]:
    if not path.startswith("/"):
        path = "/" + path
    tok = token or get_access_token()
    q = params.copy() if params else {}
    if tok:
        q["access_token"] = tok
    url = base + path
    if q:
        url += "?" + urllib.parse.urlencode(q, doseq=True)
    return _curl_json(url)


def ig_exchange_short_to_long(app_secret: str, short_token: str) -> Tuple[int, Dict[str, Any]]:
    url = (
        f"{IG_BASE}/access_token?grant_type=ig_exchange_token&client_secret="
        f"{urllib.parse.quote_plus(app_secret)}&access_token={urllib.parse.quote_plus(short_token)}"
    )
    return _curl_json(url)


def fb_exchange_short_to_long(app_id: str, app_secret: str, short_token: str) -> Tuple[int, Dict[str, Any]]:
    url = (
        f"{GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id="
        f"{urllib.parse.quote_plus(app_id)}&client_secret={urllib.parse.quote_plus(app_secret)}&fb_exchange_token="
        f"{urllib.parse.quote_plus(short_token)}"
    )
    return _curl_json(url)


def debug_token(app_id: str, app_secret: str, input_token: str) -> Tuple[int, Dict[str, Any]]:
    app_access_token = f"{app_id}|{app_secret}"
    url = (
        f"{GRAPH_BASE}/debug_token?input_token={urllib.parse.quote_plus(input_token)}&access_token="
        f"{urllib.parse.quote_plus(app_access_token)}"
    )
    return _curl_json(url)
