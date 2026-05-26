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

  test("classifies source-result-aware omnichannel recovery reports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-source-result-ledger-"));
    try {
      const reportPath = join(dir, "omnichannel-recovery.json");
      const outPath = join(dir, "classification.json");

      await writeFile(reportPath, JSON.stringify({
        schemaVersion: "crm-vnext-omnichannel-source-recovery-2026-05-26",
        generatedAt: "2026-05-26T00:38:57Z",
        contacts: {
          "ig:dmbc01": {
            contactKey: "ig:dmbc01",
            recommendedAction: "unresolved_high_value",
            exactAnchorsSearched: [
              { type: "instagramHandle", value: "dmbc01" },
            ],
            searchedSources: [
              {
                source: "manychat_ui_read_only_exact_anchor",
                status: "completed",
                anchors: ["dmbc01"],
                metrics: { profilesOpened: 1 },
              },
              {
                source: "instagram_messages_ui_read_only",
                status: "completed",
                anchors: ["dmbc01"],
                metrics: { openedThreads: 1 },
              },
            ],
            strongMatches: [],
            weakCandidates: [
              {
                source: "manychat_ui_read_only_exact_anchor",
                sourceKind: "manychat_profile_checked_no_requested_email_bridge",
                reason: "Exact profile opened read-only, but visible fields had no email bridge.",
              },
            ],
          },
          "email:luis.e.lopera@gmail.com": {
            contactKey: "email:luis.e.lopera@gmail.com",
            recommendedAction: "unresolved_high_value",
            exactAnchorsSearched: [
              { type: "email", value: "luis.e.lopera@gmail.com" },
              { type: "phone", value: "+573002681642", digits: "573002681642" },
            ],
            searchedSources: [
              {
                source: "manychat_ui_read_only_exact_anchor",
                status: "completed",
                anchors: ["luis.e.lopera@gmail.com", "573002681642"],
                metrics: { profilesOpened: 0, foundRowsOrProfiles: 0 },
              },
              {
                source: "instagram_messages_ui_read_only",
                status: "completed",
                anchors: ["luis.e.lopera@gmail.com", "573002681642"],
                metrics: { openedThreads: 0 },
              },
            ],
            strongMatches: [],
            weakCandidates: [],
          },
        },
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-source-result-ledger.mjs",
        "--report-file",
        reportPath,
        "--source-system",
        "Omnichannel Source Recovery v2",
        "--out",
        outPath,
      ], { cwd: process.cwd() });

      const classification = JSON.parse(await readFile(outPath, "utf8"));
      const diana = classification.entries.find((entry: { contactKey: string }) =>
        entry.contactKey === "ig:dmbc01"
      );
      expect(diana).toMatchObject({
        sourceResultStatus: "found_profile_no_requested_bridge",
        resultStrength: "negative_strong_for_visible_profile_fields",
        sourceExhaustion: "exhausted_for_visible_profile_or_thread_fields",
      });

      const luis = classification.entries.find((entry: { contactKey: string }) =>
        entry.contactKey === "email:luis.e.lopera@gmail.com"
      );
      expect(luis).toMatchObject({
        sourceResultStatus: "not_found_exhaustive",
        resultStrength: "negative_strong_for_declared_exact_anchor_method",
        sourceExhaustion: "exhausted_for_declared_exact_anchor_method",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
