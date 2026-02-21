import { expect } from '@wdio/globals';
import { openWorkspaceFile, readEditorState, waitForPreviewMode } from './helpers.mjs';

describe('Reading-first workflow', () => {
  it('opens markdown files in preview-first mode', async () => {
    await openWorkspaceFile('sample.md');
    await waitForPreviewMode('sample.md');

    const state = await readEditorState();
    expect(state.activeEditor).toBe(false);
    expect(state.activeTabLabel.toLowerCase()).toContain('sample.md');
  });
});
