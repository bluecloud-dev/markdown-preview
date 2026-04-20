type MermaidRenderResult =
  | {
      ok: true;
      svg: string;
    }
  | {
      ok: false;
      error: string;
    };

let initialized = false;
let lastThemeSignature: string | undefined;

type MermaidThemeState = {
  signature: string;
  variables: Record<string, string>;
};

type MermaidModule = {
  default: {
    initialize: (options: {
      startOnLoad: boolean;
      securityLevel: 'strict';
      suppressErrorRendering: boolean;
      theme: string;
      themeVariables: Record<string, string>;
      flowchart: {
        htmlLabels: boolean;
      };
    }) => void;
    render: (renderId: string, source: string) => Promise<{ svg: string }>;
  };
};

let mermaidModulePromise: Promise<MermaidModule> | undefined;
let renderQueue: Promise<void> = Promise.resolve();

const readCssVariable = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
};

const getMermaidThemeState = (): MermaidThemeState => {
  const foreground = readCssVariable('--vscode-editor-foreground', '#d4d4d4');
  const background = readCssVariable('--vscode-editor-background', '#1e1e1e');
  const border = readCssVariable('--vscode-editorWidget-border', foreground);
  const panelBackground = readCssVariable('--vscode-editorWidget-background', background);
  const subtleBackground = readCssVariable('--vscode-list-hoverBackground', panelBackground);
  const edgeLabelBackground = readCssVariable('--vscode-input-background', panelBackground);

  const variables: Record<string, string> = {
    textColor: foreground,
    lineColor: border,
    primaryTextColor: foreground,
    primaryBorderColor: border,
    primaryColor: panelBackground,
    secondaryTextColor: foreground,
    secondaryBorderColor: border,
    secondaryColor: subtleBackground,
    tertiaryTextColor: foreground,
    tertiaryBorderColor: border,
    tertiaryColor: subtleBackground,
    clusterBkg: panelBackground,
    clusterBorder: border,
    edgeLabelBackground,
    background,
    mainBkg: panelBackground,
    secondBkg: subtleBackground,
  };

  return {
    signature: Object.values(variables).join('|'),
    variables,
  };
};

const loadMermaid = async (): Promise<MermaidModule> => {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid') as Promise<MermaidModule>;
  }
  return mermaidModulePromise;
};

const ensureInitialized = (mermaidModule: MermaidModule): void => {
  const themeState = getMermaidThemeState();
  if (initialized && themeState.signature === lastThemeSignature) {
    return;
  }

  mermaidModule.default.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: 'default',
    themeVariables: themeState.variables,
    flowchart: {
      htmlLabels: false,
    },
  });
  initialized = true;
  lastThemeSignature = themeState.signature;
};

export const renderMermaidDiagram = async (
  source: string,
  renderId: string,
): Promise<MermaidRenderResult> => {
  const queuedRender = async (): Promise<MermaidRenderResult> => {
    try {
      const mermaidModule = await loadMermaid();
      ensureInitialized(mermaidModule);
      const rendered = await mermaidModule.default.render(renderId, source);
      return {
        ok: true,
        svg: rendered.svg,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: message,
      };
    }
  };

  const resultPromise = renderQueue.then(queuedRender, queuedRender);
  renderQueue = resultPromise.then(
    () => {},
    () => {},
  );
  return resultPromise;
};
