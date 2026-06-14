import type {
  HostToViewMessage,
  ImageUriMap,
  ToolbarMode,
  ViewEditorCommand,
} from '../../custom-editor/protocol';
import type { ContentWidthSetting } from '../../types/config';
import { isHostToViewMessage } from '../../custom-editor/protocol';

type HostMessageHandlers = {
  onInit: (payload: {
    fileName: string;
    markdown: string;
    revision: number;
    mermaidEnabled: boolean;
    toolbarMode: ToolbarMode;
    contentWidth: ContentWidthSetting;
    imageSources: ImageUriMap;
  }) => void;
  onDocumentChanged: (payload: {
    markdown: string;
    revision: number;
    imageSources: ImageUriMap;
  }) => void;
  onExecuteCommand: (command: ViewEditorCommand) => void;
  onSettingsChanged: (payload: {
    mermaidEnabled: boolean;
    toolbarMode: ToolbarMode;
    contentWidth: ContentWidthSetting;
  }) => void;
  onInsertLink: (payload: { href: string; text?: string }) => void;
  onImageInserted: (payload: { path: string; webviewUri: string; filename: string }) => void;
  onImageRejected: (payload: { reason: string }) => void;
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
    case 'host.imageInserted': {
      handlers.onImageInserted(message.payload);
      return;
    }
    case 'host.imageRejected': {
      handlers.onImageRejected(message.payload);
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
