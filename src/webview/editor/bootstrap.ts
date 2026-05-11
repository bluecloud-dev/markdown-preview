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
    <div class="muninn-toolbar-group" data-group="text">
      <button type="button" data-command="toggleBold" data-pressable="true" aria-pressed="false">Bold</button>
      <button type="button" data-command="toggleItalic" data-pressable="true" aria-pressed="false">Italic</button>
      <button type="button" data-command="insertLink" data-pressable="true" aria-pressed="false">Link</button>
    </div>
    <div class="muninn-toolbar-group" data-group="structure">
      <button type="button" data-command="setHeading1" data-pressable="true" aria-pressed="false">H1</button>
      <button type="button" data-command="setHeading2" data-pressable="true" aria-pressed="false">H2</button>
      <button type="button" data-command="setHeading3" data-pressable="true" aria-pressed="false" data-advanced="true">H3</button>
      <button type="button" data-command="setParagraph" data-pressable="true" aria-pressed="false">Paragraph</button>
      <button type="button" data-command="toggleBulletList" data-pressable="true" aria-pressed="false" data-advanced="true">Bullet</button>
      <button type="button" data-command="toggleNumberedList" data-pressable="true" aria-pressed="false" data-advanced="true">Numbered</button>
    </div>
    <div class="muninn-toolbar-group" data-group="insert">
      <button type="button" data-command="insertTable">Table</button>
      <button type="button" data-command="insertCodeBlock">Code</button>
      <button type="button" data-command="insertMermaidBlock" data-advanced="true">Mermaid</button>
      <button type="button" data-command="openRawMarkdown" title="Open raw Markdown source in VS Code">Source</button>
    </div>
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
