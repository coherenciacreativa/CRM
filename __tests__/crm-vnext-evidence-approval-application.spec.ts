import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildCrmVNextEvidenceApprovalApplication } from "../lib/crm/crm-vnext-evidence-approval-application.js";
import { readCrmEvidenceReviewDecisionLedger } from "../lib/crm/crm-vnext-evidence-review-decisions.js";

const NOW = "2026-05-10T12:00:00.000Z";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempLedger = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-evidence-approval-application-"));
  dirs.push(dir);
  return join(dir, "decisions.jsonl");
};

describe("CRM vNext evidence approval application", () => {
  test("applies family-email decisions to the preview without mutating cards", async () => {
    const ledgerPath = await tempLedger();
    const application = await buildCrmVNextEvidenceApprovalApplication({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "google-drive:retiro-junio:row-7",
          sourceKind: "retreat_table",
          text: [
            "File: RETIRO 25 Y 26 DE JUNIO",
            "Name: Gladys Mayerli Garcia Ortegon",
            "Email: mayaariana@hotmail.com",
            "Phone: 3115381341",
            "Context: Retiro familiar: Ariana Catalina Torres Garcia comparte correo.",
            "Email ownership review required: email may belong to a family member or companion.",
          ].join(" "),
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
      decisions: [{
        candidateEmail: "mayaariana@hotmail.com",
        selectedOptionId: "keep_email_unassigned_family_or_companion",
      }],
      approvedBy: "Alejandro",
      commit: false,
      ledgerPath,
    });

    expect(application.committed).toBe(false);
    expect(application.decisionAppend.added).toHaveLength(1);
    expect(application.before.summary.openEvidenceQuestions).toBe(1);
    expect(application.after.summary.openEvidenceQuestions).toBe(0);
    expect(application.delta).toMatchObject({
      openEvidenceQuestions: -1,
      resolvedEvidenceQuestions: 1,
    });
    expect(application.resolvedEvidenceQuestions[0]).toMatchObject({
      candidateEmail: "mayaariana@hotmail.com",
      selectedOptionId: "keep_email_unassigned_family_or_companion",
    });
    expect(application.after.summary.operationsExecuted).toBe(0);
    expect(application.safety).toMatchObject({
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      outboundProhibited: true,
      cardWriteStillRequiresSeparateApproval: true,
    });

    const ledger = await readCrmEvidenceReviewDecisionLedger(ledgerPath, { now: NOW });
    expect(ledger.summary.decisions).toBe(0);
    expect(JSON.stringify(application)).not.toContain("/Users/");
  });

  test("can commit confirmed subject emails only to the decision ledger", async () => {
    const ledgerPath = await tempLedger();
    const application = await buildCrmVNextEvidenceApprovalApplication({
      text: "CRM: Amalia de Bedud es estudiante de yoga hace mas de 10 años y ha asistido a múltiples retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      localSources: [
        {
          sourceId: "gmail:amalia:1",
          sourceKind: "gmail_export",
          text: "From: Amalia De Bedout <amaliadbg@hotmail.com> Subject: Yoga y retiro",
        },
      ],
      sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
      decisions: [{
        candidateEmail: "amaliadbg@hotmail.com",
        selectedOptionId: "confirm_email_for_subject",
      }],
      approvedBy: "Alejandro",
      commit: true,
      ledgerPath,
    });

    expect(application.committed).toBe(true);
    expect(application.decisionAppend.summaryAfter).toMatchObject({
      decisions: 1,
      primaryEmailConfirmed: 1,
    });
    expect(application.before.summary.blockedOpenEvidenceQuestions).toBe(1);
    expect(application.after.summary.blockedOpenEvidenceQuestions).toBe(0);
    expect(application.resolvedEvidenceQuestions[0]).toMatchObject({
      candidateEmail: "amaliadbg@hotmail.com",
      selectedOptionId: "confirm_email_for_subject",
    });
    expect(application.decisionAppend.added[0].safety).toEqual({
      cardMutationExecuted: false,
      factStoreWriteExecuted: false,
      outboundExecuted: false,
    });

    const ledger = await readCrmEvidenceReviewDecisionLedger(ledgerPath, { now: NOW });
    expect(ledger.summary).toMatchObject({
      decisions: 1,
      primaryEmailConfirmed: 1,
    });
  });
});
