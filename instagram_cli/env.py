from __future__ import annotations

import os
from typing import Dict


ENV_PATH = ".env"


def load_env(path: str = ENV_PATH) -> Dict[str, str]:
    data: Dict[str, str] = {}
    if not os.path.exists(path):
        return data
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            if "=" not in s:
                continue
            k, v = s.split("=", 1)
            data[k.strip()] = v.strip().strip('"')
    return data


def save_env(updates: Dict[str, str], path: str = ENV_PATH) -> None:
    env = load_env(path)
    env.update({k: v for k, v in updates.items() if v is not None})
    lines = [f"{k}={v}\n" for k, v in sorted(env.items())]
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)

