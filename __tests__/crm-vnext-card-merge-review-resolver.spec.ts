import { describe, expect, test } from "vitest";

import {
  applyCrmVNextCardMergeReviewResolutionToStore,
  buildCrmVNextCardMergeReviewResolver,
} from "../lib/crm/crm-vnext-card-merge-review-resolver";
import {
  CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
  type CrmVNextPersonCardStore,
} from "../lib/crm/crm-vnext-card-write-apply";
import { buildPersonCardVNext, type PersonCardVNext } from "../lib/crm/person-card-vnext";
import type { CrmCardApplyPreviewOperation } from "../lib/crm/crm-vnext-card-apply-preview";

const NOW = "2026-05-10T12:00:00.000Z";

const targetCard = (): PersonCardVNext =>
  buildPersonCardVNext({
    personId: "email:juanjotru@gmail.com",
    now: NOW,
    identities: {
      email: "juanjotru@gmail.com",
      phone: "+573136579879",
      city: "Medellin",
    },
    channels: {
      emailStatus: "active",
    },
    evidence: [
      {
        source: "mailerlite:subscriber",
        observedAt: NOW,
        note: "Existing MailerLite subscriber row.",
      },
    ],
  });

const proposedDraft = (): PersonCardVNext =>
  buildPersonCardVNext({
    personId: "email:juanjotru@gmail.com",
    displayName: "Juan Jose Trujillo",
    now: NOW,
    identities: {
      email: "juanjotru@gmail.com",
      phone: "+573136579879",
      city: "Medellin",
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
    evidence: [
      {
        source: "alejandro:conversation",
        observedAt: NOW,
        note: "Juan Jose is a yoga student, retreat attendee, therapy consultation client, friend, and ally.",
      },
    ],
  });

const op = (
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
  const draft = proposedDraft();
  const operations: CrmCardApplyPreviewOperation[] = [
    op(
      "op_stage",
      "stage_merge_review",
      {
        proposedCardDraft: draft,
      },
      ["card_write_policy", "merge_policy"],
    ),
    op(
      "op_evidence",
      "add_evidence",
      {
        evidence: draft.evidence[0],
      },
    ),
    op(
      "op_yoga",
      "add_service_relationship",
      {
        serviceKey: "yoga_classes",
        privacy: "standard",
      },
    ),
    op(
      "op_retreat",
      "add_service_relationship",
      {
        serviceKey: "retreats",
        privacy: "standard",
      },
    ),
    op(
      "op_therapy",
      "add_service_relationship",
      {
        serviceKey: "therapy_consultations",
        privacy: "restricted",
      },
      ["card_write_policy", "privacy_restricted_service"],
    ),
    op(
      "op_restricted",
      "mark_restricted_service",
      {
        serviceKey: "therapy_consultations",
      },
      ["privacy_restricted_service"],
    ),
  ];

  return {
    schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
    generatedAt: NOW,
    base: {
      kind: "vnext-card-store",
      sourceKind: "previous-vnext-card-store",
      cardsBeforeApply: 1,
    },
    cards: [targetCard()],
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
          operationIds: operations.map((operation) => operation.operationId),
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

describe("CRM vNext card merge review resolver", () => {
  test("previews staged merges without committing and requires restricted-service acknowledgement", () => {
    const report = buildCrmVNextCardMergeReviewResolver({
      store: storeFixture(),
      reviewIds: ["merge_review_juan"],
      now: NOW,
    });

    expect(report.mode).toBe("dry_run_merge_review_resolver");
    expect(report.summary).toMatchObject({
      mergeReviews: 1,
      selectedReviews: 1,
      readyForHumanApprovedMerge: 1,
      restrictedServiceReviews: 1,
      committed: false,
      commitBlocked: false,
      operationsExecuted: 0,
    });
    expect(report.reviewItems[0]).toMatchObject({
      reviewId: "merge_review_juan",
      status: "ready_for_human_approved_merge",
      targetPersonId: "email:juanjotru@gmail.com",
      restrictedService: {
        present: true,
        serviceKeys: ["therapy_consultations"],
      },
      commitBlockers: ["restricted_service_ack_required"],
    });
    expect(report.reviewItems[0].proposedResolvedCard).toMatchObject({
      personId: "email:juanjotru@gmail.com",
      displayName: "Juan Jose Trujillo",
      products: {
        yogaClasses90d: 1,
        retreatsAttended: 1,
        purchaseCount: 1,
        activeClient: true,
      },
    });
  });

  test("blocks committed resolution without approval boundary details", () => {
    const report = buildCrmVNextCardMergeReviewResolver({
      store: storeFixture(),
      reviewIds: ["merge_review_juan"],
      approvedBy: "Alejandro",
      commit: true,
      now: NOW,
    });

    expect(report.summary.committed).toBe(false);
    expect(report.summary.commitBlocked).toBe(true);
    expect(report.summary.commitBlockers).toEqual(["restricted_service_ack_required"]);
  });

  test("applies an explicitly approved merge resolution to the local store and removes the queue item", () => {
    const store = storeFixture();
    const report = buildCrmVNextCardMergeReviewResolver({
      store,
      reviewIds: ["merge_review_juan"],
      approvedBy: "Alejandro",
      ackRestrictedService: true,
      commit: true,
      now: NOW,
    });
    const applied = applyCrmVNextCardMergeReviewResolutionToStore({
      store,
      report,
      approvedBy: "Alejandro",
      committedAt: NOW,
    });

    expect(report.summary).toMatchObject({
      committed: true,
      commitBlocked: false,
      operationsExecuted: 6,
    });
    expect(applied.store.cards).toHaveLength(1);
    expect(applied.store.mergeReviewQueue).toHaveLength(0);
    expect(applied.store.cards[0]).toMatchObject({
      personId: "email:juanjotru@gmail.com",
      displayName: "Juan Jose Trujillo",
      products: {
        yogaClasses90d: 1,
        retreatsAttended: 1,
        purchaseCount: 1,
        activeClient: true,
      },
    });
    expect(applied.store.cards[0].evidence).toHaveLength(2);
    expect(applied.ledgerEntries).toHaveLength(1);
    expect(applied.ledgerEntries[0]).toMatchObject({
      committedBy: "Alejandro",
      reviewId: "merge_review_juan",
      targetPersonId: "email:juanjotru@gmail.com",
      restrictedServiceAcknowledged: true,
      safety: {
        outboundExecuted: false,
        factStoreWriteExecuted: false,
        liveApiCallsExecuted: false,
        credentialReadExecuted: false,
      },
    });
  });

  test("keeps missing target cards blocked", () => {
    const store = storeFixture();
    store.cards = [];

    const report = buildCrmVNextCardMergeReviewResolver({
      store,
      reviewIds: ["merge_review_juan"],
      approvedBy: "Alejandro",
      ackRestrictedService: true,
      commit: true,
      now: NOW,
    });

    expect(report.summary.committed).toBe(false);
    expect(report.summary.commitBlocked).toBe(true);
    expect(report.reviewItems[0]).toMatchObject({
      status: "blocked_missing_target_card",
      blockers: ["blocked_missing_target_card"],
    });
  });
});
