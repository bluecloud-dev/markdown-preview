import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_WEBVIEW_ENTRY_POINT = 'src/webview/editor/index.ts';
export const MILESTONE3_INITIAL_WEBVIEW_BYTES = 3_197_004;
export const DEFAULT_MINIMUM_REDUCTION_RATIO = 0.25;

const isRecord = (value) => typeof value === 'object' && value !== null;

export const formatBytes = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kib = bytes / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }

  return `${(kib / 1024).toFixed(2)} MiB`;
};

const getOutputs = (metafile) => {
  if (!isRecord(metafile) || !isRecord(metafile.outputs)) {
    throw new Error('esbuild metafile is missing an outputs object.');
  }

  return metafile.outputs;
};

const readOutputBytes = (outputPath, output) => {
  if (!isRecord(output) || typeof output.bytes !== 'number' || !Number.isFinite(output.bytes)) {
    throw new Error(`esbuild output ${outputPath} is missing a finite byte count.`);
  }

  return output.bytes;
};

const findEntryOutput = (outputs, entryPoint) => {
  for (const [outputPath, output] of Object.entries(outputs)) {
    if (isRecord(output) && output.entryPoint === entryPoint) {
      return [outputPath, output];
    }
  }

  throw new Error(`Unable to find webview entry output for ${entryPoint}.`);
};

export const collectInitialWebviewOutputs = (
  metafile,
  entryPoint = DEFAULT_WEBVIEW_ENTRY_POINT,
) => {
  const outputs = getOutputs(metafile);
  const [entryOutputPath, entryOutput] = findEntryOutput(outputs, entryPoint);
  const includedOutputs = [
    {
      path: entryOutputPath,
      bytes: readOutputBytes(entryOutputPath, entryOutput),
      kind: 'script',
    },
  ];

  if (typeof entryOutput.cssBundle === 'string') {
    const cssOutput = outputs[entryOutput.cssBundle];
    if (!cssOutput) {
      throw new Error(`Webview CSS bundle ${entryOutput.cssBundle} is missing from metafile.`);
    }

    includedOutputs.push({
      path: entryOutput.cssBundle,
      bytes: readOutputBytes(entryOutput.cssBundle, cssOutput),
      kind: 'style',
    });
  }

  return includedOutputs;
};

export const assertInitialWebviewBudget = (metafile, options = {}) => {
  const baselineBytes = options.baselineBytes ?? MILESTONE3_INITIAL_WEBVIEW_BYTES;
  const minimumReductionRatio = options.minimumReductionRatio ?? DEFAULT_MINIMUM_REDUCTION_RATIO;
  const entryPoint = options.entryPoint ?? DEFAULT_WEBVIEW_ENTRY_POINT;

  if (baselineBytes <= 0 || !Number.isFinite(baselineBytes)) {
    throw new Error('Initial webview baseline must be a positive finite byte count.');
  }
  if (
    minimumReductionRatio < 0 ||
    minimumReductionRatio >= 1 ||
    !Number.isFinite(minimumReductionRatio)
  ) {
    throw new Error('Initial webview reduction ratio must be a finite value from 0 to 1.');
  }

  const includedOutputs = collectInitialWebviewOutputs(metafile, entryPoint);
  const initialBytes = includedOutputs.reduce((total, output) => total + output.bytes, 0);
  const budgetBytes = Math.floor(baselineBytes * (1 - minimumReductionRatio));
  const reductionRatio = (baselineBytes - initialBytes) / baselineBytes;

  if (initialBytes > budgetBytes) {
    throw new Error(
      `Initial webview payload is ${formatBytes(initialBytes)}, budget is ${formatBytes(
        budgetBytes,
      )} (${Math.round(minimumReductionRatio * 100)}% reduction from ${formatBytes(
        baselineBytes,
      )} baseline).`,
    );
  }

  return {
    baselineBytes,
    budgetBytes,
    initialBytes,
    reductionRatio,
    includedOutputs,
  };
};

export const writeBundleMetadata = ({
  metafile,
  budget,
  outputPath,
  production,
  generatedAt = new Date().toISOString(),
}) => {
  const outputs = Object.fromEntries(
    Object.entries(getOutputs(metafile)).map(([filePath, output]) => [
      filePath,
      {
        bytes: readOutputBytes(filePath, output),
        entryPoint: isRecord(output) ? output.entryPoint : undefined,
        imports: isRecord(output) ? output.imports : undefined,
        cssBundle: isRecord(output) ? output.cssBundle : undefined,
      },
    ]),
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt,
        production,
        initialWebviewBudget: budget,
        outputs,
      },
      null,
      2,
    )}\n`,
  );
};
