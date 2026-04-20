import type { Node as ProseMirrorNode } from 'prosemirror-model';

export const MERMAID_LANGUAGE = 'mermaid';

export const isMermaidCodeBlockNode = (node: ProseMirrorNode): boolean => {
  if (node.type.name !== 'code_block') {
    return false;
  }
  const rawParameters = (node.attrs.params as string | undefined) ?? '';
  return rawParameters.trim().toLowerCase() === MERMAID_LANGUAGE;
};

export const getMermaidSourceFromNode = (node: ProseMirrorNode): string => node.textContent;
