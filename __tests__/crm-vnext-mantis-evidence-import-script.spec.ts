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

  test("converts contact-keyed Mantis CRM vNext evidence hunts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mantis-import-contacts-"));
    try {
      const reportPath = join(dir, "mantis-contact-report.json");
      const outPath = join(dir, "import.json");
      const textPath = join(dir, "import.txt");
      await writeFile(reportPath, JSON.stringify({
        schemaVersion: "mantis.crm_vnext.evidence_hunt.v1",
        generatedAt: "2026-05-10T22:33:56.651707+00:00",
        mode: "read_only_evidence_hunt",
        contacts: {
          santiago_bernal: {
            inputAnchors: ["Santiago Bernal", "santiagobernal676@gmail.com confirmed by Alejandro"],
            strongMatches: [
              {
                source: "MailerLite subscriber detail",
                sourceId: "/Users/example/private/mailer.json",
                strength: "strong",
                evidence: {
                  email: "santiagobernal676@gmail.com",
                  name: "Santiago",
                  lastName: "Bernal",
                  phone: "3155686404",
                  groups: ["Asistentes a retiros", "Zoom Registrants"],
                },
              },
              {
                source: "macOS Contacts SQLite",
                strength: "strong",
                evidence: {
                  fullName: "Santiago Bernal",
                  emails: ["santiagobernal676@gmail.com", "sbernal@proteccion.com.co"],
                  phones: ["3155686404"],
                },
                classification: {
                  primaryEmail: "santiagobernal676@gmail.com",
                  secondaryOrHistoricalWorkEmail: "sbernal@proteccion.com.co",
                },
              },
            ],
            resolvedAnchors: {
              primaryEmail: "santiagobernal676@gmail.com",
              phone: "3155686404",
              secondaryEmails: [{ email: "sbernal@proteccion.com.co", classification: "historical_or_work_proteccion" }],
              retreatOrClassEvidence: ["MailerLite Asistentes a retiros", "MailerLite Zoom Registrants"],
            },
            recommendation: "ready_for_batch_loop",
          },
          mayerli_mayuyis2626: {
            inputAnchors: ["Mayerli", "@mayuyis2626"],
            strongMatches: [
              {
                source: "CRM vNext Mayerli mini-loop / Drive-derived evidence",
                strength: "strong_for_name_phone_handle_and_family_context; weak_for_email_ownership",
                evidence: {
                  handle: "@mayuyis2626",
                  nameCandidates: ["Gladys Mayerli Garcia Ortegon"],
                  phoneCandidate: "3115381341",
                  emailCandidatesReviewOnly: ["mayaariana@hotmail.com"],
                },
              },
            ],
            resolvedAnchors: {
              phone: "3115381341",
              nameCandidates: ["Gladys Mayerli Garcia Ortegon"],
              instagramHandle: "mayuyis2626",
              ownedEmail: null,
              familyOrCompanionEmailsReviewOnly: ["mayaariana@hotmail.com"],
            },
            recommendation: "needs_human_decision",
          },
        },
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
        selectedResults: 2,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(packet.summary.evidenceSources).toBeGreaterThanOrEqual(3);
      expect(text).toContain("Santiago Bernal");
      expect(text).toContain("email confirmado santiagobernal676@gmail.com");
      expect(text).toContain("emails de familia/acompañante review-only");
      expect(JSON.stringify(packet)).not.toContain("/Users/example");

      const santiagoMailerLite = packet.evidenceSources.find((source: { sourceId: string }) =>
        source.sourceId === "mantis_evidence:santiago_bernal:mailerlite_export:1"
      );
      expect(santiagoMailerLite.text).toContain("Email: santiagobernal676@gmail.com");
      expect(santiagoMailerLite.text).toContain("Phone: 3155686404");

      const mayerli = packet.evidenceSources.find((source: { sourceId: string }) =>
        source.sourceId.includes("mayuyis2626")
      );
      expect(mayerli.text).toContain("mayaariana@hotmail.com");
      expect(mayerli.text.toLowerCase()).toContain("review");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
