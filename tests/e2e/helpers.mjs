import { browser } from '@wdio/globals';

export const getWorkbench = async () => browser.getWorkbench();

const originalWorkspaceFiles = new Map();

export const resetEditors = async () => {
  await browser.executeWorkbench(async (vscode) => {
    await vscode.workspace.saveAll(false);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
};

export const openWorkspaceFile = async (fileName) => {
  const workbench = await getWorkbench();
  const hadSnapshot = originalWorkspaceFiles.has(fileName);
  if (!hadSnapshot) {
    originalWorkspaceFiles.set(fileName, await readWorkspaceFileText(fileName));
  }
  await resetEditors();

  const originalContents = originalWorkspaceFiles.get(fileName);
  await browser.executeWorkbench(
    async (vscode, relativeFileName, contents, shouldRestore) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder available in VS Code test session.');
      }

      const documentUri = vscode.Uri.joinPath(workspaceFolder.uri, relativeFileName);
      if (shouldRestore) {
        await vscode.workspace.fs.writeFile(documentUri, new TextEncoder().encode(contents));
      }
      await vscode.commands.executeCommand('vscode.open', documentUri);
    },
    fileName,
    originalContents,
    hadSnapshot,
  );

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
    try {
      await webview.close();
    } catch (error) {
      // VS Code may have already torn down the webview iframe during editor
      // transitions; WebdriverIO then surfaces this as "invalid session id".
      if (!(error instanceof Error) || !error.message.includes('invalid session id')) {
        throw error;
      }
    }
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

export const executeUntil = async (
  command,
  predicate,
  errorMessage,
  { fileName = 'sample.md', attempts = 8, pauseMs = 200 } = {},
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await browser.executeWorkbench(async (vscode, commandName) => {
      await vscode.commands.executeCommand(commandName);
    }, command);
    await browser.pause(pauseMs);

    const text = await readWorkspaceFileText(fileName);
    if (predicate(text)) {
      return;
    }
  }

  throw new Error(errorMessage);
};

export const waitForWorkspaceMarkdown = async (
  predicate,
  errorMessage,
  { fileName = 'sample.md', attempts = 10, pauseMs = 200 } = {},
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const text = await readWorkspaceFileText(fileName);
    if (predicate(text)) {
      return text;
    }
    await browser.pause(pauseMs);
  }

  throw new Error(errorMessage);
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
