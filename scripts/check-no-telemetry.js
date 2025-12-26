const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const matches = [];
for (const file of walk(srcDir)) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.toLowerCase().includes('telemetry')) {
    matches.push(file);
  }
}

if (matches.length > 0) {
  console.error('Telemetry references found in:');
  for (const file of matches) {
    console.error(`- ${path.relative(root, file)}`);
  }
  process.exit(1);
}
