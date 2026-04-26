import MarkdownIt from 'markdown-it';
import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  MarkdownParser,
  MarkdownSerializer,
  type ParseSpec,
} from 'prosemirror-markdown';
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import type {
  ToolbarMode,
  ViewEditorCommand,
  ViewToHostMessage,
} from '../../custom-editor/protocol';
import type { EditorBootstrap } from './bootstrap';
import { createFormattingCommandController } from './formatting-commands';
import { wrapTablesForEditor, unwrapTablesForHost } from './markdown-transforms';
import { attachHostMessageListener } from './messages';
import { isMermaidCodeBlockNode } from './nodes/mermaid-node';
import { createCodeBlockNodeViewConstructor } from './nodes/table-node-view';
import { MermaidPreviewController } from './preview';
import { HostSyncController } from './sync';
import {
  describeSelectionState,
  isPressableToolbarCommand,
  isToolbarCommandVisible,
  isTransientToolbarCommand,
} from './toolbar-state';

export type WebviewHostApi = {
  postMessage: (message: ViewToHostMessage) => void;
};

export type EditorRuntime = {
  start: () => void;
  dispose: () => void;
};

type EditorRuntimeOptions = {
  ui: EditorBootstrap;
  vscode: WebviewHostApi;
};

const schema = defaultMarkdownParser.schema;

const markdownItParser = MarkdownIt('commonmark', {
  html: false,
  linkify: true,
});

const parserTokens = (
  defaultMarkdownParser as unknown as {
    tokens: Record<string, ParseSpec>;
  }
).tokens;

const markdownParser = new MarkdownParser(schema, markdownItParser, parserTokens);
const markdownSerializer = new MarkdownSerializer(
  defaultMarkdownSerializer.nodes,
  defaultMarkdownSerializer.marks,
);

export const createEditorRuntime = ({ ui, vscode }: EditorRuntimeOptions): EditorRuntime => {
  let view: EditorView | undefined;
  let toolbarMode: ToolbarMode = 'basic';
  let focusModeEnabled = false;
  let detachHostMessageListener: (() => void) | undefined;

  const setStatus = (message: string): void => {
    ui.statusMessage.textContent = message;
  };

  const syncToolbarVisibility = (): void => {
    for (const [command, button] of ui.toolbarButtons.entries()) {
      button.hidden = !isToolbarCommandVisible(command, {
        toolbarMode,
        focusModeEnabled,
      });
    }
  };

  const updateToolbarPressedState = (command: string, pressed: boolean): void => {
    const button = ui.toolbarButtons.get(command);
    if (!button || !isPressableToolbarCommand(command)) {
      return;
    }

    button.classList.toggle('is-active', pressed);
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  };

  const setToolbarMode = (mode: ToolbarMode): void => {
    toolbarMode = mode;
    syncToolbarVisibility();
  };

  const setFocusMode = (enabled: boolean): void => {
    focusModeEnabled = enabled;
    ui.app.classList.toggle('muninn-focus-mode', focusModeEnabled);
    ui.toolbar.hidden = focusModeEnabled;
    ui.statusLine.hidden = focusModeEnabled;
    syncToolbarVisibility();
  };

  const serializeMarkdownForHost = (): string => {
    if (!view) {
      return '';
    }

    const rawMarkdown = markdownSerializer.serialize(view.state.doc);
    return unwrapTablesForHost(rawMarkdown);
  };

  const syncController = new HostSyncController({
    debounceMs: 80,
    postApply: (payload) => {
      vscode.postMessage({
        type: 'view.applyDocument',
        payload,
      });
    },
  });

  const commandController = createFormattingCommandController({
    getView: () => view,
    postMessage: (message) => {
      vscode.postMessage(message);
    },
    setStatus,
  });

  const mermaidPreview = new MermaidPreviewController({
    panel: ui.mermaidPreviewPanel,
    body: ui.mermaidPreviewBody,
    getSelectedMermaidSource: () => commandController.selectCodeBlockSource(isMermaidCodeBlockNode),
    renderDelayMs: 120,
  });

  const schedulePreviewRender = (): void => {
    mermaidPreview.scheduleRender();
  };

  const updateToolbarState = (): void => {
    const selection = commandController.getSelectionState();

    updateToolbarPressedState('toggleBold', selection.bold);
    updateToolbarPressedState('toggleItalic', selection.italic);
    updateToolbarPressedState('insertLink', selection.link);
    updateToolbarPressedState('setHeading1', selection.headingLevel === 1);
    updateToolbarPressedState('setHeading2', selection.headingLevel === 2);
    updateToolbarPressedState('setHeading3', selection.headingLevel === 3);
    updateToolbarPressedState('setParagraph', selection.paragraph);
    updateToolbarPressedState('toggleBulletList', selection.bulletList);
    updateToolbarPressedState('toggleNumberedList', selection.numberedList);
    updateToolbarPressedState('insertTable', selection.table);
    updateToolbarPressedState('insertCodeBlock', selection.code);

    ui.selectionFeedback.textContent = describeSelectionState(selection);
  };

  const executeEditorCommand = (command: ViewEditorCommand): boolean => {
    const executed = commandController.executeEditorCommand(command);
    updateToolbarState();
    return executed;
  };

  const parseMarkdown = (markdown: string): EditorState =>
    EditorState.create({
      doc: markdownParser.parse(markdown),
      plugins: [
        history(),
        keymap({
          'Mod-z': undo,
          'Shift-Mod-z': redo,
          'Mod-y': redo,
          'Mod-b': () => executeEditorCommand('toggleBold'),
          'Mod-i': () => executeEditorCommand('toggleItalic'),
          'Mod-k': () => executeEditorCommand('insertLink'),
          'Mod-Alt-0': () => executeEditorCommand('setParagraph'),
          'Mod-Alt-1': () => executeEditorCommand('setHeading1'),
          'Mod-Alt-2': () => executeEditorCommand('setHeading2'),
          'Mod-Alt-3': () => executeEditorCommand('setHeading3'),
          'Mod-Shift-8': () => executeEditorCommand('toggleBulletList'),
          'Mod-Shift-7': () => executeEditorCommand('toggleNumberedList'),
          'Mod-Alt-c': () => executeEditorCommand('insertCodeBlock'),
          'Mod-Alt-m': () => executeEditorCommand('insertMermaidBlock'),
          'Mod-Alt-t': () => executeEditorCommand('insertTable'),
        }),
        keymap(baseKeymap),
        new Plugin({
          view: () => ({
            update: () => {
              updateToolbarState();
              schedulePreviewRender();
            },
          }),
        }),
      ],
    });

  const applyHostMarkdown = (hostMarkdown: string): void => {
    const editorMarkdown = wrapTablesForEditor(hostMarkdown);

    if (!view) {
      view = new EditorView(ui.editorContainer, {
        state: parseMarkdown(editorMarkdown),
        nodeViews: {
          code_block: createCodeBlockNodeViewConstructor({ setStatus }),
        },
        dispatchTransaction(transaction) {
          if (!view) {
            return;
          }
          const nextState = view.state.apply(transaction);
          view.updateState(nextState);
          if (transaction.docChanged) {
            syncController.queueApply(serializeMarkdownForHost);
          }
        },
      });
      updateToolbarState();
      schedulePreviewRender();
      return;
    }

    const currentHostMarkdown = serializeMarkdownForHost();
    if (currentHostMarkdown === hostMarkdown) {
      return;
    }

    syncController.withSuppressedSync(() => {
      view?.updateState(parseMarkdown(editorMarkdown));
    });
    updateToolbarState();
    schedulePreviewRender();
  };

  for (const [command, button] of ui.toolbarButtons.entries()) {
    button.addEventListener('click', () => {
      if (command === 'openRawMarkdown') {
        syncController.flushApply(serializeMarkdownForHost);
        button.classList.add('is-active');
        vscode.postMessage({
          type: 'view.executeCommand',
          payload: { command: 'openRawMarkdown' },
        });
        return;
      }

      const executed = executeEditorCommand(command as ViewEditorCommand);
      if (!executed) {
        setStatus(`Command failed: ${command}`);
      }
      if (executed && isTransientToolbarCommand(command)) {
        button.classList.add('is-active');
        globalThis.setTimeout(() => {
          updateToolbarState();
        }, 600);
      }
      view?.focus();
    });
  }

  const start = (): void => {
    detachHostMessageListener = attachHostMessageListener({
      onInit: (payload) => {
        syncController.setRevision(payload.revision);
        mermaidPreview.setEnabled(payload.mermaidEnabled);
        setToolbarMode(payload.toolbarMode);
        setFocusMode(payload.focusModeEnabled);
        applyHostMarkdown(payload.markdown);
        setStatus('Connected');
        view?.focus();
      },
      onDocumentChanged: (payload) => {
        const shouldRetry = syncController.handleHostDocumentChanged(payload.revision);
        applyHostMarkdown(payload.markdown);
        if (shouldRetry) {
          syncController.queueApply(serializeMarkdownForHost);
        }
      },
      onExecuteCommand: (command) => {
        const executed = executeEditorCommand(command);
        if (!executed) {
          setStatus(`Command failed: ${command}`);
        }
      },
      onSettingsChanged: (payload) => {
        mermaidPreview.setEnabled(payload.mermaidEnabled);
        setToolbarMode(payload.toolbarMode);
        schedulePreviewRender();
      },
      onFocusModeChanged: (enabled) => {
        setFocusMode(enabled);
      },
      onRevealSection: (section) => {
        const revealed = commandController.revealSection(section);
        if (!revealed) {
          setStatus(`Section not found: ${section.title}`);
        }
        updateToolbarState();
      },
      onInsertLink: (payload) => {
        const inserted = commandController.insertLinkFromHost(payload.href, payload.text);
        if (!inserted) {
          setStatus('Failed to insert link.');
        }
        updateToolbarState();
      },
      onError: (payload) => {
        const shouldRetry = syncController.handleHostError();
        setStatus(payload.message);
        if (shouldRetry) {
          syncController.queueApply(serializeMarkdownForHost);
        }
      },
    });

    vscode.postMessage({ type: 'view.ready' });
  };

  const dispose = (): void => {
    detachHostMessageListener?.();
    syncController.dispose();
    mermaidPreview.dispose();
    view?.destroy();
  };

  return {
    start,
    dispose,
  };
};
