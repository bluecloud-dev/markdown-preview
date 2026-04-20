import type {
  HostToViewMessage,
  ToolbarMode,
  ViewEditorCommand,
} from '../../custom-editor/protocol';
import { isHostToViewMessage } from '../../custom-editor/protocol';

type HostMessageHandlers = {
  onInit: (payload: {
    markdown: string;
    revision: number;
    mermaidEnabled: boolean;
    toolbarMode: ToolbarMode;
  }) => void;
  onDocumentChanged: (payload: { markdown: string; revision: number }) => void;
  onExecuteCommand: (command: ViewEditorCommand) => void;
  onSettingsChanged: (payload: { mermaidEnabled: boolean; toolbarMode: ToolbarMode }) => void;
  onInsertLink: (payload: { href: string; text?: string }) => void;
  onError: (payload: { code: 'revision_mismatch' | 'apply_failed'; message: string }) => void;
};

export const dispatchHostMessage = (
  message: HostToViewMessage,
  handlers: HostMessageHandlers,
): void => {
  switch (message.type) {
    case 'host.init': {
      handlers.onInit(message.payload);
      return;
    }
    case 'host.documentChanged': {
      handlers.onDocumentChanged(message.payload);
      return;
    }
    case 'host.executeCommand': {
      handlers.onExecuteCommand(message.payload.command);
      return;
    }
    case 'host.settingsChanged': {
      handlers.onSettingsChanged(message.payload);
      return;
    }
    case 'host.insertLink': {
      handlers.onInsertLink(message.payload);
      return;
    }
    case 'host.error': {
      handlers.onError(message.payload);
      return;
    }
    default: {
      return;
    }
  }
};

export const attachHostMessageListener = (handlers: HostMessageHandlers): (() => void) => {
  const listener = (event: MessageEvent<unknown>): void => {
    if (!isHostToViewMessage(event.data)) {
      return;
    }
    dispatchHostMessage(event.data, handlers);
  };

  window.addEventListener('message', listener);
  return () => {
    window.removeEventListener('message', listener);
  };
};
