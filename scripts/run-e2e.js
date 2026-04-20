const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const now = new Date();
const timestamp = now
  .toISOString()
  .replaceAll(':', '')
  .replaceAll('.', '')
  .replace('T', '-')
  .slice(0, 15);

if (!process.env.WDIO_RUN_ID) {
  process.env.WDIO_RUN_ID = `${timestamp}-${Math.random().toString(16).slice(2, 8)}`;
}

if (!process.env.E2E_VIDEO) {
  process.env.E2E_VIDEO = process.env.CI === 'true' ? '1' : '0';
}

delete process.env.ELECTRON_RUN_AS_NODE;
if (!process.env.NYC_PROCESS_ID && !process.env.NYC_CONFIG && !process.env.NYC_COVERAGE) {
  delete process.env.NODE_OPTIONS;
}

const cliPath = path.join(__dirname, '..', 'node_modules', '@wdio', 'cli', 'bin', 'wdio.js');
const repoRoot = path.join(__dirname, '..');
const userArgs = process.argv.slice(2);
const hasSpecSelection = userArgs.some(
  (arg) =>
    arg === '--spec' ||
    arg.startsWith('--spec=') ||
    arg === '--suite' ||
    arg.startsWith('--suite='),
);
const hasMaxInstancesArg = userArgs.some((arg, index) => {
  if (arg === '--maxInstances') {
    return true;
  }

  if (arg.startsWith('--maxInstances=')) {
    return true;
  }

  if (arg === '-m') {
    return true;
  }

  return userArgs[index - 1] === '--maxInstances' || userArgs[index - 1] === '-m';
});

const defaultSpecs = !hasSpecSelection
  ? fs
      .readdirSync(path.join(repoRoot, 'tests', 'e2e'))
      .filter((entry) => entry.endsWith('.e2e.mjs'))
      .sort()
      .map((entry) => `./tests/e2e/${entry}`)
  : [null];

const runWdio = (spec, runId) => {
  const args = [cliPath, 'run', './wdio.conf.cjs'];
  if (!hasMaxInstancesArg) {
    // Keep desktop E2E deterministic by default; users can still override with --maxInstances.
    args.push('--maxInstances', '1');
  }

  if (spec) {
    args.push('--spec', spec);
  }

  args.push(...userArgs);

  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      WDIO_RUN_ID: runId,
    },
  });
};

let exitCode = 0;
for (const spec of defaultSpecs) {
  const suffix = spec ? `-${path.basename(spec, '.e2e.mjs')}` : '';
  const runId = `${process.env.WDIO_RUN_ID}${suffix}`;
  const result = runWdio(spec, runId);
  exitCode = result.status ?? 1;
  if (exitCode !== 0) {
    break;
  }
}

process.exit(exitCode);
