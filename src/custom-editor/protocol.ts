export type DocumentRevision = number;
export type ToolbarMode = 'basic' | 'advanced';

export type ViewEditorCommand =
  | 'toggleBold'
  | 'toggleItalic'
  | 'setHeading1'
  | 'setHeading2'
  | 'setHeading3'
  | 'setParagraph'
  | 'toggleBulletList'
  | 'toggleNumberedList'
  | 'insertLink'
  | 'insertMermaidBlock'
  | 'insertTable'
  | 'insertCodeBlock'
  | 'addTableRow'
  | 'addTableColumn';

export type HostToViewMessage =
  | {
      type: 'host.init';
      payload: SerializedMarkdownPayload & {
        mermaidEnabled: boolean;
        toolbarMode: ToolbarMode;
      };
    }
  | {
      type: 'host.documentChanged';
      payload: SerializedMarkdownPayload;
    }
  | {
      type: 'host.executeCommand';
      payload: {
        command: ViewEditorCommand;
      };
    }
  | {
      type: 'host.settingsChanged';
      payload: {
        mermaidEnabled: boolean;
        toolbarMode: ToolbarMode;
      };
    }
  | {
      type: 'host.insertLink';
      payload: {
        href: string;
        text?: string;
      };
    }
  | {
      type: 'host.error';
      payload: {
        code: 'revision_mismatch' | 'apply_failed';
        message: string;
      };
    };

export type ViewToHostMessage =
  | {
      type: 'view.ready';
    }
  | {
      type: 'view.applyDocument';
      payload: SerializedMarkdownPayload;
    }
  | {
      type: 'view.executeCommand';
      payload: {
        command: 'openRawMarkdown';
      };
    }
  | {
      type: 'view.requestLinkInput';
      payload: {
        selectedText?: string;
      };
    };

export type SerializedMarkdownPayload = {
  markdown: string;
  revision: DocumentRevision;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';

const isSerializedMarkdownPayload = (value: unknown): value is SerializedMarkdownPayload => {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.markdown) &&
    typeof value.revision === 'number' &&
    Number.isFinite(value.revision)
  );
};

const isViewEditorCommand = (value: unknown): value is ViewEditorCommand =>
  value === 'toggleBold' ||
  value === 'toggleItalic' ||
  value === 'setHeading1' ||
  value === 'setHeading2' ||
  value === 'setHeading3' ||
  value === 'setParagraph' ||
  value === 'toggleBulletList' ||
  value === 'toggleNumberedList' ||
  value === 'insertLink' ||
  value === 'insertMermaidBlock' ||
  value === 'insertTable' ||
  value === 'insertCodeBlock' ||
  value === 'addTableRow' ||
  value === 'addTableColumn';

const isToolbarMode = (value: unknown): value is ToolbarMode =>
  value === 'basic' || value === 'advanced';

export const isViewToHostMessage = (value: unknown): value is ViewToHostMessage => {
  if (!isObject(value) || !isString(value.type)) {
    return false;
  }

  if (value.type === 'view.ready') {
    return true;
  }

  if (value.type === 'view.applyDocument') {
    return isSerializedMarkdownPayload(value.payload);
  }

  if (value.type === 'view.executeCommand') {
    return isObject(value.payload) && value.payload.command === 'openRawMarkdown';
  }

  if (value.type === 'view.requestLinkInput') {
    return (
      isObject(value.payload) &&
      (value.payload.selectedText === undefined || isString(value.payload.selectedText))
    );
  }

  return false;
};

export const isHostToViewMessage = (value: unknown): value is HostToViewMessage => {
  if (!isObject(value) || !isString(value.type)) {
    return false;
  }

  if (value.type === 'host.init') {
    const payload = value.payload;
    return (
      isSerializedMarkdownPayload(payload) &&
      isObject(payload) &&
      typeof (payload as { mermaidEnabled?: unknown }).mermaidEnabled === 'boolean' &&
      isToolbarMode((payload as { toolbarMode?: unknown }).toolbarMode)
    );
  }

  if (value.type === 'host.documentChanged') {
    return isSerializedMarkdownPayload(value.payload);
  }

  if (value.type === 'host.executeCommand') {
    return isObject(value.payload) && isViewEditorCommand(value.payload.command);
  }

  if (value.type === 'host.settingsChanged') {
    return (
      isObject(value.payload) &&
      typeof value.payload.mermaidEnabled === 'boolean' &&
      isToolbarMode(value.payload.toolbarMode)
    );
  }

  if (value.type === 'host.insertLink') {
    return (
      isObject(value.payload) &&
      isString(value.payload.href) &&
      (value.payload.text === undefined || isString(value.payload.text))
    );
  }

  if (value.type === 'host.error') {
    return (
      isObject(value.payload) &&
      (value.payload.code === 'revision_mismatch' || value.payload.code === 'apply_failed') &&
      isString(value.payload.message)
    );
  }

  return false;
};
