import fs from 'node:fs';
import path from 'node:path';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('webview module boundaries', () => {
  const editorRoot = path.resolve(__dirname, '..', '..', '..', 'src', 'webview', 'editor');

  it('keeps the entrypoint focused on bootstrap and runtime wiring', () => {
    const indexSource = fs.readFileSync(path.join(editorRoot, 'index.ts'), 'utf8');

    expect(indexSource).to.include("import { createEditorRuntime } from './editor-runtime'");
    expect(indexSource).to.not.include('prosemirror-commands');
    expect(indexSource).to.not.include('prosemirror-history');
    expect(indexSource).to.not.include('prosemirror-schema-list');
    expect(indexSource).to.not.include('markdown-table-utilities');
  });

  it('keeps command, toolbar, and table logic in dedicated modules', () => {
    for (const fileName of [
      'formatting-commands.ts',
      'table-commands.ts',
      'toolbar-state.ts',
      'editor-runtime.ts',
    ]) {
      expect(fs.existsSync(path.join(editorRoot, fileName)), fileName).to.equal(true);
    }
  });

  it('keeps Mermaid rendering outside the initial runtime import graph', () => {
    const previewSource = fs.readFileSync(path.join(editorRoot, 'preview.ts'), 'utf8');
    const runtimeSource = fs.readFileSync(path.join(editorRoot, 'editor-runtime.ts'), 'utf8');

    expect(previewSource).to.not.include("from './renderers/mermaid-renderer'");
    expect(runtimeSource).to.not.include("from './renderers/mermaid-renderer'");
    expect(previewSource).to.include("import('./renderers/mermaid-renderer.js')");
  });
});
