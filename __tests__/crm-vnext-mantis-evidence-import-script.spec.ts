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

  test("converts Mantis enrichment reports with identity-bridge candidates and rejected collisions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mantis-import-enrichment-"));
    try {
      const reportPath = join(dir, "mantis-enrichment-report.json");
      const outPath = join(dir, "import.json");
      const textPath = join(dir, "import.txt");
      await writeFile(reportPath, JSON.stringify({
        schemaVersion: "mantis.crm_vnext.enrichment.v1",
        contacts: {
          "@cielo_gom_g": {
            crmVnextKey: "ig:cielo_gom_g",
            inputHandle: "@cielo_gom_g",
            identity: {
              confirmed: {
                instagramHandle: "cielo_gom_g",
                displayName: "Cielo Gom G",
                email: null,
              },
              candidates: [
                {
                  field: "email",
                  value: "cielotago@gmail.com",
                  status: "review_only_candidate_primary_pending_bridge",
                  why: "MailerLite row lacks exact handle but local memory bridges Cielo Gomez to @cielo_gom_g.",
                },
              ],
              doNotPromote: [],
            },
            confirmedFacts: ["Instagram handle @cielo_gom_g exists as local CRM vNext card."],
            communityRelationship: {
              type: "instagram_retreat_lead",
              recommendedNextAction: "send to Codex as identity_bridge_candidate",
            },
            retreatProgramEvidence: { status: "confirmed_interest_not_attendance" },
            evidenceSources: [
              {
                kind: "mailerLite_cursor_scan",
                source: "/Users/example/private/mailerlite.json",
                finding: "Active subscriber Cielo Gomez: cielotago@gmail.com, +573143011712, Bogotá/Colombia, leads_instagram.csv + onboarding complete. No exact @cielo_gom_g field.",
              },
            ],
          },
          "@luzestellariatizabal": {
            crmVnextKey: "ig:luzestellariatizabal",
            inputHandle: "@luzestellariatizabal",
            identity: {
              confirmed: {
                instagramHandle: "luzestellariatizabal",
                displayName: "Luz Estella Aristizabal",
                fullName: "Luz Estella Aristizabal",
              },
              candidates: [],
              doNotPromote: [
                {
                  field: "email",
                  value: "arquitectura.kmga@gmail.com",
                  why: "Surname-only collision for Katy Giraldo Aristizabal.",
                },
              ],
            },
            confirmedFacts: ["Full/display name Luz Estella Aristizabal confirmed by Juana IG report."],
            evidenceSources: [],
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
      expect(text).toContain("@cielo_gom_g");
      expect(text).toContain("identity bridge");
      expect(text).not.toContain("cielotago@gmail.com");

      const cieloMailer = packet.evidenceSources.find((source: { sourceKind: string; text: string }) =>
        source.sourceKind === "mailerlite_export" && source.text.includes("cielotago@gmail.com")
      );
      expect(cieloMailer.text).toContain("Identity bridge review required");

      const rejectedCollision = packet.evidenceSources.find((source: { text: string }) =>
        source.text.includes("Do not assign email arquitectura.kmga@gmail.com")
      );
      expect(rejectedCollision.text).toContain("collision evidence only");
      expect(JSON.stringify(packet)).not.toContain("/Users/example");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("converts Google-backed enrichment schema with review-only family email and do-not-promote kinds", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mantis-import-google-enrichment-"));
    try {
      const reportPath = join(dir, "mantis-google-enrichment-report.json");
      const outPath = join(dir, "import.json");
      const textPath = join(dir, "import.txt");
      await writeFile(reportPath, JSON.stringify({
        schemaVersion: "mantis.crm_vnext.enrichment.v1",
        contacts: {
          "@mayuyis2626": {
            crmVnextKey: "ig:mayuyis2626",
            inputHandle: "@mayuyis2626",
            identity: {
              confirmed: {
                instagramHandle: "mayuyis2626",
                fullName: "Gladys Mayerli García Ortegón",
                phone: "3115381341",
                city: "Bogotá",
                country: "Colombia",
              },
              candidatesReviewOnly: [
                {
                  field: "email",
                  value: "mayaariana@hotmail.com",
                  confidence: "medium",
                  status: "review_only_family_shared_or_companion",
                  why: "Email appears in a family cluster and may belong to Ariana.",
                  sources: ["Google Drive retreat table"],
                },
              ],
              doNotPromote: [
                {
                  kind: "email",
                  value: "mayaariana@hotmail.com",
                  why: "Do not assign family/shared email as Mayerli primary email without approval.",
                },
              ],
            },
            evidence: [
              {
                source: "Gmail / Zoom <no-reply@zoom.us>",
                status: "confirmed",
                confidence: "high",
                finding: "Zoom registration confirms Gladys Mayerli García Ortegón with phone 3115381341.",
              },
            ],
            programAndRelationshipEvidence: {
              status: "confirmed",
              relationshipTypes: ["yoga_student", "retreat_attendee"],
              finding: "Multiple retreat/class records point to Mayerli as a long-term community member.",
            },
            emailPhoneOwnership: {
              rationale: "Phone appears tied to Mayerli; email remains family/shared review-only.",
            },
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
        results: 1,
        selectedResults: 1,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(packet.summary.evidenceSources).toBeGreaterThanOrEqual(4);
      expect(text).toContain("@mayuyis2626");
      expect(text).toContain("relación: yoga_student + retreat_attendee");
      expect(text).toContain("identity bridge");
      expect(JSON.stringify(packet)).not.toContain("/Users/example");

      const gmailEvidence = packet.evidenceSources.find((source: { sourceKind: string; text: string }) =>
        source.sourceKind === "gmail_export" && source.text.includes("Zoom registration")
      );
      expect(gmailEvidence.text).toContain("Phone: 3115381341");

      const reviewOnlyEmail = packet.evidenceSources.find((source: { text: string }) =>
        source.text.includes("mayaariana@hotmail.com") && source.text.includes("Field: email")
      );
      expect(reviewOnlyEmail.text).toContain("Identity bridge review required");

      const rejectedCollision = packet.evidenceSources.find((source: { text: string }) =>
        source.text.includes("Do not assign email mayaariana@hotmail.com")
      );
      expect(rejectedCollision.text).toContain("collision evidence only");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
