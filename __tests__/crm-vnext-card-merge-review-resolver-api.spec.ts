import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import handler from "../pages/api/crm-vnext/card-merge-review-resolver.js";
import {
  CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
  type CrmVNextPersonCardStore,
} from "../lib/crm/crm-vnext-card-write-apply";
import type { CrmCardApplyPreviewOperation } from "../lib/crm/crm-vnext-card-apply-preview";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

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

const operation = (
  operationId: string,
  type: CrmCardApplyPreviewOperation["type"],
  value: unknown,
  approvalRequired: string[] = ["card_write_policy"],
): CrmCardApplyPreviewOperation => ({
  operationId,
  type,
  path: "/test",
  value,
  wouldMutate: true,
  executed: false,
  approvalRequired,
  reason: `Test ${type}`,
});

const storeFixture = (): CrmVNextPersonCardStore => {
  const targetCard = buildPersonCardVNext({
    personId: "email:juanjotru@gmail.com",
    now: NOW,
    identities: {
      email: "juanjotru@gmail.com",
      phone: "+573136579879",
    },
    evidence: [{ source: "mailerlite:subscriber", observedAt: NOW }],
  });
  const proposedCardDraft = buildPersonCardVNext({
    personId: "email:juanjotru@gmail.com",
    displayName: "Juan Jose Trujillo",
    now: NOW,
    identities: {
      email: "juanjotru@gmail.com",
      phone: "+573136579879",
    },
    scoring: {
      participation: {
        yogaClasses90d: 1,
        retreatsAttended: 1,
      },
      purchases: {
        purchaseCount: 1,
        activeClient: true,
      },
    },
    evidence: [{ source: "alejandro:conversation", observedAt: NOW }],
  });
  const operations = [
    operation("op_stage", "stage_merge_review", { proposedCardDraft }, ["card_write_policy", "merge_policy"]),
    operation("op_restricted", "mark_restricted_service", { serviceKey: "therapy_consultations" }, ["privacy_restricted_service"]),
  ];

  return {
    schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
    generatedAt: NOW,
    base: {
      kind: "vnext-card-store",
      sourceKind: "previous-vnext-card-store",
      cardsBeforeApply: 1,
    },
    cards: [targetCard],
    mergeReviewQueue: [
      {
        reviewId: "merge_review_juan",
        createdAt: NOW,
        approvalItemId: "card_write_approval_juan",
        targetPersonId: "email:juanjotru@gmail.com",
        subjectLabel: "Juan Jose Trujillo",
        operations,
        provenance: {
          provenanceId: "card_write_provenance_juan",
          approvalItemId: "card_write_approval_juan",
          batchItemId: "stitch_batch_juan",
          previewId: "card_apply_preview_juan",
          targetPersonId: "email:juanjotru@gmail.com",
          approvedBy: "Alejandro",
          approvedAt: NOW,
          recommendedAction: "review_merge_or_create",
          mutationKind: "stage_merge_review",
          approvalScopes: ["card_write_policy", "merge_policy", "privacy_restricted_service"],
          operationIds: operations.map((item) => item.operationId),
          evidenceDecisionRecordIds: [],
          safety: {
            outboundExecuted: false,
            factStoreWriteExecuted: false,
            liveApiCallsExecuted: false,
            credentialReadExecuted: false,
          },
        },
      },
    ],
    provenance: [],
  };
};

const makeFixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-card-merge-review-resolver-api-"));
  dirs.push(dir);
  const cardStorePath = join(dir, "person-card-store", "person-cards-vnext.json");
  const mergeReviewLedgerPath = join(dir, "card-merge-review-resolver", "ledger.jsonl");
  const backupDir = join(dir, "backups");
  await mkdir(join(dir, "person-card-store"), { recursive: true });
  await writeFile(cardStorePath, `${JSON.stringify(storeFixture(), null, 2)}\n`, "utf8");
  return { dir, cardStorePath, mergeReviewLedgerPath, backupDir };
};

describe("/api/crm-vnext/card-merge-review-resolver", () => {
  test("previews and commits merge reviews only with explicit approval and restricted-service ack", async () => {
    const fixture = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;

    const preview = mockRes();
    await handler({
      method: "POST",
      query: {
        cardStorePath: fixture.cardStorePath,
        mergeReviewLedgerPath: fixture.mergeReviewLedgerPath,
        backupDir: fixture.backupDir,
      },
      body: {
        reviewIds: ["merge_review_juan"],
      },
      headers: {},
    } as MockReq, preview as never);

    expect(preview.statusCode).toBe(200);
    expect((preview.body as { resolver: { summary: { committed: boolean; selectedReviews: number } } }).resolver.summary).toMatchObject({
      committed: false,
      selectedReviews: 1,
    });
    expect((preview.body as { write: { files: { cardStoreWritten: boolean } } }).write.files.cardStoreWritten).toBe(false);

    const blocked = mockRes();
    await handler({
      method: "POST",
      query: {
        cardStorePath: fixture.cardStorePath,
        mergeReviewLedgerPath: fixture.mergeReviewLedgerPath,
        backupDir: fixture.backupDir,
      },
      body: {
        reviewIds: ["merge_review_juan"],
        approvedBy: "Alejandro",
        commit: true,
      },
      headers: {},
    } as MockReq, blocked as never);

    expect(blocked.statusCode).toBe(409);
    expect((blocked.body as { error: string }).error).toBe("card_merge_review_resolver_commit_blocked");

    const committed = mockRes();
    await handler({
      method: "POST",
      query: {
        cardStorePath: fixture.cardStorePath,
        mergeReviewLedgerPath: fixture.mergeReviewLedgerPath,
        backupDir: fixture.backupDir,
      },
      body: {
        reviewIds: ["merge_review_juan"],
        approvedBy: "Alejandro",
        ackRestrictedService: true,
        commit: true,
      },
      headers: {},
    } as MockReq, committed as never);

    expect(committed.statusCode).toBe(200);
    const payload = committed.body as {
      ok: boolean;
      resolver: { summary: { committed: boolean; operationsExecuted: number } };
      write: {
        backups: { previousStoreBackupCreated: boolean };
        files: { cardStoreWritten: boolean; ledgerWritten: boolean; ledgerEntries: number };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.resolver.summary.committed).toBe(true);
    expect(payload.resolver.summary.operationsExecuted).toBeGreaterThan(0);
    expect(payload.write.backups.previousStoreBackupCreated).toBe(true);
    expect(payload.write.files).toMatchObject({
      cardStoreWritten: true,
      ledgerWritten: true,
      ledgerEntries: 1,
    });

    const store = JSON.parse(await readFile(fixture.cardStorePath, "utf8"));
    expect(store.mergeReviewQueue).toHaveLength(0);
    expect(store.cards[0]).toMatchObject({
      personId: "email:juanjotru@gmail.com",
      displayName: "Juan Jose Trujillo",
      products: {
        yogaClasses90d: 1,
        retreatsAttended: 1,
        purchaseCount: 1,
        activeClient: true,
      },
    });

    const serialized = JSON.stringify(committed.body);
    expect(serialized).not.toContain(fixture.dir);
    expect(serialized).not.toContain(fixture.cardStorePath);
    expect(serialized).not.toContain(fixture.mergeReviewLedgerPath);
  });

  test("rejects non-POST methods", async () => {
    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
