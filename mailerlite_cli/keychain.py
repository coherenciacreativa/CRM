import os
import subprocess
from typing import Optional


DEFAULT_SERVICE = "CRM-MailerLite"
DEFAULT_ACCOUNT = "default"


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
    """Store the API key in macOS Keychain under a generic password item.

    Falls back to environment variable `MAILERLITE_API_KEY` if Keychain is not available.
    """
    if not api_key:
        raise ValueError("API key must be non-empty")

    # Try macOS Keychain via `security` CLI
    try:
        proc = _run_security([
            "add-generic-password",
            "-a", account,
            "-s", service,
            "-w", api_key,
            "-U",  # update if exists
        ])
        if proc.returncode == 0:
            return
        # If `security` is not available or denied, fall back
    except FileNotFoundError:
        pass

    # Fallback: store in environment for the current shell session (best-effort)
    os.environ["MAILERLITE_API_KEY"] = api_key


def get_api_key(*, service: str = DEFAULT_SERVICE, account: str = DEFAULT_ACCOUNT) -> Optional[str]:
    """Retrieve the API key from Keychain. Falls back to `MAILERLITE_API_KEY` env var.

    Returns None if not found.
    """
    # Try macOS Keychain first
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

    # Fallback to environment variable
    return os.environ.get("MAILERLITE_API_KEY")


def clear_api_key(*, service: str = DEFAULT_SERVICE, account: str = DEFAULT_ACCOUNT) -> bool:
    """Delete the API key from Keychain. Returns True if removed, False if not found.

    Also clears the `MAILERLITE_API_KEY` environment variable.
    """
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

    if os.environ.pop("MAILERLITE_API_KEY", None) is not None:
        removed = True or removed

    return removed

