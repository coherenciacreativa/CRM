import { describe, expect, test } from "vitest";

import {
  EXPECTED_APPROVAL_PHRASE,
  EXPECTED_COMPACT_FOOTER_APPROVAL_PHRASE,
  EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE,
  EXPECTED_E01_CANARY_APPROVAL_PHRASE,
  EXPECTED_E04_RESEND_APPROVAL_PHRASE,
  buildPreflight,
  expectedApprovalPhraseFor,
  htmlStats,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  replacementReceiptGreen,
  targetedSeedTestSendCompleted,
} from "../scripts/crm-vnext-mailerlite-mini-launch-null-audience-seed-test-send.mjs";

const safetyGroup = {
  id: "safe-group-1",
  name: "CC · Safety · Null audience · DO NOT SEND",
  active_count: 0,
};

const htmlFor = (label) => `<html><body><p>${label}</p><a href="https://preview.example.test/${label.toLowerCase()}">preview</a></body></html>`;

const campaign = ({ label, name, content = htmlFor(label), status = "draft", groupId = "safe-group-1" }) => ({
  id: `campaign-${label}`,
  name,
  status,
  type: "regular",
  filter: [["groups", [groupId]]],
  emails: [{ content }],
  scheduled_for: null,
  queued_at: null,
  started_at: null,
  finished_at: null,
  is_currently_sending_out: false,
  used_in_automations: false,
  warnings: [],
  missing_data: [],
  has_basic_filter: true,
  can_be_scheduled: true,
});

const names = [
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E01 Delivery orientation · API Null Audience replacement",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E02 Practice · API Null Audience replacement",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E03 Editorial depth · API Null Audience replacement",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E04 Feedback invitation · API Null Audience replacement",
];

const campaigns = names.map((name, index) => campaign({
  label: `E0${index + 1}`,
  name,
}));

const compactNames = [
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E01 Delivery orientation · API Null Audience compact footer canon",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E02 Practice · API Null Audience compact footer canon",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E03 Editorial depth · API Null Audience compact footer canon",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E04 Feedback invitation · API Null Audience compact footer canon",
];

const compactCampaigns = compactNames.map((name, index) => campaign({
  label: `E0${index + 1}`,
  name,
}));

const compactV2Names = [
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E01 Delivery orientation · API Null Audience compact footer v2 canon",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E02 Practice · API Null Audience compact footer v2 canon",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E03 Editorial depth · API Null Audience compact footer v2 canon",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E04 Feedback invitation · API Null Audience compact footer v2 canon",
];

const compactV2Campaigns = compactV2Names.map((name, index) => campaign({
  label: `E0${index + 1}`,
  name,
}));

const replacementReceipt = {
  ok: true,
  status: "mailerlite_null_audience_replacement_execution_completed_no_sends",
  mode: "execute_requested",
  createdDrafts: names.map((name, index) => ({
    step: index + 1,
    label: `E0${index + 1}`,
    campaignIdSha256: null,
    name,
  })),
  postCreateQa: {
    replacementDraftCount: 4,
    nullAudienceSafeCount: 4,
    contentGreenCount: 4,
    rows: campaigns.map((row, index) => ({
      label: `E0${index + 1}`,
      contentSha256: htmlStats(row.emails[0].content).sha256,
    })),
  },
  safety: {
    mailerLiteDraftsCreated: 4,
    campaignsPublished: false,
    campaignsScheduled: false,
    sendsPerformed: false,
    subscribersRead: false,
    subscriberMutationsPerformed: false,
    additionalGroupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    exactUrlsPrinted: false,
    tokensPrinted: false,
  },
};

const compactReplacementReceipt = {
  ok: true,
  status: "mailerlite_null_audience_replacement_execution_completed_no_sends",
  mode: "execute_requested",
  createdDrafts: compactNames.map((name, index) => ({
    step: index + 1,
    label: `E0${index + 1}`,
    campaignIdSha256: null,
    name,
  })),
  postCreateQa: {
    replacementDraftCount: 4,
    nullAudienceSafeCount: 4,
    contentGreenCount: 4,
    rows: compactCampaigns.map((row, index) => ({
      label: `E0${index + 1}`,
      contentSha256: htmlStats(row.emails[0].content).sha256,
    })),
  },
  safety: {
    mailerLiteDraftsCreated: 4,
    campaignsPublished: false,
    campaignsScheduled: false,
    sendsPerformed: false,
    subscribersRead: false,
    subscriberMutationsPerformed: false,
    additionalGroupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    exactUrlsPrinted: false,
    tokensPrinted: false,
  },
};

const compactV2ReplacementReceipt = {
  ...compactReplacementReceipt,
  createdDrafts: compactV2Names.map((name, index) => ({
    step: index + 1,
    label: `E0${index + 1}`,
    campaignIdSha256: null,
    name,
  })),
  postCreateQa: {
    replacementDraftCount: 4,
    nullAudienceSafeCount: 4,
    contentGreenCount: 4,
    rows: compactV2Campaigns.map((row, index) => ({
      label: `E0${index + 1}`,
      contentSha256: htmlStats(row.emails[0].content).sha256,
    })),
  },
};

const canaryName = "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E01 Delivery orientation · API Null Audience visual signature canary";
const canaryCampaign = campaign({
  label: "E01",
  name: canaryName,
});
const canaryReplacementReceipt = {
  ok: true,
  status: "mailerlite_null_audience_canary_replacement_execution_completed_no_sends",
  mode: "execute_requested",
  createdDrafts: [{
    step: 1,
    label: "E01",
    campaignIdSha256: null,
    name: canaryName,
  }],
  postCreateQa: {
    replacementDraftCount: 1,
    nullAudienceSafeCount: 1,
    contentGreenCount: 1,
    rows: [{
      label: "E01",
      contentSha256: htmlStats(canaryCampaign.emails[0].content).sha256,
    }],
  },
  safety: {
    mailerLiteDraftsCreated: 1,
    campaignsPublished: false,
    campaignsScheduled: false,
    sendsPerformed: false,
    subscribersRead: false,
    subscriberMutationsPerformed: false,
    additionalGroupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    exactUrlsPrinted: false,
    tokensPrinted: false,
  },
};

describe("CRM vNext MailerLite Null Audience seed test send", () => {
  test("normalizes and matches the exact approval phrase", () => {
    expect(normalizeApprovalPhrase(EXPECTED_APPROVAL_PHRASE)).toBe(normalizeApprovalPhrase(EXPECTED_APPROVAL_PHRASE));
    expect(EXPECTED_APPROVAL_PHRASE).toContain("saludoalsol+seedmail@gmail.com");
    expect(EXPECTED_APPROVAL_PHRASE).toContain("asset-ready Null Audience");
    expect(EXPECTED_APPROVAL_PHRASE).toContain("active_count=0");
    expect(EXPECTED_APPROVAL_PHRASE).toContain("sin audience send");
  });

  test("parses UI-assisted sent-record mode without enabling API execute", () => {
    const options = parseArgs([
      "--record-ui-sent",
      "--ui-sent-labels",
      "E01,E02,E03,E04",
      "--approval-phrase",
      EXPECTED_APPROVAL_PHRASE,
    ]);

    expect(options.execute).toBe(false);
    expect(options.recordUiSent).toBe(true);
    expect(options.uiSentLabels).toEqual(["E01", "E02", "E03", "E04"]);
  });

  test("supports an E04-only resend boundary with its own exact phrase", () => {
    const options = parseArgs([
      "--target-labels",
      "E04",
      "--record-ui-sent",
      "--ui-sent-labels",
      "E04",
      "--approval-phrase",
      EXPECTED_E04_RESEND_APPROVAL_PHRASE,
    ]);

    expect(options.targetLabels).toEqual(["E04"]);
    expect(options.uiSentLabels).toEqual(["E04"]);
    expect(expectedApprovalPhraseFor(options.targetLabels)).toBe(EXPECTED_E04_RESEND_APPROVAL_PHRASE);
    expect(EXPECTED_E04_RESEND_APPROVAL_PHRASE).toContain("E04 asset-ready Null Audience");
    expect(EXPECTED_E04_RESEND_APPROVAL_PHRASE).toContain("receipt de creación asset-ready");
    expect(EXPECTED_E04_RESEND_APPROVAL_PHRASE).toContain("sin reenviar E01-E03");
  });

  test("supports a compact-footer seed-test boundary with its own exact phrase", () => {
    const details = new Map(compactCampaigns.map((row) => [row.id, row]));
    const preflight = buildPreflight({
      replacementReceipt: compactReplacementReceipt,
      groups: [safetyGroup],
      campaigns: compactCampaigns,
      details,
      seedEmail: "saludoalsol+seedmail@gmail.com",
      execute: true,
      recordUiSent: true,
      approvalPhrase: EXPECTED_COMPACT_FOOTER_APPROVAL_PHRASE,
    });

    expect(expectedApprovalPhraseFor(["E01", "E02", "E03", "E04"], compactReplacementReceipt)).toBe(
      EXPECTED_COMPACT_FOOTER_APPROVAL_PHRASE,
    );
    expect(EXPECTED_COMPACT_FOOTER_APPROVAL_PHRASE).toContain("compact-footer Null Audience");
    expect(EXPECTED_COMPACT_FOOTER_APPROVAL_PHRASE).toContain("receipt de creación compact-footer");
    expect(preflight.blockers).toEqual([]);
    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.compactFooterSet).toBe(true);
  });

  test("supports a compact-footer v2 seed-test boundary with its own exact phrase", () => {
    const details = new Map(compactV2Campaigns.map((row) => [row.id, row]));
    const preflight = buildPreflight({
      replacementReceipt: compactV2ReplacementReceipt,
      groups: [safetyGroup],
      campaigns: compactV2Campaigns,
      details,
      seedEmail: "saludoalsol+seedmail@gmail.com",
      execute: true,
      recordUiSent: true,
      approvalPhrase: EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE,
    });

    expect(expectedApprovalPhraseFor(["E01", "E02", "E03", "E04"], compactV2ReplacementReceipt)).toBe(
      EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE,
    );
    expect(EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE).toContain("compact-footer v2 Null Audience");
    expect(EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE).toContain("receipt de creación compact-footer v2");
    expect(preflight.expectedApprovalPhrase).toBe(EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE);
    expect(preflight.blockers).toEqual([]);
    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.compactFooterSet).toBe(true);
  });

  test("blocks direct API execution for compact-footer seed tests", () => {
    const details = new Map(compactCampaigns.map((row) => [row.id, row]));
    const preflight = buildPreflight({
      replacementReceipt: compactReplacementReceipt,
      groups: [safetyGroup],
      campaigns: compactCampaigns,
      details,
      seedEmail: "saludoalsol+seedmail@gmail.com",
      execute: true,
      approvalPhrase: EXPECTED_COMPACT_FOOTER_APPROVAL_PHRASE,
    });

    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.blockers).toContain("compact_footer_seed_test_requires_ui_record_mode");
  });

  test("supports an E01 canary seed-test boundary with its own exact phrase", () => {
    const options = parseArgs([
      "--target-labels",
      "E01",
      "--execute",
      "--approval-phrase",
      EXPECTED_E01_CANARY_APPROVAL_PHRASE,
    ]);

    expect(options.targetLabels).toEqual(["E01"]);
    expect(expectedApprovalPhraseFor(options.targetLabels)).toBe(EXPECTED_E01_CANARY_APPROVAL_PHRASE);
    expect(EXPECTED_E01_CANARY_APPROVAL_PHRASE).toContain("sin reenviar E02-E04");
  });

  test("accepts a completed replacement receipt and green fresh campaign scan", () => {
    const details = new Map(campaigns.map((row) => [row.id, row]));
    const preflight = buildPreflight({
      replacementReceipt,
      groups: [safetyGroup],
      campaigns,
      details,
      seedEmail: "saludoalsol+seedmail@gmail.com",
      execute: true,
      approvalPhrase: EXPECTED_APPROVAL_PHRASE,
    });

    expect(replacementReceiptGreen(replacementReceipt)).toBe(true);
    expect(preflight.blockers).toEqual([]);
    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.safetyGroupActiveCount).toBe(0);
    expect(preflight.targets).toHaveLength(4);
    expect(preflight.targets.every((target) => target.nullAudienceSafe)).toBe(true);
    expect(preflight.targets.every((target) => target.contentMatchesCreationReceipt)).toBe(true);
    expect(preflight.targets.every((target) => target.placeholderCount === 0)).toBe(true);
  });

  test("limits fresh preflight to E04 when the E04-only resend phrase is supplied", () => {
    const details = new Map(campaigns.map((row) => [row.id, row]));
    const preflight = buildPreflight({
      replacementReceipt,
      groups: [safetyGroup],
      campaigns,
      details,
      seedEmail: "saludoalsol+seedmail@gmail.com",
      execute: true,
      targetLabels: ["E04"],
      approvalPhrase: EXPECTED_E04_RESEND_APPROVAL_PHRASE,
    });

    expect(preflight.blockers).toEqual([]);
    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.targetLabels).toEqual(["E04"]);
    expect(preflight.targets.map((target) => target.label)).toEqual(["E04"]);
  });

  test("accepts an E01 canary replacement receipt and limits fresh preflight to that draft", () => {
    const details = new Map([[canaryCampaign.id, canaryCampaign]]);
    const preflight = buildPreflight({
      replacementReceipt: canaryReplacementReceipt,
      groups: [safetyGroup],
      campaigns: [canaryCampaign],
      details,
      seedEmail: "saludoalsol+seedmail@gmail.com",
      execute: true,
      targetLabels: ["E01"],
      approvalPhrase: EXPECTED_E01_CANARY_APPROVAL_PHRASE,
    });

    expect(replacementReceiptGreen(canaryReplacementReceipt, ["E01"])).toBe(true);
    expect(replacementReceiptGreen(canaryReplacementReceipt)).toBe(false);
    expect(preflight.blockers).toEqual([]);
    expect(preflight.approvalMatched).toBe(true);
    expect(preflight.targetLabels).toEqual(["E01"]);
    expect(preflight.targets.map((target) => target.label)).toEqual(["E01"]);
    expect(preflight.targets[0].placeholderCount).toBe(0);
    expect(preflight.targets[0].redactedFinalLinkTokenCount).toBe(0);
  });

  test("treats an E04-only send as complete when the single targeted test is recorded", () => {
    expect(targetedSeedTestSendCompleted({
      preflight: {
        blockers: [],
        targets: [{ label: "E04" }],
      },
      sentTests: [{ label: "E04" }],
      errors: [],
    })).toBe(true);

    expect(targetedSeedTestSendCompleted({
      preflight: {
        blockers: [],
        targets: [{ label: "E04" }],
      },
      sentTests: [],
      errors: [],
    })).toBe(false);
  });

  test("blocks if any replacement draft is not constrained to the empty safety group", () => {
    const unsafe = campaign({
      label: "E02",
      name: names[1],
      groupId: "real-group",
    });
    const mixedCampaigns = [campaigns[0], unsafe, campaigns[2], campaigns[3]];
    const details = new Map(mixedCampaigns.map((row) => [row.id, row]));
    const preflight = buildPreflight({
      replacementReceipt,
      groups: [safetyGroup],
      campaigns: mixedCampaigns,
      details,
      seedEmail: "saludoalsol+seedmail@gmail.com",
      execute: true,
      approvalPhrase: EXPECTED_APPROVAL_PHRASE,
    });

    expect(preflight.blockers).toContain("target_E02_null_audience_not_safe");
  });

  test("blocks if content has placeholders or the seed is not exact", () => {
    const bad = campaign({
      label: "E01",
      name: names[0],
      content: "result_or_resource_link_placeholder",
    });
    const mixedCampaigns = [bad, campaigns[1], campaigns[2], campaigns[3]];
    const details = new Map(mixedCampaigns.map((row) => [row.id, row]));
    const preflight = buildPreflight({
      replacementReceipt,
      groups: [safetyGroup],
      campaigns: mixedCampaigns,
      details,
      seedEmail: "other@example.test",
      execute: true,
      approvalPhrase: EXPECTED_APPROVAL_PHRASE,
    });

    expect(preflight.blockers).toContain("seed_email_not_exact_approved_recipient");
    expect(preflight.blockers).toContain("target_E01_placeholders_still_present");
    expect(preflight.blockers).toContain("target_E01_content_sha256_drift");
  });

  test("renders a receipt without raw secrets or exact URLs", () => {
    const markdown = renderMarkdown({
      generatedAt: "2026-05-31T00:00:00.000Z",
      mode: "execute_requested",
      status: "mailerlite_null_audience_seed_test_send_completed_test_only",
      ok: true,
      decision: {
        approvalRequest: {
          exactApprovalPhrase: EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE,
          exactApprovalPhrasePrinted: false,
          targetLabels: ["E01", "E02", "E03", "E04"],
        },
        approval: { status: "exact_approval_phrase_matched" },
        canExecute: true,
        exactApprovalPhrasePrinted: false,
        blockers: [],
      },
      seedRecipient: {
        redacted: "sa…@gmail.com",
        printed: false,
      },
      preflight: {
        groupsRead: 1,
        campaignsRead: 4,
        campaignDetailsRead: 4,
        safetyGroupName: "CC · Safety · Null audience · DO NOT SEND",
        safetyGroupActiveCount: 0,
        targetCount: 4,
        qaGreenCount: 4,
      },
      sentTests: [{
        label: "E01",
        name: names[0],
        seedRecipientRedacted: "sa…@gmail.com",
        campaignIdPrinted: false,
      }],
      errors: [],
      safety: {
        mailerLiteApiCalled: true,
        mailerLiteTestEmailsSent: 1,
        testSendExecutionChannel: "mailerlite_ui_manual_assisted",
        audienceSendsPerformed: false,
        campaignsPublished: false,
        campaignsScheduled: false,
        subscribersRead: false,
        subscriberMutationsPerformed: false,
        additionalGroupsCreatedOrAssigned: false,
        segmentsCreatedOrAssigned: false,
        workflowMutationsPerformed: false,
        shopifyMutationsPerformed: false,
        crmLiveApiCalled: false,
        signalLedgerAppendPerformed: false,
        crmCardMutationsPerformed: false,
        crmScoreMutationsPerformed: false,
        factStoreWritePerformed: false,
        exactUrlsPrinted: false,
        tokensPrinted: false,
        senderValuesPrinted: false,
      },
    });

    expect(markdown).toContain("Test emails sent: 1");
    expect(markdown).not.toContain("saludoalsol+seedmail@gmail.com");
    expect(markdown).not.toContain(EXPECTED_COMPACT_FOOTER_V2_APPROVAL_PHRASE);
    expect(markdown).not.toContain("https://preview.example.test");
  });
});
