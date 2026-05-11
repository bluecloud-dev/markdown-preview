export type EditorBootstrap = {
  app: HTMLDivElement;
  toolbar: HTMLDivElement;
  editorContainer: HTMLDivElement;
  statusLine: HTMLDivElement;
  mermaidPreviewPanel: HTMLElement;
  mermaidPreviewBody: HTMLDivElement;
  toolbarButtons: Map<string, HTMLButtonElement>;
};

export const bootstrapEditorApp = (): EditorBootstrap => {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('Muninn webview app root not found.');
  }

  app.innerHTML = `
  <header class="muninn-editor-header" data-testid="muninn-editor-header">
    <div class="muninn-editor-identity">
      <strong>Muninn</strong>
      <span>Markdown editor</span>
    </div>
    <div class="muninn-editor-help">Use Source to open raw Markdown in VS Code.</div>
  </header>
  <div class="muninn-toolbar" role="toolbar" aria-label="Muninn markdown toolbar">
    <div class="muninn-toolbar-group" data-group="text" role="group" aria-labelledby="muninn-toolbar-group-text-label">
      <span id="muninn-toolbar-group-text-label" class="muninn-toolbar-group-label" data-group-label="Text">Text</span>
      <button type="button" data-command="toggleBold" data-pressable="true" aria-pressed="false" title="Bold (Ctrl/Cmd+B)">Bold</button>
      <button type="button" data-command="toggleItalic" data-pressable="true" aria-pressed="false" title="Italic (Ctrl/Cmd+I)">Italic</button>
      <button type="button" data-command="insertLink" data-pressable="true" aria-pressed="false" title="Insert or remove link">Link</button>
    </div>
    <div class="muninn-toolbar-group" data-group="structure" role="group" aria-labelledby="muninn-toolbar-group-structure-label">
      <span id="muninn-toolbar-group-structure-label" class="muninn-toolbar-group-label" data-group-label="Structure">Structure</span>
      <button type="button" data-command="setHeading1" data-pressable="true" aria-pressed="false" title="Heading 1">H1</button>
      <button type="button" data-command="setHeading2" data-pressable="true" aria-pressed="false" title="Heading 2">H2</button>
      <button type="button" data-command="setHeading3" data-pressable="true" aria-pressed="false" data-advanced="true" title="Heading 3">H3</button>
      <button type="button" data-command="setParagraph" data-pressable="true" aria-pressed="false" title="Paragraph">Paragraph</button>
      <button type="button" data-command="toggleBulletList" data-pressable="true" aria-pressed="false" data-advanced="true" title="Toggle bullet list">Bullet</button>
      <button type="button" data-command="toggleNumberedList" data-pressable="true" aria-pressed="false" data-advanced="true" title="Toggle numbered list">Numbered</button>
    </div>
    <div class="muninn-toolbar-group" data-group="insert" role="group" aria-labelledby="muninn-toolbar-group-insert-label">
      <span id="muninn-toolbar-group-insert-label" class="muninn-toolbar-group-label" data-group-label="Insert">Insert</span>
      <button type="button" data-command="insertTable" title="Insert table (Ctrl/Cmd+Alt+T)">Table</button>
      <button type="button" data-command="insertCodeBlock" title="Insert code block">Code</button>
      <button type="button" data-command="insertMermaidBlock" data-advanced="true" title="Insert Mermaid diagram (Ctrl/Cmd+Alt+M)">Mermaid</button>
      <button type="button" data-command="openRawMarkdown" title="Open raw Markdown source in VS Code">Source</button>
    </div>
    <button type="button" class="muninn-toolbar-more" data-testid="muninn-toolbar-more" aria-expanded="false" title="Show advanced toolbar actions">More</button>
  </div>
  <div class="muninn-editor-shell" id="editor-shell">
    <section id="mermaid-preview-panel" class="muninn-mermaid-preview-panel" hidden>
      <div class="muninn-mermaid-preview-header">
        <strong>Mermaid Preview</strong>
      </div>
      <div id="mermaid-preview-body" class="muninn-mermaid-preview-body"></div>
    </section>
    <div id="editor"></div>
  </div>
  <div id="status" class="muninn-status" role="status" aria-live="polite">Ready</div>
`;

  const toolbar = document.querySelector<HTMLDivElement>('.muninn-toolbar');
  const editorContainer = document.querySelector<HTMLDivElement>('#editor');
  const statusLine = document.querySelector<HTMLDivElement>('#status');
  const mermaidPreviewPanel = document.querySelector<HTMLElement>('#mermaid-preview-panel');
  const mermaidPreviewBody = document.querySelector<HTMLDivElement>('#mermaid-preview-body');
  if (!toolbar || !editorContainer || !statusLine || !mermaidPreviewPanel || !mermaidPreviewBody) {
    throw new Error('Muninn webview UI elements are missing.');
  }

  const toolbarButtons = new Map<string, HTMLButtonElement>();
  for (const button of app.querySelectorAll<HTMLButtonElement>('button[data-command]')) {
    const command = button.dataset.command;
    if (!command) {
      continue;
    }
    toolbarButtons.set(command, button);
  }

  return {
    app,
    toolbar,
    editorContainer,
    statusLine,
    mermaidPreviewPanel,
    mermaidPreviewBody,
    toolbarButtons,
  };
};
