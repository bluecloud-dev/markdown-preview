#!/usr/bin/env node

console.log(
  'Skipping web tests: this extension does not currently expose a web entry point (no package.json `browser` field).',
);
process.exit(0);
