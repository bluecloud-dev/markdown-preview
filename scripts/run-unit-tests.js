const fs = require('fs');
const path = require('path');
const Module = require('module');
const Mocha = require('mocha');

const helpersPath = path.resolve(__dirname, '..', 'tests', 'helpers');
process.env.NODE_PATH = helpersPath;
Module._initPaths();

const testsRoot = path.resolve(__dirname, '..', 'out', 'tests', 'unit');
if (!fs.existsSync(testsRoot)) {
  throw new Error('Compiled unit tests not found. Run npm run compile first.');
}

const testFiles = [];
const collectTests = (directory) => {
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

const mocha = new Mocha({ ui: 'bdd', color: true });
for (const testFile of testFiles) {
  mocha.addFile(testFile);
}

mocha.run((failures) => {
  if (failures > 0) {
    process.exitCode = 1;
  }
});
