import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);

const readBody = async (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
});

const startFakeMailerLite = async () => {
  const requests = [];
  const server = createServer(async (req, res) => {
    await readBody(req);
    requests.push({
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
    });

    if (req.method !== 'GET' || req.headers.authorization !== 'Bearer test-mailerlite-key') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Unauthenticated.' }));
      return;
    }

    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname !== '/api/subscribers') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'not found' }));
      return;
    }

    const cursor = url.searchParams.get('cursor');
    const next = cursor ? null : `${url.origin}/api/subscribers?cursor=next-page&limit=2`;
    const data = cursor
      ? [
        {
          id: 'sub-secret-2',
          email: 'artifact-private-two@example.test',
          status: 'Unsubscribed',
          clicks30d: 3,
          last_click_at: '2026-06-04T12:00:00.000Z',
          private_url: 'https://private.example.test/two',
        },
      ]
      : [
        {
          id: 'sub-secret-1',
          email: 'artifact-private-one@example.test',
          status: 'Subscribed',
          opens30d: 5,
          clicks30d: 1,
          last_open_at: '2026-06-05T12:00:00.000Z',
          groups: ['Private Group'],
          campaign_body: 'Private campaign body must stay only in the artifact.',
        },
      ];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data, links: { next } }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake_server_missing_port');
  return {
    apiBase: `http://127.0.0.1:${address.port}/api`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};

const startFakeMailerLiteError = async () => {
  const requests = [];
  const sensitive = {
    email: 'upstream-private-person@example.test',
    token: 'SYNTHETIC_TOKEN_SHOULD_NOT_LEAK_1234567890',
    privateUrl: 'https://private.example.test/error-token',
    campaignBody: 'Private campaign body from upstream error should stay hidden.',
    rawPayloadMarker: '__RAW_UPSTREAM_PAYLOAD_SHOULD_NOT_LEAK__',
    headerLikeValue: 'Authorization: Bearer SYNTHETIC_HEADER_SHOULD_NOT_LEAK',
  };
  const rawBody = JSON.stringify({
    message: 'upstream error',
    email: sensitive.email,
    token: sensitive.token,
    private_url: sensitive.privateUrl,
    campaign_body: sensitive.campaignBody,
    raw_payload_marker: sensitive.rawPayloadMarker,
    header_like_value: sensitive.headerLikeValue,
  });
  const server = createServer(async (req, res) => {
    await readBody(req);
    requests.push({
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
    });

    res.writeHead(500, {
      'Content-Type': 'application/json',
      'X-Synthetic-Private-Email': sensitive.email,
      'X-Synthetic-Token': sensitive.token,
      'X-Synthetic-Authorization': sensitive.headerLikeValue,
    });
    res.end(rawBody);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake_server_missing_port');
  return {
    apiBase: `http://127.0.0.1:${address.port}/api`,
    requests,
    sensitive,
    rawBody,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};

const createFakeSecurityPath = async (dir) => {
  const binDir = join(dir, 'bin');
  await mkdir(binDir, { recursive: true });
  const securityBin = join(binDir, 'security');
  await writeFile(securityBin, '#!/bin/sh\nexit 1\n', 'utf8');
  await chmod(securityBin, 0o755);
  return `${binDir}:${process.env.PATH ?? ''}`;
};

const runExport = async (args, options = {}) => execFileAsync('node', [
  'scripts/crm-vnext-mailerlite-engagement-artifact-export.mjs',
  ...args,
], {
  cwd: process.cwd(),
  ...options,
});

describe('crm-vnext MailerLite engagement artifact export script', () => {
  test('writes a private artifact and redacted aggregate receipts without leaking rows', async () => {
    const fake = await startFakeMailerLite();
    const dir = await mkdtemp(join(tmpdir(), 'crm-mailerlite-engagement-artifact-export-'));
    try {
      const path = await createFakeSecurityPath(dir);
      const artifactOut = join(dir, 'private-artifacts', 'mailerlite-engagement-artifact.json');
      const jsonOut = join(dir, 'reports', 'receipt.json');
      const markdownOut = join(dir, 'reports', 'receipt.md');

      const { stdout, stderr } = await runExport([
        '--service',
        '__missing__',
        '--account',
        '__missing__',
        '--api-base',
        fake.apiBase,
        '--limit',
        '2',
        '--max-pages',
        '5',
        '--artifact-out',
        artifactOut,
        '--out',
        jsonOut,
        '--markdown-out',
        markdownOut,
        '--fail-on-blocked',
      ], {
        env: { PATH: path, MAILERLITE_API_KEY: 'test-mailerlite-key' },
      });

      expect(stderr).toBe('');
      const terminal = JSON.parse(stdout);
      const receipt = JSON.parse(await readFile(jsonOut, 'utf8'));
      const markdown = await readFile(markdownOut, 'utf8');
      const artifact = JSON.parse(await readFile(artifactOut, 'utf8'));
      await stat(artifactOut);

      expect(fake.requests).toHaveLength(2);
      expect(fake.requests.every((request) => request.method === 'GET')).toBe(true);
      expect(artifact.rows).toHaveLength(2);
      expect(JSON.stringify(artifact)).toContain('artifact-private-one@example.test');

      for (const report of [terminal, receipt]) {
        expect(report.ok).toBe(true);
        expect(report.status).toBe('ok');
        expect(report.aggregate).toMatchObject({ rowCount: 2 });
        expect(report.privateArtifact).toMatchObject({
          written: true,
          pathLabel: basename(artifactOut),
          outsideRepo: true,
        });
        expect(report.safetyFlags).toMatchObject({
          mailerLiteApiCalled: true,
          mutationsPerformed: false,
          crmStateTouched: false,
          rawRowsPrinted: false,
          privateArtifactWritten: true,
          redactedReceiptWritten: true,
        });
        expect(report).not.toHaveProperty('rows');
        expect(report).not.toHaveProperty('subscribers');
        expect(report).not.toHaveProperty('rawPayloads');
      }

      const serialized = `${stdout}\n${JSON.stringify(receipt)}\n${markdown}`;
      expect(serialized).not.toContain('artifact-private-one@example.test');
      expect(serialized).not.toContain('artifact-private-two@example.test');
      expect(serialized).not.toContain('sub-secret-1');
      expect(serialized).not.toContain('sub-secret-2');
      expect(serialized).not.toContain('Private Group');
      expect(serialized).not.toContain('Private campaign body');
      expect(serialized).not.toContain('https://private.example.test/two');
      expect(serialized).not.toContain('test-mailerlite-key');
      expect(serialized).not.toContain('__missing__');
      expect(serialized).not.toContain('Bearer');
      expect(serialized).not.toContain('Authorization');
      expect(serialized).not.toContain('credentialSource');
      expect(serialized).not.toContain('credentialLength');
      expect(serialized).not.toContain('credentialFingerprint');
      expect(serialized).not.toContain(artifactOut);
    } finally {
      await fake.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('blocks private artifact paths inside the repo before source access', async () => {
    const fake = await startFakeMailerLite();
    const dir = await mkdtemp(join(tmpdir(), 'crm-mailerlite-engagement-artifact-export-'));
    try {
      const path = await createFakeSecurityPath(dir);
      const artifactOut = join(process.cwd(), 'tmp', 'mailerlite-engagement-artifact.json');
      const jsonOut = join(dir, 'reports', 'blocked.json');
      const markdownOut = join(dir, 'reports', 'blocked.md');
      let error;

      try {
        await runExport([
          '--service',
          '__missing__',
          '--account',
          '__missing__',
          '--api-base',
          fake.apiBase,
          '--artifact-out',
          artifactOut,
          '--out',
          jsonOut,
          '--markdown-out',
          markdownOut,
          '--fail-on-blocked',
        ], {
          env: { PATH: path, MAILERLITE_API_KEY: 'test-mailerlite-key' },
        });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeTruthy();
      expect(fake.requests).toHaveLength(0);
      const terminal = JSON.parse(error.stdout);
      const receipt = JSON.parse(await readFile(jsonOut, 'utf8'));
      const markdown = await readFile(markdownOut, 'utf8');

      for (const report of [terminal, receipt]) {
        expect(report.ok).toBe(false);
        expect(report.status).toBe('blocked');
        expect(report.blockers).toContain('private_artifact_path_inside_repo');
        expect(report.privateArtifact).toMatchObject({
          written: false,
          pathLabel: basename(artifactOut),
          outsideRepo: false,
        });
        expect(report.safetyFlags).toMatchObject({
          mailerLiteApiCalled: false,
          mutationsPerformed: false,
          crmStateTouched: false,
          rawRowsPrinted: false,
          privateArtifactWritten: false,
          redactedReceiptWritten: true,
        });
      }

      const serialized = `${error.stdout}\n${JSON.stringify(receipt)}\n${markdown}`;
      expect(serialized).not.toContain('test-mailerlite-key');
      expect(serialized).not.toContain('__missing__');
      expect(serialized).not.toContain('credentialSource');
      expect(serialized).not.toContain('credentialLength');
      expect(serialized).not.toContain('credentialFingerprint');
      expect(serialized).not.toContain(artifactOut);
    } finally {
      await fake.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('redacts upstream HTTP failure bodies and headers from terminal and receipts', async () => {
    const fake = await startFakeMailerLiteError();
    const dir = await mkdtemp(join(tmpdir(), 'crm-mailerlite-engagement-artifact-export-'));
    try {
      const path = await createFakeSecurityPath(dir);
      const artifactOut = join(dir, 'private-artifacts', 'mailerlite-engagement-artifact.json');
      const jsonOut = join(dir, 'reports', 'upstream-error.json');
      const markdownOut = join(dir, 'reports', 'upstream-error.md');
      let error;

      try {
        await runExport([
          '--service',
          '__missing__',
          '--account',
          '__missing__',
          '--api-base',
          fake.apiBase,
          '--artifact-out',
          artifactOut,
          '--out',
          jsonOut,
          '--markdown-out',
          markdownOut,
          '--fail-on-blocked',
        ], {
          env: { PATH: path, MAILERLITE_API_KEY: 'test-mailerlite-key' },
        });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeTruthy();
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].method).toBe('GET');
      const terminal = JSON.parse(error.stdout);
      const receipt = JSON.parse(await readFile(jsonOut, 'utf8'));
      const markdown = await readFile(markdownOut, 'utf8');

      for (const report of [terminal, receipt]) {
        expect(report.ok).toBe(false);
        expect(report.status).toBe('blocked');
        expect(report.blockers).toContain('mailerlite_http_500');
        if ('error' in report) expect(report.error).toBe('mailerlite_http_500');
        expect(report.safetyFlags).toMatchObject({
          mailerLiteApiCalled: true,
          mutationsPerformed: false,
          crmStateTouched: false,
          rawRowsPrinted: false,
          privateArtifactWritten: false,
          redactedReceiptWritten: true,
        });
      }

      const serialized = `${error.stdout}\n${error.stderr}\n${JSON.stringify(receipt)}\n${markdown}`;
      for (const value of Object.values(fake.sensitive)) {
        expect(serialized).not.toContain(value);
      }
      expect(serialized).not.toContain(fake.rawBody);
      expect(serialized).not.toContain('raw_payload_marker');
      expect(serialized).not.toContain('X-Synthetic-Private-Email');
      expect(serialized).not.toContain('X-Synthetic-Token');
      expect(serialized).not.toContain('X-Synthetic-Authorization');
      expect(serialized).not.toContain('test-mailerlite-key');
      expect(serialized).not.toContain('__missing__');
      expect(serialized).not.toContain('credentialSource');
      expect(serialized).not.toContain('credentialLength');
      expect(serialized).not.toContain('credentialFingerprint');
      expect(serialized).not.toContain(artifactOut);
    } finally {
      await fake.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
