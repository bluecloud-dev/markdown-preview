import * as vscode from 'vscode';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
  throw new Error('Timed out waiting for save chain condition.');
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

const openInCustomEditor = async (fileName: string): Promise<vscode.TextDocument> => {
  const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
  expect(extension).to.not.equal(undefined);
  await extension?.activate();

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  expect(workspaceFolder, 'expected integration workspace folder').to.not.equal(undefined);

  const uri = vscode.Uri.joinPath(workspaceFolder!.uri, fileName);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.commands.executeCommand('vscode.open', uri);
  await waitFor(() => getActiveCustomViewType() === 'muninn.markdownEditor');
  return document;
};

const insertMermaidUntilApplied = async (document: vscode.TextDocument): Promise<void> => {
  let inserted = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await vscode.commands.executeCommand('muninn.insertMermaidBlock');
    await sleep(250);
    if (document.getText().includes('```mermaid')) {
      inserted = true;
      break;
    }
  }
  expect(inserted, 'expected mermaid block to be inserted via webview round trip').to.equal(true);
};

const readDiskText = async (document: vscode.TextDocument): Promise<string> => {
  const bytes = await vscode.workspace.fs.readFile(document.uri);
  return new TextDecoder().decode(bytes);
};

describe('Integration CLI: save chain', () => {
  it('marks the document dirty after a webview edit and persists it on save', async () => {
    const document = await openInCustomEditor('save-pipeline.md');

    await insertMermaidUntilApplied(document);
    expect(document.isDirty, 'webview edit must dirty the TextDocument').to.equal(true);

    await vscode.commands.executeCommand('workbench.action.files.save');
    await waitFor(() => !document.isDirty);

    const diskText = await readDiskText(document);
    expect(diskText).to.include('```mermaid');
    expect(diskText).to.include('Alpha bravo charlie delta.');
  });

  it('persists webview edits through autosave without an explicit save', async () => {
    const filesConfiguration = vscode.workspace.getConfiguration('files');
    await filesConfiguration.update('autoSave', 'afterDelay', vscode.ConfigurationTarget.Global);
    await filesConfiguration.update('autoSaveDelay', 200, vscode.ConfigurationTarget.Global);

    try {
      const document = await openInCustomEditor('save-pipeline-autosave.md');

      await insertMermaidUntilApplied(document);
      await waitFor(() => !document.isDirty);

      const diskText = await readDiskText(document);
      expect(diskText).to.include('```mermaid');
      expect(diskText).to.include('Echo foxtrot golf hotel.');
    } finally {
      await filesConfiguration.update('autoSave', 'off', vscode.ConfigurationTarget.Global);
      await filesConfiguration.update(
        'autoSaveDelay',
        undefined,
        vscode.ConfigurationTarget.Global,
      );
    }
  });
});
