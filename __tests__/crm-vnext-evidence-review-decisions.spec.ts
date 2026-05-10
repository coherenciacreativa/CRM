import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildCrmVNextEvidenceReviewPacket } from "../lib/crm/crm-vnext-evidence-review-packet.js";
import {
  appendCrmEvidenceReviewDecisions,
  readCrmEvidenceReviewDecisionLedger,
} from "../lib/crm/crm-vnext-evidence-review-decisions.js";

const NOW = "2026-05-10T12:00:00.000Z";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempLedger = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-evidence-review-decisions-"));
  dirs.push(dir);
  return join(dir, "decisions.jsonl");
};

const mayerliPacket = () => buildCrmVNextEvidenceReviewPacket({
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
        "Context: Retiro familiar: Ariana Catalina Torres Garcia, Gladys Mayerli Garcia Ortegon y Jose Fidel Torres Delgado comparten correo.",
        "Email ownership review required: email may belong to a family member or companion.",
      ].join(" "),
    },
  ],
  sourceCoverage: { filesScanned: 0, filesSkipped: 0, roots: 0, connectedEvidenceSources: 1 },
});

describe("CRM vNext evidence review decision ledger", () => {
  test("previews and commits approved evidence decisions without mutating cards", async () => {
    const ledgerPath = await tempLedger();
    const packet = mayerliPacket();
    const candidateEmail = packet.reviewItems[0].decisionQuestions[0].candidateEmail;

    const preview = await appendCrmEvidenceReviewDecisions({
      text: "CRM: @mayuyis2626 es Mayerli.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      packet,
      decisions: [{
        candidateEmail,
        selectedOptionId: "keep_email_unassigned_family_or_companion",
        notes: "Alejandro suspects this email belongs to Ariana/family.",
      }],
      approvedBy: "Alejandro",
      commit: false,
      ledgerPath,
    });

    expect(preview.committed).toBe(false);
    expect(preview.added).toHaveLength(1);
    expect(preview.summaryAfter.decisions).toBe(0);
    expect(preview.added[0].effect).toMatchObject({
      keepEmailUnassigned: true,
      primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: false,
      cardWriteStillRequiresApproval: true,
    });

    const committed = await appendCrmEvidenceReviewDecisions({
      text: "CRM: @mayuyis2626 es Mayerli.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      packet,
      decisions: [{
        candidateEmail,
        selectedOptionId: "keep_email_unassigned_family_or_companion",
      }],
      approvedBy: "Alejandro",
      commit: true,
      ledgerPath,
    });

    expect(committed.committed).toBe(true);
    expect(committed.added).toHaveLength(1);
    expect(committed.summaryAfter).toMatchObject({
      decisions: 1,
      emailOwnershipDecisions: 1,
      keptFamilyOrCompanion: 1,
    });
    expect(committed.safety.cardMutationProhibited).toBe(true);
    expect(committed.added[0].safety).toEqual({
      cardMutationExecuted: false,
      factStoreWriteExecuted: false,
      outboundExecuted: false,
    });

    const ledger = await readCrmEvidenceReviewDecisionLedger(ledgerPath, { now: NOW });
    expect(ledger.summary.decisions).toBe(1);
    expect(ledger.decisions[0].candidateEmail).toBe(candidateEmail);
    expect(JSON.stringify(ledger)).not.toContain("/Users/");
  });

  test("skips duplicate decisions and reports invalid selections", async () => {
    const ledgerPath = await tempLedger();
    const packet = mayerliPacket();
    const candidateEmail = packet.reviewItems[0].decisionQuestions[0].candidateEmail;

    await appendCrmEvidenceReviewDecisions({
      text: "CRM: @mayuyis2626 es Mayerli.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      packet,
      decisions: [{ candidateEmail, selectedOptionId: "keep_email_unassigned_family_or_companion" }],
      approvedBy: "Alejandro",
      commit: true,
      ledgerPath,
    });

    const second = await appendCrmEvidenceReviewDecisions({
      text: "CRM: @mayuyis2626 es Mayerli.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      packet,
      decisions: [
        { candidateEmail, selectedOptionId: "keep_email_unassigned_family_or_companion" },
        { candidateEmail: "nobody@example.com", selectedOptionId: "ignore_candidate" },
      ],
      approvedBy: "Alejandro",
      commit: true,
      ledgerPath,
    });

    expect(second.added).toHaveLength(0);
    expect(second.duplicatesSkipped).toHaveLength(1);
    expect(second.invalidSelections).toEqual([{
      candidateEmail: "nobody@example.com",
      questionId: null,
      selectedOptionId: "ignore_candidate",
      reason: "matching_review_question_not_found",
    }]);
    expect(second.summaryAfter.decisions).toBe(1);
  });

  test("requires an approver for append attempts", async () => {
    await expect(appendCrmEvidenceReviewDecisions({
      text: "CRM: @mayuyis2626 es Mayerli.",
      sourceKind: "alejandro_conversation",
      cards: [],
      mailerBridgeRows: [],
      packet: mayerliPacket(),
      decisions: [{ candidateEmail: "mayaariana@hotmail.com", selectedOptionId: "ignore_candidate" }],
      approvedBy: "",
    })).rejects.toThrow("evidence_review_decisions_approved_by_required");
  });
});
