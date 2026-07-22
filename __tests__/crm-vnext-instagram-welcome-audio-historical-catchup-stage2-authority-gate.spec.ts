import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import * as gate from '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs';

const NOW = Date.parse('2026-07-22T15:00:00.000Z');
const EXACT = gate
  .WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST.EXACT;

const build = (overrides: Record<string, unknown> = {}) => (
  gate.buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest(
    overrides,
    { now_ms: NOW },
  )
);

const install = (
  privateAuthority: unknown = build(),
  consumeScenario = EXACT,
) => gate.installWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest({
  private_authority: privateAuthority,
  consume_scenario: consumeScenario,
});

const gateModuleHref = new URL(
  '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
  import.meta.url,
).href;

const runOwnerOnlyEnvironmentLedgerChild = ({
  ledgerPath,
  authority,
  crashAfterClaim = false,
}: {
  ledgerPath: string;
  authority: unknown;
  crashAfterClaim?: boolean;
}) => {
  const childSource = `
    import { closeSync, openSync } from 'node:fs';
    const now = Date.now();
    const ledgerPath = ${JSON.stringify(ledgerPath)};
    const authority = {
      ...${JSON.stringify(authority)},
      issued_at_ms: now,
      expires_at_ms: now + 300000,
    };
    let calls = 0;
    const consume = async (...args) => {
      calls += 1;
      if (args.length !== 0) return null;
      let claimed = false;
      try {
        const descriptor = openSync(ledgerPath, 'wx', 0o600);
        closeSync(descriptor);
        claimed = true;
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
      }
      if (claimed && ${JSON.stringify(crashAfterClaim)}) process.exit(73);
      return claimed
        ? authority
        : Object.freeze({
            ...authority,
            mission_ledger_claimed_once: false,
            prior_mission_ledger_claims: 1,
          });
    };
    const facade = {};
    Object.defineProperties(facade, {
      brand: {
        value: ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND)},
        writable: false, enumerable: false, configurable: false,
      },
      consume_historical_catchup_stage2_authority_once: {
        value: consume, writable: false, enumerable: false, configurable: false,
      },
    });
    Object.freeze(facade);
    Object.defineProperty(globalThis, Symbol.for(${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT)}), {
      value: facade, writable: false, enumerable: false, configurable: false,
    });
    Object.defineProperty(globalThis, ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS)}, {
      value: facade, writable: false, enumerable: false, configurable: false,
    });
    const g = await import(${JSON.stringify(gateModuleHref)});
    const result = await g.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
    process.stdout.write(JSON.stringify({
      calls,
      recognized: result.authority_recognized,
      consumed: result.authority_consumed,
      valid: result.authority_valid,
      blocker: result.blocker_code,
    }));
  `;
  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', childSource],
    { encoding: 'utf8' },
  );
};

afterEach(() => {
  gate.resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest();
  gate.resetWelcomeAudioHistoricalCatchupStage2ApprovalNonceLedgerForTest();
});

describe('CRM Core historical catch-up Stage 2 authority gate', () => {
  it('publishes the exact fixed contract and authority shape', () => {
    expect(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT).toBe(
      'crm-core/historical-catchup-stage2-authority-runtime/v1',
    );
    expect(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS).toBe(
      'crmCoreHistoricalCatchupStage2AuthorityRuntimeV1',
    );
    expect(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND).toBe(
      'crm_core_historical_catchup_stage2_authority_runtime_v1',
    );
    expect(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TTL_MS).toBe(300_000);
    expect(Object.keys(build() as object)).toEqual(
      gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_FIELDS,
    );
    expect(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_FIELDS).toHaveLength(30);
  });

  it('consumes one exact internal authority once and validates its closed attestation', async () => {
    expect(install()).toBe(true);

    const first = await gate
      .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
    expect(first).toEqual({
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: true,
      private_authority: build(),
      blocker_code: null,
    });
    expect(Object.keys(first)).toEqual(
      gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RESULT_FIELDS,
    );
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult(first)).toEqual({
      ok: true,
    });
    expect(gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest()).toEqual({
      installed: true,
      method_call_count: 1,
      mission_ledger_claim_count: 1,
      prior_mission_ledger_claims: 0,
      duplicate_claim_blocked_count: 0,
      successful_return_count: 1,
    });

    const replay = await gate
      .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
    expect(replay).toMatchObject({
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: false,
      private_authority: null,
      blocker_code:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
    });
    expect(gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest()).toEqual({
      installed: true,
      method_call_count: 2,
      mission_ledger_claim_count: 1,
      prior_mission_ledger_claims: 0,
      duplicate_claim_blocked_count: 0,
      successful_return_count: 1,
    });
  });

  it('derives distinct default approval nonces from distinct synthetic approval times', () => {
    const first = gate.buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest(
      {},
      { now_ms: NOW },
    );
    const second = gate.buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest(
      {},
      { now_ms: NOW + 1 },
    );
    expect(first?.approval_instance_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(second?.approval_instance_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first?.approval_instance_sha256).not.toBe(second?.approval_instance_sha256);
  });

  it('keeps the test approval-nonce ledger across facade reset and burns a reinstall', async () => {
    const authority = build();
    expect(install(authority)).toBe(true);
    const first = await gate
      .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
    expect(first.authority_valid).toBe(true);
    expect(gate.resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest()).toBe(true);

    expect(install(authority)).toBe(true);
    const duplicate = await gate
      .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
    expect(duplicate).toEqual({
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: false,
      private_authority: null,
      blocker_code:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
    });
    expect(gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest()).toEqual({
      installed: true,
      method_call_count: 1,
      mission_ledger_claim_count: 0,
      prior_mission_ledger_claims: 1,
      duplicate_claim_blocked_count: 1,
      successful_return_count: 0,
    });

    expect(gate.resetWelcomeAudioHistoricalCatchupStage2ApprovalNonceLedgerForTest()).toBe(true);
    expect(gate.resetWelcomeAudioHistoricalCatchupStage2ApprovalNonceLedgerForTest()).toBe(false);
  });

  it('fails closed on the same environment approval nonce in a second process', () => {
    const root = mkdtempSync(join(tmpdir(), 'crm-core-stage2-ledger-'));
    chmodSync(root, 0o700);
    const ledgerPath = join(root, 'synthetic-approval-nonce.claim');
    try {
      const authority = build({ approval_instance_sha256: '7'.repeat(64) });
      const first = runOwnerOnlyEnvironmentLedgerChild({ ledgerPath, authority });
      expect(first.status).toBe(0);
      expect(JSON.parse(first.stdout)).toMatchObject({
        calls: 1,
        recognized: true,
        consumed: true,
        valid: true,
        blocker: null,
      });
      expect(statSync(ledgerPath).mode & 0o777).toBe(0o600);

      const second = runOwnerOnlyEnvironmentLedgerChild({ ledgerPath, authority });
      expect(second.status).toBe(0);
      expect(JSON.parse(second.stdout)).toEqual({
        calls: 1,
        recognized: true,
        consumed: true,
        valid: false,
        blocker:
          gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves the environment claim across crash-after-claim and blocks the next process', () => {
    const root = mkdtempSync(join(tmpdir(), 'crm-core-stage2-crash-ledger-'));
    chmodSync(root, 0o700);
    const ledgerPath = join(root, 'synthetic-crash-approval-nonce.claim');
    const sourceMarker = join(root, 'source-action.marker');
    try {
      const authority = build({ approval_instance_sha256: '8'.repeat(64) });
      const crashed = runOwnerOnlyEnvironmentLedgerChild({
        ledgerPath,
        authority,
        crashAfterClaim: true,
      });
      expect(crashed.status).toBe(73);
      expect(existsSync(ledgerPath)).toBe(true);
      expect(statSync(ledgerPath).mode & 0o777).toBe(0o600);
      expect(existsSync(sourceMarker)).toBe(false);

      const resumed = runOwnerOnlyEnvironmentLedgerChild({ ledgerPath, authority });
      expect(resumed.status).toBe(0);
      expect(JSON.parse(resumed.stdout)).toEqual({
        calls: 1,
        recognized: true,
        consumed: true,
        valid: false,
        blocker:
          gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
      });
      expect(existsSync(sourceMarker)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects missing runtime and hostile caller input without consuming anything', async () => {
    const missing = await gate
      .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
    expect(missing).toEqual({
      authority_recognized: false,
      authority_consumed: false,
      authority_valid: false,
      private_authority: null,
      blocker_code:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.RUNTIME_INVALID,
    });

    expect(install()).toBe(true);
    const hostileInputs = [
      {},
      { now_ms: NOW, authority: build() },
      { now_ms: 'not-a-number' },
      new Proxy({ now_ms: NOW }, {}),
    ];
    for (const input of hostileInputs) {
      const result = await (
        gate.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest as any
      )(input);
      expect(result.blocker_code).toBe(
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.INPUT_INVALID,
      );
    }
    expect(gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest())
      .toMatchObject({ method_call_count: 0, mission_ledger_claim_count: 0 });
  });

  const invalidAuthorityCases: Array<[string, Record<string, unknown>]> = [
    ['schema', { authority_schema_version: 'wrong' }],
    ['mission', { mission_id: 'wrong' }],
    ['contract', { contract_version: 'wrong' }],
    ['approval', { approval_instance_sha256: 'A'.repeat(64) }],
    ['commit syntax', { approved_central_commit: 'not-a-commit' }],
    ['central commit relation', { observed_central_commit: 'd'.repeat(40) }],
    ['upstream commit relation', { observed_upstream_commit: 'd'.repeat(40) }],
    ['target branch', { target_branch: 'wrong' }],
    ['observed branch', { observed_branch: 'wrong' }],
    ['upstream missing', { upstream_present: false }],
    ['dirty repository', { repository_clean: false }],
    ['mission digest', { mission_contract_sha256: 'd'.repeat(64) }],
    ['next-action digest', { next_action_sha256: 'd'.repeat(64) }],
    ['approved owner anchor syntax', { approved_owner_account_anchor_sha256: 'wrong' }],
    ['owner anchor mismatch', { source_runtime_owner_account_anchor_sha256: 'd'.repeat(64) }],
    ['account binding absent', { source_runtime_account_binding_attested: false }],
    ['backend', { source_backend: 'wrong' }],
    ['selection policy', { selection_policy: 'wrong' }],
    ['command', { command: 'wrong' }],
    ['future issue', { issued_at_ms: NOW + 1, expires_at_ms: NOW + 300_001 }],
    ['expired', { issued_at_ms: NOW - 300_000, expires_at_ms: NOW }],
    ['wrong ttl', { expires_at_ms: NOW + 299_999 }],
    ['row cap', { max_rows_total: 9 }],
    ['traversal count', { exact_distinct_traversals: 1 }],
    ['thread cap', { max_threads: 1 }],
    ['seen cap', { max_seen_transitions: 1 }],
    ['capability count', { capabilities_issued: 1 }],
    ['stage 3', { stage_3_authorized: true }],
    ['send', { send_authorized: true }],
    ['ledger unclaimed', { mission_ledger_claimed_once: false }],
    ['prior ledger claim', { prior_mission_ledger_claims: 1 }],
  ];

  it.each(invalidAuthorityCases)(
    'burns one recognized but invalid authority before source: %s',
    async (_label, overrides) => {
      expect(install(build(overrides))).toBe(true);
      const result = await gate
        .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
      expect(result).toEqual({
        authority_recognized: true,
        authority_consumed: true,
        authority_valid: false,
        private_authority: null,
        blocker_code:
          gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
      });
      expect(gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest())
        .toMatchObject({ method_call_count: 1, mission_ledger_claim_count: 1 });
    },
  );

  it('burns a recognized authority when the environment throws or returns malformed data', async () => {
    for (const [scenario, blocker, approvalNonce] of [
      [
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST
          .THROWS_AFTER_CLAIM,
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.CONSUME_FAILED,
        'e'.repeat(64),
      ],
      [
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST
          .MALFORMED_AFTER_CLAIM,
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
        'f'.repeat(64),
      ],
    ] as const) {
      expect(install(build({ approval_instance_sha256: approvalNonce }), scenario)).toBe(true);
      const result = await gate
        .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
      expect(result).toMatchObject({
        authority_recognized: true,
        authority_consumed: true,
        authority_valid: false,
        blocker_code: blocker,
      });
      expect(gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest())
        .toMatchObject({ method_call_count: 1, mission_ledger_claim_count: 1 });
      expect(gate.resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest()).toBe(true);
    }
  });

  it('keeps the ForTest binding internal and leaves production globals untouched', async () => {
    const slot = Symbol.for(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT);
    const alias = gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS;
    const beforeSlot = Object.getOwnPropertyDescriptor(globalThis, slot);
    const beforeAlias = Object.getOwnPropertyDescriptor(globalThis, alias);

    expect(install()).toBe(true);
    expect(Object.getOwnPropertyDescriptor(globalThis, slot)).toEqual(beforeSlot);
    expect(Object.getOwnPropertyDescriptor(globalThis, alias)).toEqual(beforeAlias);

    const production = await gate.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
    expect(production).toMatchObject({
      authority_recognized: false,
      authority_consumed: false,
      blocker_code:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.RUNTIME_INVALID,
    });
    expect(gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest())
      .toMatchObject({ method_call_count: 0 });
  });

  it('requires exact frozen facade and field descriptors', () => {
    expect(install()).toBe(true);
    const runtime = gate.inspectWelcomeAudioHistoricalCatchupStage2AuthorityRuntimeForTest();
    expect(Object.getPrototypeOf(runtime)).toBe(Object.prototype);
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Reflect.ownKeys(runtime)).toEqual([
      'brand',
      'consume_historical_catchup_stage2_authority_once',
    ]);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(runtime))) {
      expect(descriptor).toMatchObject({
        writable: false,
        enumerable: false,
        configurable: false,
      });
      expect(descriptor.get).toBeUndefined();
      expect(descriptor.set).toBeUndefined();
    }
    expect(install()).toBe(false);
    expect(gate.resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest()).toBe(true);
    expect(gate.resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest()).toBe(false);
  });

  it('accepts the one exact productive facade installed before module import', () => {
    const modulePath = fileURLToPath(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
      import.meta.url,
    ));
    const authority = build();
    const childSource = `
      const now = Date.now();
      const authority = {
        ...${JSON.stringify(authority)},
        issued_at_ms: now,
        expires_at_ms: now + 300000,
      };
      let calls = 0;
      const facade = {};
      Object.defineProperties(facade, {
        brand: {
          value: ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND)},
          writable: false, enumerable: false, configurable: false,
        },
        consume_historical_catchup_stage2_authority_once: {
          value: async (...args) => { calls += 1; return args.length === 0 ? authority : null; },
          writable: false, enumerable: false, configurable: false,
        },
      });
      Object.freeze(facade);
      Object.defineProperty(globalThis, Symbol.for(${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT)}), {
        value: facade, writable: false, enumerable: false, configurable: false,
      });
      Object.defineProperty(globalThis, ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS)}, {
        value: facade, writable: false, enumerable: false, configurable: false,
      });
      const g = await import(${JSON.stringify(new URL(`file://${modulePath}`).href)});
      const result = await g.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
      process.stdout.write(JSON.stringify({
        calls,
        recognized: result.authority_recognized,
        consumed: result.authority_consumed,
        valid: result.authority_valid,
        blocker: result.blocker_code,
        result_valid: g.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult(result).ok,
      }));
    `;
    expect(JSON.parse(execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', childSource],
      { encoding: 'utf8' },
    ))).toEqual({
      calls: 1,
      recognized: true,
      consumed: true,
      valid: true,
      blocker: null,
      result_valid: true,
    });
  });

  it('rejects a malformed pre-import facade with zero method, ledger, or source calls', () => {
    const root = mkdtempSync(join(tmpdir(), 'crm-core-stage2-malformed-facade-'));
    chmodSync(root, 0o700);
    const ledgerMarker = join(root, 'ledger-claim.marker');
    const sourceMarker = join(root, 'source-call.marker');
    const modulePath = fileURLToPath(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
      import.meta.url,
    ));
    try {
      const childSource = `
        import { existsSync, writeFileSync } from 'node:fs';
        let methodCalls = 0;
        let sourceCalls = 0;
        const facade = Object.freeze({
          brand: ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND)},
          consume_historical_catchup_stage2_authority_once: async () => {
            methodCalls += 1;
            writeFileSync(${JSON.stringify(ledgerMarker)}, 'claimed', { flag: 'wx', mode: 0o600 });
            return null;
          },
        });
        Object.defineProperty(globalThis, Symbol.for(${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT)}), {
          value: facade, writable: false, enumerable: false, configurable: false,
        });
        Object.defineProperty(globalThis, ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS)}, {
          value: facade, writable: false, enumerable: false, configurable: false,
        });
        const g = await import(${JSON.stringify(new URL(`file://${modulePath}`).href)});
        const result = await g.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
        if (result.authority_valid) {
          sourceCalls += 1;
          writeFileSync(${JSON.stringify(sourceMarker)}, 'source', { flag: 'wx', mode: 0o600 });
        }
        process.stdout.write(JSON.stringify({
          methodCalls,
          ledgerClaims: existsSync(${JSON.stringify(ledgerMarker)}) ? 1 : 0,
          sourceCalls,
          sourceMarker: existsSync(${JSON.stringify(sourceMarker)}),
          recognized: result.authority_recognized,
          consumed: result.authority_consumed,
        }));
      `;
      const child = spawnSync(
        process.execPath,
        ['--input-type=module', '--eval', childSource],
        { encoding: 'utf8' },
      );
      expect(child.status).toBe(0);
      expect(JSON.parse(child.stdout)).toEqual({
        methodCalls: 0,
        ledgerClaims: 0,
        sourceCalls: 0,
        sourceMarker: false,
        recognized: false,
        consumed: false,
      });
      expect(existsSync(ledgerMarker)).toBe(false);
      expect(existsSync(sourceMarker)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses the privately captured productive clock after import', () => {
    const modulePath = fileURLToPath(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
      import.meta.url,
    ));
    const runCase = (stale: boolean) => {
      const childSource = `
        const actualNow = Date.now();
        const authority = {
          ...${JSON.stringify(build())},
          issued_at_ms: actualNow ${stale ? '- 600000' : ''},
          expires_at_ms: actualNow ${stale ? '- 300000' : '+ 300000'},
        };
        let methodCalls = 0;
        const facade = {};
        Object.defineProperties(facade, {
          brand: {
            value: ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND)},
            writable: false, enumerable: false, configurable: false,
          },
          consume_historical_catchup_stage2_authority_once: {
            value: async () => { methodCalls += 1; return authority; },
            writable: false, enumerable: false, configurable: false,
          },
        });
        Object.freeze(facade);
        Object.defineProperty(globalThis, Symbol.for(${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT)}), {
          value: facade, writable: false, enumerable: false, configurable: false,
        });
        Object.defineProperty(globalThis, ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS)}, {
          value: facade, writable: false, enumerable: false, configurable: false,
        });
        const g = await import(${JSON.stringify(new URL(`file://${modulePath}`).href)});
        Date.now = () => ${stale ? 'actualNow - 450000' : '0'};
        const result = await g.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
        process.stdout.write(JSON.stringify({
          methodCalls,
          recognized: result.authority_recognized,
          consumed: result.authority_consumed,
          valid: result.authority_valid,
          blocker: result.blocker_code,
        }));
      `;
      return JSON.parse(execFileSync(
        process.execPath,
        ['--input-type=module', '--eval', childSource],
        { encoding: 'utf8' },
      ));
    };

    expect(runCase(false)).toEqual({
      methodCalls: 1,
      recognized: true,
      consumed: true,
      valid: true,
      blocker: null,
    });
    expect(runCase(true)).toEqual({
      methodCalls: 1,
      recognized: true,
      consumed: true,
      valid: false,
      blocker:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
    });
  });

  it('samples productive freshness only after the awaited authority return', () => {
    const modulePath = fileURLToPath(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
      import.meta.url,
    ));
    const childSource = `
      let clock = 1000000;
      Date.now = () => clock;
      const authority = {
        ...${JSON.stringify(build())},
        issued_at_ms: clock,
        expires_at_ms: clock + 300000,
      };
      let methodCalls = 0;
      let sourceCalls = 0;
      const facade = {};
      Object.defineProperties(facade, {
        brand: {
          value: ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND)},
          writable: false, enumerable: false, configurable: false,
        },
        consume_historical_catchup_stage2_authority_once: {
          value: async () => {
            methodCalls += 1;
            clock = authority.expires_at_ms;
            return authority;
          },
          writable: false, enumerable: false, configurable: false,
        },
      });
      Object.freeze(facade);
      Object.defineProperty(globalThis, Symbol.for(${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT)}), {
        value: facade, writable: false, enumerable: false, configurable: false,
      });
      Object.defineProperty(globalThis, ${JSON.stringify(gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS)}, {
        value: facade, writable: false, enumerable: false, configurable: false,
      });
      const g = await import(${JSON.stringify(new URL(`file://${modulePath}`).href)});
      const result = await g.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
      if (result.authority_valid) sourceCalls += 1;
      process.stdout.write(JSON.stringify({
        methodCalls,
        sourceCalls,
        recognized: result.authority_recognized,
        consumed: result.authority_consumed,
        valid: result.authority_valid,
        blocker: result.blocker_code,
      }));
    `;
    expect(JSON.parse(execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', childSource],
      { encoding: 'utf8' },
    ))).toEqual({
      methodCalls: 1,
      sourceCalls: 0,
      recognized: true,
      consumed: true,
      valid: false,
      blocker:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
    });
  });

  it('recognizes, invokes, burns, and rejects a test facade installed in production mode', () => {
    const modulePath = fileURLToPath(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
      import.meta.url,
    ));
    const childSource = `
      const g = await import(${JSON.stringify(new URL(`file://${modulePath}`).href)});
      const now = ${NOW};
      const authority = g.buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest({}, { now_ms: now });
      g.installWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest({
        private_authority: authority,
        consume_scenario: g.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST.EXACT,
      });
      const facade = g.inspectWelcomeAudioHistoricalCatchupStage2AuthorityRuntimeForTest();
      Object.defineProperty(globalThis, Symbol.for(g.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT), {
        value: facade, writable: false, enumerable: false, configurable: false,
      });
      Object.defineProperty(globalThis, g.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS, {
        value: facade, writable: false, enumerable: false, configurable: false,
      });
      const result = await g.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
      const audit = g.inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest();
      process.stdout.write(JSON.stringify({ result: {
        authority_recognized: result.authority_recognized,
        authority_consumed: result.authority_consumed,
        authority_valid: result.authority_valid,
        blocker_code: result.blocker_code,
      }, audit }));
    `;
    const parsed = JSON.parse(execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', childSource],
      { encoding: 'utf8' },
    ));
    expect(parsed).toEqual({
      result: {
        authority_recognized: true,
        authority_consumed: true,
        authority_valid: false,
        blocker_code:
          gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.CROSS_MODE_RUNTIME,
      },
      audit: {
        installed: true,
        method_call_count: 1,
        mission_ledger_claim_count: 1,
        prior_mission_ledger_claims: 0,
        duplicate_claim_blocked_count: 0,
        successful_return_count: 1,
      },
    });
  });

  it('rejects an exact-shaped foreign production clone installed after import without a call', () => {
    const modulePath = fileURLToPath(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
      import.meta.url,
    ));
    const childSource = `
      const g = await import(${JSON.stringify(new URL(`file://${modulePath}`).href)});
      let calls = 0;
      const method = async () => { calls += 1; return null; };
      const clone = {};
      Object.defineProperties(clone, {
        brand: {
          value: g.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND,
          writable: false, enumerable: false, configurable: false,
        },
        consume_historical_catchup_stage2_authority_once: {
          value: method, writable: false, enumerable: false, configurable: false,
        },
      });
      Object.freeze(clone);
      Object.defineProperty(globalThis, Symbol.for(g.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT), {
        value: clone, writable: false, enumerable: false, configurable: false,
      });
      Object.defineProperty(globalThis, g.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS, {
        value: clone, writable: false, enumerable: false, configurable: false,
      });
      const result = await g.consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce();
      process.stdout.write(JSON.stringify({ calls, recognized: result.authority_recognized, consumed: result.authority_consumed }));
    `;
    const parsed = JSON.parse(execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', childSource],
      { encoding: 'utf8' },
    ));
    expect(parsed).toEqual({ calls: 0, recognized: false, consumed: false });
  });

  it('rejects result tampering, proxies, and private extras', async () => {
    expect(install()).toBe(true);
    const valid = await gate
      .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({ now_ms: NOW });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult(valid)).toEqual({
      ok: true,
    });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult({
      ...valid,
      raw_private_reference: 'forbidden',
    })).toEqual({ ok: false });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult(new Proxy(valid, {})))
      .toEqual({ ok: false });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult({
      ...valid,
      authority_consumed: false,
    })).toEqual({ ok: false });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult({
      ...valid,
      private_authority: Object.freeze({ ...valid.private_authority }),
    })).toEqual({ ok: false });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult({
      ...valid,
      private_authority: {},
    })).toEqual({ ok: false });

    const blocked = {
      authority_recognized: false,
      authority_consumed: false,
      authority_valid: false,
      private_authority: null,
      blocker_code:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.RUNTIME_INVALID,
    };
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult(blocked))
      .toEqual({ ok: true });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult({
      ...blocked,
      blocker_code:
        gate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
    })).toEqual({ ok: false });
    expect(gate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult({
      ...blocked,
      authority_recognized: true,
    })).toEqual({ ok: false });
  });

  it('contains no browser, network, fixed private root, or authority issuer', () => {
    const source = readFileSync(new URL(
      '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
      import.meta.url,
    ), 'utf8');
    expect(source).not.toMatch(/(?:playwright|puppeteer|chrome|safari|computer.use)/iu);
    expect(source).not.toMatch(/(?:https?:\/\/|fetch\s*\(|node:(?:http|https|net))/u);
    expect(source).not.toContain('Mantis-Private-Source-Artifacts');
    expect(source).not.toMatch(/\b(?:openSync|writeFileSync|writeFile|mkdir|rename|link|unlink)\b/u);
    expect(source).not.toMatch(/(?:mint|publish|issue).*Authority/u);
    expect(source).toContain('captureExactInstalledProductionRuntimeBinding');
  });
});
