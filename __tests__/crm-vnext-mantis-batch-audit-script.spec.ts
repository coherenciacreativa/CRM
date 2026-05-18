import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("CRM vNext Mantis batch audit script", () => {
  test("marks a one-contact report as partial when a five-contact prompt was expected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mantis-batch-audit-"));
    try {
      const promptPath = join(dir, "prompt.json");
      const reportPath = join(dir, "report.json");
      const outPath = join(dir, "audit.json");
      const markdownPath = join(dir, "audit.md");

      await writeFile(promptPath, JSON.stringify({
        schemaVersion: "crm-vnext-ig-origin-batch-prompt-test",
        contacts: [
          {
            personId: "ig:alejandra_goonzales",
            subject: "@alejandra_goonzales",
            inputAnchors: ["ig:alejandra_goonzales", "alegonzo1306@gmail.com", "@alejandra_goonzales"],
            missingFields: ["phone", "city", "country"],
          },
          {
            personId: "ig:jacervantesg",
            subject: "@jacervantesg",
            inputAnchors: ["ig:jacervantesg", "cervantesjohanna@gmail.com", "@jacervantesg"],
            missingFields: ["phone", "city", "country"],
          },
          {
            personId: "ig:lu_marquezc",
            subject: "@lu_marquezc",
            inputAnchors: ["ig:lu_marquezc", "a1000elpoema@yahoo.com", "@lu_marquezc"],
            missingFields: ["phone", "city", "country"],
          },
          {
            personId: "ig:luzmarias45",
            subject: "@luzmarias45",
            inputAnchors: ["ig:luzmarias45", "luzmachica@gmail.com", "@luzmarias45"],
            missingFields: ["phone", "city", "country"],
          },
          {
            personId: "ig:marcelarojas.bienestar",
            subject: "@marcelarojas.bienestar",
            inputAnchors: ["ig:marcelarojas.bienestar", "marcelarojas30@gmail.com", "@marcelarojas.bienestar"],
            missingFields: ["phone", "city", "country"],
          },
        ],
      }), "utf8");

      await writeFile(reportPath, JSON.stringify({
        schemaVersion: "mantis.crm_vnext.evidence_hunt.v1",
        contacts: {
          "ig:marcelarojas.bienestar": {
            personId: "ig:marcelarojas.bienestar",
            inputAnchors: ["ig:marcelarojas.bienestar", "marcelarojas30@gmail.com"],
            resolvedAnchors: {
              instagramHandle: "marcelarojas.bienestar",
              email: "marcelarojas30@gmail.com",
            },
          },
        },
        sourcesConsulted: [
          { source: "crm_vnext_person_card_store", status: "hit" },
          {
            source: "instagram_messages_ui",
            status: "not_accessible_without_manual_session",
            resultSummary: "Chrome profile was not running.",
          },
        ],
        blockers: [
          {
            source: "Google Workspace via gog",
            exactBlocker: "oauth2 invalid_grant: Token has been expired or revoked.",
            impact: "Could not search Gmail, Drive, or Google Contacts.",
          },
        ],
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-mantis-batch-audit.mjs",
        "--expected-prompt-file",
        promptPath,
        "--report-file",
        reportPath,
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const audit = JSON.parse(await readFile(outPath, "utf8"));
      const markdown = await readFile(markdownPath, "utf8");

      expect(audit.summary).toMatchObject({
        runStatus: "partial_run",
        expectedContacts: 5,
        reportedContacts: 1,
        processedExpectedContacts: 1,
        missingExpectedContacts: 4,
        blockedSources: 2,
      });
      expect(audit.coverage.find((item: { personId: string }) => item.personId === "ig:marcelarojas.bienestar")).toMatchObject({
        status: "processed",
      });
      expect(audit.coverage.find((item: { personId: string }) => item.personId === "ig:jacervantesg")).toMatchObject({
        status: "missing_from_report",
      });
      expect(audit.retryPrompt).toContain("procesaste 1/5");
      expect(audit.retryPrompt).toContain("@jacervantesg");
      expect(audit.retryPrompt).toContain("Reautorizar gog/Google Workspace");
      expect(markdown).toContain("Run status: partial_run");
      expect(markdown).toContain("Copy-Ready Retry Prompt");
      expect(JSON.stringify(audit)).not.toContain("/Users/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("marks a report complete when all expected contacts are covered", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mantis-batch-audit-complete-"));
    try {
      const promptPath = join(dir, "prompt.json");
      const reportPath = join(dir, "report.json");
      const outPath = join(dir, "audit.json");

      await writeFile(promptPath, JSON.stringify({
        contacts: [
          {
            personId: "ig:one",
            subject: "@one",
            inputAnchors: ["ig:one", "one@example.com", "@one"],
          },
          {
            personId: "ig:two",
            subject: "@two",
            inputAnchors: ["ig:two", "two@example.com", "@two"],
          },
        ],
      }), "utf8");
      await writeFile(reportPath, JSON.stringify({
        contacts: {
          "ig:one": { personId: "ig:one", resolvedAnchors: { email: "one@example.com" } },
          "ig:two": { personId: "ig:two", resolvedAnchors: { email: "two@example.com" } },
        },
        sourcesConsulted: [{ source: "local", status: "hit" }],
        blockers: [],
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-mantis-batch-audit.mjs",
        "--expected-prompt-file",
        promptPath,
        "--report-file",
        reportPath,
        "--out",
        outPath,
      ], { cwd: process.cwd() });

      const audit = JSON.parse(await readFile(outPath, "utf8"));

      expect(audit.summary).toMatchObject({
        runStatus: "complete",
        expectedContacts: 2,
        processedExpectedContacts: 2,
        missingExpectedContacts: 0,
        blockedSources: 0,
      });
      expect(audit.recommendation).toContain("normal import/review loop");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("exits non-zero with fail-on-partial for source-blocked complete reports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mantis-batch-audit-fail-"));
    try {
      const promptPath = join(dir, "prompt.json");
      const reportPath = join(dir, "report.json");

      await writeFile(promptPath, JSON.stringify({
        contacts: [{ personId: "ig:one", subject: "@one", inputAnchors: ["ig:one", "@one"] }],
      }), "utf8");
      await writeFile(reportPath, JSON.stringify({
        contacts: { "ig:one": { personId: "ig:one" } },
        sourcesConsulted: [
          { source: "MailerLite live API", status: "blocked", resultSummary: "HTTP 401 Unauthenticated." },
        ],
      }), "utf8");

      await expect(execFileAsync("node", [
        "scripts/crm-vnext-mantis-batch-audit.mjs",
        "--expected-prompt-file",
        promptPath,
        "--report-file",
        reportPath,
        "--fail-on-partial",
      ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 2 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
