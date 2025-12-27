import fs from 'node:fs';
import path from 'node:path';
import Mocha from 'mocha';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
  });

  const testsRoot = path.resolve(__dirname, '..');
  const testFiles: string[] = [];

  const collectTests = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        collectTests(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.test.js')) {
        testFiles.push(entryPath);
      }
    }
  };

  collectTests(testsRoot);
  for (const testFile of testFiles) {
    mocha.addFile(testFile);
  }

  return new Promise((resolve, reject) => {
    mocha.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
        return;
      }
      resolve();
    });
  });
}
