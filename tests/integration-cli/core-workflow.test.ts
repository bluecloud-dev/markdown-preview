import * as vscode from 'vscode';
import sinon from 'sinon';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeNewlines = (value: string): string => value.replaceAll('\r\n', '\n');

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 15_000,
  intervalMs = 100,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error('Timed out waiting for integration workflow condition.');
};

const getActiveCustomViewType = (): string | undefined => {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (!tab) {
    return undefined;
  }
  if (tab.input instanceof vscode.TabInputCustom) {
    return tab.input.viewType;
  }
  return undefined;
};

describe('Integration CLI: core workflow', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('opens markdown in custom editor, applies editor commands, and can open raw source', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
    expect(extension).to.not.equal(undefined);
    await extension?.activate();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    expect(workspaceFolder, 'expected integration workspace folder').to.not.equal(undefined);

    const uri = vscode.Uri.joinPath(workspaceFolder!.uri, 'with-formatting.md');
    const document = await vscode.workspace.openTextDocument(uri);

    await vscode.commands.executeCommand('vscode.open', uri);
    await waitFor(() => getActiveCustomViewType() === 'muninn.markdownEditor');

    let inserted = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await vscode.commands.executeCommand('muninn.insertMermaidBlock');
      await sleep(250);
      const text = document.getText();
      if (text.includes('A[Start] --> B[Finish]') || text.includes('```mermaid')) {
        inserted = true;
        break;
      }
    }
    expect(inserted).to.equal(true);

    await vscode.commands.executeCommand('muninn.openRawMarkdown');
    await waitFor(
      () =>
        vscode.window.activeTextEditor?.document.uri.toString() === uri.toString() &&
        vscode.window.activeTextEditor?.document.languageId === 'markdown',
    );

    expect(vscode.window.activeTextEditor?.document.uri.toString()).to.equal(uri.toString());
  });

  it('keeps markdown table blocks intact after command-driven document rewrites', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
    expect(extension).to.not.equal(undefined);
    await extension?.activate();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    expect(workspaceFolder, 'expected integration workspace folder').to.not.equal(undefined);

    const uri = vscode.Uri.joinPath(workspaceFolder!.uri, 'table.md');
    const document = await vscode.workspace.openTextDocument(uri);

    await vscode.commands.executeCommand('vscode.open', uri);
    await waitFor(() => getActiveCustomViewType() === 'muninn.markdownEditor');

    let commandApplied = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await vscode.commands.executeCommand('muninn.insertMermaidBlock');
      await sleep(250);
      if (
        document.getText().includes('A[Start] --> B[Finish]') ||
        document.getText().includes('```mermaid')
      ) {
        commandApplied = true;
        break;
      }
    }
    expect(commandApplied).to.equal(true);

    const text = normalizeNewlines(document.getText());
    expect(text).to.include('| Name | Value |');
    expect(text).to.include('| --- | --- |');
    expect(text).to.include('\n| A | 1 |\n');
    expect(text.includes('| Name | Value | | --- | --- |')).to.equal(false);
  });

  it('supports prompt-driven link and code block insertion commands', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
    expect(extension).to.not.equal(undefined);
    await extension?.activate();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    expect(workspaceFolder, 'expected integration workspace folder').to.not.equal(undefined);

    const uri = vscode.Uri.joinPath(workspaceFolder!.uri, 'with-formatting.md');
    const document = await vscode.workspace.openTextDocument(uri);

    await vscode.commands.executeCommand('vscode.open', uri);
    await waitFor(() => getActiveCustomViewType() === 'muninn.markdownEditor');

    const inputStub = sinon
      .stub(vscode.window, 'showInputBox')
      .resolves('https://example.com/docs');
    const quickPickStub = sinon.stub(vscode.window, 'showQuickPick').resolves();
    const initialFenceCount = document.getText().match(/^```/gm)?.length ?? 0;

    await vscode.commands.executeCommand('muninn.insertLink');
    await waitFor(() => document.getText().includes('https://example.com/docs'));

    await vscode.commands.executeCommand('muninn.insertCodeBlock');
    await waitFor(() => (document.getText().match(/^```/gm)?.length ?? 0) > initialFenceCount);

    expect(inputStub.called).to.equal(true);
    expect(quickPickStub.called).to.equal(false);
  });

  it('routes table action quick pick commands to the active custom editor', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
    expect(extension).to.not.equal(undefined);
    await extension?.activate();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    expect(workspaceFolder, 'expected integration workspace folder').to.not.equal(undefined);

    const uri = vscode.Uri.joinPath(workspaceFolder!.uri, 'table.md');
    const document = await vscode.workspace.openTextDocument(uri);

    await vscode.commands.executeCommand('vscode.open', uri);
    await waitFor(() => getActiveCustomViewType() === 'muninn.markdownEditor');

    const quickPickStub = sinon.stub(vscode.window, 'showQuickPick').callsFake(async (items) => {
      const typedItems = items as ReadonlyArray<{ command?: string }>;
      return typedItems.find((item) => item.command === 'insertTable') as
        | vscode.QuickPickItem
        | undefined;
    });

    let commandApplied = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await vscode.commands.executeCommand('muninn.tableActions');
      await sleep(250);
      if (document.getText().includes('| Column 1 | Column 2 |')) {
        commandApplied = true;
        break;
      }
    }

    expect(quickPickStub.called).to.equal(true);
    expect(commandApplied).to.equal(true);
  });
});
