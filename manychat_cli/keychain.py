import os
import subprocess
from typing import Optional


DEFAULT_SERVICE = "CRM-ManyChat"
DEFAULT_ACCOUNT = "api_key"


class KeychainError(RuntimeError):
    pass


def _run_security(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["security", *cmd],
        check=False,
        capture_output=True,
        text=True,
    )


def set_api_key(api_key: str, *, service: str = DEFAULT_SERVICE, account: str = DEFAULT_ACCOUNT) -> None:
    if not api_key:
        raise ValueError("API key must be non-empty")

    try:
        proc = _run_security([
            "add-generic-password",
            "-a", account,
            "-s", service,
            "-w", api_key,
            "-U",
        ])
        if proc.returncode == 0:
            return
    except FileNotFoundError:
        pass

    os.environ["MANYCHAT_API_KEY"] = api_key


def get_api_key(*, service: str = DEFAULT_SERVICE, account: str = DEFAULT_ACCOUNT) -> Optional[str]:
    try:
        proc = _run_security([
            "find-generic-password",
            "-a", account,
            "-s", service,
            "-w",
        ])
        if proc.returncode == 0:
            return proc.stdout.strip()
    except FileNotFoundError:
        pass

    return os.environ.get("MANYCHAT_API_KEY")


def clear_api_key(*, service: str = DEFAULT_SERVICE, account: str = DEFAULT_ACCOUNT) -> bool:
    removed = False
    try:
        proc = _run_security([
            "delete-generic-password",
            "-a", account,
            "-s", service,
        ])
        removed = proc.returncode == 0
    except FileNotFoundError:
        pass

    if os.environ.pop("MANYCHAT_API_KEY", None) is not None:
        removed = True or removed

    return removed

