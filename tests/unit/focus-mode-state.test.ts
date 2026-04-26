import * as vscode from 'vscode';
import { FocusModeState } from '../../src/custom-editor/focus-mode-state';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const createMemento = (): vscode.Memento => {
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

describe('FocusModeState', () => {
  it('persists the last-used focus mode value in workspace state', async () => {
    const memento = createMemento();
    const state = new FocusModeState(memento);

    expect(state.isEnabled()).to.equal(false);
    expect(await state.toggle()).to.equal(true);
    expect(new FocusModeState(memento).isEnabled()).to.equal(true);

    await state.setEnabled(false);
    expect(new FocusModeState(memento).isEnabled()).to.equal(false);
  });
});
