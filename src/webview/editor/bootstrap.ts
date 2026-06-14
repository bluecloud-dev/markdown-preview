import { getHtmlString } from './localization';

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
      <strong>${getHtmlString('headerBrandName')}</strong>
      <span>${getHtmlString('headerBrandRole')}</span>
    </div>
    <div class="muninn-editor-help">${getHtmlString('headerHelp')}</div>
  </header>
  <div class="muninn-toolbar" role="toolbar" aria-label="${getHtmlString('toolbarAriaLabel')}">
    <div class="muninn-toolbar-group" data-group="text" role="group" aria-labelledby="muninn-toolbar-group-text-label">
      <span id="muninn-toolbar-group-text-label" class="muninn-toolbar-group-label">${getHtmlString('toolbarGroupTextLabel')}</span>
      <button type="button" data-command="toggleBold" aria-pressed="false" title="${getHtmlString('toolbarButtonBoldTitle')}">${getHtmlString('commandLabelBold')}</button>
      <button type="button" data-command="toggleItalic" aria-pressed="false" title="${getHtmlString('toolbarButtonItalicTitle')}">${getHtmlString('commandLabelItalic')}</button>
      <button type="button" data-command="insertLink" aria-pressed="false" title="${getHtmlString('toolbarButtonLinkTitle')}">${getHtmlString('commandLabelLink')}</button>
    </div>
    <div class="muninn-toolbar-group" data-group="structure" role="group" aria-labelledby="muninn-toolbar-group-structure-label">
      <span id="muninn-toolbar-group-structure-label" class="muninn-toolbar-group-label">${getHtmlString('toolbarGroupStructureLabel')}</span>
      <button type="button" data-command="setHeading1" aria-pressed="false" title="${getHtmlString('toolbarButtonHeading1Title')}">${getHtmlString('toolbarButtonHeading1Label')}</button>
      <button type="button" data-command="setHeading2" aria-pressed="false" title="${getHtmlString('toolbarButtonHeading2Title')}">${getHtmlString('toolbarButtonHeading2Label')}</button>
      <button type="button" data-command="setHeading3" aria-pressed="false" data-advanced="true" title="${getHtmlString('toolbarButtonHeading3Title')}">${getHtmlString('toolbarButtonHeading3Label')}</button>
      <button type="button" data-command="setParagraph" aria-pressed="false" title="${getHtmlString('toolbarButtonParagraphTitle')}">${getHtmlString('commandLabelParagraph')}</button>
      <button type="button" data-command="toggleBulletList" aria-pressed="false" data-advanced="true" title="${getHtmlString('toolbarButtonBulletTitle')}">${getHtmlString('toolbarButtonBulletLabel')}</button>
      <button type="button" data-command="toggleNumberedList" aria-pressed="false" data-advanced="true" title="${getHtmlString('toolbarButtonNumberedTitle')}">${getHtmlString('toolbarButtonNumberedLabel')}</button>
    </div>
    <div class="muninn-toolbar-group" data-group="insert" role="group" aria-labelledby="muninn-toolbar-group-insert-label">
      <span id="muninn-toolbar-group-insert-label" class="muninn-toolbar-group-label">${getHtmlString('toolbarGroupInsertLabel')}</span>
      <button type="button" data-command="insertTable" title="${getHtmlString('toolbarButtonTableTitle')}">${getHtmlString('commandLabelTable')}</button>
      <button type="button" data-command="insertCodeBlock" title="${getHtmlString('toolbarButtonCodeTitle')}">${getHtmlString('commandLabelCodeBlock')}</button>
      <button type="button" data-command="insertMermaidBlock" data-advanced="true" title="${getHtmlString('toolbarButtonMermaidTitle')}">${getHtmlString('toolbarButtonMermaidLabel')}</button>
      <button type="button" data-command="openRawMarkdown" title="${getHtmlString('toolbarButtonSourceTitle')}">${getHtmlString('toolbarButtonSourceLabel')}</button>
    </div>
    <button type="button" class="muninn-toolbar-more" data-testid="muninn-toolbar-more" aria-expanded="false" title="${getHtmlString('toolbarMoreTitle')}">${getHtmlString('toolbarMoreLabel')}</button>
  </div>
  <div class="muninn-editor-shell" id="editor-shell">
    <section id="mermaid-preview-panel" class="muninn-mermaid-preview-panel" aria-label="${getHtmlString('mermaidPreviewAriaLabel')}" hidden>
      <div class="muninn-mermaid-preview-header">
        <strong>${getHtmlString('mermaidPreviewTitle')}</strong>
      </div>
      <div id="mermaid-preview-body" class="muninn-mermaid-preview-body"></div>
    </section>
    <div id="editor"></div>
  </div>
  <div id="status" class="muninn-status" role="status" aria-live="polite">${getHtmlString('statusReady')}</div>
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
