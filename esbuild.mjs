import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

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
  format: 'iife',
  target: ['chrome114'],
  outdir: 'media',
  entryNames: '[name]',
  sourcemap: !isProduction,
  minify: isProduction,
  loader: {
    '.css': 'css',
  },
  logLevel: 'info',
};

if (isWatch) {
  const [extensionContext, webviewContext] = await Promise.all([
    context(extensionBuildOptions),
    context(webviewBuildOptions),
  ]);
  await Promise.all([extensionContext.watch(), webviewContext.watch()]);
} else {
  await Promise.all([build(extensionBuildOptions), build(webviewBuildOptions)]);
}
