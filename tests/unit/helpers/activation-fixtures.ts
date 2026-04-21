import sinon from 'sinon';
import * as vscode from 'vscode';

export const createOutputChannel = (): vscode.LogOutputChannel =>
  ({
    name: 'Muninn for VS Code',
    logLevel: vscode.LogLevel.Trace,
    onDidChangeLogLevel: sinon.stub() as unknown as vscode.Event<vscode.LogLevel>,
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    append: () => {},
    appendLine: () => {},
    replace: () => {},
    clear: () => {},
    show: (() => {}) as vscode.LogOutputChannel['show'],
    hide: () => {},
    dispose: () => {},
  }) as vscode.LogOutputChannel;

export const createMemento = (): vscode.Memento => {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      if (store.has(key)) {
        return store.get(key) as T;
      }
      return defaultValue as T;
    },
    update: async (key: string, value: unknown): Promise<void> => {
      if (value === undefined) {
        store.delete(key);
        return;
      }
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
};
