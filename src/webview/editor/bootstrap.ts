export type EditorBootstrap = {
  app: HTMLDivElement;
  toolbar: HTMLDivElement;
  editorContainer: HTMLDivElement;
  statusLine: HTMLDivElement;
  statusMessage: HTMLSpanElement;
  selectionFeedback: HTMLSpanElement;
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
  <div class="muninn-toolbar" role="toolbar" aria-label="Muninn markdown toolbar">
    <div class="muninn-toolbar-group" data-group="text">
      <button type="button" data-command="toggleBold" data-pressable="true" aria-pressed="false" title="Toggle bold (Ctrl/Cmd+B)">Bold</button>
      <button type="button" data-command="toggleItalic" data-pressable="true" aria-pressed="false" title="Toggle italic (Ctrl/Cmd+I)">Italic</button>
      <button type="button" data-command="insertLink" data-pressable="true" aria-pressed="false" title="Insert or remove link (Ctrl/Cmd+K)">Link</button>
    </div>
    <div class="muninn-toolbar-group" data-group="structure">
      <button type="button" data-command="setHeading1" data-pressable="true" aria-pressed="false" title="Set heading 1 (Ctrl/Cmd+Alt+1)">H1</button>
      <button type="button" data-command="setHeading2" data-pressable="true" aria-pressed="false" title="Set heading 2 (Ctrl/Cmd+Alt+2)">H2</button>
      <button type="button" data-command="setHeading3" data-pressable="true" aria-pressed="false" data-advanced="true" title="Set heading 3 (Ctrl/Cmd+Alt+3)">H3</button>
      <button type="button" data-command="setParagraph" data-pressable="true" aria-pressed="false" title="Set paragraph (Ctrl/Cmd+Alt+0)">Paragraph</button>
      <button type="button" data-command="toggleBulletList" data-pressable="true" aria-pressed="false" data-advanced="true" title="Toggle bullet list (Ctrl/Cmd+Shift+8)">Bullet</button>
      <button type="button" data-command="toggleNumberedList" data-pressable="true" aria-pressed="false" data-advanced="true" title="Toggle numbered list (Ctrl/Cmd+Shift+7)">Numbered</button>
    </div>
    <div class="muninn-toolbar-group" data-group="insert">
      <button type="button" data-command="insertTable" title="Insert table (Ctrl/Cmd+Alt+T)">Table</button>
      <button type="button" data-command="insertCodeBlock" title="Insert code block (Ctrl/Cmd+Alt+C)">Code</button>
      <button type="button" data-command="insertMermaidBlock" data-advanced="true">Mermaid</button>
      <button type="button" data-command="openRawMarkdown">Raw</button>
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
  <div id="status" class="muninn-status" role="status" aria-live="polite">
    <span id="status-message">Ready</span>
    <span id="selection-feedback">Selection: Document</span>
  </div>
`;

  const toolbar = document.querySelector<HTMLDivElement>('.muninn-toolbar');
  const editorContainer = document.querySelector<HTMLDivElement>('#editor');
  const statusLine = document.querySelector<HTMLDivElement>('#status');
  const statusMessage = document.querySelector<HTMLSpanElement>('#status-message');
  const selectionFeedback = document.querySelector<HTMLSpanElement>('#selection-feedback');
  const mermaidPreviewPanel = document.querySelector<HTMLElement>('#mermaid-preview-panel');
  const mermaidPreviewBody = document.querySelector<HTMLDivElement>('#mermaid-preview-body');
  if (
    !toolbar ||
    !editorContainer ||
    !statusLine ||
    !statusMessage ||
    !selectionFeedback ||
    !mermaidPreviewPanel ||
    !mermaidPreviewBody
  ) {
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
    statusMessage,
    selectionFeedback,
    mermaidPreviewPanel,
    mermaidPreviewBody,
    toolbarButtons,
  };
};
