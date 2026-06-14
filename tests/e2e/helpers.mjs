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

const waitForActiveCustomEditor = async () => {
  await browser.waitUntil(
    async () => {
      const state = await readEditorState();
      return state.activeCustomViewType === 'muninn.markdownEditor';
    },
    {
      timeout: 20_000,
      timeoutMsg: 'Expected Muninn custom editor to be active.',
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
  { attempts = 10, interval = 200, beforeRead } = {},
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (beforeRead) {
      await beforeRead();
    }

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
    await waitForCustomEditorWebviewReady();
    await executeWorkbenchCommand(command);
    await browser.pause(interval);

    await waitForCustomEditorWebviewReady();
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

export const isRetryableWebviewError = (error) => {
  const message = String(error?.message ?? error).toLowerCase();
  return (
    message.includes('stale element') ||
    message.includes('invalid session id') ||
    message.includes('detached') ||
    message.includes('frame') ||
    message.includes('target closed') ||
    message.includes('target window already closed') ||
    message.includes('no such window') ||
    message.includes('web view not found')
  );
};

const runWithRetryableWebviewErrors = async (operationName, run) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isRetryableWebviewError(error) || attempt === 2) {
        throw error;
      }

      console.warn(
        `[wdio] Retrying ${operationName} after transient webview lifecycle error (${attempt + 1}/3): ${
          error?.message ?? error
        }`,
      );
      await browser.pause(300);
    }
  }

  throw new Error(`Retry loop for ${operationName} exited unexpectedly.`);
};

const runWithOpenWebviewIfAppRoot = async (webview, runInWebview) => {
  return runWithRetryableWebviewErrors('open custom editor webview', async () => {
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
  });
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
  await runWithRetryableWebviewErrors('run in custom editor webview', async () => {
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
  });
};

export const waitForCustomEditorWebviewReady = async () => {
  await withCustomEditorWebview(async () => {
    const editor = await browser.$('.ProseMirror');
    await editor.waitForDisplayed({ timeout: 5_000 });
  });
  await waitForActiveCustomEditor();
};

export const executeWorkbenchCommandAndWaitForWorkspaceFileText = async (
  fileName,
  command,
  predicate,
  errorMessage,
) => {
  await waitForCustomEditorWebviewReady();
  await executeWorkbenchCommand(command);
  return waitForWorkspaceFileText(fileName, predicate, errorMessage, {
    beforeRead: waitForCustomEditorWebviewReady,
  });
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
  return waitForWorkspaceFileText(fileName, predicate, errorMessage, {
    ...options,
    beforeRead: waitForCustomEditorWebviewReady,
  });
};

const readWebviewTitle = async (webview, index) => {
  let opened = false;
  try {
    await webview.open();
    opened = true;
    const title = await browser.execute(() => document.title);
    await webview.close();
    opened = false;
    return title || `webview-${index + 1}: empty title`;
  } catch (error) {
    if (opened) {
      try {
        await webview.close();
      } catch {
        // Best-effort diagnostics should not hide the original failure.
      }
    }
    return `webview-${index + 1}: title unavailable (${error?.message ?? error})`;
  }
};

export const readWebviewInventory = async () => {
  try {
    const workbench = await getWorkbench();
    const webviews = await workbench.getAllWebviews();
    const titles = [];

    for (let index = 0; index < webviews.length; index += 1) {
      titles.push(await readWebviewTitle(webviews[index], index));
    }

    return { count: webviews.length, titles };
  } catch (error) {
    return {
      count: null,
      titles: [],
      error: error?.message ?? String(error),
    };
  }
};

export const readE2EDiagnostics = async (error) => {
  let editorState = null;
  let editorStateError = null;

  try {
    editorState = await readEditorState();
  } catch (stateError) {
    editorStateError = stateError?.message ?? String(stateError);
  }

  return {
    failureKind: isRetryableWebviewError(error)
      ? 'runner-window-loss-or-transient-webview-lifecycle'
      : 'application-or-assertion-failure',
    editorState,
    editorStateError,
    webviews: await readWebviewInventory(),
  };
};
