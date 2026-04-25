import './styles.css';
import type { ViewToHostMessage } from '../../custom-editor/protocol';
import { bootstrapEditorApp } from './bootstrap';
import { createEditorRuntime } from './editor-runtime';

declare function acquireVsCodeApi(): {
  postMessage: (message: ViewToHostMessage) => void;
};

const runtime = createEditorRuntime({
  ui: bootstrapEditorApp(),
  vscode: acquireVsCodeApi(),
});

window.addEventListener('beforeunload', () => {
  runtime.dispose();
});

runtime.start();
