import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/card-write-apply.js";
import type { CrmDeepLocalSource } from "../lib/crm/crm-vnext-deep-local-stitching";
import type { CrmStoredEvidenceReviewDecision } from "../lib/crm/crm-vnext-evidence-review-decisions";

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

const NOW = "2026-05-10T12:00:00.000Z";
const TEXT = "CRM: @cadavid_eli se llama Eliana Cadavid, asiste a mis clases de yoga y al Encuentro Feliz.";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CRM_VNEXT_INSIGHTS_TOKEN: process.env.CRM_VNEXT_INSIGHTS_TOKEN,
};

let dirs: string[] = [];

const mockRes = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };
  return response;
};

afterEach(async () => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  if (originalEnv.CRM_VNEXT_INSIGHTS_TOKEN === undefined) delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  else process.env.CRM_VNEXT_INSIGHTS_TOKEN = originalEnv.CRM_VNEXT_INSIGHTS_TOKEN;
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const leadCaptureEvidence: CrmDeepLocalSource[] = [
  {
    sourceKind: "lead_capture_export",
    sourceId: "manychat-cache:cadavid_eli",
    text: [
      "IG username: cadavid_eli.",
      "Name: Eliana Cadavid.",
      "Email: eli.cadavid@hotmail.com.",
      "Phone: 3104954266.",
      "WhatsApp: +573104954266.",
      "ManyChat contact ID: 1869907027.",
      "IG ID: 1279882713772355.",
      "Context: Se unio a clases de yoga y recibe grabaciones por WhatsApp.",
    ].join(" "),
  },
];

const confirmedElianaEmailDecision = (): CrmStoredEvidenceReviewDecision => ({
  schemaVersion: "crm-vnext-stored-evidence-review-decision-2026-05-10",
  decisionRecordId: "evidence_decision_eliana_email_confirmed",
  decisionBatchId: "evidence_decision_batch_test",
  decidedAt: NOW,
  approvedBy: "Alejandro",
  sourcePacketGeneratedAt: NOW,
  itemId: "evidence_review_eliana",
  questionId: "evidence_question_eliana_email",
  questionType: "email_ownership",
  targetPersonId: null,
  subject: {
    label: "Eliana Cadavid",
    rawName: "Eliana Cadavid",
    instagramHandle: "cadavid_eli",
    proposedDisplayName: "Eliana Cadavid",
  },
  candidateEmail: "eli.cadavid@hotmail.com",
  selectedOptionId: "confirm_email_for_subject",
  selectedOptionLabel: "Confirm eli.cadavid@hotmail.com as Eliana Cadavid's email",
  notes: null,
  relatedPersonName: null,
  evidenceSourceIds: ["manychat-cache:cadavid_eli"],
  effect: {
    primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: true,
    keepEmailUnassigned: false,
    createsRelatedPersonCandidate: false,
    needsMoreEvidence: false,
    ignoredCandidate: false,
    cardWriteStillRequiresApproval: true,
  },
  safety: {
    cardMutationExecuted: false,
    factStoreWriteExecuted: false,
    outboundExecuted: false,
  },
});

const makeFixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-card-write-apply-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  const localRootPath = join(dir, "memory");
  const decisionLedgerPath = join(dir, "decisions.jsonl");
  const cardStorePath = join(dir, "person-card-store", "person-cards-vnext.json");
  const cardWriteLedgerPath = join(dir, "card-write-apply", "ledger.jsonl");
  const backupDir = join(dir, "backups");
  await mkdir(localRootPath, { recursive: true });
  await writeFile(sourcePath, JSON.stringify({ generatedAt: NOW, cards: [] }), "utf8");
  await writeFile(
    mailerBridgePath,
    "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status\n",
    "utf8",
  );
  await writeFile(join(localRootPath, "WORKLOG.md"), "No private path here.", "utf8");
  await writeFile(decisionLedgerPath, `${JSON.stringify(confirmedElianaEmailDecision())}\n`, "utf8");
  return {
    dir,
    sourcePath,
    mailerBridgePath,
    localRootPath,
    decisionLedgerPath,
    cardStorePath,
    cardWriteLedgerPath,
    backupDir,
  };
};

describe("/api/crm-vnext/card-write-apply", () => {
  test("previews and commits local card writes only with explicit approval", async () => {
    const fixture = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;

    const preview = mockRes();
    await handler({
      method: "POST",
      query: {
        sourcePath: fixture.sourcePath,
        mailerBridgePath: fixture.mailerBridgePath,
        localRootPath: fixture.localRootPath,
        decisionLedgerPath: fixture.decisionLedgerPath,
        cardStorePath: fixture.cardStorePath,
        cardWriteLedgerPath: fixture.cardWriteLedgerPath,
        backupDir: fixture.backupDir,
      },
      body: {
        text: TEXT,
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
        evidenceSources: leadCaptureEvidence,
        applyAllReady: true,
        commit: false,
      },
      headers: {},
    } as MockReq, preview as never);

    expect(preview.statusCode).toBe(200);
    expect((preview.body as { apply: { summary: { committed: boolean; cardsToUpsert: number } } }).apply.summary).toMatchObject({
      committed: false,
      cardsToUpsert: 1,
    });
    expect((preview.body as { write: { files: { cardStoreWritten: boolean } } }).write.files.cardStoreWritten).toBe(false);

    const blocked = mockRes();
    await handler({
      method: "POST",
      query: {
        sourcePath: fixture.sourcePath,
        mailerBridgePath: fixture.mailerBridgePath,
        localRootPath: fixture.localRootPath,
        decisionLedgerPath: fixture.decisionLedgerPath,
        cardStorePath: fixture.cardStorePath,
        cardWriteLedgerPath: fixture.cardWriteLedgerPath,
        backupDir: fixture.backupDir,
      },
      body: {
        text: TEXT,
        sourceKind: "alejandro_conversation",
        evidenceSources: leadCaptureEvidence,
        commit: true,
      },
      headers: {},
    } as MockReq, blocked as never);

    expect(blocked.statusCode).toBe(409);
    expect((blocked.body as { error: string }).error).toBe("card_write_apply_commit_blocked");

    const committed = mockRes();
    await handler({
      method: "POST",
      query: {
        sourcePath: fixture.sourcePath,
        mailerBridgePath: fixture.mailerBridgePath,
        localRootPath: fixture.localRootPath,
        decisionLedgerPath: fixture.decisionLedgerPath,
        cardStorePath: fixture.cardStorePath,
        cardWriteLedgerPath: fixture.cardWriteLedgerPath,
        backupDir: fixture.backupDir,
      },
      body: {
        text: TEXT,
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
        evidenceSources: leadCaptureEvidence,
        applyAllReady: true,
        approvedBy: "Alejandro",
        commit: true,
      },
      headers: {},
    } as MockReq, committed as never);

    expect(committed.statusCode).toBe(200);
    const payload = committed.body as {
      ok: boolean;
      apply: { summary: { committed: boolean; operationsExecuted: number } };
      write: {
        backups: { sourceBackupCreated: boolean; previousStoreBackupCreated: boolean };
        files: { cardStoreWritten: boolean; ledgerWritten: boolean; ledgerEntries: number };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.apply.summary.committed).toBe(true);
    expect(payload.apply.summary.operationsExecuted).toBeGreaterThan(0);
    expect(payload.write.backups.sourceBackupCreated).toBe(true);
    expect(payload.write.backups.previousStoreBackupCreated).toBe(false);
    expect(payload.write.files).toMatchObject({
      cardStoreWritten: true,
      ledgerWritten: true,
      ledgerEntries: 1,
    });

    const store = JSON.parse(await readFile(fixture.cardStorePath, "utf8"));
    expect(store.cards[0]).toMatchObject({
      personId: "ig:cadavid_eli",
      identities: {
        email: "eli.cadavid@hotmail.com",
        instagramHandle: "cadavid_eli",
        phone: "3104954266",
      },
    });

    const serialized = JSON.stringify(committed.body);
    expect(serialized).not.toContain(fixture.dir);
    expect(serialized).not.toContain(fixture.sourcePath);
    expect(serialized).not.toContain(fixture.cardStorePath);
    expect(serialized).not.toContain(fixture.decisionLedgerPath);
  });

  test("rejects missing text and non-POST methods", async () => {
    const missing = mockRes();
    await handler({ method: "POST", query: {}, body: {}, headers: {} } as MockReq, missing as never);
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ ok: false, error: "card_write_apply_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
