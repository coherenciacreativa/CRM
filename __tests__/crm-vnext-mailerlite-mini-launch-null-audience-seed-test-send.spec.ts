import { describe, expect, test } from "vitest";

import {
  EXPECTED_APPROVAL_PHRASE,
  buildPreflight,
  htmlStats,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  replacementReceiptGreen,
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

describe("CRM vNext MailerLite Null Audience seed test send", () => {
  test("normalizes and matches the exact approval phrase", () => {
    expect(normalizeApprovalPhrase(EXPECTED_APPROVAL_PHRASE)).toBe(normalizeApprovalPhrase(EXPECTED_APPROVAL_PHRASE));
    expect(EXPECTED_APPROVAL_PHRASE).toContain("saludoalsol+seedmail@gmail.com");
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
    expect(markdown).not.toContain("https://preview.example.test");
  });
});
