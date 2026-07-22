import { readFileSync } from 'node:fs';
import { types as nodeUtilTypes } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import * as host from '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';

const NOW = 1_800_000_000_000;

const install = ({
  open = 'exact',
  qualification = host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
    .EXACT_TWO_PAIRS,
  observation = host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
    .EXACT_CANDIDATE,
  finalize = 'exact',
}: {
  open?: string;
  qualification?: string;
  observation?: string;
  finalize?: string;
} = {}) => host.installWelcomeAudioIabSemanticRuntimeFacadeForTest({
  open_scenario: open,
  qualification_scenario: qualification,
  observation_scenario: observation,
  finalize_scenario: finalize,
});

const qualificationBlocker = async (scenario: string) => {
  expect(install({ qualification: scenario })).toBe(true);
  const result = await host.qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({
    now_ms: NOW,
  });
  return {
    result,
    blocker: result.redacted_receipt.blocker_codes[0],
  };
};

const observationBlocker = async (scenario: string) => {
  expect(install({ observation: scenario })).toBe(true);
  const result = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
    now_ms: NOW,
  });
  return {
    result,
    blocker: result.redacted_receipt.blocker_codes[0],
  };
};

afterEach(() => {
  host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
});

describe('IAB semantic notification/profile qualification', () => {
  it('fails closed without the fixed runtime seam', async () => {
    const result = await host.qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce();

    expect(result.private_complete_source_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
    ]);
    expect(
      host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  it('qualifies exactly two distinct notification/profile traversals and nothing more', async () => {
    expect(install()).toBe(true);

    const result = await host.qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({
      now_ms: NOW,
    });

    expect(result.private_complete_source_capability).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
      threads_opened: 0,
      seen_transitions: 0,
      capability_issued: false,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      read_only_source_action_attempted: true,
      read_only_source_action_performed: true,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: false,
      blocker_codes: [],
    });
    expect(
      host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(JSON.stringify(result.redacted_receipt)).not.toContain('private_candidate');
  });

  it('keeps the pre-closure synthetic harness shape compatible with an exact open', async () => {
    expect(host.installWelcomeAudioIabSemanticRuntimeFacadeForTest({
      qualification_scenario:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.EXACT_TWO_PAIRS,
      observation_scenario:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.EXACT_CANDIDATE,
      finalize_scenario: 'exact',
    })).toBe(true);

    const result = await host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });

    expect(result.redacted_receipt).toMatchObject({
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
      read_only_source_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      blocker_codes: [],
    });
  });

  it.each([
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ONE_PAIR,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_COUNT_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.DUPLICATE_PAIR,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_NOT_DISTINCT,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.THREAD_OPENED,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.SEEN_TRANSITION,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.CHALLENGE,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.REPORT_PROXY,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ACTION_THROWS,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED,
    ],
  ])('blocks hostile qualification scenario %s and finalizes once', async (scenario, blocker) => {
    const observed = await qualificationBlocker(scenario);

    expect(observed.result.private_complete_source_capability).toBeNull();
    expect(observed.blocker).toBe(blocker);
    expect(
      host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
        observed.result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  it('preserves exact rejected qualification progress and rejects receipt erasure', async () => {
    const capture = async (qualification: string) => {
      expect(install({ qualification })).toBe(true);
      const result = await host
        .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };

    const onePair = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ONE_PAIR,
    );
    expect(onePair).toMatchObject({
      rows_scanned: 8,
      notification_profile_pairs_qualified: 1,
      threads_opened: 0,
      seen_transitions: 0,
      external_effect_invoked: false,
    });

    const threadOpened = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.THREAD_OPENED,
    );
    expect(threadOpened).toMatchObject({
      rows_scanned: 8,
      threads_opened: 1,
      seen_transitions: 0,
      external_effect_invoked: false,
    });

    const seen = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.SEEN_TRANSITION,
    );
    expect(seen).toMatchObject({
      rows_scanned: 8,
      threads_opened: 0,
      seen_transitions: 1,
      external_effect_invoked: true,
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
      ],
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...seen,
      read_only_source_action_performed: false,
    })).toMatchObject({ ok: false });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...seen,
      external_effect_invoked: false,
    })).toMatchObject({ ok: false });

    const rowCap = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS,
    );
    expect(rowCap).toMatchObject({
      rows_scanned: 9,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED],
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...rowCap,
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
      ],
    })).toMatchObject({ ok: false });

    const preOpen = await (host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce as any)({ forbidden: true });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...preOpen.redacted_receipt,
      read_only_source_action_performed: true,
    })).toMatchObject({ ok: false });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...preOpen.redacted_receipt,
      rows_scanned: 1,
    })).toMatchObject({ ok: false });
  });

  it('accounts valid pairs before a higher-priority qualification blocker', async () => {
    const capture = async (qualification: string) => {
      expect(install({ qualification })).toBe(true);
      const result = await host
        .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };

    const twoPairsAndThread = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.THREAD_OPENED,
    );
    expect(twoPairsAndThread).toMatchObject({
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
      threads_opened: 1,
      external_effect_possible_or_unknown: true,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN],
    });

    const onePairAndThread = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .ONE_PAIR_THREAD_OPENED,
    );
    expect(onePairAndThread).toMatchObject({
      notification_profile_pairs_qualified: 1,
      distinct_pairs_proven: false,
      threads_opened: 1,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN],
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      onePairAndThread,
    )).toEqual({ ok: true, reason: null });
  });

  it('rejects a pair array with an inherited iterator without invoking it', async () => {
    const observed = await qualificationBlocker(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .PAIR_ARRAY_INHERITED_ITERATOR,
    );

    expect(observed.blocker).toBe(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
    );
    expect(observed.result.redacted_receipt).toMatchObject({
      notification_profile_pairs_qualified: 0,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: true,
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      observed.result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  it('closes the qualification REPORT_INVALID matrix without hiding lower-bound pairs', async () => {
    const capture = async (qualification: string) => {
      expect(install({ qualification })).toBe(true);
      const result = await host
        .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };

    const compoundInvalid = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT,
    );
    expect(compoundInvalid).toMatchObject({
      rows_scanned: 9,
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
      threads_opened: 0,
      challenge_or_error_absent: false,
      external_effect_possible_or_unknown: true,
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
      ],
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      compoundInvalid,
    )).toEqual({ ok: true, reason: null });

    const rowCap = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS,
    );
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...rowCap,
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
      ],
    })).toMatchObject({ ok: false });

    const qualified = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.EXACT_TWO_PAIRS,
    );
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...qualified,
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
      external_effect_possible_or_unknown: true,
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
      ],
    })).toMatchObject({ ok: false });
  });

  it('accepts every emitted qualification invalid-report marker and rejects its inverse', async () => {
    const invalidScenarios = [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.REPORT_PROXY,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .PAIR_ARRAY_INHERITED_ITERATOR,
    ];

    for (const qualification of invalidScenarios) {
      for (const finalize of ['exact', 'invalid']) {
        expect(install({ qualification, finalize })).toBe(true);
        const result = await host
          .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
        expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
        expect(result.redacted_receipt).toMatchObject({
          decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
          challenge_or_error_absent: false,
          isolated_tab_finalized: finalize === 'exact',
          external_effect_possible_or_unknown: true,
          blocker_codes: [
            host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
          ],
        });
        expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
          result.redacted_receipt,
        )).toEqual({ ok: true, reason: null });
        expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
          ...result.redacted_receipt,
          challenge_or_error_absent: true,
        })).toMatchObject({ ok: false });
      }
    }
  });

  it('enforces exact qualification thread/Seen effect accounting outside REPORT_INVALID', async () => {
    const capture = async (qualification: string) => {
      expect(install({ qualification })).toBe(true);
      const result = await host
        .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };
    const cases = [
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.CHALLENGE,
        ),
        patch: { external_effect_possible_or_unknown: true },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ONE_PAIR,
        ),
        patch: { external_effect_possible_or_unknown: true },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.THREAD_OPENED,
        ),
        patch: { external_effect_possible_or_unknown: false },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.SEEN_TRANSITION,
        ),
        patch: { external_effect_possible_or_unknown: false },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.REPORT_PROXY,
        ),
        patch: { external_effect_possible_or_unknown: false },
      },
    ];
    for (const entry of cases) {
      expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
        ...entry.receipt,
        ...entry.patch,
      })).toMatchObject({ ok: false });
    }
  });

  it('keeps the primary qualification violation when finalization also fails', async () => {
    expect(install({
      qualification:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.SEEN_TRANSITION,
      finalize: 'invalid',
    })).toBe(true);

    const result = await host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
      ],
      isolated_tab_finalized: false,
      seen_transitions: 1,
      external_effect_invoked: true,
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  it.each([
    ['throws', host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED],
    ['malformed', host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID],
  ])(
    'records a conservative read-only source action when open %s and finalizes exactly once',
    async (open, blocker) => {
      expect(install({ open })).toBe(true);

      const result = await host
        .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });

      expect(result.private_complete_source_capability).toBeNull();
      expect(result.redacted_receipt).toMatchObject({
        decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
        read_only_source_action_attempted: true,
        read_only_source_action_performed: false,
        isolated_tab_opened: false,
        isolated_tab_finalized: true,
        capability_issued: false,
        external_effect_possible_or_unknown: true,
        blocker_codes: [blocker],
      });
      expect(
        host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
          result.redacted_receipt,
        ),
      ).toEqual({ ok: true, reason: null });
    },
  );

  it('rejects caller data on the zero-argument production export before runtime use', async () => {
    expect(install()).toBe(true);

    const result = await (host.qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce as any)({
      url: 'caller-controlled',
    });

    expect(result.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
    ]);
    const untouched = await host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
    expect(untouched.redacted_receipt.decision).toBe(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
    );
  });
});

describe('historical catch-up pilot source selection', () => {
  it('keeps ordinary_recent_v1 behavior and payload shape unchanged', async () => {
    expect(install()).toBe(true);
    const ordinary = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: Date.now(),
    });
    const ordinaryPayload = host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(
      ordinary.private_complete_source_capability,
    );

    expect(ordinary.redacted_receipt.decision).toBe(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY,
    );
    expect(Object.keys(ordinaryPayload ?? {})).toEqual(
      host.WELCOME_AUDIO_IAB_SEMANTIC_COMPLETE_SOURCE_PAYLOAD_FIELDS,
    );
    expect(ordinaryPayload).not.toHaveProperty('selection_policy');
    expect(ordinaryPayload).not.toHaveProperty('age_evidence_raw');
    expect(ordinaryPayload).not.toHaveProperty('age_evidence_kind');
    expect(ordinaryPayload).not.toHaveProperty('age_bucket');
    expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);

    expect(install({
      observation:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_8D,
    })).toBe(true);
    const historicalLabelOnOrdinaryRoute = await host
      .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
    expect(historicalLabelOnOrdinaryRoute.private_complete_source_capability).toBeNull();
    expect(historicalLabelOnOrdinaryRoute.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID,
    ]);
  });

  it('qualifies only the historical policy pair grammar on its separate route', async () => {
    expect(install({
      qualification:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
          .HISTORICAL_EXACT_TWO_PAIRS,
    })).toBe(true);
    const historical = await host
      .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnceForTest({
        now_ms: NOW,
      });
    expect(historical.redacted_receipt).toMatchObject({
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
      blocker_codes: [],
    });
    expect(
      host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
        historical.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);

    expect(install()).toBe(true);
    const ordinaryLabelsOnHistoricalRoute = await host
      .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnceForTest({
        now_ms: NOW,
      });
    expect(ordinaryLabelsOnHistoricalRoute.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
    ]);
  });

  it.each([
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_8D,
      '8d',
      'displayed_day',
      8,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_30D,
      '30d',
      'displayed_day',
      30,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_1W,
      '1w',
      'coarse_week',
      1,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_4W,
      '4w',
      'coarse_week',
      4,
    ],
  ])('admits explicit historical boundary label %s without claiming chronology', async (
    scenario,
    ageEvidenceRaw,
    ageEvidenceKind,
    ageBucket,
  ) => {
    expect(install({ observation: scenario })).toBe(true);
    const result = await host
      .observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnceForTest({
        now_ms: Date.now(),
      });

    expect(result.redacted_receipt.decision).toBe(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY,
    );
    expect(
      host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(result.redacted_receipt),
    ).toEqual({ ok: true, reason: null });
    expect(JSON.stringify(result.redacted_receipt)).not.toContain('private_candidate');
    const payload = host
      .consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest(
        result.private_complete_source_capability,
      );
    expect(Object.keys(payload ?? {})).toEqual(
      host.WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_COMPLETE_SOURCE_PAYLOAD_FIELDS_V2,
    );
    expect(payload).toMatchObject({
      source_contract_version:
        host.WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_CONTRACT_VERSION_V2,
      source_mission_id: host.WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_MISSION_ID,
      selection_policy:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_SELECTION_POLICY.HISTORICAL_CATCHUP_PILOT_V1,
      visible_time_bucket_utf8: ageEvidenceRaw,
      age_evidence_raw: ageEvidenceRaw,
      age_evidence_kind: ageEvidenceKind,
      age_bucket: ageBucket,
      relationship_binding: 'follows_owner',
      actual_elapsed_age_claimed: false,
      campaign_membership_claimed: false,
    });
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Reflect.set(payload as object, 'age_bucket', 999)).toBe(false);
    expect(
      host.consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest(
        result.private_complete_source_capability,
      ),
    ).toBeNull();
  });

  it.each([
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_7D,
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_31D,
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_5W,
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_1WK,
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_4WKS,
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
      .HISTORICAL_8_DIA_UNACCENTED,
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
      .HISTORICAL_8_DIAS_UNACCENTED,
    host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_AMBIGUOUS,
  ])('rejects out-of-policy or ambiguous historical label %s', async (scenario) => {
    expect(install({ observation: scenario })).toBe(true);
    const result = await host
      .observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnceForTest({
        now_ms: NOW,
      });

    expect(result.private_complete_source_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID,
    ]);
  });

  it('still requires a current visible follows-owner relationship', async () => {
    expect(install({
      observation: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
        .HISTORICAL_RELATIONSHIP_UNKNOWN,
    })).toBe(true);
    const result = await host
      .observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnceForTest({
        now_ms: NOW,
      });

    expect(result.private_complete_source_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RELATIONSHIP_INVALID,
    ]);
  });

  it('keeps policy, age, and relationship outside productive caller control', async () => {
    const qualification = await host
      .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnce({
        selection_policy: 'historical_catchup_pilot_v1',
      });
    const observations = await Promise.all([
      host.observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnce({
        visible_time_bucket_utf8: '8d',
      }),
      host.observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnce({
        relationship_binding: 'follows_owner',
      }),
      host.observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnce({
        age_evidence_raw: '8d',
        age_evidence_kind: 'displayed_day',
        age_bucket: 8,
      }),
    ]);

    expect(qualification.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
    ]);
    for (const observation of observations) {
      expect(observation.private_complete_source_capability).toBeNull();
      expect(observation.redacted_receipt.blocker_codes).toEqual([
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
      ]);
    }
  });

  it('burns capabilities on every ordinary/historical family mismatch', async () => {
    expect(install({
      observation:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_8D,
    })).toBe(true);
    const historical = await host
      .observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnceForTest({
        now_ms: Date.now(),
      });
    expect(host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(
      historical.private_complete_source_capability,
    )).toBeNull();
    expect(host.consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest(
      historical.private_complete_source_capability,
    )).toBeNull();
    expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);

    expect(install()).toBe(true);
    const ordinary = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: Date.now(),
    });
    expect(host.consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest(
      ordinary.private_complete_source_capability,
    )).toBeNull();
    expect(host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(
      ordinary.private_complete_source_capability,
    )).toBeNull();
  });
});

describe('IAB semantic complete candidate observation', () => {
  it('issues one opaque capability only after complete binding and exact finalization', async () => {
    expect(install()).toBe(true);

    const result = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: Date.now(),
    });

    expect(result.private_complete_source_capability).not.toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY,
      rows_scanned: 8,
      candidates_qualified: 1,
      notification_profile_bound: true,
      profile_thread_bound: true,
      owner_account_bound: true,
      relationship_bound: true,
      preopen_unread_explicit_none: true,
      seen_transition_absent: true,
      prior_welcome_audio_explicit_none: true,
      prior_welcome_attempt_explicit_none: true,
      dedupe_clear: true,
      composer_visible: true,
      attachment_control_visible_and_usable: true,
      challenge_or_error_absent: true,
      threads_opened: 1,
      read_only_source_action_attempted: true,
      read_only_source_action_performed: true,
      external_effect_possible_or_unknown: false,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      capability_issued: true,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(
      host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    const serializedReceipt = JSON.stringify(result.redacted_receipt);
    for (const forbidden of ['private_candidate', 'private-thread', 'private-owner']) {
      expect(serializedReceipt).not.toContain(forbidden);
    }
  });

  it('consumes once, returns the exact stable private payload, and does not renew expiry', async () => {
    expect(install()).toBe(true);
    const now = Date.now();
    const result = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: now,
    });
    const capability = result.private_complete_source_capability;

    const payload = host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(
      capability,
    );

    expect(Object.keys(payload ?? {})).toEqual(
      host.WELCOME_AUDIO_IAB_SEMANTIC_COMPLETE_SOURCE_PAYLOAD_FIELDS,
    );
    expect(payload).toMatchObject({
      source_contract_version: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION,
      source_backend: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
      source_mission_id: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_MISSION_ID,
      source_row_ordinal: 1,
      notification_profile_binding: 'exact',
      profile_thread_binding: 'exact',
      owner_account_binding: 'exact',
      relationship_binding: 'follows_owner',
      preopen_unread_inbound: 'explicit_none',
      seen_transition: 'absent',
      prior_welcome_audio: 'explicit_none',
      prior_welcome_attempt: 'explicit_none',
      dedupe_status: 'clear',
      composer_status: 'visible',
      attachment_control_status: 'visible_and_usable',
      challenge_or_error_status: 'absent',
      isolated_tab_finalized: 'exactly_once',
    });
    expect(Date.parse(payload?.source_expires_at ?? '') - Date.parse(
      payload?.source_observed_at ?? '',
    )).toBe(host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_CAPABILITY_TTL_MS);
    expect(
      host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(capability),
    ).toBeNull();
  });

  it('is nonserializable, nonforgeable, nonclone-admitting, and burns stale state first', async () => {
    expect(install()).toBe(true);
    const result = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: Date.now() - host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_CAPABILITY_TTL_MS,
    });
    const capability = result.private_complete_source_capability;

    expect(() => JSON.stringify(capability)).toThrow('not_serializable');
    expect(Object.keys(capability ?? {})).toEqual(['clone_guard']);
    let cloneError: unknown = null;
    try {
      structuredClone(capability);
    } catch (error) {
      cloneError = error;
    }
    expect(cloneError).toBeInstanceOf(Error);
    expect(String((cloneError as Error).message)).not.toContain('private_candidate');
    expect(host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest({})).toBeNull();
    expect(host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest({
      ...(capability as object),
    })).toBeNull();
    expect(
      host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(capability),
    ).toBeNull();
    expect(
      host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(capability),
    ).toBeNull();
  });

  it('product consumer rejects and burns a ForTest-minted capability', async () => {
    expect(install()).toBe(true);
    const result = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: Date.now(),
    });
    const capability = result.private_complete_source_capability;

    expect(
      host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce(capability),
    ).toBeNull();
    expect(
      host.consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(capability),
    ).toBeNull();
  });

  it.each([
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_PRESENT,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PREOPEN_UNREAD_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_UNKNOWN,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PREOPEN_UNREAD_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.SEEN_TRANSITION,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
      true,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.THREAD_NOT_OPENED,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.BINDING_INCOMPLETE,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.RELATIONSHIP_UNKNOWN,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RELATIONSHIP_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.PRIOR_AUDIO_PRESENT,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PRIOR_WELCOME_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.PRIOR_ATTEMPT_UNKNOWN,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PRIOR_WELCOME_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.DEDUPE_UNKNOWN,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.DEDUPE_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.COMPOSER_MISSING,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPOSER_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.ATTACHMENT_MISSING,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ATTACHMENT_CONTROL_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.CHALLENGE,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.REPORT_PROXY,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
    ],
    [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.ACTION_THROWS,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED,
    ],
  ])('blocks hostile observation scenario %s and never issues capability', async (
    scenario,
    blocker,
    externalEffectInvoked = false,
  ) => {
    const observed = await observationBlocker(scenario);

    expect(observed.result.private_complete_source_capability).toBeNull();
    expect(observed.blocker).toBe(blocker);
    expect(observed.result.redacted_receipt).toMatchObject({
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
      candidates_qualified: 0,
      capability_issued: false,
      external_effect_invoked: externalEffectInvoked,
      isolated_tab_finalized: true,
    });
    expect(
      host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
        observed.result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  it('preserves exact rejected observation progress and possible Seen effects', async () => {
    const capture = async (observation: string) => {
      expect(install({ observation })).toBe(true);
      const result = await host
        .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };

    const threadNotOpened = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.THREAD_NOT_OPENED,
    );
    expect(threadNotOpened).toMatchObject({
      rows_scanned: 8,
      threads_opened: 0,
      seen_transition_absent: true,
      external_effect_invoked: false,
    });

    const bindingIncomplete = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.BINDING_INCOMPLETE,
    );
    expect(bindingIncomplete).toMatchObject({
      rows_scanned: 8,
      threads_opened: 1,
      notification_profile_bound: true,
      profile_thread_bound: false,
      owner_account_bound: true,
      external_effect_invoked: false,
    });

    const seen = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.SEEN_TRANSITION,
    );
    expect(seen).toMatchObject({
      rows_scanned: 8,
      threads_opened: 1,
      seen_transition_absent: false,
      external_effect_invoked: true,
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
      ],
    });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...seen,
      read_only_source_action_performed: false,
    })).toMatchObject({ ok: false });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...seen,
      external_effect_invoked: false,
    })).toMatchObject({ ok: false });

    const rowCap = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS,
    );
    expect(rowCap).toMatchObject({
      rows_scanned: 9,
      threads_opened: 1,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED],
    });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...rowCap,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID],
    })).toMatchObject({ ok: false });
  });

  it('applies the conservative unread/thread/Seen cross-product', async () => {
    const capture = async (observation: string) => {
      expect(install({ observation })).toBe(true);
      const result = await host
        .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };

    const unreadWithoutOpen = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_PRESENT,
    );
    expect(unreadWithoutOpen).toMatchObject({
      threads_opened: 0,
      seen_transition_absent: true,
      seen_transition_observed: false,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: false,
    });

    for (const observation of [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
        .UNREAD_PRESENT_THREAD_OPENED,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
        .UNREAD_UNKNOWN_THREAD_OPENED,
    ]) {
      const unsafeOpen = await capture(observation);
      expect(unsafeOpen).toMatchObject({
        threads_opened: 1,
        seen_transition_absent: false,
        seen_transition_observed: false,
        external_effect_invoked: false,
        external_effect_possible_or_unknown: true,
        blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PREOPEN_UNREAD_INVALID],
      });
      expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(unsafeOpen))
        .toEqual({ ok: true, reason: null });
    }

    const seenUnknown = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.SEEN_UNKNOWN,
    );
    expect(seenUnknown).toMatchObject({
      threads_opened: 1,
      seen_transition_absent: false,
      seen_transition_observed: false,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: true,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN],
    });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(seenUnknown))
      .toEqual({ ok: true, reason: null });

    const multipleThreads = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.THREAD_MULTIPLE,
    );
    expect(multipleThreads).toMatchObject({
      threads_opened: 2,
      seen_transition_absent: false,
      external_effect_possible_or_unknown: true,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID],
    });
  });

  it('closes the candidate REPORT_INVALID matrix for compound invalid reports', async () => {
    const capture = async (observation: string) => {
      expect(install({ observation })).toBe(true);
      const result = await host
        .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };

    const compoundInvalid = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT,
    );
    expect(compoundInvalid).toMatchObject({
      rows_scanned: 9,
      threads_opened: 0,
      challenge_or_error_absent: false,
      seen_transition_absent: false,
      external_effect_possible_or_unknown: true,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID],
    });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(compoundInvalid))
      .toEqual({ ok: true, reason: null });

    const rowCap = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS,
    );
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...rowCap,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID],
    })).toMatchObject({ ok: false });

    const ready = await capture(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.EXACT_CANDIDATE,
    );
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...ready,
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
      candidates_qualified: 0,
      capability_issued: false,
      seen_transition_absent: false,
      external_effect_possible_or_unknown: true,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID],
    })).toMatchObject({ ok: false });
  });

  it('accepts every emitted candidate invalid-report marker and rejects its inverse', async () => {
    const invalidScenarios = [
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT,
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.REPORT_PROXY,
    ];

    for (const observation of invalidScenarios) {
      for (const finalize of ['exact', 'invalid']) {
        expect(install({ observation, finalize })).toBe(true);
        const result = await host
          .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
        expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
        expect(result.redacted_receipt).toMatchObject({
          decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
          candidates_qualified: 0,
          challenge_or_error_absent: false,
          seen_transition_absent: false,
          isolated_tab_finalized: finalize === 'exact',
          capability_issued: false,
          external_effect_possible_or_unknown: true,
          blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID],
        });
        expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
          result.redacted_receipt,
        )).toEqual({ ok: true, reason: null });
        expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
          ...result.redacted_receipt,
          challenge_or_error_absent: true,
        })).toMatchObject({ ok: false });
      }
    }
  });

  it('rejects every unreachable observation thread/unread/Seen/effect combination', async () => {
    const capture = async (observation: string) => {
      expect(install({ observation })).toBe(true);
      const result = await host
        .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };
    const mutations = [
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_PRESENT,
        ),
        patch: { threads_opened: 1 },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.THREAD_NOT_OPENED,
        ),
        patch: { threads_opened: 2 },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.THREAD_MULTIPLE,
        ),
        patch: {
          seen_transition_absent: true,
          external_effect_possible_or_unknown: false,
        },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.SEEN_UNKNOWN,
        ),
        patch: { external_effect_possible_or_unknown: false },
      },
      {
        receipt: await capture(
          host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.REPORT_PROXY,
        ),
        patch: {
          seen_transition_absent: true,
          external_effect_possible_or_unknown: false,
        },
      },
    ];
    for (const entry of mutations) {
      expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
        ...entry.receipt,
        ...entry.patch,
      })).toMatchObject({ ok: false });
    }
  });

  it('keeps the primary observation violation when finalization also fails', async () => {
    expect(install({
      observation:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.SEEN_TRANSITION,
      finalize: 'invalid',
    })).toBe(true);

    const result = await host
      .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
      ],
      isolated_tab_finalized: false,
      rows_scanned: 8,
      threads_opened: 1,
      seen_transition_absent: false,
      external_effect_invoked: true,
    });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  it.each([
    ['throws', host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED],
    ['malformed', host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID],
  ])(
    'records a conservative read-only source action when open %s and finalizes exactly once',
    async (open, blocker) => {
      expect(install({ open })).toBe(true);

      const result = await host
        .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });

      expect(result.private_complete_source_capability).toBeNull();
      expect(result.redacted_receipt).toMatchObject({
        decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
        read_only_source_action_attempted: true,
        read_only_source_action_performed: false,
        isolated_tab_opened: false,
        isolated_tab_finalized: true,
        capability_issued: false,
        external_effect_possible_or_unknown: true,
        blocker_codes: [blocker],
      });
      expect(
        host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
          result.redacted_receipt,
        ),
      ).toEqual({ ok: true, reason: null });
    },
  );

  it.each(['invalid', 'throws'])('requires exact finalization before capability issue: %s', async (
    finalize,
  ) => {
    expect(install({ finalize })).toBe(true);

    const result = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: NOW,
    });

    expect(result.private_complete_source_capability).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
      candidates_qualified: 0,
      isolated_tab_finalized: false,
      capability_issued: false,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID],
    });
    expect(
      host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  it('rejects caller facts on the production observation export before runtime use', async () => {
    expect(install()).toBe(true);

    const result = await (host.observeWelcomeAudioIabSemanticFollowerCandidateOnce as any)({
      identity: 'caller-controlled',
      thread: 'caller-controlled',
      owner: true,
      now_ms: NOW,
    });

    expect(result.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
    ]);
    const untouched = await host.observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
      now_ms: NOW,
    });
    expect(untouched.redacted_receipt.decision).toBe(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY,
    );
  });
});

describe('runtime seam and receipt hardening', () => {
  it('validates every emitted receipt across the full synthetic action cross-product', async () => {
    for (const qualification of Object.values(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST,
    )) {
      for (const open of ['exact', 'throws', 'malformed']) {
        for (const finalize of ['exact', 'invalid', 'throws']) {
          expect(install({ open, qualification, finalize })).toBe(true);
          const result = await host
            .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
          expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
            result.redacted_receipt,
          )).toEqual({ ok: true, reason: null });
          expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
        }
      }
    }

    for (const observation of Object.values(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST,
    )) {
      for (const open of ['exact', 'throws', 'malformed']) {
        for (const finalize of ['exact', 'invalid', 'throws']) {
          expect(install({ open, observation, finalize })).toBe(true);
          const result = await host
            .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
          expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
            result.redacted_receipt,
          )).toEqual({ ok: true, reason: null });
          expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
        }
      }
    }
  });

  it('distinguishes open attempts from performed source actions and marks post-open throws unknown', async () => {
    expect(install({
      qualification:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ACTION_THROWS,
      finalize: 'invalid',
    })).toBe(true);
    const qualification = await host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
    expect(qualification.redacted_receipt).toMatchObject({
      read_only_source_action_attempted: true,
      read_only_source_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: false,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: true,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED],
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      qualification.redacted_receipt,
    )).toEqual({ ok: true, reason: null });

    expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
    expect(install({
      observation:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.ACTION_THROWS,
      finalize: 'invalid',
    })).toBe(true);
    const observation = await host
      .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
    expect(observation.redacted_receipt).toMatchObject({
      read_only_source_action_attempted: true,
      read_only_source_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: false,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: true,
      blocker_codes: [host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED],
    });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
      observation.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  it('keeps the ForTest facade on an internal seam and leaves both globals untouched', async () => {
    const slot = Symbol.for(host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_SLOT);
    const alias = host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_ALIAS;
    const beforeSlot = Object.getOwnPropertyDescriptor(globalThis, slot);
    const beforeAlias = Object.getOwnPropertyDescriptor(globalThis, alias);

    expect(install()).toBe(true);
    expect(Object.getOwnPropertyDescriptor(globalThis, slot)).toEqual(beforeSlot);
    expect(Object.getOwnPropertyDescriptor(globalThis, alias)).toEqual(beforeAlias);

    const synthetic = await host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
    expect(synthetic.redacted_receipt.decision).toBe(
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
    );
    const production = await host.qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce();
    expect(production.redacted_receipt.blocker_codes).toEqual([
      host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
    ]);
  });

  it('hard-codes non-writable, non-configurable, non-enumerable production descriptors', () => {
    const source = readFileSync(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs',
      import.meta.url,
    ), 'utf8');

    for (const descriptor of ['slotDescriptor', 'aliasDescriptor']) {
      expect(source).toContain(`${descriptor}.writable !== false`);
      expect(source).toContain(`${descriptor}.configurable !== false`);
      expect(source).toContain(`${descriptor}.enumerable !== false`);
    }
  });

  it('keeps production and ForTest capability registries disjoint with cross-family burn', () => {
    const source = readFileSync(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs',
      import.meta.url,
    ), 'utf8');

    expect(source).toContain('const PRODUCTION_COMPLETE_SOURCE_CAPABILITY_STATES = new WeakMap()');
    expect(source).toContain('const TEST_COMPLETE_SOURCE_CAPABILITY_STATES = new WeakMap()');
    expect(source).toMatch(
      /const testState = TEST_COMPLETE_SOURCE_CAPABILITY_STATES\.get\(capability\);[\s\S]*?testState\.consumed = true;/u,
    );
    expect(source).toMatch(
      /const productionState = PRODUCTION_COMPLETE_SOURCE_CAPABILITY_STATES\.get\(capability\);[\s\S]*?productionState\.consumed = true;/u,
    );
    expect(source.match(/const privateCompleteSourceCapability = opaqueCapability\(\);/gu))
      .toHaveLength(1);
  });

  it('allows one exact internal ForTest facade and resets it without globals', () => {
    expect(install()).toBe(true);
    expect(install()).toBe(false);
    expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
    expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(false);
    expect((host.installWelcomeAudioIabSemanticRuntimeFacadeForTest as any)({
      open_scenario: 'exact',
      qualification_scenario: 'exact_two_pairs',
      observation_scenario: 'exact_candidate',
      finalize_scenario: 'exact',
      driver: {},
    })).toBe(false);
  });

  it('receipt validators reject extra private fields, proxies, and decision tampering', async () => {
    expect(install()).toBe(true);
    const qualification = await host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
    host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
    expect(install()).toBe(true);
    const observation = await host
      .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });

    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...qualification.redacted_receipt,
      private_identity: 'forbidden',
    })).toEqual({ ok: false, reason: 'receipt_shape_invalid' });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      new Proxy(qualification.redacted_receipt, {}),
    )).toEqual({ ok: false, reason: 'receipt_shape_invalid' });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...observation.redacted_receipt,
      capability_issued: false,
    })).toEqual({ ok: false, reason: 'receipt_decision_invalid' });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...observation.redacted_receipt,
      rows_scanned: 9,
    })).toMatchObject({ ok: false });
  });

  it('binds qualification blockers to their reachable aggregate states', async () => {
    const capture = async ({ qualification, finalize = 'exact' }: {
      qualification: string;
      finalize?: string;
    }) => {
      expect(install({ qualification, finalize })).toBe(true);
      const result = await host
        .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };
    const challenge = await capture({
      qualification:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.CHALLENGE,
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...challenge,
      challenge_or_error_absent: true,
    })).toMatchObject({ ok: false });

    const onePair = await capture({
      qualification:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ONE_PAIR,
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...onePair,
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
    })).toMatchObject({ ok: false });

    const duplicate = await capture({
      qualification:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.DUPLICATE_PAIR,
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...duplicate,
      distinct_pairs_proven: true,
    })).toMatchObject({ ok: false });

    const finalize = await capture({
      qualification:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.EXACT_TWO_PAIRS,
      finalize: 'invalid',
    });
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...finalize,
      isolated_tab_finalized: true,
    })).toMatchObject({ ok: false });
  });

  it('binds observation blockers to their reachable aggregate states', async () => {
    const capture = async ({ observation, finalize = 'exact' }: {
      observation: string;
      finalize?: string;
    }) => {
      expect(install({ observation, finalize })).toBe(true);
      const result = await host
        .observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({ now_ms: NOW });
      expect(host.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
      return result.redacted_receipt;
    };
    const cases = [
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .UNREAD_PRESENT,
        patch: { preopen_unread_explicit_none: true },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .THREAD_NOT_OPENED,
        patch: { threads_opened: 1 },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .SEEN_TRANSITION,
        patch: {
          seen_transition_absent: true,
          seen_transition_observed: false,
          external_effect_invoked: false,
          external_effect_possible_or_unknown: false,
        },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .RELATIONSHIP_UNKNOWN,
        patch: { relationship_bound: true },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .PRIOR_AUDIO_PRESENT,
        patch: { prior_welcome_audio_explicit_none: true },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .DEDUPE_UNKNOWN,
        patch: { dedupe_clear: true },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .COMPOSER_MISSING,
        patch: { composer_visible: true },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .ATTACHMENT_MISSING,
        patch: { attachment_control_visible_and_usable: true },
      },
      {
        scenario: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .CHALLENGE,
        patch: { challenge_or_error_absent: true },
      },
    ];
    for (const entry of cases) {
      const receipt = await capture({ observation: entry.scenario });
      expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
        ...receipt,
        ...entry.patch,
      })).toMatchObject({ ok: false });
    }

    const finalize = await capture({
      observation:
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.EXACT_CANDIDATE,
      finalize: 'invalid',
    });
    expect(host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt({
      ...finalize,
      isolated_tab_finalized: true,
    })).toMatchObject({ ok: false });
  });

  it('rejects inherited iterators on receipt arrays without invoking them', async () => {
    const receipt = await (host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce as any)({ forbidden: true });
    const hostilePrototype = Object.create(Array.prototype);
    Object.defineProperty(hostilePrototype, Symbol.iterator, {
      get: () => {
        throw new TypeError('receipt_iterator_must_not_run');
      },
    });
    const hostileBlockers = [...receipt.redacted_receipt.blocker_codes];
    Object.setPrototypeOf(hostileBlockers, hostilePrototype);

    expect(() => host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...receipt.redacted_receipt,
      blocker_codes: hostileBlockers,
    })).not.toThrow();
    expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
      ...receipt.redacted_receipt,
      blocker_codes: hostileBlockers,
    })).toMatchObject({ ok: false });
  });

  it('keeps both public receipt validators total on revoked and hostile object inputs', async () => {
    const qualification = await (host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce as any)({ forbidden: true });
    const observation = await (host
      .observeWelcomeAudioIabSemanticFollowerCandidateOnce as any)({ forbidden: true });
    const cases = [
      {
        receipt: qualification.redacted_receipt,
        validate: host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt,
      },
      {
        receipt: observation.redacted_receipt,
        validate: host.validateWelcomeAudioIabSemanticFollowerCandidateReceipt,
      },
    ];

    for (const entry of cases) {
      const revoked = Proxy.revocable({ ...entry.receipt }, {});
      revoked.revoke();
      expect(() => entry.validate(revoked.proxy)).not.toThrow();
      expect(entry.validate(revoked.proxy)).toEqual({
        ok: false,
        reason: 'receipt_shape_invalid',
      });

      let hostileTrapCalls = 0;
      const hostileProxy = new Proxy({ ...entry.receipt }, {
        getPrototypeOf: () => {
          hostileTrapCalls += 1;
          throw new TypeError('hostile_proxy_trap_must_not_run');
        },
        ownKeys: () => {
          hostileTrapCalls += 1;
          throw new TypeError('hostile_proxy_trap_must_not_run');
        },
      });
      expect(() => entry.validate(hostileProxy)).not.toThrow();
      expect(entry.validate(hostileProxy)).toMatchObject({ ok: false });
      expect(hostileTrapCalls).toBe(0);

      let receiptGetterCalls = 0;
      const accessorReceipt = { ...entry.receipt };
      Object.defineProperty(accessorReceipt, 'decision', {
        configurable: true,
        enumerable: true,
        get: () => {
          receiptGetterCalls += 1;
          throw new TypeError('receipt_getter_must_not_run');
        },
      });
      expect(() => entry.validate(accessorReceipt)).not.toThrow();
      expect(entry.validate(accessorReceipt)).toMatchObject({ ok: false });
      expect(receiptGetterCalls).toBe(0);

      const wrongPrototype = { ...entry.receipt };
      Object.setPrototypeOf(wrongPrototype, null);
      expect(() => entry.validate(wrongPrototype)).not.toThrow();
      expect(entry.validate(wrongPrototype)).toMatchObject({ ok: false });
    }
  });

  it('rejects every hostile blocker array shape without getters, traps, or iterators', async () => {
    const source = await (host
      .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce as any)({ forbidden: true });
    const validate = (blockerCodes: unknown) => (
      host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
        ...source.redacted_receipt,
        blocker_codes: blockerCodes,
      })
    );
    const assertTotalReject = (value: unknown) => {
      expect(() => validate(value)).not.toThrow();
      expect(validate(value)).toMatchObject({ ok: false });
    };
    const base = [...source.redacted_receipt.blocker_codes];

    const revoked = Proxy.revocable([...base], {});
    revoked.revoke();
    assertTotalReject(revoked.proxy);

    let proxyTrapCalls = 0;
    assertTotalReject(new Proxy([...base], {
      getPrototypeOf: () => {
        proxyTrapCalls += 1;
        throw new TypeError('array_proxy_trap_must_not_run');
      },
    }));
    expect(proxyTrapCalls).toBe(0);

    class BlockerArraySubclass extends Array {}
    assertTotalReject(new BlockerArraySubclass(...base));

    let hostileGetterCalls = 0;
    const accessorIndex: unknown[] = [];
    Object.defineProperty(accessorIndex, '0', {
      configurable: true,
      enumerable: true,
      get: () => {
        hostileGetterCalls += 1;
        throw new TypeError('array_index_getter_must_not_run');
      },
    });
    assertTotalReject(accessorIndex);

    const poisonedIterator = [...base];
    Object.defineProperty(poisonedIterator, Symbol.iterator, {
      configurable: true,
      get: () => {
        hostileGetterCalls += 1;
        throw new TypeError('array_iterator_getter_must_not_run');
      },
    });
    assertTotalReject(poisonedIterator);
    expect(hostileGetterCalls).toBe(0);

    assertTotalReject(new Array(1));
    const extraProperty = [...base] as any;
    extraProperty.extra = true;
    assertTotalReject(extraProperty);
    const symbolProperty = [...base] as any;
    symbolProperty[Symbol('extra')] = true;
    assertTotalReject(symbolProperty);
    const wrongPrototype = [...base];
    Object.setPrototypeOf(wrongPrototype, Object.create(Array.prototype));
    assertTotalReject(wrongPrototype);
  });

  it('keeps production exports noninjectable while all injection hooks end in ForTest', () => {
    const productionNames = [
      'qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce',
      'observeWelcomeAudioIabSemanticFollowerCandidateOnce',
      'consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce',
    ];
    const injectableNames = Object.keys(host).filter((name) => /install|reset|inspect/u.test(name));

    expect(productionNames.every((name) => typeof (host as any)[name] === 'function')).toBe(true);
    expect(injectableNames.every((name) => name.endsWith('ForTest'))).toBe(true);
  });
});

describe('qualification receipt production-emitter compatibility witnesses', () => {
  it('validates representative production emissions and rejects deterministic safety forgeries',
    async () => {
      // NARROW_PRODUCTION_EMITTER_COMPATIBILITY_CONTRACT_BEGIN
      const receiptFields = [
        ...host.WELCOME_AUDIO_IAB_SEMANTIC_QUALIFICATION_RECEIPT_FIELDS,
      ];
      const productionEmit = host.qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce;
      const forTestEmit = host
        .qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest;

      expect(productionEmit).not.toBe(forTestEmit);
      expect(productionEmit.name.endsWith('ForTest')).toBe(false);

      const encodeCanonicalValue = (value: unknown): unknown => {
        if (Array.isArray(value)) {
          return ['array', value.map((item) => encodeCanonicalValue(item))];
        }
        if (value === null) return ['null'];
        if (typeof value === 'number') {
          if (Number.isNaN(value)) return ['number', 'nan'];
          if (value === Number.POSITIVE_INFINITY) return ['number', 'positive_infinity'];
          if (value === Number.NEGATIVE_INFINITY) return ['number', 'negative_infinity'];
          if (Object.is(value, -0)) return ['number', 'negative_zero'];
        }
        return [typeof value, value];
      };
      const canonicalReceiptKey = (value: unknown) => {
        try {
          if (
            value === null
            || typeof value !== 'object'
            || Array.isArray(value)
            || nodeUtilTypes.isProxy(value)
            || Object.getPrototypeOf(value) !== Object.prototype
          ) throw new TypeError('representative_receipt_shape_invalid');
          const descriptors = Object.getOwnPropertyDescriptors(value);
          const ownKeys = Reflect.ownKeys(descriptors);
          if (
            ownKeys.length !== receiptFields.length
            || ownKeys.some((key) => typeof key !== 'string' || !receiptFields.includes(key))
            || receiptFields.some((field) => {
              const descriptor = descriptors[field];
              return !descriptor
                || !Object.hasOwn(descriptor, 'value')
                || descriptor.get !== undefined
                || descriptor.set !== undefined;
            })
          ) throw new TypeError('representative_receipt_descriptor_invalid');
          return JSON.stringify(receiptFields.map((field) => [
            field,
            encodeCanonicalValue(descriptors[field].value),
          ]));
        } catch (error) {
          if (error instanceof TypeError) throw error;
          throw new TypeError('representative_receipt_canonicalization_failed');
        }
      };
      const reorderedClone = (
        receipt: Record<string, unknown>,
        enumerable: boolean,
      ) => {
        const clone: Record<string, unknown> = {};
        for (const field of [...receiptFields].reverse()) {
          Object.defineProperty(clone, field, {
            value: receipt[field],
            enumerable,
            writable: false,
            configurable: false,
          });
        }
        return clone;
      };

      const provenance: string[] = [];
      const representativeReceipts: Record<string, unknown>[] = [];
      const collectProductionReceipt = (result: {
        redacted_receipt: Record<string, unknown>;
      }) => {
        provenance.push('production_entrypoint');
        representativeReceipts.push(result.redacted_receipt);
        return result.redacted_receipt;
      };

      const callerInputReceipt = collectProductionReceipt(await (productionEmit as any)({
        forbidden: true,
      }));
      const runtimeMissingReceipt = collectProductionReceipt(await productionEmit());

      const makePair = (ordinal: number, identityToken: string) => Object.freeze({
        row_ordinal: ordinal,
        notification_identity_utf8: `synthetic_candidate_${identityToken}`,
        profile_identity_utf8: `synthetic_candidate_${identityToken}`,
        notification_reference: `synthetic-notification-${ordinal}-${identityToken}`,
        profile_reference: `synthetic-profile-${ordinal}-${identityToken}`,
        visible_time_bucket_utf8: '3d',
        notification_profile_binding: 'exact',
        follower_event_binding: 'started_following_owner',
      });
      const exactPairs = Object.freeze([
        makePair(1, 'one'),
        makePair(2, 'two'),
      ]);
      const buildReport = ({
        rows,
        threads,
        seen,
        challenge = 'absent',
        pairs = exactPairs,
      }: {
        rows: unknown;
        threads: unknown;
        seen: unknown;
        challenge?: unknown;
        pairs?: readonly unknown[];
      }) => Object.freeze({
        rows_scanned: rows,
        thread_open_count: threads,
        seen_transition_count: seen,
        challenge_or_error_status: challenge,
        pairs,
      });

      let currentReport: Readonly<Record<string, unknown>> = Object.freeze({});
      let finalizeValid = true;
      const runtime = Object.freeze({
        brand: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_BRAND,
        open_isolated_instagram_tab_once: async () => Object.freeze({
          isolated_tab_opened: true,
          source_backend: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
        }),
        qualify_notification_profile_pairs_once: async () => currentReport,
        observe_follower_candidate_once: async () => null,
        finalize_isolated_tab_once: async () => Object.freeze({
          isolated_tab_finalized: finalizeValid,
          finalize_count: 1,
        }),
      });
      const slot = Symbol.for(host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_SLOT);
      const alias = host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_ALIAS;
      expect(Object.getOwnPropertyDescriptor(globalThis, slot)).toBeUndefined();
      expect(Object.getOwnPropertyDescriptor(globalThis, alias)).toBeUndefined();
      for (const key of [slot, alias]) {
        Object.defineProperty(globalThis, key, {
          value: runtime,
          writable: false,
          configurable: false,
          enumerable: false,
        });
      }

      const emitReport = async ({
        report,
        finalize = true,
      }: {
        report: Readonly<Record<string, unknown>>;
        finalize?: boolean;
      }) => {
        currentReport = report;
        finalizeValid = finalize;
        return collectProductionReceipt(await productionEmit());
      };
      const exactReport = buildReport({
        rows: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS,
        threads: 0,
        seen: 0,
      });
      const exactReceipt = await emitReport({ report: exactReport });
      const rowCapReceipt = await emitReport({
        report: buildReport({
          rows: Number.MAX_SAFE_INTEGER,
          threads: 0,
          seen: 0,
        }),
      });
      const hugeThreadReceipt = await emitReport({
        report: buildReport({
          rows: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS,
          threads: Number.MAX_SAFE_INTEGER,
          seen: 0,
        }),
      });
      const hugeSeenReceipt = await emitReport({
        report: buildReport({
          rows: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS,
          threads: 0,
          seen: Number.MAX_SAFE_INTEGER,
        }),
      });
      const malformedReportReceipt = await emitReport({ report: Object.freeze({}) });
      const finalizeInvalidReceipt = await emitReport({
        report: exactReport,
        finalize: false,
      });

      expect(representativeReceipts).toHaveLength(8);
      expect(new Set(provenance)).toEqual(new Set(['production_entrypoint']));
      expect(callerInputReceipt.blocker_codes).toEqual([
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
      ]);
      expect(runtimeMissingReceipt.blocker_codes).toEqual([
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
      ]);
      expect(rowCapReceipt.rows_scanned).toBe(Number.MAX_SAFE_INTEGER);
      expect(hugeThreadReceipt.threads_opened).toBe(Number.MAX_SAFE_INTEGER);
      expect(hugeSeenReceipt.seen_transitions).toBe(Number.MAX_SAFE_INTEGER);
      expect(finalizeInvalidReceipt.blocker_codes).toEqual([
        host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID,
      ]);

      for (const receipt of representativeReceipts) {
        expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
          receipt,
        )).toEqual({ ok: true, reason: null });
        const reordered = reorderedClone(receipt, true);
        const nonEnumerable = reorderedClone(receipt, false);
        expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
          reordered,
        )).toEqual({ ok: true, reason: null });
        expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
          nonEnumerable,
        )).toEqual({ ok: true, reason: null });
        expect(canonicalReceiptKey(reordered)).toBe(canonicalReceiptKey(receipt));
        expect(canonicalReceiptKey(nonEnumerable)).toBe(canonicalReceiptKey(receipt));
      }

      const safetyForgeries = [
        { ...exactReceipt, isolated_tab_finalized: false },
        {
          ...exactReceipt,
          blocker_codes: Object.freeze([
            host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
          ]),
        },
        {
          ...rowCapReceipt,
          rows_scanned: host.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS,
        },
        { ...hugeThreadReceipt, external_effect_possible_or_unknown: false },
        { ...hugeSeenReceipt, external_effect_invoked: false },
        { ...runtimeMissingReceipt, read_only_source_action_attempted: true },
        { ...malformedReportReceipt, challenge_or_error_absent: true },
      ];
      for (const forgery of safetyForgeries) {
        expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
          forgery,
        ).ok).toBe(false);
      }

      for (const field of receiptFields) {
        const missingField = { ...exactReceipt };
        delete missingField[field];
        expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
          missingField,
        ).ok).toBe(false);
      }
      expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt({
        ...exactReceipt,
        unexpected_public_field: true,
      }).ok).toBe(false);
      const symbolField = { ...exactReceipt } as Record<PropertyKey, unknown>;
      symbolField[Symbol('unexpected_public_field')] = true;
      expect(host.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
        symbolField,
      ).ok).toBe(false);
      // NARROW_PRODUCTION_EMITTER_COMPATIBILITY_CONTRACT_END
    });
});
