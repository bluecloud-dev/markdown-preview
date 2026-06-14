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
        type: 'view.requestImageInsert',
        payload: { kind: 'paste', name: 'clip.png', mime: 'image/png', bytesBase64: 'aGVsbG8=' },
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
    expect(
      isViewToHostMessage({
        type: 'view.requestImageInsert',
        payload: { kind: 'command', bytesBase64: 'aGVsbG8=' },
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
          imageSources: {},
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
        type: 'host.imageInserted',
        payload: {
          path: 'images/screenshot.png',
          webviewUri: 'vscode-webview://view/images/screenshot.png',
          filename: 'screenshot.png',
        },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.imageRejected',
        payload: { reason: 'Unsupported image type.' },
      }),
    ).to.equal(true);
    expect(
      isHostToViewMessage({
        type: 'host.error',
        payload: { code: 'revision_mismatch', message: 'nope' },
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
  });
});
