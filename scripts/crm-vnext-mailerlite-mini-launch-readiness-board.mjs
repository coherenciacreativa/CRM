#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-readiness-board-2026-05-27';
const DEFAULT_ONBOARDING_EXECUTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_EMAIL_ASSET_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_GROUP_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_group_dry_run_after_brand_promoted_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMPTY_GROUP_CREATION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_creation_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_SEQUENCE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_STYLE_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_LOCAL_EMAIL_ASSET_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_ASSET_BUILD_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_BUILDER_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SHOPIFY_HANDOFF_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_handoff_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_CRM_SIGNAL_PROJECTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-readiness-board.mjs [options]

Options:
  --onboarding-execution-packet <path>  Onboarding v2 execution JSON. Defaults to ${DEFAULT_ONBOARDING_EXECUTION_PACKET}
  --rehearsal-packet <path>             Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --event-contract <path>               Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --seed-test-qa-packet <path>          Seed-test QA JSON. Defaults to ${DEFAULT_SEED_TEST_QA_PACKET}
  --brand-email-asset-packet <path>     Brand/email asset JSON. Defaults to ${DEFAULT_BRAND_EMAIL_ASSET_PACKET}
  --group-dry-run <path>                Mini-launch group dry-run JSON. Defaults to ${DEFAULT_GROUP_DRY_RUN}
  --empty-group-creation-packet <path>  Optional exact approval packet for creating missing empty groups. Defaults to ${DEFAULT_EMPTY_GROUP_CREATION_PACKET}
  --empty-group-create-dry-run <path>   Optional guarded create runner dry-run JSON. Defaults to ${DEFAULT_EMPTY_GROUP_CREATE_DRY_RUN}
  --brand-candidate-review-packet <path>
                                         Brand candidate review JSON. Defaults to ${DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET}
  --email-sequence-packet <path>        Email sequence asset JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE_PACKET}
  --email-style-qa-packet <path>        Optional Email Style QA JSON after final Brand response. Defaults to ${DEFAULT_EMAIL_STYLE_QA_PACKET}
  --local-email-asset-plan <path>       Optional local email asset plan JSON. Defaults to ${DEFAULT_LOCAL_EMAIL_ASSET_PLAN}
  --email-asset-build-scope-packet <path> Optional exact approval scope packet for draft email asset build. Defaults to ${DEFAULT_EMAIL_ASSET_BUILD_SCOPE_PACKET}
  --email-builder-payload-manifest <path> Optional local builder payload manifest. Defaults to ${DEFAULT_EMAIL_BUILDER_PAYLOAD_MANIFEST}
  --shopify-handoff-packet <path>       Shopify/Web handoff JSON. Defaults to ${DEFAULT_SHOPIFY_HANDOFF_PACKET}
  --crm-signal-projection-packet <path> CRM signal projection JSON. Defaults to ${DEFAULT_CRM_SIGNAL_PROJECTION_PACKET}
  --control-room <path>                 CRM Launch OS control room. Defaults to ${DEFAULT_CONTROL_ROOM}
  --out <path>                          Write JSON board
  --markdown-out <path>                 Write Markdown board
  --help                                Show this help

Local-only readiness board for one Mini-Launch OS rehearsal. It consolidates
Brand, Web, MailerLite, CRM, seed-test, receipts, and onboarding gates so an
operator can see what is ready, what is blocked, and what requires Alejandro's
approval. It never calls MailerLite, Shopify, CRM live APIs, reads subscribers,
edits workflows, sends emails, appends ledgers, writes cards, changes scoring,
or touches Fact Store.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    onboardingExecutionPacket: DEFAULT_ONBOARDING_EXECUTION_PACKET,
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    seedTestQaPacket: DEFAULT_SEED_TEST_QA_PACKET,
    brandEmailAssetPacket: DEFAULT_BRAND_EMAIL_ASSET_PACKET,
    groupDryRun: DEFAULT_GROUP_DRY_RUN,
    emptyGroupCreationPacket: DEFAULT_EMPTY_GROUP_CREATION_PACKET,
    emptyGroupCreateDryRun: DEFAULT_EMPTY_GROUP_CREATE_DRY_RUN,
    brandCandidateReviewPacket: DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET,
    emailSequencePacket: DEFAULT_EMAIL_SEQUENCE_PACKET,
    emailStyleQaPacket: DEFAULT_EMAIL_STYLE_QA_PACKET,
    localEmailAssetPlan: DEFAULT_LOCAL_EMAIL_ASSET_PLAN,
    emailAssetBuildScopePacket: DEFAULT_EMAIL_ASSET_BUILD_SCOPE_PACKET,
    emailBuilderPayloadManifest: DEFAULT_EMAIL_BUILDER_PAYLOAD_MANIFEST,
    shopifyHandoffPacket: DEFAULT_SHOPIFY_HANDOFF_PACKET,
    crmSignalProjectionPacket: DEFAULT_CRM_SIGNAL_PROJECTION_PACKET,
    controlRoom: DEFAULT_CONTROL_ROOM,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--onboarding-execution-packet') options.onboardingExecutionPacket = argv[++index];
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--seed-test-qa-packet') options.seedTestQaPacket = argv[++index];
    else if (arg === '--brand-email-asset-packet') options.brandEmailAssetPacket = argv[++index];
    else if (arg === '--group-dry-run') options.groupDryRun = argv[++index];
    else if (arg === '--empty-group-creation-packet') options.emptyGroupCreationPacket = argv[++index];
    else if (arg === '--empty-group-create-dry-run') options.emptyGroupCreateDryRun = argv[++index];
    else if (arg === '--brand-candidate-review-packet') options.brandCandidateReviewPacket = argv[++index];
    else if (arg === '--email-sequence-packet') options.emailSequencePacket = argv[++index];
    else if (arg === '--email-style-qa-packet') options.emailStyleQaPacket = argv[++index];
    else if (arg === '--local-email-asset-plan') options.localEmailAssetPlan = argv[++index];
    else if (arg === '--email-asset-build-scope-packet') options.emailAssetBuildScopePacket = argv[++index];
    else if (arg === '--email-builder-payload-manifest') options.emailBuilderPayloadManifest = argv[++index];
    else if (arg === '--shopify-handoff-packet') options.shopifyHandoffPacket = argv[++index];
    else if (arg === '--crm-signal-projection-packet') options.crmSignalProjectionPacket = argv[++index];
    else if (arg === '--control-room') options.controlRoom = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readOptionalJson = async (path) => {
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const loadSourceDigests = async (options) => {
  const sourceMap = [
    [options.onboardingExecutionPacket, 'onboarding v2 state and production v1 protection'],
    [options.rehearsalPacket, 'mini-launch concept and handoffs'],
    [options.eventContract, 'CRM event spine and store-only signal boundaries'],
    [options.seedTestQaPacket, 'seed-test modes and approval separation'],
    [options.brandEmailAssetPacket, 'Email 1 Brand asset and creative QA state'],
    [options.groupDryRun, 'MailerLite receipt group dry-run state'],
    [options.emptyGroupCreationPacket, 'exact approval packet for missing mini-launch empty groups', true],
    [options.emptyGroupCreateDryRun, 'guarded create runner dry-run for missing mini-launch empty groups', true],
    [options.brandCandidateReviewPacket, 'Brand semantic decision request for group candidates'],
    [options.emailSequencePacket, 'full email sequence asset state'],
    [options.emailStyleQaPacket, 'final Brand-approved email style QA and local asset-plan boundary', true],
    [options.localEmailAssetPlan, 'local-only MailerLite email asset implementation plan with placeholders and closed build/send gates', true],
    [options.emailAssetBuildScopePacket, 'exact approval scope packet for future MailerLite draft email asset build; no execution', true],
    [options.emailBuilderPayloadManifest, 'local builder payload manifest with exact draft payloads and closed execution/send gates', true],
    [options.shopifyHandoffPacket, 'Shopify/Web Design handoff state'],
    [options.crmSignalProjectionPacket, 'CRM signal projection state and closed write gates'],
    [options.controlRoom, 'current Launch OS board and completion gates'],
  ];

  const digests = [];
  for (const [path, consultedFor, optional = false] of sourceMap) {
    let content;
    try {
      content = await readFile(resolve(path), 'utf8');
    } catch (error) {
      if (optional && error.code === 'ENOENT') {
        digests.push({
          path: resolve(path),
          present: false,
          chars: 0,
          consultedFor,
        });
        continue;
      }
      throw error;
    }
    digests.push({
      path: resolve(path),
      present: true,
      chars: content.length,
      consultedFor,
    });
  }
  return digests;
};

const launchFrom = (...packets) => {
  for (const packet of packets) {
    if (packet?.launch?.launchId) {
      return {
        launchId: packet.launch.launchId,
        resourceName: packet.launch.resourceName,
        resourceType: packet.launch.resourceType,
      };
    }
  }
  return {
    launchId: null,
    resourceName: null,
    resourceType: null,
  };
};

const statusKindFor = (status) => {
  if (!status) return 'missing';
  if (status.startsWith('blocked_')) return 'blocked';
  if (status.includes('ready') || status.includes('already')) return 'ready';
  if (status.includes('needs')) return 'needs_review';
  return 'review';
};

const buildLane = ({
  id,
  owner,
  packet,
  status,
  readiness = {},
  readyNow = false,
  blockedBy = [],
  nextAction,
  liveActionsClosed = [],
}) => ({
  id,
  owner,
  sourceStatus: status ?? packet?.status ?? null,
  statusKind: statusKindFor(status ?? packet?.status),
  readyNow,
  blockedBy,
  nextAction,
  readiness,
  liveActionsClosed,
});

const groupDryRunState = (groupDryRun) => {
  const status = groupDryRun?.status ?? null;
  if (status === 'mini_launch_group_dry_run_ready_for_future_empty_group_decision') {
    return {
      readyNow: true,
      blockedBy: [],
      nextAction: 'Dry-run is fresh and Brand-approved. Prepare an exact empty-group creation approval packet only if Alejandro wants the two missing groups created empty; no subscriber assignment, workflow use, or sends.',
    };
  }
  if (status === 'mini_launch_groups_already_exist_no_create_needed') {
    return {
      readyNow: true,
      blockedBy: [],
      nextAction: 'Launch receipt groups already exist. Move only to a separate receipt seed-test scope packet if Alejandro approves that next gate.',
    };
  }
  if (status === 'blocked_until_brand_promotes_or_rejects_candidates') {
    return {
      readyNow: false,
      blockedBy: ['brand_dictionary_candidate_status_pending'],
      nextAction: 'Brand must promote, reject, or rename the candidate rows before this dry-run can unlock an approval packet.',
    };
  }
  if (status === 'blocked_until_brand_dictionary_candidates') {
    return {
      readyNow: false,
      blockedBy: ['brand_dictionary_candidate_rows_missing'],
      nextAction: 'Brand must add/review the candidate rows, then CRM reruns the group dry-run before any group creation approval exists.',
    };
  }
  return {
    readyNow: false,
    blockedBy: ['group_dry_run_not_ready'],
    nextAction: 'Rerun or inspect the group dry-run before any group creation approval exists.',
  };
};

const emptyGroupCreationPacketState = (packet) => {
  if (!packet) {
    return {
      present: false,
      readyNow: false,
      blockedBy: ['empty_group_creation_packet_not_generated'],
      nextAction: 'Prepare the exact empty-group creation approval packet from the fresh group dry-run before asking Alejandro to decide.',
    };
  }
  if (packet.status === 'ready_for_exact_human_approval_to_create_mini_launch_empty_groups') {
    return {
      present: true,
      readyNow: true,
      blockedBy: [],
      nextAction: 'Pause at Alejandro decision boundary: the exact approval phrase is prepared, but no group creation is authorized until he gives that phrase and a fresh re-scan still shows the targets missing.',
    };
  }
  if (packet.status === 'reference_only_empty_group_creation_already_completed') {
    return {
      present: true,
      readyNow: true,
      blockedBy: [],
      nextAction: 'The target groups already exist. Keep this packet as reference only; no empty-group creation approval is pending.',
    };
  }
  return {
    present: true,
    readyNow: false,
    blockedBy: packet.blockers?.length ? packet.blockers : ['empty_group_creation_packet_not_ready'],
    nextAction: 'Resolve approval-packet blockers before any MailerLite empty-group decision.',
  };
};

const emptyGroupCreateDryRunState = (run) => {
  if (!run) {
    return {
      present: false,
      readyNow: false,
      blockedBy: ['mini_launch_empty_group_create_dry_run_not_generated'],
      nextAction: 'Run the mini-launch empty-group create runner in dry-run mode only after the approval packet is prepared; do not use --execute.',
    };
  }
  if (run.status === 'dry_run_ready_for_exact_approval') {
    return {
      present: true,
      readyNow: true,
      blockedBy: [],
      nextAction: 'Runner dry-run is green. Pause at Alejandro exact-phrase boundary; do not run --execute without exact approval and a fresh scan.',
    };
  }
  if (run.status === 'dry_run_no_create_needed_targets_already_exist') {
    return {
      present: true,
      readyNow: true,
      blockedBy: [],
      nextAction: 'Target groups already exist in the fresh scan. No empty group creation is pending; continue to the next separate approval boundary without --execute.',
    };
  }
  return {
    present: true,
    readyNow: false,
    blockedBy: run.decision?.blockers?.length ? run.decision.blockers : ['mini_launch_empty_group_create_dry_run_not_ready'],
    nextAction: 'Resolve create runner dry-run blockers before any exact execution decision.',
  };
};

const brandStatusClosesCandidateDecision = (status) =>
  ['proposed_local', 'live_canonical'].includes(cleanString(status));

const brandCandidateGroupState = ({ brandCandidateReviewPacket, groupDryRun }) => {
  const plannedGroups = Array.isArray(groupDryRun?.plannedGroups) ? groupDryRun.plannedGroups : [];
  const acceptedGroups = plannedGroups.filter((group) =>
    group?.registeredInBrandDictionary === true && brandStatusClosesCandidateDecision(group?.brandStatus));
  const dryRunClosesDecision = groupDryRun?.ok === true
    && [
      'mini_launch_group_dry_run_ready_for_future_empty_group_decision',
      'mini_launch_groups_already_exist_no_create_needed',
    ].includes(groupDryRun?.status)
    && plannedGroups.length > 0
    && acceptedGroups.length === plannedGroups.length
    && (groupDryRun?.summary?.missingBrandCandidateCount ?? 0) === 0
    && (groupDryRun?.summary?.brandStatusBlockedCount ?? 0) === 0;

  if (dryRunClosesDecision) {
    return {
      sourceStatus: 'brand_candidate_decision_closed_ready_no_live_changes',
      readyNow: true,
      blockedBy: [],
      nextAction: 'Brand candidate semantics are closed from the promoted dry-run; do not reopen unless naming evidence changes. Empty group creation still requires exact Alejandro approval and a fresh scan.',
      readiness: {
        decisionState: 'closed_from_promoted_group_dry_run',
        recommendedDecision: 'accepted_as_proposed_local_or_live_canonical',
        acceptedGroupCount: acceptedGroups.length,
        missingCandidateCount: 0,
        brandStatusBlockedCount: 0,
        sourceDryRunStatus: groupDryRun.status,
        historicalReviewPacketStatus: brandCandidateReviewPacket?.status ?? null,
        historicalMissingCandidateCount: brandCandidateReviewPacket?.dictionaryState?.missingCandidateCount ?? null,
        rows: acceptedGroups.map((group) => ({
          name: group.name,
          layer: group.layer,
          brandStatus: group.brandStatus,
          existsInMailerLite: group.existsInMailerLite ?? false,
        })),
      },
    };
  }

  return {
    sourceStatus: brandCandidateReviewPacket?.status ?? null,
    readyNow: brandCandidateReviewPacket?.status === 'brand_candidate_review_packet_ready_no_live_changes',
    blockedBy: ['brand_semantic_decision_pending'],
    nextAction: 'Brand chooses add_as_candidate, rename, or reject for the two MailerLite receipt candidates.',
    readiness: {
      recommendedDecision: brandCandidateReviewPacket?.brandDecisionRequest?.recommendedDecision ?? null,
      missingCandidateCount: brandCandidateReviewPacket?.dictionaryState?.missingCandidateCount ?? null,
      decisionState: 'pending_semantic_decision',
    },
  };
};

const emailSequenceState = ({
  emailSequencePacket,
  emailStyleQaPacket,
  localEmailAssetPlan,
  emailAssetBuildScopePacket,
  emailBuilderPayloadManifest,
}) => {
  if (emailBuilderPayloadManifest?.status === 'email_builder_payload_manifest_ready_no_live_changes') {
    return {
      sourceStatus: emailBuilderPayloadManifest.status,
      readyNow: true,
      blockedBy: ['exact_mailerlite_asset_build_approval', 'builder_render_qa_before_seed_send', 'exact_seed_send_approval'],
      nextAction: 'Email builder payload manifest is ready as local implementation input; do not create/edit MailerLite assets, send, attach workflows or assign subscribers until exact approval.',
      readiness: {
        brandReviewStatus: 'approved_no_live_from_final_brand_response',
        localEmailAssetPlanStatus: localEmailAssetPlan?.status ?? null,
        emailAssetBuildScopePacketStatus: emailAssetBuildScopePacket?.status ?? null,
        payloadCount: emailBuilderPayloadManifest?.executiveSummary?.payloadCount ?? null,
        contentBlockCount: emailBuilderPayloadManifest?.executiveSummary?.contentBlockCount ?? null,
        placeholderCount: emailBuilderPayloadManifest?.executiveSummary?.inertUrlPlaceholderCount ?? null,
        replyCtaCount: emailBuilderPayloadManifest?.executiveSummary?.replyCtaCount ?? null,
        readyForExactAssetBuildApprovalReviewNow: emailBuilderPayloadManifest?.executiveSummary?.readyForExactAssetBuildApprovalReviewNow ?? true,
        canExecuteBuilderNow: emailBuilderPayloadManifest?.executiveSummary?.canExecuteBuilderNow ?? false,
        canCreateOrEditMailerLiteAssetsNow: emailBuilderPayloadManifest?.executiveSummary?.canCreateOrEditMailerLiteAssetsNow ?? false,
        readyForSeedSendNow: emailBuilderPayloadManifest?.executiveSummary?.readyForSeedSendNow ?? false,
        manifestIsApprovalByItself: emailBuilderPayloadManifest?.approvalBoundary?.manifestIsApprovalByItself ?? false,
        exactAssetBuildApprovalStillRequired: emailBuilderPayloadManifest?.approvalBoundary?.exactAssetBuildApprovalStillRequired ?? true,
      },
    };
  }

  if (emailAssetBuildScopePacket?.status === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes') {
    return {
      sourceStatus: emailAssetBuildScopePacket.status,
      readyNow: true,
      blockedBy: ['exact_mailerlite_asset_build_approval', 'builder_render_qa_before_seed_send', 'exact_seed_send_approval'],
      nextAction: 'Email asset-build scope packet is ready as a human approval boundary; do not execute builder work, send, attach workflows or assign subscribers.',
      readiness: {
        brandReviewStatus: 'approved_no_live_from_final_brand_response',
        localEmailAssetPlanStatus: localEmailAssetPlan?.status ?? null,
        readyForExactAssetBuildApprovalRequestNow: emailAssetBuildScopePacket?.executiveSummary?.readyForExactAssetBuildApprovalRequestNow ?? true,
        readyForMailerLiteAssetBuildNow: emailAssetBuildScopePacket?.executiveSummary?.readyForMailerLiteAssetBuildNow ?? false,
        readyForSeedSendNow: emailAssetBuildScopePacket?.executiveSummary?.readyForSeedSendNow ?? false,
        assetCount: emailAssetBuildScopePacket?.executiveSummary?.assetCount ?? null,
        placeholderCount: emailAssetBuildScopePacket?.executiveSummary?.inertUrlPlaceholderCount ?? null,
        replyCtaCount: emailAssetBuildScopePacket?.executiveSummary?.replyCtaCount ?? null,
        canAskAlejandroForApproval: emailAssetBuildScopePacket?.requestedFutureScope?.canAskAlejandroForApproval ?? false,
        packetIsApprovalByItself: emailAssetBuildScopePacket?.requestedFutureScope?.packetIsApprovalByItself ?? false,
        canCreateOrEditMailerLiteAssetsNow: emailAssetBuildScopePacket?.executiveSummary?.canCreateOrEditMailerLiteAssetsNow ?? false,
        canExecuteBuildNow: emailAssetBuildScopePacket?.requestedFutureScope?.canExecuteBuildNow ?? false,
      },
    };
  }

  if (localEmailAssetPlan?.status === 'mini_launch_local_email_asset_plan_ready_no_live_changes') {
    return {
      sourceStatus: localEmailAssetPlan.status,
      readyNow: true,
      blockedBy: ['exact_mailerlite_asset_build_scope', 'builder_render_qa_before_seed_send', 'exact_seed_send_approval'],
      nextAction: 'Local email asset plan is ready for exact MailerLite asset-build scope request; do not build assets, send, attach workflows or assign subscribers.',
      readiness: {
        brandReviewStatus: 'approved_no_live_from_final_brand_response',
        emailStyleQaStatus: localEmailAssetPlan?.executiveSummary?.styleQaStatus ?? emailStyleQaPacket?.status ?? null,
        readyForLocalAssetPlanNow: localEmailAssetPlan?.executiveSummary?.readyForLocalAssetPlanNow ?? true,
        readyForExactAssetBuildScopeRequestNow: localEmailAssetPlan?.executiveSummary?.readyForExactAssetBuildScopeRequestNow ?? true,
        readyForMailerLiteAssetBuildNow: localEmailAssetPlan?.executiveSummary?.readyForMailerLiteAssetBuildNow ?? false,
        readyForSeedSendNow: localEmailAssetPlan?.executiveSummary?.readyForSeedSendNow ?? false,
        hardBlockerCount: localEmailAssetPlan?.executiveSummary?.styleQaHardBlockerCount ?? emailStyleQaPacket?.executiveSummary?.hardBlockerCount ?? null,
        yellowCheckCount: localEmailAssetPlan?.executiveSummary?.styleQaYellowCheckCount ?? emailStyleQaPacket?.executiveSummary?.yellowCheckCount ?? null,
        assetCount: localEmailAssetPlan?.executiveSummary?.assetCount ?? localEmailAssetPlan?.assetRows?.length ?? null,
        placeholderCount: localEmailAssetPlan?.executiveSummary?.placeholderCount ?? null,
        canCreateOrEditMailerLiteAssetsNow: localEmailAssetPlan?.approvalBoundary?.canCreateOrEditMailerLiteAssetsNow ?? false,
        canAssignSubscribersNow: localEmailAssetPlan?.approvalBoundary?.canAssignSubscribersNow ?? false,
        canAttachWorkflowNow: localEmailAssetPlan?.approvalBoundary?.canAttachWorkflowNow ?? false,
      },
    };
  }

  if (emailStyleQaPacket?.status === 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes') {
    return {
      sourceStatus: emailStyleQaPacket.status,
      readyNow: true,
      blockedBy: ['exact_mailerlite_asset_build_scope', 'builder_render_qa_before_seed_send', 'exact_seed_send_approval'],
      nextAction: 'Brand approved the sequence for no-live continuation; use Email Style QA to prepare a local asset plan, but do not build in MailerLite or send.',
      readiness: {
        brandReviewStatus: 'approved_no_live_from_final_brand_response',
        readyForLocalAssetPlanNow: emailStyleQaPacket?.approvalGate?.readyForLocalAssetPlanNow ?? true,
        readyForMailerLiteAssetBuildNow: emailStyleQaPacket?.approvalGate?.readyForMailerLiteAssetBuildNow ?? false,
        readyForSeedSendNow: emailStyleQaPacket?.approvalGate?.readyForSeedSendNow ?? false,
        readyForReceiptSeedTestNow: emailStyleQaPacket?.approvalGate?.readyForReceiptSeedTestNow ?? false,
        readyForAudienceLaunchNow: emailStyleQaPacket?.approvalGate?.readyForAudienceLaunchNow ?? false,
        hardBlockerCount: emailStyleQaPacket?.executiveSummary?.hardBlockerCount ?? null,
        yellowCheckCount: emailStyleQaPacket?.executiveSummary?.yellowCheckCount ?? null,
        styleGapCount: emailStyleQaPacket?.executiveSummary?.styleGapCount ?? null,
        claimsRiskCount: emailStyleQaPacket?.executiveSummary?.claimsRiskCount ?? null,
        publicInternalLeakIssueCount: emailStyleQaPacket?.executiveSummary?.publicInternalLeakIssueCount ?? null,
        nextNoLiveMove: emailStyleQaPacket?.approvalGate?.nextNoLiveMove ?? null,
      },
    };
  }

  return {
    sourceStatus: emailSequencePacket?.status ?? null,
    readyNow: emailSequencePacket?.status === 'email_sequence_asset_packet_ready_for_brand_review_no_live_changes',
    blockedBy: ['brand_review_full_sequence', 'email_style_qa'],
    nextAction: 'Brand reviews the four-email arc; Sent groups remain off by default.',
    readiness: emailSequencePacket?.readiness ?? {},
  };
};

const buildLanes = ({
  onboardingExecutionPacket,
  rehearsalPacket,
  eventContract,
  seedTestQaPacket,
  brandEmailAssetPacket,
  groupDryRun,
  emptyGroupCreationPacket,
  emptyGroupCreateDryRun,
  brandCandidateReviewPacket,
  emailSequencePacket,
  emailStyleQaPacket,
  localEmailAssetPlan,
  emailAssetBuildScopePacket,
  emailBuilderPayloadManifest,
  shopifyHandoffPacket,
  crmSignalProjectionPacket,
}) => {
  const dryRunState = groupDryRunState(groupDryRun);
  const emptyPacketState = emptyGroupCreationPacketState(emptyGroupCreationPacket);
  const createDryRunState = emptyGroupCreateDryRunState(emptyGroupCreateDryRun);
  const brandCandidateState = brandCandidateGroupState({ brandCandidateReviewPacket, groupDryRun });
  const sequenceState = emailSequenceState({
    emailSequencePacket,
    emailStyleQaPacket,
    localEmailAssetPlan,
    emailAssetBuildScopePacket,
    emailBuilderPayloadManifest,
  });

  return [
    buildLane({
    id: 'onboarding_protection',
    owner: 'CRM / MailerLite',
    packet: onboardingExecutionPacket,
    readyNow: true,
    readiness: {
      productionV1Preserved: true,
      v2ExecutionPacketStatus: onboardingExecutionPacket?.status ?? null,
      currentDecision: 'No onboarding flow or production audience change is authorized.',
    },
    nextAction: 'Keep Onboarding v1 live; only create Onboarding v2 empty groups if Alejandro gives the exact approval phrase from that lane.',
    liveActionsClosed: ['pause_onboarding_v1', 'edit_onboarding_v1', 'activate_onboarding_v2', 'switch_entry_group'],
  }),
  buildLane({
    id: 'concept_rehearsal',
    owner: 'Brand Front Desk',
    packet: rehearsalPacket,
    readyNow: rehearsalPacket?.ok === true,
    nextAction: 'Use the rehearsal as the source concept; do not treat it as public approval.',
    liveActionsClosed: ['public_launch', 'shopify_publish', 'mailerLite_send'],
  }),
  buildLane({
    id: 'crm_event_contract',
    owner: 'CRM',
    packet: eventContract,
    readyNow: eventContract?.ok === true,
    nextAction: 'Use as the event spine for future seed observations; do not append ledger events yet.',
    liveActionsClosed: ['signal_ledger_append', 'crm_card_write', 'crm_score_mutation', 'fact_store_write'],
  }),
  buildLane({
    id: 'crm_signal_projection_packet',
    owner: 'CRM / Signal OS',
    packet: crmSignalProjectionPacket,
    readyNow: crmSignalProjectionPacket?.status === 'ready_for_no_live_signal_projection_design',
    readiness: {
      currentProjectionReadyFor: crmSignalProjectionPacket?.projectionModel?.currentProjectionReadyFor ?? [],
      storeOnlyNowCount: crmSignalProjectionPacket?.projectionModel?.storeOnlyNow?.length ?? null,
      futurePolicyOnlyEvents: crmSignalProjectionPacket?.projectionModel?.futurePolicyOnlyEvents ?? [],
      signalsGenerated: crmSignalProjectionPacket?.projectionProof?.projection?.signalsGenerated ?? null,
      canAppendSignalLedgerNow: crmSignalProjectionPacket?.approvalGate?.canAppendSignalLedgerNow ?? false,
      canWriteCardsNow: crmSignalProjectionPacket?.approvalGate?.canWriteCardsNow ?? false,
      canScoreNow: crmSignalProjectionPacket?.approvalGate?.canScoreNow ?? false,
      canWriteFactStoreNow: crmSignalProjectionPacket?.approvalGate?.canWriteFactStoreNow ?? false,
    },
    blockedBy: crmSignalProjectionPacket?.status === 'ready_for_no_live_signal_projection_design'
      ? []
      : ['crm_signal_projection_packet_not_ready'],
    nextAction: 'Use this as the no-live interpretation bridge from mini-launch events to projection policy; do not append ledgers, write cards, score, or touch Fact Store.',
    liveActionsClosed: ['signal_ledger_append', 'crm_card_write', 'crm_score_mutation', 'fact_store_write', 'onboarding_routing'],
  }),
  buildLane({
    id: 'brand_email_1',
    owner: 'Brand',
    packet: brandEmailAssetPacket,
    readyNow: brandEmailAssetPacket?.status === 'brand_email_asset_packet_ready_for_brand_review_no_live_changes',
    readiness: brandEmailAssetPacket?.readiness ?? {},
    blockedBy: ['brand_review_email_1_copy', 'email_style_signature_footer_qa'],
    nextAction: 'Brand reviews/revises Email 1 before any MailerLite asset build or seed send.',
    liveActionsClosed: ['mailerLite_asset_build', 'seed_send', 'audience_send'],
  }),
  buildLane({
    id: 'email_sequence',
    owner: 'Brand / Email',
    packet: emailSequencePacket,
    status: sequenceState.sourceStatus,
    readyNow: sequenceState.readyNow,
    readiness: sequenceState.readiness,
    blockedBy: sequenceState.blockedBy,
    nextAction: sequenceState.nextAction,
    liveActionsClosed: ['mailerLite_asset_build', 'seed_send', 'workflow_attachment', 'audience_send'],
  }),
  buildLane({
    id: 'shopify_web_handoff',
    owner: 'Web Design / Shopify',
    packet: shopifyHandoffPacket,
    readyNow: shopifyHandoffPacket?.readiness?.readyForWebDesignReviewNow === true,
    readiness: shopifyHandoffPacket?.readiness ?? {},
    blockedBy: ['web_design_review', 'exact_scope_before_repo_edit_or_preview'],
    nextAction: 'Web Design can review/build a local draft from the handoff, but no preview/live/form connection is authorized.',
    liveActionsClosed: ['shopify_preview_or_draft_page', 'form_connection', 'publish_live'],
  }),
  buildLane({
    id: 'brand_candidate_groups',
    owner: 'Brand',
    packet: brandCandidateReviewPacket,
    status: brandCandidateState.sourceStatus,
    readyNow: brandCandidateState.readyNow,
    readiness: brandCandidateState.readiness,
    blockedBy: brandCandidateState.blockedBy,
    nextAction: brandCandidateState.nextAction,
    liveActionsClosed: ['group_creation', 'subscriber_assignment', 'workflow_use', 'send'],
  }),
  buildLane({
    id: 'mailerlite_group_dry_run',
    owner: 'CRM / MailerLite Planner',
    packet: groupDryRun,
    readyNow: dryRunState.readyNow,
    readiness: groupDryRun?.readiness ?? {},
    blockedBy: dryRunState.blockedBy,
    nextAction: dryRunState.nextAction,
    liveActionsClosed: ['group_creation', 'subscriber_assignment', 'workflow_attachment', 'send'],
  }),
  buildLane({
    id: 'mailerlite_empty_group_approval_packet',
    owner: 'CRM / MailerLite Planner',
    packet: emptyGroupCreationPacket,
    readyNow: emptyPacketState.readyNow,
    readiness: {
      present: emptyPacketState.present,
      canAskAlejandroForApproval: emptyGroupCreationPacket?.decision?.canAskAlejandroForApproval ?? false,
      targetGroupCount: emptyGroupCreationPacket?.targetGroups?.length ?? 0,
      requiresFreshRerunBeforeExecution: emptyGroupCreationPacket?.decision?.requiresFreshRerunBeforeExecution ?? true,
      packetIsApprovalByItself: emptyGroupCreationPacket?.decision?.packetIsApprovalByItself ?? false,
    },
    blockedBy: emptyPacketState.blockedBy,
    nextAction: emptyPacketState.nextAction,
    liveActionsClosed: ['group_creation_until_exact_phrase', 'subscriber_assignment', 'workflow_attachment', 'send'],
  }),
  buildLane({
    id: 'mailerlite_empty_group_create_dry_run',
    owner: 'CRM / MailerLite Executor',
    packet: emptyGroupCreateDryRun,
    readyNow: createDryRunState.readyNow,
    readiness: {
      present: createDryRunState.present,
      freshGroupsRead: emptyGroupCreateDryRun?.freshScan?.groupsRead ?? null,
      targetGroupsExistingCount: emptyGroupCreateDryRun?.freshScan?.targetGroupsExistingCount ?? null,
      targetGroupsMissingCount: emptyGroupCreateDryRun?.freshScan?.targetGroupsMissingCount ?? null,
      createdCount: emptyGroupCreateDryRun?.createdGroups?.length ?? 0,
      canExecute: emptyGroupCreateDryRun?.decision?.canExecute ?? false,
      mailerLiteMutationsPerformed: emptyGroupCreateDryRun?.safety?.mailerLiteMutationsPerformed ?? false,
    },
    blockedBy: createDryRunState.blockedBy,
    nextAction: createDryRunState.nextAction,
    liveActionsClosed: ['execute_until_exact_phrase', 'subscriber_assignment', 'workflow_attachment', 'send', 'onboarding_handoff'],
  }),
  buildLane({
    id: 'seed_test_qa',
    owner: 'MailerLite / QA',
    packet: seedTestQaPacket,
    readyNow: seedTestQaPacket?.ok === true,
    readiness: seedTestQaPacket?.readiness ?? {},
    blockedBy: ['brand_review', 'asset_build_scope', 'exact_seed_send_approval', 'group_dry_run_for_receipt_test'],
    nextAction: 'Use this as the seed-test checklist only; no seed send or receipt test is authorized.',
    liveActionsClosed: ['seed_send', 'receipt_seed_test', 'subscriber_mutation', 'workflow_use'],
  }),
  ];
};

const buildDepartmentQueues = ({ lanes }) => ({
  brand: [
    lanes.find((lane) => lane.id === 'email_sequence')?.readiness?.brandReviewStatus === 'approved_no_live_from_final_brand_response'
      ? 'Brand sequence approval is closed for no-live continuation; review only if copy evidence changes.'
      : 'Review Email 1 and full four-email sequence for voice, promise, CTA and public/internal separation.',
    lanes.some((lane) => lane.id === 'mailerlite_group_dry_run' && lane.readyNow)
      ? 'Group candidate semantics are closed for this pass; do not reopen unless naming evidence changes.'
      : 'Decide semantic status for the two group candidates: add_as_candidate, rename, or reject for now.',
    'Keep candidate decision separate from any permission to create groups.',
  ],
  webDesign: [
    'Review Shopify/Web handoff and suggested files.',
    'If building next, use local/draft scope only and keep form connections/publish closed.',
    'Return mobile/UX corrections if the handoff is not yet strong enough.',
  ],
  crm: [
    'Preserve event contract as store-only until seed observations exist and append is approved.',
    lanes.some((lane) => lane.id === 'crm_signal_projection_packet' && lane.readyNow)
      ? 'CRM signal projection packet is ready as no-live policy; do not append ledgers, write cards, score, or touch Fact Store.'
      : 'Prepare or repair the CRM signal projection packet before any future signal append/write request.',
    lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes'
      ? 'Email asset-build scope packet is ready as a human boundary; keep MailerLite builder, workflows, subscribers and seed send closed until exact approval.'
      : lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'email_builder_payload_manifest_ready_no_live_changes'
      ? 'Email builder payload manifest is ready as local implementation input; keep MailerLite builder, workflows, subscribers and seed send closed until exact approval.'
      : lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes'
      ? 'Local email asset plan is ready for exact build-scope request only; keep MailerLite builder, workflows, subscribers and seed send closed.'
      : lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes'
      ? 'Email Style QA is ready for local asset planning only; keep MailerLite builder and seed send closed.'
      : 'Wait for Brand sequence review and Email Style QA before any local asset plan.',
    lanes.some((lane) => lane.id === 'mailerlite_empty_group_create_dry_run' && lane.readyNow)
      ? 'Mini-launch create runner dry-run is green; hold at exact phrase boundary and never run --execute without Alejandro.'
      : lanes.some((lane) => lane.id === 'mailerlite_empty_group_approval_packet' && lane.readyNow)
      ? 'Exact empty-group approval packet is prepared; hold execution until Alejandro gives the exact phrase and a fresh re-scan stays clean.'
      : lanes.some((lane) => lane.id === 'mailerlite_group_dry_run' && lane.readyNow)
      ? 'Use the fresh group dry-run only to prepare a later exact empty-group approval packet if Alejandro wants it.'
      : 'Rerun group dry-run after Brand semantic decision.',
    'Keep Experiment identity CRM-first unless MailerLite needs routing/dedupe/exclusion.',
  ],
  mailerLite: [
    'No action now.',
    'Asset build, seed send, receipt seed test, workflow use and audience launch stay closed.',
    'Any later action requires exact scope and Alejandro approval.',
  ],
  alejandro: [
    lanes.some((lane) => lane.id === 'brand_candidate_groups' && lane.readyNow)
      ? 'No immediate live decision needed. Later, approve only if you want Brand/Web/MailerLite to move from review to a concrete live-adjacent step.'
      : 'No current action required.',
  ],
});

const buildLiveGateMatrix = () => [
  {
    id: 'brand_review',
    status: 'open_no_live',
    owner: 'Brand',
    needsAlejandroApprovalNow: false,
    meaning: 'Review/revise copy, sequence and semantic group candidates.',
  },
  {
    id: 'web_design_review',
    status: 'open_no_live',
    owner: 'Web Design',
    needsAlejandroApprovalNow: false,
    meaning: 'Review handoff or prepare local draft only if scope is accepted.',
  },
  {
    id: 'shopify_repo_edit',
    status: 'closed_until_explicit_scope',
    owner: 'Web Design',
    needsAlejandroApprovalNow: true,
    meaning: 'Creating local Shopify files should be a separate scoped action; preview/publish still closed.',
  },
  {
    id: 'shopify_preview_or_publish',
    status: 'closed',
    owner: 'Alejandro / Web Design',
    needsAlejandroApprovalNow: true,
    meaning: 'No draft page, theme push, preview connection or live publish from this board.',
  },
  {
    id: 'mailerlite_group_creation',
    status: 'closed',
    owner: 'Alejandro / MailerLite Planner',
    needsAlejandroApprovalNow: true,
    meaning: 'Needs Brand dictionary decision/fresh dry-run when unresolved, plus an exact approval phrase before any group creation.',
  },
  {
    id: 'mailerLite_asset_build_or_seed_send',
    status: 'closed',
    owner: 'Alejandro / MailerLite',
    needsAlejandroApprovalNow: true,
    meaning: 'Needs Brand review, exact asset scope, exact seed recipient and send approval.',
  },
  {
    id: 'receipt_seed_test',
    status: 'closed',
    owner: 'Alejandro / MailerLite / CRM',
    needsAlejandroApprovalNow: true,
    meaning: 'Needs live groups approved/created or verified, exact seed subscriber scope and fresh scan.',
  },
  {
    id: 'onboarding_handoff',
    status: 'closed',
    owner: 'Alejandro / CRM / MailerLite',
    needsAlejandroApprovalNow: true,
    meaning: 'No routing to Onboarding v1/v2 until a separate onboarding migration gate.',
  },
  {
    id: 'audience_launch',
    status: 'closed',
    owner: 'Alejandro',
    needsAlejandroApprovalNow: true,
    meaning: 'No public send, live form connection, CRM write/scoring or launch activation.',
  },
];

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  groupsCreated: false,
  subscriberAssignmentsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const nextBestNoLiveMovesFor = ({ lanes }) => {
  const groupDryRunLane = lanes.find((lane) => lane.id === 'mailerlite_group_dry_run');
  const emptyGroupPacketLane = lanes.find((lane) => lane.id === 'mailerlite_empty_group_approval_packet');
  const emptyGroupCreateDryRunLane = lanes.find((lane) => lane.id === 'mailerlite_empty_group_create_dry_run');
  const crmSignalProjectionLane = lanes.find((lane) => lane.id === 'crm_signal_projection_packet');
  const moves = [
    'Brand reviews the full email sequence for voice, promise, CTA and public/internal separation.',
    'Web Design reviews/builds from the Shopify handoff only if scope is accepted.',
  ];

  if (crmSignalProjectionLane?.readyNow) {
    moves.push('CRM signal projection packet is ready as a no-live interpretation bridge; no Signal Ledger append, cards, scoring or Fact Store writes.');
  }

  if (lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'email_builder_payload_manifest_ready_no_live_changes') {
    moves[0] = 'Email builder payload manifest is ready; next boundary remains exact asset-build approval, not builder execution.';
  } else if (lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes') {
    moves[0] = 'Local email asset plan is ready; next no-live move is an exact MailerLite asset-build scope request, not builder execution.';
  } else if (lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes') {
    moves[0] = 'Email asset-build scope packet is ready; next no-live move is the exact local builder payload manifest, not builder execution.';
  } else if (lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes') {
    moves[0] = 'Email sequence Brand review is closed for no-live continuation; use Email Style QA for local asset planning only.';
  }

  if (emptyGroupCreateDryRunLane?.sourceStatus === 'dry_run_no_create_needed_targets_already_exist') {
    moves.push('Mini-launch empty groups already exist; do not rerun --execute for that boundary. Continue with the next separate approval queue item.');
  } else if (emptyGroupCreateDryRunLane?.readyNow) {
    moves.push('Mini-launch empty-group create runner dry-run is green; pause at Alejandro exact-phrase boundary and do not run --execute.');
  } else if (emptyGroupPacketLane?.readyNow) {
    moves.push('Run the mini-launch empty-group create runner in dry-run mode only to confirm the fresh scan; do not create groups without exact phrase.');
  } else if (groupDryRunLane?.readyNow) {
    moves.push('Prepare an exact empty-group creation approval packet only if Alejandro wants the two Brand-approved groups created empty; no subscribers, workflows, or sends.');
  } else {
    moves.push(groupDryRunLane?.nextAction ?? 'Rerun the launch group dry-run before any group creation approval exists.');
  }

  return moves;
};

const overallStateFor = ({ lanes }) => {
  const emailSequenceStatus = lanes.find((lane) => lane.id === 'email_sequence')?.sourceStatus;
  if (emailSequenceStatus === 'email_builder_payload_manifest_ready_no_live_changes') {
    return 'email_builder_payload_manifest_ready_not_ready_for_live_operation';
  }
  if (emailSequenceStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes') {
    return 'email_asset_build_scope_ready_for_exact_approval_not_ready_for_live_operation';
  }
  if (emailSequenceStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes') {
    return 'local_email_asset_plan_ready_not_ready_for_live_operation';
  }
  if (emailSequenceStatus === 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes') {
    return 'department_reviews_reconciled_ready_for_local_asset_planning_not_ready_for_live_operation';
  }
  return 'ready_for_department_reviews_not_ready_for_live_operation';
};

const buildReadinessBoard = ({
  onboardingExecutionPacket,
  rehearsalPacket,
  eventContract,
  seedTestQaPacket,
  brandEmailAssetPacket,
  groupDryRun,
  emptyGroupCreationPacket,
  emptyGroupCreateDryRun,
  brandCandidateReviewPacket,
  emailSequencePacket,
  emailStyleQaPacket,
  localEmailAssetPlan,
  emailAssetBuildScopePacket,
  emailBuilderPayloadManifest,
  shopifyHandoffPacket,
  crmSignalProjectionPacket,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(rehearsalPacket, eventContract, emailSequencePacket, shopifyHandoffPacket);
  const lanes = buildLanes({
    onboardingExecutionPacket,
    rehearsalPacket,
    eventContract,
    seedTestQaPacket,
    brandEmailAssetPacket,
    groupDryRun,
    emptyGroupCreationPacket,
    emptyGroupCreateDryRun,
    brandCandidateReviewPacket,
    emailSequencePacket,
    emailStyleQaPacket,
    localEmailAssetPlan,
    emailAssetBuildScopePacket,
    emailBuilderPayloadManifest,
    shopifyHandoffPacket,
    crmSignalProjectionPacket,
  });
  const liveGateMatrix = buildLiveGateMatrix();
  const readyNoLiveLanes = lanes.filter((lane) => lane.readyNow).map((lane) => lane.id);
  const blockedOrClosedLanes = lanes.filter((lane) => lane.blockedBy.length > 0).map((lane) => ({
    id: lane.id,
    blockedBy: lane.blockedBy,
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_readiness_board',
    generatedAt,
    ok: true,
    status: 'mini_launch_readiness_board_ready_no_live_changes',
    launch,
    executiveSummary: {
      overallState: overallStateFor({ lanes }),
      readyNoLiveLaneCount: readyNoLiveLanes.length,
      liveGateOpenCount: liveGateMatrix.filter((gate) => gate.status === 'open_no_live').length,
      liveMutationGateOpenCount: liveGateMatrix.filter((gate) => gate.status === 'open_no_live' && gate.needsAlejandroApprovalNow).length,
      nextBestNoLiveMoves: nextBestNoLiveMovesFor({ lanes }),
      noImmediateAlejandroLiveApprovalNeeded: true,
    },
    lanes,
    departmentQueues: buildDepartmentQueues({ lanes }),
    liveGateMatrix,
    blockedOrClosedLanes,
    operatorWarnings: [
      'Do not treat a Brand candidate decision as permission to create MailerLite groups.',
      'Do not treat the empty-group approval packet as execution approval; Alejandro must give the exact phrase and the runner must re-scan first.',
      'Do not run the mini-launch create runner with --execute unless Alejandro gives the exact phrase for the two named empty groups.',
      'Do not treat Web Design handoff as permission to publish or connect a real form.',
      'Do not treat Email Sequence draft as permission to build MailerLite assets or send tests.',
      'Do not treat the email asset-build scope packet as MailerLite builder approval; Alejandro must approve exact scope before any asset mutation.',
      'Do not treat the email builder payload manifest as MailerLite builder execution; it is local input only.',
      'Do not treat the CRM signal projection packet as permission to append ledgers, write cards, score, or touch Fact Store.',
      'Do not route mini-launch participants into onboarding until a separate onboarding gate exists.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (board) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Readiness Board',
    '',
    `Generated: ${board.generatedAt}`,
    `Status: ${board.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${board.launch.resourceName}`,
    `launch_id interno: ${board.launch.launchId}`,
    '',
    `Estado general: ${board.executiveSummary.overallState}`,
    '',
    'Este tablero no ejecuta nada vivo. Solo consolida los paquetes existentes para que Brand, Web Design, CRM, MailerLite y Alejandro no confundan revision, preparacion y aprobacion viva.',
    '',
    '## Next Best No-Live Moves',
    '',
    renderList(board.executiveSummary.nextBestNoLiveMoves),
    '',
    '## Lanes',
    '',
  ];

  for (const lane of board.lanes) {
    lines.push(`### ${lane.id}`);
    lines.push(`- Owner: ${lane.owner}`);
    lines.push(`- Source status: ${lane.sourceStatus}`);
    lines.push(`- Ready now: ${lane.readyNow}`);
    lines.push(`- Next action: ${lane.nextAction}`);
    if (lane.blockedBy.length) lines.push(`- Blocked by: ${lane.blockedBy.join(', ')}`);
    if (lane.liveActionsClosed.length) lines.push(`- Live actions closed: ${lane.liveActionsClosed.join(', ')}`);
    lines.push('');
  }

  lines.push('## Department Queues', '');
  for (const [department, tasks] of Object.entries(board.departmentQueues)) {
    lines.push(`### ${department}`);
    lines.push(renderList(tasks));
    lines.push('');
  }

  lines.push('## Live Gate Matrix', '');
  for (const gate of board.liveGateMatrix) {
    lines.push(`- ${gate.id}: ${gate.status}; owner=${gate.owner}; Alejandro approval=${gate.needsAlejandroApprovalNow}; ${gate.meaning}`);
  }

  lines.push('', '## Operator Warnings', '');
  lines.push(renderList(board.operatorWarnings));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of board.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin CRM live API calls.');
  lines.push('- Sin browser.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin test email enviado.');
  lines.push('- Sin append al Signal Event Ledger.');
  lines.push('- Sin card writes, scoring, Fact Store u outbound.');

  return lines.join('\n');
};

const writeJson = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const buildBoardFromFiles = async (options) => {
  const [
    onboardingExecutionPacket,
    rehearsalPacket,
    eventContract,
    seedTestQaPacket,
    brandEmailAssetPacket,
    groupDryRun,
    emptyGroupCreationPacket,
    emptyGroupCreateDryRun,
    brandCandidateReviewPacket,
    emailSequencePacket,
    emailStyleQaPacket,
    localEmailAssetPlan,
    emailAssetBuildScopePacket,
    emailBuilderPayloadManifest,
    shopifyHandoffPacket,
    crmSignalProjectionPacket,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.onboardingExecutionPacket),
    readJson(options.rehearsalPacket),
    readJson(options.eventContract),
    readJson(options.seedTestQaPacket),
    readJson(options.brandEmailAssetPacket),
    readJson(options.groupDryRun),
    readOptionalJson(options.emptyGroupCreationPacket),
    readOptionalJson(options.emptyGroupCreateDryRun),
    readJson(options.brandCandidateReviewPacket),
    readJson(options.emailSequencePacket),
    readOptionalJson(options.emailStyleQaPacket),
    readOptionalJson(options.localEmailAssetPlan),
    readOptionalJson(options.emailAssetBuildScopePacket),
    readOptionalJson(options.emailBuilderPayloadManifest),
    readJson(options.shopifyHandoffPacket),
    readJson(options.crmSignalProjectionPacket),
    loadSourceDigests(options),
  ]);

  return buildReadinessBoard({
    onboardingExecutionPacket,
    rehearsalPacket,
    eventContract,
    seedTestQaPacket,
    brandEmailAssetPacket,
    groupDryRun,
    emptyGroupCreationPacket,
    emptyGroupCreateDryRun,
    brandCandidateReviewPacket,
    emailSequencePacket,
    emailStyleQaPacket,
    localEmailAssetPlan,
    emailAssetBuildScopePacket,
    emailBuilderPayloadManifest,
    shopifyHandoffPacket,
    crmSignalProjectionPacket,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const board = await buildBoardFromFiles(options);
  if (options.out) await writeJson(options.out, board);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(board));

  console.log(JSON.stringify({
    ok: board.ok,
    status: board.status,
    generatedAt: board.generatedAt,
    launchId: board.launch.launchId,
    overallState: board.executiveSummary.overallState,
    readyNoLiveLaneCount: board.executiveSummary.readyNoLiveLaneCount,
    liveMutationGateOpenCount: board.executiveSummary.liveMutationGateOpenCount,
    noImmediateAlejandroLiveApprovalNeeded: board.executiveSummary.noImmediateAlejandroLiveApprovalNeeded,
    nextBestNoLiveMoves: board.executiveSummary.nextBestNoLiveMoves,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: board.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch readiness board failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDepartmentQueues,
  buildLanes,
  buildLiveGateMatrix,
  buildReadinessBoard,
  launchFrom,
  parseArgs,
  renderMarkdown,
};
