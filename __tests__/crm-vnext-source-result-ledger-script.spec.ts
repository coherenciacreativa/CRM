import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("CRM vNext source result ledger script", () => {
  test("separates found profile without bridge from limited UI search", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-source-result-ledger-"));
    try {
      const reportPath = join(dir, "manychat-retry.json");
      const outPath = join(dir, "classification.json");
      const markdownPath = join(dir, "classification.md");
      const ledgerPath = join(dir, "ledger.jsonl");

      await writeFile(reportPath, JSON.stringify({
        schema: "crm_vnext.manychat_ui_current_browser_read_only_retry.v0",
        created_at: "2026-05-25T20:14:44+09:00",
        source: "ManyChat Contacts UI (current browser)",
        ui_context: {
          search_box_label: "Search by name..",
          segments_builder_state: "upsell_only_no_usable_custom_field_modal_surfaced",
        },
        queries_executed: [
          {
            anchor: "ig:gabrielrojas_r",
            method: "direct_subscriber_url",
            result: "found",
          },
          {
            anchor: "email:luis.e.lopera@gmail.com",
            method: "contacts_search_exact_string",
            query: "luis.e.lopera@gmail.com",
            result: "not_found",
            ui_result: "0 selected / of 0 total / Nothing here",
          },
        ],
        contacts: {
          "ig:gabrielrojas_r": {
            status: "found",
            bridge_status: "no_email_bridge_in_current_ui",
            confidence: "high",
            manychat_contact_id: "533929342",
            opted_in_handle: "gabrielrojas_r",
            custom_fields: {
              has_email_from_buffer: "No",
              has_email_in_first_dm: "No",
              dm_buffer: "Hola, soy de Iquique.",
            },
          },
          "email:luis.e.lopera@gmail.com": {
            status: "not_found_in_current_ui",
            bridge_status: "no_match_in_current_ui",
            confidence: "medium-negative",
            search_queries: [
              {
                query: "luis.e.lopera@gmail.com",
                ui_result: "0 selected / of 0 total / Nothing here",
              },
            ],
            ui_note: "Search box is labeled Search by name..; current free-account UI did not surface a usable custom-field filter modal.",
          },
        },
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-source-result-ledger.mjs",
        "--report-file",
        reportPath,
        "--ledger-path",
        ledgerPath,
        "--recorded-by",
        "Vitest",
        "--write",
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const classification = JSON.parse(await readFile(outPath, "utf8"));
      expect(classification.summary).toMatchObject({
        entries: 2,
        sourceNegativeButNotExhausted: 1,
      });

      const gabriel = classification.entries.find((entry: { contactKey: string }) =>
        entry.contactKey === "ig:gabrielrojas_r"
      );
      expect(gabriel).toMatchObject({
        sourceResultStatus: "found_profile_no_requested_bridge",
        resultStrength: "negative_strong_for_visible_profile_fields",
        sourceExhaustion: "exhausted_for_visible_manychat_profile_fields",
      });

      const luis = classification.entries.find((entry: { contactKey: string }) =>
        entry.contactKey === "email:luis.e.lopera@gmail.com"
      );
      expect(luis).toMatchObject({
        sourceResultStatus: "not_found_limited_search",
        resultStrength: "negative_weak_due_to_ui_capability",
        sourceExhaustion: "not_exhausted",
      });

      const ledgerText = await readFile(ledgerPath, "utf8");
      expect(ledgerText.trim().split("\n")).toHaveLength(2);
      expect(ledgerText).toContain("\"recordedBy\":\"Vitest\"");

      const markdown = await readFile(markdownPath, "utf8");
      expect(markdown).toContain("found_profile_no_requested_bridge");
      expect(markdown).toContain("not_found_limited_search");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
