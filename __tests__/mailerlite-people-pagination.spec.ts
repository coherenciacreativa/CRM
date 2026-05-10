import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("mailerlite_cli people search", () => {
  test("uses cursor pagination and local match-any filtering", async () => {
    const python = `
import json
from mailerlite_cli import people as ppl

calls = []
pages = {
  None: {
    "data": [
      {"id": "1", "email": "other@example.com", "fields": {"name": "Other Person"}}
    ],
    "meta": {"next_cursor": "cursor-2"}
  },
  "cursor-2": {
    "data": [
      {"id": "2", "email": "juanjotru@gmail.com", "fields": {"name": "Juan José Trujillo", "city": "Medellín"}},
      {"id": "3", "email": "mayerli@example.com", "fields": {"notes": "Referencia: Mayerli yoga"}}
    ]
  }
}

def fake_get(path, params=None):
  calls.append(dict(params or {}))
  return pages.get((params or {}).get("cursor"))

ppl.api_get = fake_get
results = ppl.search_candidates(
  tokens=["juanjotru", "mayerli"],
  limit=100,
  max_pages=5,
  use_search=False,
  match_any=True,
  delay_s=0,
)
print(json.dumps({
  "calls": calls,
  "emails": [item["email"] for item in results],
}, ensure_ascii=False))
`;

    const { stdout } = await execFileAsync("python3", ["-c", python], {
      cwd: process.cwd(),
    });
    const payload = JSON.parse(stdout);

    expect(payload.calls).toEqual([
      { limit: 100 },
      { limit: 100, cursor: "cursor-2" },
    ]);
    expect(payload.emails).toEqual(["juanjotru@gmail.com", "mayerli@example.com"]);
  });
});
