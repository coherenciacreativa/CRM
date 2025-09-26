from __future__ import annotations

import json
import os
import shutil
import subprocess
import urllib.parse
from typing import Any, Dict, Optional, Tuple

from instagram_cli.env import load_env  # reuse existing env util
from .keychain import get_api_key as kc_get, set_api_key as kc_set


BASE = "https://api.manychat.com"


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


def _env_api_key() -> Optional[str]:
    env = load_env()
    for key in (
        "MANYCHAT_PAGE_SCOPED_API_KEY",  # preferred explicit page-scoped var (underscore)
        "MANYCHAT_PAGE-SCOPED_API_KEY",  # tolerate hyphenated variant as in .env:48
        "MANYCHAT_API_KEY",  # generic fallback
    ):
        v = env.get(key)
        if v:
            return v
    # Environment variables (OS) cannot contain hyphens reliably, but check common names anyway
    return (
        os.environ.get("MANYCHAT_PAGE_SCOPED_API_KEY")
        or os.environ.get("MANYCHAT_API_KEY")
        or os.environ.get("MANYCHAT_PAGE-SCOPED_API_KEY")
    )


def get_api_key() -> Optional[str]:
    # Priority: Keychain > .env > process env
    v = kc_get()
    if v:
        return v
    return _env_api_key()


def set_api_key(api_key: str) -> None:
    kc_set(api_key)


def _auth_headers(token: Optional[str] = None) -> Dict[str, str]:
    tok = token or get_api_key()
    return {"Authorization": f"Bearer {tok}"} if tok else {}


def api_get(path: str, *, params: Optional[Dict[str, Any]] = None, token: Optional[str] = None) -> Tuple[int, Dict[str, Any]]:
    if not path.startswith("/"):
        path = "/" + path
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    return _curl_json(url, headers=_auth_headers(token))


def page_get_info() -> Tuple[int, Dict[str, Any]]:
    return api_get("/fb/page/getInfo")


def subscriber_find_by_name(name: str) -> Tuple[int, Dict[str, Any]]:
    return api_get("/fb/subscriber/findByName", params={"name": name})


def subscriber_get_info(subscriber_id: int | str) -> Tuple[int, Dict[str, Any]]:
    return api_get("/fb/subscriber/getInfo", params={"subscriber_id": subscriber_id})


def profile_generate_single_use_link(template_id: int) -> Tuple[int, Dict[str, Any]]:
    # Useful to validate a Profile-scoped token; expect 400 for invalid template_id but 401 for wrong token
    if not _curl_available():
        return 0, {"error": "curl not available"}
    import json as _json
    headers = _auth_headers()
    headers.setdefault("Content-Type", "application/json")
    # manual small POST using _curl_json helper doesn't support method override; keep it simple via subprocess
    url = BASE + "/user/template/generateSingleUseLink"
    cmd = [
        "curl", "--http2", "--silent", "--show-error", "--compressed",
        "-H", "Accept: application/json",
    ]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    cmd += [
        "-X", "POST",
        "--data-binary", _json.dumps({"template_id": int(template_id)}),
        url, "-w", "\n__HTTP_STATUS:%{http_code}__\n",
    ]
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
        payload = _json.loads(body) if body else {}
    except _json.JSONDecodeError:
        payload = {"raw": body}
    return status, payload


def subscriber_find_by_system_field(*, email: str | None = None, phone: str | None = None) -> Tuple[int, Dict[str, Any]]:
    params: Dict[str, Any] = {}
    if email:
        params["email"] = email
    if phone and not email:
        params["phone"] = phone
    return api_get("/fb/subscriber/findBySystemField", params=params)
