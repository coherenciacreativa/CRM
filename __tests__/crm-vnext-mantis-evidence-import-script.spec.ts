import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("CRM vNext Mantis evidence import script", () => {
  test("converts Mantis evidence hunts into safe text and evidenceSources", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mantis-import-"));
    try {
      const reportPath = join(dir, "mantis-report.json");
      const outPath = join(dir, "import.json");
      const textPath = join(dir, "import.txt");
      await writeFile(reportPath, JSON.stringify({
        meta: {
          task: "crm_vnext_test",
          mutations_performed: false,
          outbound_messages_to_leads: false,
        },
        results: [
          {
            handle: "@gulnarapaola",
            candidate_name: "Gulnara Paola Castaño Reyes",
            candidate_email: "gulnacast@gmail.com",
            candidate_phone: "+57 300 4477735",
            mailer_groups: ["Asistentes a retiro Junio 2024"],
            confidence: "high",
            recommended_next_step: "enrich_existing",
            blockers: ["confirm before writing"],
            evidenceSources: [
              {
                kind: "juana_report",
                path: "/Users/example/private/report.json",
                finding: "Conversación activa; última interacción 2026-03-08 19:48.",
              },
              {
                kind: "local_csv_xlsx",
                path: "/Users/example/private/contacts.csv",
                finding: "Gulnara Paola Castaño Reyes, gulnacast@gmail.com, +57 300 4477735, subscribed.",
              },
              {
                kind: "local_csv_xlsx_negative",
                path: "/Users/example/private/false.csv",
                finding: "False positive.",
              },
            ],
          },
          {
            handle: "@low_case",
            candidate_name: "Low Case",
            confidence: "low",
            evidenceSources: [],
          },
        ],
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-mantis-evidence-import.mjs",
        "--report-file",
        reportPath,
        "--out",
        outPath,
        "--text-out",
        textPath,
        "--min-confidence",
        "high",
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const text = await readFile(textPath, "utf8");
      expect(packet.summary).toMatchObject({
        results: 2,
        selectedResults: 1,
        evidenceSources: 2,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(text).toContain("CRM: @gulnarapaola se llama Gulnara Paola Castaño Reyes, y preguntó");
      expect(JSON.stringify(packet)).not.toContain("/Users/example");

      const leadCapture = packet.evidenceSources.find((source: { sourceKind: string }) =>
        source.sourceKind === "lead_capture_export"
      );
      expect(leadCapture.text).toContain("Handle: @gulnarapaola");
      expect(leadCapture.text).not.toContain("gulnacast@gmail.com");

      const mailerLite = packet.evidenceSources.find((source: { sourceKind: string }) =>
        source.sourceKind === "mailerlite_export"
      );
      expect(mailerLite.text).toContain("Email: gulnacast@gmail.com");
      expect(packet.selectedResults[0].evidenceSources).toHaveLength(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
