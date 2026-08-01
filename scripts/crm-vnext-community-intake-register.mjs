#!/usr/bin/env -S TS_NODE_TRANSPILE_ONLY=1 node --loader ts-node/esm --experimental-specifier-resolution=node
import { execFile } from 'node:child_process';
import { chmod, lstat, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { buildCrmVNextCommunityIntakeRegister } from '../lib/crm/crm-vnext-community-intake-register.js';

const usage = `Usage:
  TS_NODE_TRANSPILE_ONLY=1 node --loader ts-node/esm --experimental-specifier-resolution=node scripts/crm-vnext-community-intake-register.mjs --current <path> --out <path> [options]

Options:
  --current <path>         Current owner-only Community Intake Register JSON
  --previous <path>        Previous version of the same register
  --existing-cards <path>  Synthetic or separately approved compact card identity index
  --out <path>             Required owner-only dry-run report path
  --help                   Show this help

This command performs local dry-run preparation only. It never reads a source, calls a live API,
writes CRM or ledger state, mutates MailerLite, or sends a message.`;

const parseArgs = (argv) => {
  const options = { current: null, previous: null, existingCards: null, out: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--current') options.current = argv[++index];
    else if (arg === '--previous') options.previous = argv[++index];
    else if (arg === '--existing-cards') options.existingCards = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }
  if (!options.help && (!options.current || !options.out)) throw new Error('current_and_out_required');
  return options;
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);
const worktreeRoots = async () => {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, 'worktree', 'list', '--porcelain']);
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.startsWith('worktree '))
    .map((line) => resolve(line.slice('worktree '.length)));
};
const isInsideAnyWorktree = (filePath, roots) => {
  const absolute = resolve(filePath);
  return roots.some((root) => absolute === root || absolute.startsWith(`${root}${sep}`));
};
const canonicalInputPath = async (filePath) => {
  const absolute = resolve(filePath);
  const metadata = await lstat(absolute);
  if (metadata.isSymbolicLink()) throw new Error('owner_only_symlink_prohibited');
  if (metadata.nlink !== 1) throw new Error('owner_only_hardlink_prohibited');
  return realpath(absolute);
};
const canonicalOutputPath = async (filePath) => {
  const absolute = resolve(filePath);
  try {
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) throw new Error('owner_only_symlink_prohibited');
    if (metadata.nlink !== 1) throw new Error('owner_only_hardlink_prohibited');
    return realpath(absolute);
  } catch (error) {
    if (['owner_only_symlink_prohibited', 'owner_only_hardlink_prohibited'].includes(error?.message)) throw error;
    if (error?.code !== 'ENOENT') throw error;
    const parent = await realpath(dirname(absolute));
    return join(parent, basename(absolute));
  }
};
const assertOwnerOnlyInput = async (canonicalPath) => {
  const mode = (await stat(canonicalPath)).mode & 0o777;
  if ((mode & 0o077) !== 0) throw new Error('owner_only_input_mode_required');
};
const fileIdentity = async (filePath) => {
  try {
    const metadata = await stat(filePath);
    return `${metadata.dev}:${metadata.ino}`;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const roots = await worktreeRoots();
  const canonicalInputs = [];
  const inputIdentities = [];
  for (const inputPath of [options.current, options.previous, options.existingCards].filter(Boolean)) {
    const canonical = await canonicalInputPath(inputPath);
    if (isInsideAnyWorktree(canonical, roots)) throw new Error('owner_only_input_must_be_outside_repo');
    await assertOwnerOnlyInput(canonical);
    canonicalInputs.push(canonical);
    inputIdentities.push(await fileIdentity(canonical));
  }
  const outPath = await canonicalOutputPath(options.out);
  if (isInsideAnyWorktree(outPath, roots)) throw new Error('owner_only_output_must_be_outside_repo');
  const outputParentMode = (await stat(dirname(outPath))).mode & 0o777;
  if ((outputParentMode & 0o077) !== 0) throw new Error('owner_only_output_parent_mode_required');
  const outputIdentity = await fileIdentity(outPath);
  if (
    canonicalInputs.includes(outPath)
    || (outputIdentity && inputIdentities.includes(outputIdentity))
  ) throw new Error('owner_only_output_must_differ_from_inputs');
  const report = await buildCrmVNextCommunityIntakeRegister({
    currentRegister: await readJson(canonicalInputs[0]),
    previousRegister: options.previous ? await readJson(canonicalInputs[1]) : null,
    existingCards: options.existingCards ? await readJson(canonicalInputs.at(-1)) : [],
  });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await chmod(outPath, 0o600);
  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    summary: report.summary,
    artifactWritten: true,
    authorityGranted: false,
  }));
};

main().catch((error) => {
  const allowlisted = new Set([
    'owner_only_input_must_be_outside_repo',
    'owner_only_output_must_be_outside_repo',
    'owner_only_input_mode_required',
    'owner_only_output_parent_mode_required',
    'owner_only_output_must_differ_from_inputs',
    'owner_only_symlink_prohibited',
    'owner_only_hardlink_prohibited',
    'current_and_out_required',
  ]);
  const code = allowlisted.has(error?.message) ? error.message : 'community_intake_failed_closed';
  console.error(`crm-vnext community-intake-register failed: ${code}`);
  process.exitCode = 1;
});
