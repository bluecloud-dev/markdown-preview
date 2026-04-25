import fs from 'node:fs';
import { build, context } from 'esbuild';
import {
  assertInitialWebviewBudget,
  formatBytes,
  writeBundleMetadata,
} from './scripts/bundle-budget.mjs';

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');
const bundleMetadataPath = 'media/bundle-metadata.json';

const extensionBuildOptions = {
  entryPoints: {
    extension: 'src/extension.ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outdir: 'dist',
  entryNames: '[name]',
  external: ['vscode'],
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
};

const webviewBuildOptions = {
  entryPoints: {
    'editor-webview': 'src/webview/editor/index.ts',
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  splitting: true,
  target: ['chrome114'],
  outdir: 'media',
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  sourcemap: !isProduction,
  minify: isProduction,
  metafile: !isWatch,
  loader: {
    '.css': 'css',
  },
  logLevel: 'info',
};

const cleanBuildOutputs = () => {
  for (const directory of ['dist', 'media']) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

if (isWatch) {
  const [extensionContext, webviewContext] = await Promise.all([
    context(extensionBuildOptions),
    context(webviewBuildOptions),
  ]);
  await Promise.all([extensionContext.watch(), webviewContext.watch()]);
} else {
  cleanBuildOutputs();
  const [, webviewResult] = await Promise.all([
    build(extensionBuildOptions),
    build(webviewBuildOptions),
  ]);
  const budget = assertInitialWebviewBudget(webviewResult.metafile);
  writeBundleMetadata({
    metafile: webviewResult.metafile,
    budget,
    outputPath: bundleMetadataPath,
    production: isProduction,
  });
  console.log(
    `Initial webview payload ${formatBytes(budget.initialBytes)} ` +
      `(budget ${formatBytes(budget.budgetBytes)})`,
  );
}
