import { browser } from '@wdio/globals';

export const getWorkbench = async () => browser.getWorkbench();

export const executeWorkbenchCommand = async (command) => {
  await browser.executeWorkbench(async (vscode, commandName) => {
    await vscode.commands.executeCommand(commandName);
  }, command);
};

export const resetEditors = async () => {
  await browser.executeWorkbench(async (vscode) => {
    const dirtyDocuments = vscode.workspace.textDocuments.filter(
      (document) => document.isDirty && document.uri.scheme === 'file',
    );

    for (const document of dirtyDocuments) {
      await vscode.window.showTextDocument(document, { preview: false });
      await vscode.commands.executeCommand('workbench.action.files.revert');
    }

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
};

const getWorkspaceFileUri = async (fileName) =>
  browser.executeWorkbench(async (vscode, relativeFileName) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder available in VS Code test session.');
    }
    return vscode.Uri.joinPath(workspaceFolder.uri, relativeFileName).toString();
  }, fileName);

export const openWorkspaceFile = async (fileName) => {
  const workbench = await getWorkbench();
  await resetEditors();

  const documentUri = await getWorkspaceFileUri(fileName);
  await browser.executeWorkbench(async (vscode, serializedUri) => {
    const uri = vscode.Uri.parse(serializedUri);
    await vscode.commands.executeCommand('vscode.open', uri);
  }, documentUri);

  return workbench;
};

export const readEditorState = async () =>
  browser.executeWorkbench((vscode) => {
    const activeEditor = vscode.window.activeTextEditor;
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    let activeCustomViewType = null;
    let activeCustomUri = null;

    if (activeTab?.input instanceof vscode.TabInputCustom) {
      activeCustomViewType = activeTab.input.viewType;
      activeCustomUri = activeTab.input.uri.toString();
    }

    return {
      activeEditor: Boolean(activeEditor),
      languageId: activeEditor?.document.languageId ?? null,
      documentText: activeEditor?.document.getText() ?? null,
      activeTabLabel: activeTab?.label ?? '',
      tabGroups: vscode.window.tabGroups.all.length,
      activeCustomViewType,
      activeCustomUri,
      activeTextUri: activeEditor?.document.uri.toString() ?? null,
    };
  });

export const waitForCustomEditor = async (fileName) => {
  await browser.waitUntil(
    async () => {
      const state = await readEditorState();
      return (
        state.activeTabLabel.toLowerCase().includes(fileName.toLowerCase()) &&
        state.activeCustomViewType === 'muninn.markdownEditor'
      );
    },
    {
      timeout: 20_000,
      timeoutMsg: `Expected custom editor for ${fileName}`,
    },
  );
};

export const waitForRawEditor = async (fileName) => {
  await browser.waitUntil(
    async () => {
      const state = await readEditorState();
      return (
        state.activeTabLabel.toLowerCase().includes(fileName.toLowerCase()) &&
        state.activeEditor === true &&
        state.languageId === 'markdown'
      );
    },
    {
      timeout: 20_000,
      timeoutMsg: `Expected raw markdown editor for ${fileName}`,
    },
  );
};

export const readWorkspaceFileText = async (fileName) =>
  browser.executeWorkbench(async (vscode, relativeFileName) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder available in VS Code test session.');
    }

    const documentUri = vscode.Uri.joinPath(workspaceFolder.uri, relativeFileName);
    const document = await vscode.workspace.openTextDocument(documentUri);
    return document.getText();
  }, fileName);

export const waitForWorkspaceFileText = async (
  fileName,
  predicate,
  errorMessage,
  { attempts = 10, interval = 200 } = {},
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const text = await readWorkspaceFileText(fileName);
    if (predicate(text)) {
      return text;
    }
    await browser.pause(interval);
  }

  throw new Error(errorMessage);
};

export const executeWorkbenchCommandUntilWorkspaceFileText = async (
  fileName,
  command,
  predicate,
  errorMessage,
  { attempts = 8, interval = 200 } = {},
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await executeWorkbenchCommand(command);
    await browser.pause(interval);

    const text = await readWorkspaceFileText(fileName);
    if (predicate(text)) {
      return text;
    }
  }

  throw new Error(errorMessage);
};

const hasWebviewAppRoot = async () => {
  try {
    return await browser.execute(() => Boolean(document.querySelector('#app')));
  } catch {
    return false;
  }
};

const runWithOpenWebviewIfAppRoot = async (webview, runInWebview) => {
  await webview.open();
  try {
    if (!(await hasWebviewAppRoot())) {
      return false;
    }
    await runInWebview();
    return true;
  } finally {
    await webview.close();
  }
};

export const runInCustomEditorWebviewIfAvailable = async (runInWebview) => {
  const workbench = await getWorkbench();
  const webviews = await workbench.getAllWebviews();

  for (const webview of webviews) {
    if (await runWithOpenWebviewIfAppRoot(webview, runInWebview)) {
      return true;
    }
  }

  return false;
};

export const withCustomEditorWebview = async (runInWebview) => {
  await browser.waitUntil(
    async () => {
      const workbench = await getWorkbench();
      const webviews = await workbench.getAllWebviews();
      return webviews.length > 0;
    },
    {
      timeout: 15_000,
      timeoutMsg: 'Expected active custom editor webview.',
    },
  );

  const ranInWebview = await runInCustomEditorWebviewIfAvailable(runInWebview);
  if (!ranInWebview) {
    throw new Error('Active custom editor webview context not found.');
  }
};

export const waitForCustomEditorWebviewReady = async () => {
  await withCustomEditorWebview(async () => {
    const editor = await browser.$('.ProseMirror');
    await editor.waitForDisplayed({ timeout: 5_000 });
  });
  // Closing a VS Code webview detaches its inner frame asynchronously. Avoid
  // dispatching commands while WebDriver is still processing that detach event.
  await browser.pause(500);
};

export const executeWorkbenchCommandAndWaitForWorkspaceFileText = async (
  fileName,
  command,
  predicate,
  errorMessage,
) => {
  await waitForCustomEditorWebviewReady();
  await executeWorkbenchCommand(command);
  return waitForWorkspaceFileText(fileName, predicate, errorMessage);
};

export const executeWorkbenchCommandOnceAndWaitForWorkspaceFileText = async (
  fileName,
  command,
  predicate,
  errorMessage,
  options,
) => {
  await waitForCustomEditorWebviewReady();
  await executeWorkbenchCommand(command);
  return waitForWorkspaceFileText(fileName, predicate, errorMessage, options);
};
