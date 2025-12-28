/* eslint-disable no-console, unicorn/no-process-exit, unicorn/prefer-module, unicorn/prefer-top-level-await, unicorn/import-style */
import * as path from 'node:path';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import * as cp from 'node:child_process';

async function main(): Promise<void> {
  try {
    // Clear environment variables that cause issues with Electron on macOS
    delete process.env.ELECTRON_RUN_AS_NODE;
    const isCoverageRun = Boolean(
      process.env.NYC_PROCESS_ID || process.env.NYC_CONFIG || process.env.NYC_COVERAGE
    );
    if (!isCoverageRun) {
      delete process.env.NODE_OPTIONS;
    }

    const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code and resolve CLI path
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
    const [cliPath, ...cliArguments] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // Run tests using the CLI directly
    const result = cp.spawnSync(
      cliPath,
      [
        ...cliArguments,
        '--extensionDevelopmentPath=' + extensionDevelopmentPath,
        '--extensionTestsPath=' + extensionTestsPath,
        '--disable-extensions',
      ],
      {
        encoding: 'utf8',
        stdio: 'inherit',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: undefined,
          NODE_OPTIONS: isCoverageRun ? process.env.NODE_OPTIONS : undefined,
        },
      }
    );

    if (result.status !== 0) {
      throw new Error(`Test run failed with code ${result.status}`);
    }
  } catch (error) {
    console.error('Failed to run tests.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

void main();
