import fs from 'node:fs';
import path from 'node:path';
import VSCodeWorkerService, { launcher as vscodeLauncher } from 'wdio-vscode-service';

class VSCodeDirectWorkerService extends VSCodeWorkerService {
  async beforeSession(options, capabilities) {
    // Keep Electron startup env aligned with the integration test runner.
    delete process.env.ELECTRON_RUN_AS_NODE;
    if (!process.env.NYC_PROCESS_ID && !process.env.NYC_CONFIG && !process.env.NYC_COVERAGE) {
      delete process.env.NODE_OPTIONS;
    }

    const vscodeOptions = capabilities['wdio:vscodeOptions'];
    if (vscodeOptions?.storagePath && vscodeOptions?.workspacePath) {
      const workerId = (process.env.WDIO_WORKER_ID ?? '0-0').replaceAll(/[^a-zA-Z0-9._-]/g, '_');
      const baseRoot = path.dirname(vscodeOptions.storagePath);
      const workerRoot = `${baseRoot}-${workerId}`;
      const workerWorkspacePath = path.join(workerRoot, 'workspace');
      const workerStoragePath = path.join(workerRoot, 'storage');

      fs.rmSync(workerRoot, { recursive: true, force: true });
      fs.mkdirSync(workerRoot, { recursive: true });
      fs.cpSync(vscodeOptions.workspacePath, workerWorkspacePath, { recursive: true });

      vscodeOptions.workspacePath = workerWorkspacePath;
      vscodeOptions.storagePath = workerStoragePath;
    }

    await super.beforeSession(options, capabilities);

    const chromeOptions = capabilities['goog:chromeOptions'];

    if (!chromeOptions) {
      return;
    }

    // Avoid a Chromedriver/Electron compatibility issue around `windowTypes`.
    // Some versions fail to create sessions with `["webview"]`, while others
    // reject `"window"` as an unknown type. Let Chromedriver pick defaults.
    delete chromeOptions.windowTypes;
  }
}

export default VSCodeDirectWorkerService;
export const launcher = vscodeLauncher;
