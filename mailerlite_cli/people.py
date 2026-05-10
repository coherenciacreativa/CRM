from __future__ import annotations

import time
import unicodedata
import urllib.parse
from typing import Any, Dict, Iterable, List, Optional

from .client import get as api_get, post as api_post, delete as api_delete, put as api_put, MailerLiteError


def _norm(s: Optional[str]) -> str:
    if not s:
        return ""
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii").lower()


def _collect_text(item: dict) -> str:
    fields = item.get("fields") or {}
    parts: List[str] = []
    for k in ("name", "first_name", "last_name", "company", "country", "city", "phone", "notes", "note"):
        v = fields.get(k)
        if isinstance(v, str):
            parts.append(v)
    # top-level fallbacks
    for k in ("name", "first_name", "last_name", "city", "phone", "status", "notes", "note"):
        v = item.get(k)
        if isinstance(v, str):
            parts.append(v)
    for v in fields.values():
        if isinstance(v, str):
            parts.append(v)
    # email always included
    email = item.get("email")
    if isinstance(email, str):
        parts.append(email)
    return " ".join(parts)


def _extract_items(resp: Any) -> List[dict]:
    if isinstance(resp, list):
        return [x for x in resp if isinstance(x, dict)]
    if isinstance(resp, dict):
        for key in ("data", "subscribers", "items", "results"):
            val = resp.get(key)
            if isinstance(val, list):
                return [x for x in val if isinstance(x, dict)]
    return []


def _extract_next_cursor(resp: Any) -> Optional[str]:
    if not isinstance(resp, dict):
        return None
    for container in (resp, resp.get("meta") if isinstance(resp.get("meta"), dict) else None):
        if not isinstance(container, dict):
            continue
        for key in ("next_cursor", "nextCursor"):
            value = container.get(key)
            if isinstance(value, str) and value:
                return value
        links = container.get("links")
        if isinstance(links, dict):
            next_link = links.get("next")
            if isinstance(next_link, str) and next_link:
                parsed = urllib.parse.urlparse(next_link)
                query = urllib.parse.parse_qs(parsed.query)
                for key in ("cursor", "next_cursor", "page[cursor]"):
                    values = query.get(key)
                    if values and values[0]:
                        return values[0]
    return None


def _subscriber_pages(
    *,
    params: Dict[str, Any],
    max_pages: int,
    delay_s: float,
) -> Iterable[List[dict]]:
    cursor: Optional[str] = None
    page = 1
    while page <= max_pages:
        request_params = dict(params)
        if cursor:
            request_params["cursor"] = cursor
        try:
            resp = api_get("/subscribers", params=request_params)
        except MailerLiteError as e:
            if getattr(e, "status", 0) == 429:
                time.sleep(delay_s * 2)
                continue
            raise
        items = _extract_items(resp)
        if not items:
            break
        yield items
        cursor = _extract_next_cursor(resp)
        if not cursor:
            break
        page += 1
        time.sleep(delay_s)


def search_candidates(
    *,
    tokens: Iterable[str] | None = None,
    email: Optional[str] = None,
    limit: int = 100,
    max_pages: int = 10,
    use_search: bool = True,
    match_any: bool = False,
    delay_s: float = 0.15,
) -> List[dict]:
    tokens_n = [_norm(t) for t in (tokens or []) if t]
    email_n = _norm(email) if email else None

    seen: set[str] = set()
    results: List[dict] = []

    def accept(item: dict) -> bool:
        txt = _norm(_collect_text(item))
        if email_n:
            # exact email match if provided
            e = _norm(item.get("email"))
            if e != email_n:
                return False
        if match_any and tokens_n:
            return any(t and t in txt for t in tokens_n)
        for t in tokens_n:
            if t and t not in txt:
                return False
        return True

    # Phase 1: server-side search for each token/email to reduce payload
    if use_search:
        queries = []
        if email:
            queries.append(email)
        queries.extend([t for t in tokens or [] if t])
        for q in queries:
            attempt = 0
            while True:
                try:
                    for items in _subscriber_pages(
                        params={"limit": limit, "search": q},
                        max_pages=max_pages,
                        delay_s=delay_s,
                    ):
                        for it in items:
                            sid = str(it.get("id"))
                            if sid in seen:
                                continue
                            if accept(it):
                                results.append(it)
                            seen.add(sid)
                    break
                except MailerLiteError as e:
                    if getattr(e, "status", 0) == 429 and attempt < 3:
                        attempt += 1
                        time.sleep(delay_s * (2 ** attempt))
                        continue
                    # ignore and fallback to pagination
                    break
            time.sleep(delay_s)
        if results:
            return results

    # Phase 2: cursor-paginate through subscribers and filter locally.
    for items in _subscriber_pages(
        params={"limit": limit},
        max_pages=max_pages,
        delay_s=delay_s,
    ):
        for it in items:
            sid = str(it.get("id"))
            if sid in seen:
                continue
            if accept(it):
                results.append(it)
            seen.add(sid)
    return results


def get_subscriber(subscriber_id: str) -> dict:
    resp = api_get(f"/subscribers/{subscriber_id}")
    return resp.get("data") or resp


def get_subscriber_by_email(email: str) -> Optional[dict]:
    # Try server-side search first
    matches = search_candidates(tokens=None, email=email, limit=100, max_pages=1, use_search=True)
    # pick exact email match if any
    email_n = _norm(email)
    for m in matches:
        if _norm(m.get("email")) == email_n:
            return m
    # fallback to paginate a few pages
    matches = search_candidates(tokens=None, email=email, limit=1000, max_pages=5, use_search=False)
    for m in matches:
        if _norm(m.get("email")) == email_n:
            return m
    return None


def list_groups(max_pages: int = 10, limit: int = 200) -> List[dict]:
    out: List[dict] = []
    page = 1
    while page <= max_pages:
        resp = api_get("/groups", params={"limit": limit, "page": page})
        items = _extract_items(resp)
        if not items:
            break
        out.extend(items)
        if len(items) < limit:
            break
        page += 1
    return out


def find_group_by_name(name: str, *, max_pages: int = 10) -> Optional[dict]:
    n = _norm(name)
    groups = list_groups(max_pages=max_pages)
    # exact normalized match first
    for g in groups:
        if _norm(g.get("name")) == n:
            return g
    # then contains
    for g in groups:
        gn = _norm(g.get("name"))
        if n in gn:
            return g
    return None


def add_to_group(subscriber_id: str, group_id: str) -> dict:
    # POST subscribers/{id}/groups/{group_id}
    return api_post(f"/subscribers/{subscriber_id}/groups/{group_id}")


def remove_from_group(subscriber_id: str, group_id: str) -> dict:
    return api_delete(f"/subscribers/{subscriber_id}/groups/{group_id}")


def update_fields(subscriber_id: str, fields: Dict[str, Any]) -> dict:
    return api_put(f"/subscribers/{subscriber_id}", body={"fields": fields})
