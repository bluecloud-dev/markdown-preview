import { expect } from '@wdio/globals';
import { openWorkspaceFile, readEditorState, waitForCustomEditor } from './helpers.mjs';

describe('Reading-first workflow', () => {
  it('opens markdown files in Muninn custom editor by default', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    const state = await readEditorState();
    expect(state.activeCustomViewType).toBe('muninn.markdownEditor');
    expect(state.activeTabLabel.toLowerCase()).toContain('sample.md');
  });
});
