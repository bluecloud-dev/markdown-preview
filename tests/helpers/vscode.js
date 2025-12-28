const fs = require('fs').promises;

class Uri {
  constructor(value, scheme, fsPath) {
    this._value = value;
    this.scheme = scheme;
    this.fsPath = fsPath;
  }

  static file(filePath) {
    return new Uri(`file://${filePath}`, 'file', filePath);
  }

  static parse(value) {
    const [scheme, rest = ''] = value.split(':');
    const fsPath = rest.startsWith('/') ? rest : `/${rest}`;
    return new Uri(value, scheme, fsPath);
  }

  toString() {
    return this._value;
  }
}

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }

  translate(lineDelta = 0, characterDelta = 0) {
    return new Position(this.line + lineDelta, this.character + characterDelta);
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class Selection extends Range {
  constructor(anchor, active) {
    super(anchor, active);
    this.anchor = anchor;
    this.active = active;
  }

  get isEmpty() {
    return this.anchor.line === this.active.line && this.anchor.character === this.active.character;
  }
}

const workspaceFs = {
  stat: async (uri) => {
    const stats = await fs.stat(uri.fsPath);
    return { size: stats.size };
  },
  readFile: async (uri) => fs.readFile(uri.fsPath),
};

const workspace = {
  fs: workspaceFs,
  getConfiguration: () => ({
    get: () => undefined,
    inspect: () => undefined,
  }),
  asRelativePath: (uri) => uri.fsPath,
  workspaceFolders: [],
  onDidOpenTextDocument: () => ({ dispose: () => {} }),
  onDidCloseTextDocument: () => ({ dispose: () => {} }),
  onDidDeleteFiles: () => ({ dispose: () => {} }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

const window = {
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showInputBox: async () => undefined,
  showTextDocument: async () => undefined,
  setStatusBarMessage: () => undefined,
  createOutputChannel: () => ({
    appendLine: () => {},
    show: () => {},
    clear: () => {},
    dispose: () => {},
  }),
  activeTextEditor: undefined,
  visibleTextEditors: [],
  onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
  tabGroups: {
    onDidChangeTabs: () => ({ dispose: () => {} }),
    all: [],
  },
};

const env = {
  openExternal: async () => undefined,
};

const commands = {
  executeCommand: async () => undefined,
  registerCommand: () => ({ dispose: () => {} }),
  registerTextEditorCommand: () => ({ dispose: () => {} }),
};

const l10n = {
  t: (message, ...values) => {
    if (values.length === 0) {
      return message;
    }
    return message.replace(/\{(\d+)\}/g, (_, index) => String(values[index] ?? ''));
  },
};

class TabInputText {
  constructor(uri) {
    this.uri = uri;
  }
}

class TabInputCustom {
  constructor(uri) {
    this.uri = uri;
  }
}

class TabInputTextDiff {
  constructor(original, modified) {
    this.original = original;
    this.modified = modified;
  }
}

const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
};

module.exports = {
  Uri,
  Position,
  Range,
  Selection,
  ViewColumn,
  window,
  workspace,
  commands,
  env,
  l10n,
  TabInputText,
  TabInputCustom,
  TabInputTextDiff,
};
