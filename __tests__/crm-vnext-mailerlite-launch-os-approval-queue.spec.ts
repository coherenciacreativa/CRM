import { describe, expect, test } from "vitest";

import {
  buildApprovalQueue,
  buildBrujulaBuilderDraftItem,
  buildMiniLaunchEmailAssetBuildItem,
  buildMiniLaunchEmptyGroupItem,
  buildOnboardingV2EmptyGroupItem,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-approval-queue.mjs";

const miniLaunchEmptyGroupPacket = {
  status: "ready_for_exact_human_approval_to_create_mini_launch_empty_groups",
  decision: {
    canAskAlejandroForApproval: true,
    exactApprovalPhrase: "Apruebo crear los 2 grupos vacios del mini-lanzamiento.",
  },
  targetGroups: [
    { name: "CC · Source · Quiz · Inteligencia para descansar" },
    { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
  ],
  approvalBoundary: {
    allowedAfterExactApproval: ["create_these_named_empty_mailerlite_groups_only_after_fresh_rescan"],
    stillClosedEvenAfterThisApproval: ["subscriber_reads_or_assignment", "workflow_or_automation_use", "email_asset_build_or_send"],
    requiredBeforeAnyExecutorRun: ["rerun mini-launch group dry-run immediately before execution"],
  },
  safety: {
    sourceDryRunMailerLiteGroupsRead: 75,
  },
};

const miniLaunchEmptyGroupCreateDryRun = {
  status: "dry_run_ready_for_exact_approval",
  createdGroups: [],
  safety: {
    mailerLiteGroupsRead: 75,
    mailerLiteMutationsPerformed: false,
  },
};

const onboardingV2EmptyGroupsPacket = {
  status: "ready_for_exact_human_approval_to_create_empty_groups",
  approvalGate: {
    canAskAlejandroForApproval: true,
    exactApprovalPhrase: "Apruebo crear unicamente estos 12 grupos vacios de Onboarding v2.",
  },
  targetPlan: [
    { name: "CC · Source · IG onboarding" },
    { name: "CC · Journey · Editorial onboarding · In progress" },
  ],
  sourceEvidence: {
    liveGroupCount: 75,
    liveAutomationCount: 13,
  },
};

const onboardingV2EmptyGroupsCreateDryRun = {
  status: "dry_run_ready_for_exact_approval",
  createdGroups: [],
  safety: {
    groupMutationsPerformed: false,
  },
};

const miniLaunchEmailAssetBuildScopePacket = {
  status: "email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    assetCount: 4,
  },
  requestedFutureScope: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canExecuteBuildNow: false,
    exactApprovalPhrase: "Apruebo SOLO crear/editar como borradores en MailerLite los 4 assets.",
    allowedAfterExactApproval: ["create_or_edit_exactly_4_named_mailerlite_draft_email_assets"],
    stillClosedEvenAfterThisApproval: ["seed_send_or_test_send", "workflow_or_automation_attachment"],
  },
  assetBuildScope: {
    assets: [
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E01" },
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E02" },
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E03" },
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E04" },
    ],
  },
  preExecutionChecklist: ["Confirm selected subject and preheader for all four emails."],
};

const miniLaunchEmailBuilderPayloadManifest = {
  status: "email_builder_payload_manifest_ready_no_live_changes",
  executiveSummary: {
    payloadCount: 4,
    contentBlockCount: 40,
    inertUrlPlaceholderCount: 3,
    readyForSeedSendNow: false,
  },
  approvalBoundary: {
    canExecuteBuilderNow: false,
    canSendNow: false,
  },
};

const miniLaunchEmailAssetBuildDryRun = {
  status: "dry_run_ready_for_exact_asset_build_approval",
  freshScan: {
    campaignsRead: 25,
    createDraftCount: 4,
    updateDraftCount: 0,
    conflictCount: 0,
  },
  assetMutations: [],
  safety: {
    mailerLiteMutationsPerformed: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
    subscribersRead: false,
    groupsCreatedOrAssigned: false,
  },
};

const miniLaunchShopifyLocalBuildRequest = {
  status: "ready_for_human_or_web_design_scope_approval_no_live_changes",
  approvalGate: {
    canBuildLocalFilesNow: false,
    requiredPhraseBeforeLocalFiles: "Apruebo el build local Shopify no-live.",
    canPublishOrConnectNow: false,
  },
  requestedLocalScope: {
    files: [
      { path: "sections/landing-inteligencia-para-descansar.liquid" },
      { path: "templates/page.landing-inteligencia-para-descansar.json" },
    ],
  },
};

const miniLaunchCrmSignalProjectionPacket = {
  status: "ready_for_no_live_signal_projection_design",
  approvalGate: {
    canAppendSignalLedgerNow: false,
    canWriteCardsNow: false,
    canScoreNow: false,
    canWriteFactStoreNow: false,
  },
};

const brujulaEmailStyleCorrection = {
  status: "brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes",
  draft: {
    subject: "Aqui esta La Brujula de Claridad",
  },
  outputs: {
    htmlPath: "/tmp/brujula-email-1.html",
  },
};

const brujulaEmailRenderQa = {
  status: "brujula_email1_local_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    testSendReady: false,
  },
};

const validationReceipt = {
  validationStatus: "passed",
  testScope: {
    testFiles: 55,
    testCount: 331,
  },
};

const buildQueue = () => buildApprovalQueue({
  miniLaunchEmptyGroupPacket,
  miniLaunchEmptyGroupCreateDryRun,
  onboardingV2EmptyGroupsPacket,
  onboardingV2EmptyGroupsCreateDryRun,
  miniLaunchEmailAssetBuildScopePacket,
  miniLaunchEmailBuilderPayloadManifest,
  miniLaunchEmailAssetBuildDryRun,
  miniLaunchShopifyLocalBuildRequest,
  miniLaunchCrmSignalProjectionPacket,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  validationReceipt,
  generatedAt: "2026-05-28T00:00:00.000Z",
});

describe("CRM vNext MailerLite Launch OS approval queue", () => {
  test("normalizes default args and outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/queue.json", "--markdown-out", "/tmp/queue.md"]);

    expect(parsed.miniLaunchEmptyGroupPacket).toContain("mailerlite_mini_launch_empty_group_creation_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.onboardingV2EmptyGroupsPacket).toContain("mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(parsed.miniLaunchEmailBuilderPayloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailAssetBuildDryRun).toContain("mailerlite_mini_launch_email_asset_build_dry_run_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchShopifyLocalBuildRequest).toContain("mailerlite_mini_launch_shopify_local_build_request_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/queue.json");
    expect(parsed.markdownOut).toBe("/tmp/queue.md");
  });

  test("keeps the safety contract local and non-mutating", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      groupsCreated: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("marks exact approval items ready while keeping seed and CRM writes blocked", () => {
    const queue = buildQueue();
    const byId = new Map(queue.approvalItems.map((item) => [item.id, item]));

    expect(queue.status).toBe("mailerlite_launch_os_approval_queue_ready_no_live_changes");
    expect(queue.executiveSummary.readyApprovalRequestCount).toBe(5);
    expect(queue.executiveSummary.blockedApprovalRequestCount).toBe(2);
    expect(queue.executiveSummary.openLiveMutationGateCount).toBe(0);
    expect(queue.executiveSummary.readyApprovalIds).toEqual([
      "mini_launch_empty_group_creation",
      "onboarding_v2_empty_group_creation",
      "mini_launch_email_asset_build",
      "shopify_no_live_local_build",
      "brujula_email1_builder_draft",
    ]);

    expect(byId.get("mini_launch_email_asset_build")).toMatchObject({
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      exactApprovalPhrasePresent: true,
      packetIsApprovalByItself: false,
      targetCount: 4,
      evidence: {
        campaignsRead: 25,
        createDraftCount: 4,
        updateDraftCount: 0,
        conflictCount: 0,
        assetMutationsPerformed: false,
      },
    });
    expect(byId.get("mini_launch_seed_send")).toMatchObject({
      status: "prepared_but_blocked_before_approval_request",
      canAskAlejandroNow: false,
    });
    expect(byId.get("crm_signal_writes")?.blockers).toContain("separate_crm_write_approval_packet_missing");
  });

  test("blocks a mini-launch empty-group item if the create dry-run is not green", () => {
    const item = buildMiniLaunchEmptyGroupItem({
      packet: miniLaunchEmptyGroupPacket,
      dryRun: {
        ...miniLaunchEmptyGroupCreateDryRun,
        status: "blocked",
      },
    });

    expect(item.status).toBe("prepared_but_blocked_before_approval_request");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.blockers).toContain("mini_launch_empty_group_create_dry_run_not_ready:blocked");
  });

  test("marks mini-launch empty-group approval as reference-only after targets already exist", () => {
    const item = buildMiniLaunchEmptyGroupItem({
      packet: miniLaunchEmptyGroupPacket,
      dryRun: {
        ...miniLaunchEmptyGroupCreateDryRun,
        status: "dry_run_no_create_needed_targets_already_exist",
        freshScan: {
          targetGroupsExistingCount: 2,
          targetGroupsMissingCount: 0,
        },
      },
    });

    expect(item.status).toBe("reference_only_no_approval_request_now");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.exactApprovalPhrase).toBeNull();
    expect(item.operationType).toBe("live_mailerlite_group_creation_already_completed");
    expect(item.evidence).toMatchObject({
      targetGroupsAlreadyExist: true,
      targetMissingCount: 0,
      targetExistingCount: 2,
    });
    expect(item.notes.join(" ")).toContain("already exist");
  });

  test("keeps mini-launch empty-group item reference-only with completed packet and no exact phrase", () => {
    const item = buildMiniLaunchEmptyGroupItem({
      packet: {
        ...miniLaunchEmptyGroupPacket,
        status: "reference_only_empty_group_creation_already_completed",
        decision: {
          ...miniLaunchEmptyGroupPacket.decision,
          canAskAlejandroForApproval: false,
          exactApprovalPhrase: null,
        },
        targetGroups: miniLaunchEmptyGroupPacket.targetGroups.map((target) => ({
          ...target,
          plannedOperation: "no_empty_group_creation_needed_already_exists",
          allowedOperation: "already_exists_no_create_needed",
          existsInMailerLite: true,
        })),
      },
      dryRun: {
        ...miniLaunchEmptyGroupCreateDryRun,
        status: "dry_run_no_create_needed_targets_already_exist",
        freshScan: {
          targetGroupsExistingCount: 2,
          targetGroupsMissingCount: 0,
        },
      },
    });

    expect(item.status).toBe("reference_only_no_approval_request_now");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.exactApprovalPhrase).toBeNull();
    expect(item.blockers).toEqual([]);
  });

  test("builds specific boundary items for onboarding v2, asset build and Brújula", () => {
    expect(buildOnboardingV2EmptyGroupItem({
      packet: onboardingV2EmptyGroupsPacket,
      dryRun: onboardingV2EmptyGroupsCreateDryRun,
    })).toMatchObject({
      status: "ready_for_exact_approval_request",
      targetCount: 2,
      operationType: "live_mailerlite_group_creation_after_exact_approval",
    });

    expect(buildMiniLaunchEmailAssetBuildItem({
      scopePacket: miniLaunchEmailAssetBuildScopePacket,
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
    })).toMatchObject({
      status: "ready_for_exact_approval_request",
      operationType: "live_mailerlite_builder_draft_mutation_after_exact_approval",
      evidence: {
        payloadCount: 4,
        contentBlockCount: 40,
      },
    });

    const brujula = buildBrujulaBuilderDraftItem({
      correction: brujulaEmailStyleCorrection,
      renderQa: brujulaEmailRenderQa,
    });
    expect(brujula.status).toBe("ready_for_exact_approval_request");
    expect(brujula.exactApprovalPhrase).toContain("/tmp/brujula-email-1.html");
    expect(brujula.stillClosed).toContain("test_send_or_public_send");
  });

  test("renders Markdown with phrases and hard stops", () => {
    const markdown = renderMarkdown(buildQueue());

    expect(markdown).toContain("# MailerLite Launch OS v0 - Approval Queue");
    expect(markdown).toContain("Ready approval requests: 5");
    expect(markdown).toContain("Apruebo SOLO crear/editar como borradores");
    expect(markdown).toContain("This queue is not approval.");
  });
});
