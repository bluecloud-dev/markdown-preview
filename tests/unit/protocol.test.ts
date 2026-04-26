import { isHostToViewMessage, isViewToHostMessage } from '../../src/custom-editor/protocol';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('custom editor protocol guards', () => {
  it('accepts valid view-to-host payloads', () => {
    expect(isViewToHostMessage({ type: 'view.ready' })).to.equal(true);
    expect(
      isViewToHostMessage({
        type: 'view.applyDocument',
        payload: { markdown: '# title', revision: 3 },
      }),
    ).to.equal(true);
    expect(
      isViewToHostMessage({
        type: 'view.executeCommand',
        payload: { command: 'openRawMarkdown' },
      }),
    ).to.equal(true);
    expect(
      isViewToHostMessage({
        type: 'view.requestLinkInput',
        payload: { selectedText: 'Muninn' },
      }),
    ).to.equal(true);
    expect(
      isViewToHostMessage({
        type: 'view.applyDocument',
        payload: { markdown: 123, revision: 0 },
      }),
    ).to.equal(false);
  });

  it('rejects malformed view-to-host payloads', () => {
    expect(isViewToHostMessage(void 0)).to.equal(false);
    expect(isViewToHostMessage({ type: 'view.applyDocument' })).to.equal(false);
    expect(
      isViewToHostMessage({
        type: 'view.executeCommand',
        payload: { command: 'not-supported' },
      }),
    ).to.equal(false);
  });

  it('accepts valid host-to-view payloads', () => {
    expect(
      isHostToViewMessage({
        type: 'host.init',
        payload: {
          markdown: '# title',
          revision: 1,
          mermaidEnabled: true,
          toolbarMode: 'basic',
          focusModeEnabled: false,
        },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.executeCommand',
        payload: { command: 'insertMermaidBlock' },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.settingsChanged',
        payload: { mermaidEnabled: true, toolbarMode: 'advanced' },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.insertLink',
        payload: { href: 'https://example.com', text: 'Example' },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.error',
        payload: { code: 'revision_mismatch', message: 'nope' },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.focusModeChanged',
        payload: { focusModeEnabled: true },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.revealSection',
        payload: {
          id: 'h2-l4-goals',
          title: 'Goals',
          normalizedTitle: 'goals',
          level: 2,
          line: 3,
          occurrence: 0,
        },
      }),
    ).to.equal(true);
  });

  it('rejects malformed host-to-view payloads', () => {
    expect(isHostToViewMessage({ type: 'host.init', payload: void 0 })).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.init',
        payload: { markdown: '', revision: 0, mermaidEnabled: true },
      }),
    ).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.init',
        payload: {
          markdown: '',
          revision: 0,
          mermaidEnabled: true,
          toolbarMode: 'basic',
        },
      }),
    ).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.executeCommand',
        payload: { command: 'openRawMarkdown' },
      }),
    ).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.error',
        payload: { code: 'unknown', message: 'x' },
      }),
    ).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.settingsChanged',
        payload: { mermaidEnabled: true, toolbarMode: 'unknown' },
      }),
    ).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.focusModeChanged',
        payload: { focusModeEnabled: 'yes' },
      }),
    ).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.revealSection',
        payload: { id: 'missing-fields' },
      }),
    ).to.equal(false);
  });
});
