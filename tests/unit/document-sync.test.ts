import * as vscode from 'vscode';
import {
  DocumentSync,
  reconcileTrailingNewlineForApply,
} from '../../src/custom-editor/document-sync';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

type ReplaceOperation = {
  uri: vscode.Uri;
  range: vscode.Range;
  text: string;
};

type InspectableWorkspaceEdit = vscode.WorkspaceEdit & {
  replacements: ReplaceOperation[];
};

describe('DocumentSync', () => {
  const workspaceWithApplyEdit = vscode.workspace as unknown as {
    applyEdit?: (edit: vscode.WorkspaceEdit) => Promise<boolean>;
  };
  const originalApplyEdit = workspaceWithApplyEdit.applyEdit;

  afterEach(() => {
    workspaceWithApplyEdit.applyEdit = originalApplyEdit;
  });

  it('reconciles serializer-dropped final newlines without inventing new ones', () => {
    expect(reconcileTrailingNewlineForApply('# before\n', '# after')).to.equal('# after\n');
    expect(reconcileTrailingNewlineForApply('# before\n', '# after\n')).to.equal('# after\n');
    expect(reconcileTrailingNewlineForApply('# before', '# after')).to.equal('# after');
    expect(reconcileTrailingNewlineForApply('', '# after')).to.equal('# after');
    expect(reconcileTrailingNewlineForApply('\n', '')).to.equal('\n');
  });

  it('returns snapshots and increments revision for matching document changes', () => {
    const uri = vscode.Uri.file('/workspace/snapshot.md');
    const document = {
      uri,
      getText: () => '# hello',
      lineCount: 1,
      lineAt: () => ({
        range: { end: new vscode.Position(0, 7) },
      }),
    } as unknown as vscode.TextDocument;

    const sync = new DocumentSync(document);

    expect(sync.getSnapshot()).to.deep.equal({
      markdown: '# hello',
      revision: 0,
    });

    const changed = sync.handleDocumentChanged({
      document,
    } as vscode.TextDocumentChangeEvent);
    expect(changed).to.deep.equal({
      markdown: '# hello',
      revision: 1,
    });

    const otherDocument = {
      uri: vscode.Uri.file('/workspace/other.md'),
    } as vscode.TextDocument;
    const unchanged = sync.handleDocumentChanged({
      document: otherDocument,
    } as vscode.TextDocumentChangeEvent);
    expect(unchanged).to.equal(undefined);
  });

  it('returns revision mismatch when expected revision is stale', async () => {
    const uri = vscode.Uri.file('/workspace/revision.md');
    const document = {
      uri,
      getText: () => '# latest',
      lineCount: 1,
      lineAt: () => ({
        range: { end: new vscode.Position(0, 8) },
      }),
    } as unknown as vscode.TextDocument;

    const sync = new DocumentSync(document);
    sync.handleDocumentChanged({ document } as vscode.TextDocumentChangeEvent);

    const result = await sync.applyDocument('# latest', 0);
    expect(result).to.deep.equal({
      ok: false,
      code: 'revision_mismatch',
      message: 'Revision mismatch. expected=0 current=1',
    });
  });

  it('skips workspace edits when markdown is unchanged', async () => {
    const uri = vscode.Uri.file('/workspace/unchanged.md');
    const document = {
      uri,
      getText: () => '# unchanged',
      lineCount: 1,
      lineAt: () => ({
        range: { end: new vscode.Position(0, 11) },
      }),
    } as unknown as vscode.TextDocument;

    const sync = new DocumentSync(document);
    const result = await sync.applyDocument('# unchanged', 0);
    expect(result).to.deep.equal({ ok: true });
  });

  it('applies markdown edits and reports host failures', async () => {
    const appliedEdits: InspectableWorkspaceEdit[] = [];
    workspaceWithApplyEdit.applyEdit = async (edit: vscode.WorkspaceEdit) => {
      appliedEdits.push(edit as InspectableWorkspaceEdit);
      return true;
    };

    const uri = vscode.Uri.file('/workspace/apply.md');
    const document = {
      uri,
      getText: () => '# before',
      lineCount: 1,
      lineAt: () => ({
        range: { end: new vscode.Position(0, 8) },
      }),
    } as unknown as vscode.TextDocument;

    const sync = new DocumentSync(document);
    const success = await sync.applyDocument('# after', 0);
    expect(success).to.deep.equal({ ok: true });
    expect(appliedEdits.length).to.equal(1);
    expect(appliedEdits[0]?.replacements.length).to.equal(1);
    expect(appliedEdits[0]?.replacements[0]?.uri.toString()).to.equal(uri.toString());
    expect(appliedEdits[0]?.replacements[0]?.text).to.equal('# after');
    expect(appliedEdits[0]?.replacements[0]?.range.start.line).to.equal(0);
    expect(appliedEdits[0]?.replacements[0]?.range.end.character).to.equal(8);

    workspaceWithApplyEdit.applyEdit = async () => false;
    const failed = await sync.applyDocument('# failed', 0);
    expect(failed).to.deep.equal({
      ok: false,
      code: 'apply_failed',
      message: 'VS Code failed to apply the markdown update.',
    });
  });

  it('preserves the current document final-newline state when applying serialized markdown', async () => {
    const appliedEdits: InspectableWorkspaceEdit[] = [];
    workspaceWithApplyEdit.applyEdit = async (edit: vscode.WorkspaceEdit) => {
      appliedEdits.push(edit as InspectableWorkspaceEdit);
      return true;
    };

    const cases = [
      {
        name: 'had final newline',
        current: '# before\n',
        serialized: '# after',
        applied: '# after\n',
      },
      {
        name: 'had no final newline',
        current: '# before',
        serialized: '# after',
        applied: '# after',
      },
      { name: 'empty document', current: '', serialized: '# after', applied: '# after' },
      { name: 'single newline document', current: '\n', serialized: '', applied: '\n' },
    ];

    for (const testCase of cases) {
      const uri = vscode.Uri.file(`/workspace/${testCase.name.replaceAll(' ', '-')}.md`);
      const lines = testCase.current.split('\n');
      const document = {
        uri,
        getText: () => testCase.current,
        lineCount: lines.length,
        lineAt: (line: number) => ({
          range: { end: new vscode.Position(line, lines[line]?.length ?? 0) },
        }),
      } as unknown as vscode.TextDocument;

      const sync = new DocumentSync(document);
      const beforeCount = appliedEdits.length;
      const result = await sync.applyDocument(testCase.serialized, 0);

      expect(result, testCase.name).to.deep.equal({ ok: true });
      expect(appliedEdits.length, testCase.name).to.equal(beforeCount + 1);
      expect(appliedEdits.at(-1)?.replacements[0]?.text, testCase.name).to.equal(testCase.applied);
    }
  });
});
