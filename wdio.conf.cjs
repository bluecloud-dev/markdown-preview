const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

if (!process.env.WDIO_RUN_ID) {
  process.env.WDIO_RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const date = new Date().toISOString().slice(0, 10);
const runId = process.env.WDIO_RUN_ID;
const runKey = crypto.createHash('sha1').update(runId).digest('hex').slice(0, 12);
const artifactsBaseDir = path.join(__dirname, 'artifacts', 'e2e', date, runId);
const screenshotsDir = path.join(artifactsBaseDir, 'screenshots');
const logsDir = path.join(artifactsBaseDir, 'logs');
const junitDir = path.join(artifactsBaseDir, 'junit');
const videosDir = path.join(artifactsBaseDir, 'videos');
const videoRawDir = path.join(artifactsBaseDir, 'video-raw');
const e2eRunRoot = path.join('/tmp', 'mn-e2e', runKey);
const workspacePath = path.join(e2eRunRoot, 'workspace');
const fixturesPath = path.join(__dirname, 'tests', 'fixtures');

fs.mkdirSync(artifactsBaseDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(junitDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(videoRawDir, { recursive: true });
fs.mkdirSync(e2eRunRoot, { recursive: true });
if (fs.existsSync(workspacePath)) {
  fs.rmSync(workspacePath, { recursive: true, force: true });
}
fs.cpSync(fixturesPath, workspacePath, { recursive: true });

const sanitize = (value) => value.replaceAll(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
const enableVideoReporter = process.env.E2E_VIDEO === '1' || process.env.CI === 'true';
const reporters = [
  'spec',
  [
    'junit',
    {
      outputDir: junitDir,
      outputFileFormat: (options) => `wdio-${options.cid}.xml`,
    },
  ],
];

if (enableVideoReporter) {
  reporters.push([
    'video',
    {
      saveAllVideos: false,
      videoSlowdownMultiplier: 3,
      outputDir: videosDir,
      rawPath: videoRawDir,
    },
  ]);
}

exports.config = {
  runner: 'local',
  specs: ['./tests/e2e/**/*.e2e.mjs'],
  maxInstances: 1,
  maxInstancesPerCapability: 1,
  logLevel: process.env.CI ? 'warn' : 'info',
  outputDir: logsDir,
  bail: 0,
  waitforTimeout: 15_000,
  connectionRetryTimeout: 60_000,
  connectionRetryCount: 0,
  specFileRetries: 0,
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 180_000,
  },
  capabilities: [
    {
      browserName: 'vscode',
      browserVersion: process.env.VSCODE_VERSION ?? 'stable',
      'wdio:maxInstances': 1,
      'wdio:enforceWebDriverClassic': true,
      'wdio:chromedriverOptions': {
        verbose: true,
      },
      'wdio:vscodeOptions': {
        extensionPath: __dirname,
        workspacePath,
        storagePath: path.join(e2eRunRoot, 'storage'),
        verboseLogging: true,
        userSettings: {
          'security.workspace.trust.enabled': false,
          'workbench.startupEditor': 'none',
          'window.commandCenter': false,
          'window.newWindowDimensions': 'default',
          'window.restoreFullscreen': false,
        },
        vscodeArgs: {},
      },
    },
  ],
  services: [
    [
      path.join(__dirname, 'tests/e2e/services/vscode-direct-service.mjs'),
      { cachePath: path.join(__dirname, '.vscode-test') },
    ],
  ],
  reporters,
  afterTest: async (test, _context, result) => {
    if (result.passed) {
      return;
    }

    const specName = sanitize(path.basename(test.file || 'unknown-spec'));
    const testName = sanitize(test.fullTitle || test.title || 'unknown-test');
    const targetDir = path.join(screenshotsDir, specName);
    fs.mkdirSync(targetDir, { recursive: true });

    try {
      const screenshotBase64 = await browser.takeScreenshot();
      if (typeof screenshotBase64 === 'string' && screenshotBase64.length > 0) {
        fs.writeFileSync(
          path.join(targetDir, `${testName}.png`),
          Buffer.from(screenshotBase64, 'base64'),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[wdio] Failed to capture screenshot for "${testName}": ${message}`);
    }
  },
};
