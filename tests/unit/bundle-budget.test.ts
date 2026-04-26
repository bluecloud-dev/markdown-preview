import { pathToFileURL } from 'node:url';
import path from 'node:path';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

type BundleBudgetModule = {
  assertInitialWebviewBudget: (
    metafile: unknown,
    options?: {
      baselineBytes?: number;
      minimumReductionRatio?: number;
      entryPoint?: string;
    },
  ) => {
    baselineBytes: number;
    budgetBytes: number;
    initialBytes: number;
    reductionRatio: number;
    includedOutputs: Array<{ path: string; bytes: number; kind: string }>;
  };
};

const loadBundleBudget = async (): Promise<BundleBudgetModule> => {
  const modulePath = path.resolve(__dirname, '..', '..', '..', 'scripts', 'bundle-budget.mjs');
  return (await import(pathToFileURL(modulePath).href)) as BundleBudgetModule;
};

describe('webview bundle budget', () => {
  it('calculates the initial webview payload from the entry output and CSS only', async () => {
    const { assertInitialWebviewBudget } = await loadBundleBudget();

    const result = assertInitialWebviewBudget(
      {
        outputs: {
          'media/editor-webview.js': {
            entryPoint: 'src/webview/editor/index.ts',
            bytes: 650,
            cssBundle: 'media/editor-webview.css',
            imports: [{ path: 'media/chunks/mermaid-AAAA.js', kind: 'dynamic-import' }],
          },
          'media/editor-webview.css': {
            bytes: 50,
          },
          'media/chunks/mermaid-AAAA.js': {
            bytes: 2000,
          },
        },
      },
      {
        baselineBytes: 1000,
        minimumReductionRatio: 0.25,
      },
    );

    expect(result.initialBytes).to.equal(700);
    expect(result.budgetBytes).to.equal(750);
    expect(result.reductionRatio).to.equal(0.3);
    expect(result.includedOutputs).to.deep.equal([
      { path: 'media/editor-webview.js', bytes: 650, kind: 'script' },
      { path: 'media/editor-webview.css', bytes: 50, kind: 'style' },
    ]);
  });

  it('fails when the initial webview payload does not beat the configured reduction target', async () => {
    const { assertInitialWebviewBudget } = await loadBundleBudget();

    expect(() =>
      assertInitialWebviewBudget(
        {
          outputs: {
            'media/editor-webview.js': {
              entryPoint: 'src/webview/editor/index.ts',
              bytes: 801,
            },
          },
        },
        {
          baselineBytes: 1000,
          minimumReductionRatio: 0.25,
        },
      ),
    ).to.throw(/Initial webview payload is 801 B, budget is 750 B/);
  });
});
