import json
import os
import shutil
import ssl
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple

from .keychain import get_api_key


BASE_URL = "https://connect.mailerlite.com/api"


class MailerLiteError(RuntimeError):
    def __init__(self, status: int, message: str, payload: Optional[dict] = None):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status
        self.payload = payload or {}


def _build_url(path: str, params: Optional[Dict[str, Any]] = None) -> str:
    if not path.startswith("/"):
        path = "/" + path
    url = BASE_URL + path
    if params:
        # Drop None values
        q = {k: v for k, v in params.items() if v is not None}
        url = url + "?" + urllib.parse.urlencode(q, doseq=True)
    return url


def _curl_available() -> bool:
    return shutil.which("curl") is not None


def _request_with_curl(method: str, url: str, token: str, body: Optional[Dict[str, Any]], headers: Dict[str, str]) -> Tuple[int, dict]:
    cmd = [
        "curl",
        "--http2",
        "--silent",
        "--show-error",
        "--compressed",
        "-X",
        method.upper(),
        "-H",
        f"Authorization: Bearer {token}",
        "-H",
        headers.get("Accept", "Accept: application/json") if headers.get("Accept", "").startswith("Accept:") else f"Accept: {headers.get('Accept', 'application/json')}",
        "-H",
        f"User-Agent: {headers.get('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:117.0) Gecko/20100101 Firefox/117.0')}",
        url,
        "-w",
        "\n__HTTP_STATUS:%{http_code}__\n",
    ]

    data: Optional[str] = None
    if body is not None:
        data = json.dumps(body)
        # Content-Type
        cmd[cmd.index(url):cmd.index(url)] = [
            "-H",
            "Content-Type: application/json",
            "--data-binary",
            "@-",
        ]

    try:
        proc = subprocess.run(
            cmd,
            input=data,
            text=True,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        raise MailerLiteError(0, "curl not available")

    out = proc.stdout
    if not out:
        raise MailerLiteError(0, proc.stderr.strip() or "Empty response")
    if "__HTTP_STATUS:" not in out:
        raise MailerLiteError(0, "Malformed curl output")
    body_str, _, tail = out.rpartition("__HTTP_STATUS:")
    status_str, _, _ = tail.partition("__")
    try:
        status = int(status_str.strip())
    except ValueError:
        status = 0
    body_str = body_str.strip()
    if not body_str:
        payload = {}
    else:
        try:
            payload = json.loads(body_str)
        except json.JSONDecodeError:
            payload = {"raw": body_str}
    if 200 <= status < 300:
        return status, payload
    message = payload.get("message") or payload.get("error") or proc.stderr.strip() or "Request failed"
    raise MailerLiteError(status, message, payload)


def _request(method: str, path: str, *, body: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None, api_key: Optional[str] = None) -> Tuple[int, dict]:
    token = api_key or get_api_key()
    if not token:
        raise MailerLiteError(401, "Missing API key. Set it via the CLI auth command.")

    url = _build_url(path, params)

    data: Optional[bytes] = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:117.0) Gecko/20100101 Firefox/117.0",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    # Prefer curl for better compatibility with WAF/CDN
    if os.getenv("MAILERLITE_HTTP", "curl").lower() == "curl" and _curl_available():
        # Convert header dict into explicit values for curl helper
        return _request_with_curl(method, url, token, body, headers)

    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)

    def _urlopen(r: urllib.request.Request):
        insecure = os.getenv("MAILERLITE_INSECURE") == "1"
        if insecure:
            ctx = ssl._create_unverified_context()
            return urllib.request.urlopen(r, context=ctx)
        return urllib.request.urlopen(r)

    try:
        with _urlopen(req) as resp:
            status = resp.getcode()
            raw = resp.read()
            if not raw:
                return status, {}
            try:
                payload = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                payload = {"raw": raw.decode("utf-8", errors="replace")}
            return status, payload
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            payload = json.loads(raw.decode("utf-8")) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", errors="replace")}
        message = payload.get("message") or payload.get("error") or e.reason or "Request failed"
        raise MailerLiteError(e.code, message, payload)
    except urllib.error.URLError as e:
        raise MailerLiteError(0, f"Connection error: {e.reason}")


def get(path: str, *, params: Optional[Dict[str, Any]] = None, api_key: Optional[str] = None) -> dict:
    _, payload = _request("GET", path, params=params, api_key=api_key)
    return payload


def post(path: str, *, body: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None, api_key: Optional[str] = None) -> dict:
    _, payload = _request("POST", path, body=body, params=params, api_key=api_key)
    return payload


def put(path: str, *, body: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None, api_key: Optional[str] = None) -> dict:
    _, payload = _request("PUT", path, body=body, params=params, api_key=api_key)
    return payload


def delete(path: str, *, params: Optional[Dict[str, Any]] = None, api_key: Optional[str] = None) -> dict:
    _, payload = _request("DELETE", path, params=params, api_key=api_key)
    return payload
