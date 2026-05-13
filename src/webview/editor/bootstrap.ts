import { getString } from './localization';

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
      <strong>${getString('headerBrandName')}</strong>
      <span>${getString('headerBrandRole')}</span>
    </div>
    <div class="muninn-editor-help">${getString('headerHelp')}</div>
  </header>
  <div class="muninn-toolbar" role="toolbar" aria-label="${getString('toolbarAriaLabel')}">
    <div class="muninn-toolbar-group" data-group="text" role="group" aria-labelledby="muninn-toolbar-group-text-label">
      <span id="muninn-toolbar-group-text-label" class="muninn-toolbar-group-label" data-group-label="${getString('toolbarGroupTextLabel')}">${getString('toolbarGroupTextLabel')}</span>
      <button type="button" data-command="toggleBold" data-pressable="true" aria-pressed="false" title="${getString('toolbarButtonBoldTitle')}">${getString('commandLabelBold')}</button>
      <button type="button" data-command="toggleItalic" data-pressable="true" aria-pressed="false" title="${getString('toolbarButtonItalicTitle')}">${getString('commandLabelItalic')}</button>
      <button type="button" data-command="insertLink" data-pressable="true" aria-pressed="false" title="${getString('toolbarButtonLinkTitle')}">${getString('commandLabelLink')}</button>
    </div>
    <div class="muninn-toolbar-group" data-group="structure" role="group" aria-labelledby="muninn-toolbar-group-structure-label">
      <span id="muninn-toolbar-group-structure-label" class="muninn-toolbar-group-label" data-group-label="${getString('toolbarGroupStructureLabel')}">${getString('toolbarGroupStructureLabel')}</span>
      <button type="button" data-command="setHeading1" data-pressable="true" aria-pressed="false" title="${getString('toolbarButtonHeading1Title')}">${getString('toolbarButtonHeading1Label')}</button>
      <button type="button" data-command="setHeading2" data-pressable="true" aria-pressed="false" title="${getString('toolbarButtonHeading2Title')}">${getString('toolbarButtonHeading2Label')}</button>
      <button type="button" data-command="setHeading3" data-pressable="true" aria-pressed="false" data-advanced="true" title="${getString('toolbarButtonHeading3Title')}">${getString('toolbarButtonHeading3Label')}</button>
      <button type="button" data-command="setParagraph" data-pressable="true" aria-pressed="false" title="${getString('toolbarButtonParagraphTitle')}">${getString('commandLabelParagraph')}</button>
      <button type="button" data-command="toggleBulletList" data-pressable="true" aria-pressed="false" data-advanced="true" title="${getString('toolbarButtonBulletTitle')}">${getString('toolbarButtonBulletLabel')}</button>
      <button type="button" data-command="toggleNumberedList" data-pressable="true" aria-pressed="false" data-advanced="true" title="${getString('toolbarButtonNumberedTitle')}">${getString('toolbarButtonNumberedLabel')}</button>
    </div>
    <div class="muninn-toolbar-group" data-group="insert" role="group" aria-labelledby="muninn-toolbar-group-insert-label">
      <span id="muninn-toolbar-group-insert-label" class="muninn-toolbar-group-label" data-group-label="${getString('toolbarGroupInsertLabel')}">${getString('toolbarGroupInsertLabel')}</span>
      <button type="button" data-command="insertTable" title="${getString('toolbarButtonTableTitle')}">${getString('commandLabelTable')}</button>
      <button type="button" data-command="insertCodeBlock" title="${getString('toolbarButtonCodeTitle')}">${getString('commandLabelCodeBlock')}</button>
      <button type="button" data-command="insertMermaidBlock" data-advanced="true" title="${getString('toolbarButtonMermaidTitle')}">${getString('toolbarButtonMermaidLabel')}</button>
      <button type="button" data-command="openRawMarkdown" title="${getString('toolbarButtonSourceTitle')}">${getString('toolbarButtonSourceLabel')}</button>
    </div>
    <button type="button" class="muninn-toolbar-more" data-testid="muninn-toolbar-more" aria-expanded="false" title="${getString('toolbarMoreTitle')}">${getString('toolbarMoreLabel')}</button>
  </div>
  <div class="muninn-editor-shell" id="editor-shell">
    <section id="mermaid-preview-panel" class="muninn-mermaid-preview-panel" hidden>
      <div class="muninn-mermaid-preview-header">
        <strong>${getString('mermaidPreviewTitle')}</strong>
      </div>
      <div id="mermaid-preview-body" class="muninn-mermaid-preview-body"></div>
    </section>
    <div id="editor"></div>
  </div>
  <div id="status" class="muninn-status" role="status" aria-live="polite">${getString('statusReady')}</div>
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
