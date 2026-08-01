import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, link, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';
import { buildCrmVNextCommunityIntakeRegister } from '../lib/crm/crm-vnext-community-intake-register.js';

const execFileAsync = promisify(execFile);
const NOW = '2026-07-31T14:00:00.000Z';
const FOLLOW_ID = 'event-synthetic-follow-001';
const REPLY_ID = 'event-synthetic-reply-001';
const CONSENT_ID = 'event-synthetic-consent-001';
const EMAIL_ID = 'event-synthetic-email-001';
let dirs: string[] = [];

const exactEmailSha256 = (value: string) => createHash('sha256').update(value).digest('hex');

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const person = (overrides: Record<string, unknown> = {}) => ({
  person_record_id: 'person-synthetic-001',
  revision: 1,
  display_name: 'Synthetic Person',
  instagram_handle: 'Example.Person',
  email: null,
  phone: null,
  email_provenance: { status: 'unknown' },
  consent: { receive_notes: 'unknown' },
  ...overrides,
});

const event = (eventId: string, eventKind: string, overrides: Record<string, unknown> = {}) => ({
  event_id: eventId,
  person_record_id: 'person-synthetic-001',
  event_kind: eventKind,
  observed_at: '2026-07-31T12:00:00.000Z',
  direction: 'inbound',
  ...overrides,
});

const register = (persons: unknown[], events: unknown[]) => ({
  schema_version: 'community-intake-register-v1',
  batch_id: 'batch-synthetic-001',
  persons,
  events,
});

describe('CRM vNext owner-only Community Intake Register', () => {
  test('prepares a first batch without writes and preserves exact raw identity values', async () => {
    const exactEmail = 'Person.Example+Notes@Example.COM';
    const exactPhone = '+57 300 000 0000';
    const report = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([
        person({
          email: exactEmail,
          phone: exactPhone,
          email_provenance: {
            status: 'voluntarily_provided',
            observed_at: NOW,
            source_event_id: EMAIL_ID,
          },
          consent: {
            receive_notes: 'granted',
            basis: 'explicit',
            captured_at: NOW,
            source_event_id: CONSENT_ID,
          },
        }),
      ], [
        event(FOLLOW_ID, 'follow'),
        event(EMAIL_ID, 'email_handoff', {
          observed_at: NOW,
          exact_email_sha256: exactEmailSha256(exactEmail),
        }),
        event(CONSENT_ID, 'email_consent'),
      ]),
      existingCards: [],
    }, { now: NOW });

    expect(report.summary).toMatchObject({
      personsRead: 1,
      newEvents: 3,
      minimalCardProposals: 1,
      mailerLiteCandidates: 1,
      operationsExecuted: 0,
    });
    expect(report.decisions[0].raw).toMatchObject({ email: exactEmail, phone: exactPhone });
    expect(report.decisions[0].comparison.email).toBe('person.example+notes@example.com');
    expect(report.decisions[0].mailerLite.candidate?.exactEmail).toBe(exactEmail);
    expect(report.decisions[0].mailerLite.candidate?.mutationAuthority).toBe(false);
    expect(report.safety).toMatchObject({ ownerOnly: true, authorityGranted: false, productionReady: false });
  });

  test('processes only deltas and skips a previously observed follow event', async () => {
    const initial = register([person()], [event(FOLLOW_ID, 'follow')]);
    const updated = register([
      person({ revision: 2, phone: '+57 300 000 0000' }),
    ], [event(FOLLOW_ID, 'follow'), event(REPLY_ID, 'reply')]);

    const report = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: updated,
      previousRegister: initial,
      existingCards: [],
    }, { now: NOW });

    expect(report.summary).toMatchObject({
      changedPersons: 1,
      newEvents: 1,
      duplicateEventsSkipped: 1,
      signalObservationsPrepared: 1,
    });
    expect(report.signalObservations).toHaveLength(1);
    expect(report.signalObservations[0].sourceId).toBe(REPLY_ID);
  });

  test('keeps follow and reply separate while outbound audio does not become heat', async () => {
    const report = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person()], [
        event(FOLLOW_ID, 'follow'),
        event(REPLY_ID, 'reply'),
        event('event-synthetic-audio-001', 'welcome_audio_sent', {
          direction: 'outbound',
          asset_version: 'approved-audio-v1',
        }),
      ]),
    }, { now: NOW });
    expect(report.summary.signalObservationsPrepared).toBe(2);
    expect(report.canonicalSignalEvents.events.map((item) => item.eventKind)).toEqual(['instagram_follow', 'instagram_dm']);
  });

  test('matches exact handle through the existing resolver and blocks cross-card identity collisions', async () => {
    const matched = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person({ revision: 2, email: 'person@example.com' })], [event(FOLLOW_ID, 'follow')]),
      existingCards: [{ card_id: 'card-synthetic-001', instagram_handle: 'example.person' }],
    }, { now: NOW });
    expect(matched.decisions[0].identity).toMatchObject({ status: 'matched', cardId: 'card-synthetic-001' });
    expect(matched.decisions[0].identity.resolver).toBe('contact_identity_resolver');
    expect(matched.decisions[0].enrichmentProposal?.writeAuthority).toBe(false);

    const conflict = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person({ email: 'person@example.com' })], [event(FOLLOW_ID, 'follow')]),
      existingCards: [
        { card_id: 'card-synthetic-001', instagram_handle: 'example.person' },
        { card_id: 'card-synthetic-002', email: 'PERSON@example.com' },
      ],
    }, { now: NOW });
    expect(conflict.decisions[0].identity.status).toBe('conflict');
    expect(conflict.decisions[0].mailerLite).toMatchObject({ state: 'blocked', blocker: 'identity_conflict' });
  });

  test('requires voluntary email provenance and explicit receive-notes consent', async () => {
    const noConsent = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person({ email: 'person+tag@example.com' })], [event(FOLLOW_ID, 'follow')]),
    }, { now: NOW });
    expect(noConsent.decisions[0].mailerLite).toMatchObject({
      state: 'blocked',
      blocker: 'email_not_voluntarily_provided',
    });

    const missingEvidence = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([
        person({
          email: 'person+tag@example.com',
          email_provenance: { status: 'voluntarily_provided', observed_at: NOW, source_event_id: 'missing' },
          consent: { receive_notes: 'granted', basis: 'explicit', captured_at: NOW, source_event_id: 'missing' },
        }),
      ], [event(FOLLOW_ID, 'follow')]),
    }, { now: NOW });
    expect(missingEvidence.decisions[0].mailerLite.state).toBe('blocked');
  });

  test('binds email and consent evidence to the same person and allowed event kinds', async () => {
    const report = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([
        person({
          email: 'person+tag@example.com',
          email_provenance: { status: 'voluntarily_provided', observed_at: NOW, source_event_id: 'other-follow' },
          consent: { receive_notes: 'granted', basis: 'explicit', captured_at: NOW, source_event_id: 'other-follow' },
        }),
        person({ person_record_id: 'person-synthetic-002', instagram_handle: 'Other.Person' }),
      ], [
        event(FOLLOW_ID, 'follow'),
        event('other-follow', 'follow', { person_record_id: 'person-synthetic-002' }),
      ]),
    }, { now: NOW });
    expect(report.decisions[0].mailerLite).toMatchObject({
      state: 'blocked',
      blocker: 'email_provenance_event_missing_or_mismatched',
    });
  });

  test('blocks stale provenance when the exact email changes or its observation time drifts', async () => {
    const originalEmail = 'original+notes@example.com';
    const changedEmail = 'changed+notes@example.com';
    const staleEvidence = event(EMAIL_ID, 'email_handoff', {
      observed_at: NOW,
      exact_email_sha256: exactEmailSha256(originalEmail),
    });
    const basePerson = {
      email: changedEmail,
      email_provenance: {
        status: 'voluntarily_provided',
        observed_at: NOW,
        source_event_id: EMAIL_ID,
      },
      consent: {
        receive_notes: 'granted',
        basis: 'explicit',
        captured_at: NOW,
        source_event_id: CONSENT_ID,
      },
    };

    const changedEmailReport = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person(basePerson)], [staleEvidence, event(CONSENT_ID, 'email_consent')]),
    }, { now: NOW });
    expect(changedEmailReport.decisions[0].mailerLite).toMatchObject({
      state: 'blocked',
      candidate: null,
      blocker: 'email_provenance_event_missing_or_mismatched',
    });

    const driftedTimeReport = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([
        person({
          ...basePerson,
          email: originalEmail,
          email_provenance: {
            status: 'voluntarily_provided',
            observed_at: '2026-07-31T14:00:01.000Z',
            source_event_id: EMAIL_ID,
          },
        }),
      ], [staleEvidence, event(CONSENT_ID, 'email_consent')]),
    }, { now: NOW });
    expect(driftedTimeReport.decisions[0].mailerLite).toMatchObject({
      state: 'blocked',
      candidate: null,
      blocker: 'email_provenance_event_missing_or_mismatched',
    });
  });

  test('blocks duplicate identities within the register and does not propose email-only cards', async () => {
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([
        person(),
        person({ person_record_id: 'person-synthetic-002', instagram_handle: '@example.person' }),
      ], []),
    })).rejects.toThrow('duplicate_person_identity_claim');

    const emailOnly = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([
        person({ instagram_handle: null, email: 'person@example.com' }),
      ], []),
    }, { now: NOW });
    expect(emailOnly.decisions[0].cardProposal).toBeNull();
  });

  test('treats revision-only changes and repeated audio dedupe keys as no-ops', async () => {
    const initial = register([person()], [
      event('audio-1', 'welcome_audio_sent', { direction: 'outbound', asset_version: 'approved-audio-v1' }),
    ]);
    const current = register([person({ revision: 2 })], [
      event('audio-1', 'welcome_audio_sent', { direction: 'outbound', asset_version: 'approved-audio-v1' }),
      event('audio-2', 'welcome_audio_sent', { direction: 'outbound', asset_version: 'approved-audio-v1' }),
    ]);
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: current,
      previousRegister: initial,
    }, { now: NOW })).rejects.toThrow('duplicate_welcome_audio_dedupe_key');

    const semanticRepeat = register([person({ revision: 2 })], [
      event('audio-1', 'welcome_audio_sent', { direction: 'outbound', asset_version: 'approved-audio-v1' }),
      event('audio-2', 'welcome_audio_sent', {
        direction: 'outbound',
        asset_version: 'approved-audio-v2',
      }),
    ]);
    const report = await buildCrmVNextCommunityIntakeRegister({
      currentRegister: semanticRepeat,
      previousRegister: initial,
    }, { now: NOW });
    expect(report.summary.changedPersons).toBe(0);
    expect(report.summary.newEvents).toBe(1);
  });

  test('rejects invalid event directions and audio without a durable dedupe key', async () => {
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person()], [event(FOLLOW_ID, 'follow', { direction: 'sideways' })]),
    })).rejects.toThrow('invalid_event_direction');
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person()], [event('audio-1', 'welcome_audio_sent', { direction: 'outbound' })]),
    })).rejects.toThrow('welcome_audio_outbound_asset_version_required');
    const missingDirection = event(FOLLOW_ID, 'follow');
    delete (missingDirection as { direction?: string }).direction;
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person()], [missingDirection]),
    })).rejects.toThrow('invalid_event_direction');
  });

  test('rejects invalid identities in the compact existing-card index', async () => {
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person()], []),
      existingCards: [{ card_id: 'card-synthetic-001', instagram_handle: 'not a handle' }],
    })).rejects.toThrow('invalid_existing_card_instagram_handle');
  });

  test('fails closed on duplicate ids, changed events and stale person revisions', async () => {
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: register([person()], [event(FOLLOW_ID, 'follow'), event(FOLLOW_ID, 'follow')]),
    })).rejects.toThrow('duplicate_event_id');

    await expect(buildCrmVNextCommunityIntakeRegister({
      previousRegister: register([person()], [event(FOLLOW_ID, 'follow')]),
      currentRegister: register([person({ revision: 2 })], [event(FOLLOW_ID, 'reply')]),
    })).rejects.toThrow('event_id_conflict');

    await expect(buildCrmVNextCommunityIntakeRegister({
      previousRegister: register([person()], [event(FOLLOW_ID, 'follow')]),
      currentRegister: register([person({ phone: '+57 300 000 0000' })], [event(FOLLOW_ID, 'follow')]),
    })).rejects.toThrow('person_revision_not_advanced');

    await expect(buildCrmVNextCommunityIntakeRegister({
      previousRegister: register([person()], [event(FOLLOW_ID, 'follow')]),
      currentRegister: register([person({ revision: 2 })], []),
    })).rejects.toThrow('previous_event_missing_from_current_register');

    await expect(buildCrmVNextCommunityIntakeRegister({
      previousRegister: register([person({ revision: 2 })], [event(FOLLOW_ID, 'follow')]),
      currentRegister: register([person({ revision: 1 })], [event(FOLLOW_ID, 'follow')]),
    })).rejects.toThrow('person_revision_regressed');
  });

  test('enforces the ten-person cap', async () => {
    const persons = Array.from({ length: 11 }, (_, index) => person({
      person_record_id: `person-synthetic-${index}`,
      instagram_handle: `synthetic.person.${index}`,
    }));
    await expect(buildCrmVNextCommunityIntakeRegister({
      currentRegister: register(persons, []),
    })).rejects.toThrow('person_cap_exceeded');
  });

  test('CLI writes a 0600 owner-only artifact and prints aggregate output only', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-core-community-intake-'));
    dirs.push(dir);
    const current = join(dir, 'current.json');
    const out = join(dir, 'private-report.json');
    const privateMarker = 'PrivateSyntheticMarker';
    await writeFile(current, JSON.stringify(register([
      person({ display_name: privateMarker }),
    ], [event(FOLLOW_ID, 'follow')])), 'utf8');
    await chmod(current, 0o600);

    const { stdout } = await execFileAsync('node', [
      '--loader', process.env.TS_NODE_LOADER_PATH ?? join(process.cwd(), 'node_modules/ts-node/esm.mjs'),
      '--experimental-specifier-resolution=node',
      'scripts/crm-vnext-community-intake-register.mjs',
      '--current', current,
      '--out', out,
    ], { cwd: process.cwd(), env: { ...process.env, NODE_NO_WARNINGS: '1', TS_NODE_TRANSPILE_ONLY: '1' } });
    const aggregate = JSON.parse(stdout);
    const artifact = JSON.parse(await readFile(out, 'utf8'));
    const mode = (await stat(out)).mode & 0o777;

    expect(stdout).not.toContain(privateMarker);
    expect(aggregate.summary).toMatchObject({ personsRead: 1, operationsExecuted: 0 });
    expect(aggregate.authorityGranted).toBe(false);
    expect(artifact.decisions[0].raw.displayName).toBe(privateMarker);
    expect(mode).toBe(0o600);
  });

  test('CLI rejects owner-only input or output inside the repository', async () => {
    const { stderr } = await execFileAsync('node', [
      '--loader', process.env.TS_NODE_LOADER_PATH ?? join(process.cwd(), 'node_modules/ts-node/esm.mjs'),
      '--experimental-specifier-resolution=node',
      'scripts/crm-vnext-community-intake-register.mjs',
      '--current', 'package.json',
      '--out', 'private-report.json',
    ], { cwd: process.cwd(), env: { ...process.env, NODE_NO_WARNINGS: '1', TS_NODE_TRANSPILE_ONLY: '1' } }).catch((error) => error);
    expect(stderr).toContain('owner_only_input_must_be_outside_repo');
    expect(stderr).not.toContain(process.cwd());
  });

  test('CLI rejects broad-mode inputs and outputs in another registered worktree', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-core-community-intake-mode-'));
    dirs.push(dir);
    const current = join(dir, 'current.json');
    await writeFile(current, JSON.stringify(register([person()], [])), { encoding: 'utf8', mode: 0o644 });
    const loader = process.env.TS_NODE_LOADER_PATH ?? join(process.cwd(), 'node_modules/ts-node/esm.mjs');
    const baseArgs = ['--loader', loader, '--experimental-specifier-resolution=node', 'scripts/crm-vnext-community-intake-register.mjs'];
    const broadMode = await execFileAsync('node', [
      ...baseArgs, '--current', current, '--out', join(dir, 'out.json'),
    ], { cwd: process.cwd(), env: { ...process.env, NODE_NO_WARNINGS: '1', TS_NODE_TRANSPILE_ONLY: '1' } }).catch((error) => error);
    expect(broadMode.stderr).toContain('owner_only_input_mode_required');

    await chmod(current, 0o600);
    const { stdout: worktreeList } = await execFileAsync('git', ['worktree', 'list', '--porcelain']);
    const otherWorktreeRoot = worktreeList
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length))
      .find((root) => root !== process.cwd());
    expect(otherWorktreeRoot).toBeTruthy();
    const otherWorktree = await execFileAsync('node', [
      ...baseArgs, '--current', current, '--out', join(otherWorktreeRoot!, 'private-report.json'),
    ], { cwd: process.cwd(), env: { ...process.env, NODE_NO_WARNINGS: '1', TS_NODE_TRANSPILE_ONLY: '1' } }).catch((error) => error);
    expect(otherWorktree.stderr).toContain('owner_only_output_must_be_outside_repo');
  });

  test('CLI rejects input overwrite and symlink aliases', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-core-community-intake-alias-'));
    dirs.push(dir);
    const current = join(dir, 'current.json');
    const alias = join(dir, 'alias.json');
    const hardlink = join(dir, 'hardlink.json');
    await writeFile(current, JSON.stringify(register([person()], [])), { encoding: 'utf8', mode: 0o600 });
    await symlink(current, alias);
    const loader = process.env.TS_NODE_LOADER_PATH ?? join(process.cwd(), 'node_modules/ts-node/esm.mjs');
    const baseArgs = ['--loader', loader, '--experimental-specifier-resolution=node', 'scripts/crm-vnext-community-intake-register.mjs'];
    const env = { ...process.env, NODE_NO_WARNINGS: '1', TS_NODE_TRANSPILE_ONLY: '1' };
    const overwrite = await execFileAsync('node', [
      ...baseArgs, '--current', current, '--out', current,
    ], { cwd: process.cwd(), env }).catch((error) => error);
    expect(overwrite.stderr).toContain('owner_only_output_must_differ_from_inputs');

    const symlinked = await execFileAsync('node', [
      ...baseArgs, '--current', alias, '--out', join(dir, 'out.json'),
    ], { cwd: process.cwd(), env }).catch((error) => error);
    expect(symlinked.stderr).toContain('owner_only_symlink_prohibited');

    await link(current, hardlink);
    const hardlinked = await execFileAsync('node', [
      ...baseArgs, '--current', hardlink, '--out', join(dir, 'out.json'),
    ], { cwd: process.cwd(), env }).catch((error) => error);
    expect(hardlinked.stderr).toContain('owner_only_hardlink_prohibited');
  });
});
