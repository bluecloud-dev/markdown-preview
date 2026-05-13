import { DEFAULT_WEBVIEW_STRINGS, type WebviewStrings } from '../../shared/webview-strings';

type WebviewGlobal = typeof globalThis & {
  __MUNINN_WEBVIEW_STRINGS__?: Partial<WebviewStrings>;
};

const globalContext = globalThis as WebviewGlobal;

const strings: WebviewStrings = {
  ...DEFAULT_WEBVIEW_STRINGS,
  ...globalContext.__MUNINN_WEBVIEW_STRINGS__,
};

export const getString = <Key extends keyof WebviewStrings>(key: Key): string => strings[key];

export const formatString = (
  template: string,
  ...values: Array<string | number | boolean>
): string => {
  let output = template;
  for (const [index, value] of values.entries()) {
    output = output.replaceAll(`{${index}}`, String(value));
  }
  return output;
};
