import { browser } from '@wdio/globals';

export const getWorkbench = async () => browser.getWorkbench();

export const resetEditors = async () => {
  await browser.executeWorkbench(async (vscode) => {
    const dirtyDocuments = vscode.workspace.textDocuments.filter(
      (document) => document.isDirty && document.uri.scheme === 'file'
    );

    for (const document of dirtyDocuments) {
      await vscode.window.showTextDocument(document, { preview: false });
      await vscode.commands.executeCommand('workbench.action.files.revert');
    }

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
};

export const focusWorkspaceFile = async (fileName) => {
  await browser.executeWorkbench(
    async (vscode, relativeFileName) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder available in VS Code test session.');
      }

      const documentUri = vscode.Uri.joinPath(workspaceFolder.uri, relativeFileName);
      const doc = await vscode.workspace.openTextDocument(documentUri);
      await vscode.window.showTextDocument(doc, { preview: false });
    },
    fileName
  );
};

export const openWorkspaceFile = async (fileName) => {
  const workbench = await getWorkbench();
  await resetEditors();
  await focusWorkspaceFile(fileName);
  return workbench;
};

export const readEditorState = async () =>
  browser.executeWorkbench((vscode) => {
    const activeEditor = vscode.window.activeTextEditor;
    return {
      activeEditor: Boolean(activeEditor),
      languageId: activeEditor?.document.languageId ?? null,
      documentText: activeEditor?.document.getText() ?? null,
      activeTabLabel: vscode.window.tabGroups.activeTabGroup.activeTab?.label ?? '',
      tabGroups: vscode.window.tabGroups.all.length,
    };
  });

export const waitForPreviewMode = async (fileName) => {
  await browser.waitUntil(
    async () => {
      const state = await readEditorState();
      return (
        state.activeTabLabel.toLowerCase().includes(fileName.toLowerCase()) &&
        state.activeEditor === false
      );
    },
    {
      timeout: 20_000,
      timeoutMsg: `Expected preview mode for ${fileName}`,
    }
  );
};

export const waitForEditMode = async () => {
  await browser.waitUntil(
    async () => {
      const state = await readEditorState();
      return state.activeEditor && state.languageId === 'markdown';
    },
    {
      timeout: 20_000,
      timeoutMsg: 'Expected markdown text editor in edit mode',
    }
  );
};
