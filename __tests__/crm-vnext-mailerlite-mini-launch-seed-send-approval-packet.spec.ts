import { describe, expect, test } from "vitest";

import {
  buildSeedSendApprovalPacket,
  emailLooksValid,
  manualUiReceiptClosed,
  parseArgs,
  realQaGreen,
  redactEmail,
  renderMarkdown,
  seedQaPrereqsClosed,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-send-approval-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const seedTestQaPacket = {
  status: "seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes",
  launch,
  readiness: {
    manualUiDraftsBuilt: true,
    manualUiDraftCount: 4,
    localRenderReady: true,
    targetGroupsExist: true,
    realMailerLiteRenderQaReady: true,
    readyForAudienceLaunchNow: false,
    machineBlockersBeforeSeedSendApprovalRequest: ["exact_seed_recipient_missing"],
  },
  seedSendApprovalBoundary: {
    exactApprovalPhraseTemplate: "Apruebo enviar únicamente test emails desde los 4 borradores del mini-lanzamiento Inteligencia para descansar al seed recipient exacto aprobado.",
    stillClosedEvenAfterApproval: ["public_or_audience_send", "workflow_or_automation_attachment", "crm_card_write"],
  },
  safety: {
    sendsPerformed: false,
    subscriberRowsRead: false,
    mailerLiteMutationsPerformed: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const realMailerLiteRenderQa = {
  status: "mini_launch_real_mailerlite_render_qa_green_no_live_changes",
  executiveSummary: {
    draftCount: 4,
    allDraftsPreviewed: true,
    allRequiredContentExact: true,
    allSafetyGatesClosed: true,
    contentMismatchCount: 0,
    safetyMismatchCount: 0,
  },
  safety: {
    mailerLiteMutationsPerformed: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
    schedulesCreated: false,
    subscriberMutationsPerformed: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
  },
};

const manualUiBuildReceipt = {
  status: "manual_ui_build_receipt_executed_drafts_created_no_sends",
  executiveSummary: {
    createdOrEditedDraftCount: 4,
    outboxCountAfterBuild: 0,
    sendCount: 0,
    scheduleCount: 0,
    subscriberReadOrAssignmentCount: 0,
    groupAssignmentCount: 0,
    workflowAttachmentCount: 0,
  },
  safety: {
    sendsPerformed: false,
    schedulesCreated: false,
    subscribersReadOrAssigned: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
  },
};

const approvalQueue = {
  status: "mailerlite_launch_os_approval_queue_ready_no_live_changes",
  executiveSummary: {
    readyApprovalRequestCount: 0,
    blockedApprovalRequestCount: 2,
    openLiveMutationGateCount: 0,
  },
  safety: {
    sendsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch seed-send approval packet", () => {
  test("normalizes default args and private recipient options", () => {
    const parsed = parseArgs([
      "--seed-email-file",
      "/tmp/seed-email.txt",
      "--out",
      "/tmp/seed.json",
      "--markdown-out",
      "/tmp/seed.md",
    ]);

    expect(parsed.seedTestQaPacket).toContain("mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.realMailerLiteRenderQa).toContain("mailerlite_mini_launch_real_mailerlite_render_qa_inteligencia_descansar_2026-05-28.json");
    expect(parsed.manualUiBuildReceipt).toContain("mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.approvalQueue).toContain("mailerlite_launch_os_approval_queue_2026-05-28.json");
    expect(parsed.seedEmailFile).toBe("/tmp/seed-email.txt");
    expect(parsed.out).toBe("/tmp/seed.json");
    expect(parsed.markdownOut).toBe("/tmp/seed.md");
  });

  test("waits only for exact seed recipient when all other seed gates are closed", () => {
    const packet = buildSeedSendApprovalPacket({
      seedTestQaPacket,
      realMailerLiteRenderQa,
      manualUiBuildReceipt,
      approvalQueue,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.status).toBe("seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes");
    expect(packet.approvalBoundary.canAskAlejandroForApproval).toBe(false);
    expect(packet.approvalBoundary.exactApprovalPhrase).toBeNull();
    expect(packet.inputRequest).toMatchObject({
      status: "waiting_for_exact_seed_recipient_only",
      currentHumanInputNeeded: "exact_seed_recipient_email_only",
      notApproval: true,
    });
    expect(packet.blockers).toEqual(["exact_seed_recipient_missing"]);
    expect(packet.safety).toMatchObject({
      localOnly: true,
      sendsPerformed: false,
      subscriberMutationsPerformed: false,
      factStoreWritePerformed: false,
    });
    expect(markdown).toContain("Human Input Needed");
    expect(markdown).toContain("exact_seed_recipient_email_only");
    expect(markdown).toContain("none - exact seed recipient is still required");
  });

  test("builds exact seed-send approval phrase once seed recipient is supplied", () => {
    const packet = buildSeedSendApprovalPacket({
      seedTestQaPacket,
      realMailerLiteRenderQa,
      manualUiBuildReceipt,
      approvalQueue,
      seedEmail: "Seed.Test+Descanso@Example.com",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("seed_send_approval_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.approvalBoundary.canAskAlejandroForApproval).toBe(true);
    expect(packet.approvalBoundary.canExecuteSendNow).toBe(false);
    expect(packet.approvalBoundary.exactApprovalPhrase).toContain("seed.test+descanso@example.com");
    expect(packet.approvalBoundary.exactApprovalPhrase).toContain("sin workflows");
    expect(packet.inputRequest).toBeNull();
    expect(packet.seedIdentity.redactedEmail).toBe("se…@example.com");
    expect(packet.seedIdentity.exactEmail).toBe("seed.test+descanso@example.com");
    expect(packet.approvalBoundary.stillClosedEvenAfterApproval).toContain("public_or_audience_send");
    expect(packet.approvalBoundary.requiredFreshEvidenceBeforeExecution).toContain("freshly confirm the four campaigns are still drafts and Outbox is empty");
    expect(packet.blockers).toEqual([]);
  });

  test("blocks unsafe recipient strings and open live gates", () => {
    const packet = buildSeedSendApprovalPacket({
      seedTestQaPacket,
      realMailerLiteRenderQa,
      manualUiBuildReceipt,
      approvalQueue: {
        ...approvalQueue,
        executiveSummary: {
          ...approvalQueue.executiveSummary,
          openLiveMutationGateCount: 1,
        },
      },
      seedEmail: "bad<script>@example.com",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("seed_send_approval_packet_blocked_no_live_changes");
    expect(packet.approvalBoundary.canAskAlejandroForApproval).toBe(false);
    expect(packet.blockers).toContain("approval_queue_open_live_gate_count_not_zero");
    expect(packet.blockers).toContain("seed_email_invalid_or_unsafe");
  });

  test("validates helper predicates and redaction", () => {
    expect(seedQaPrereqsClosed(seedTestQaPacket)).toBe(true);
    expect(realQaGreen(realMailerLiteRenderQa)).toBe(true);
    expect(manualUiReceiptClosed(manualUiBuildReceipt)).toBe(true);
    expect(emailLooksValid("seed@example.com")).toBe(true);
    expect(emailLooksValid("bad <seed>@example.com")).toBe(false);
    expect(redactEmail("abraham@example.com")).toBe("ab…@example.com");
  });
});
