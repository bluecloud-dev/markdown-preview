import MarkdownIt from 'markdown-it';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import {
  MarkdownParser,
  MarkdownSerializer,
  ParseSpec,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import { unwrapTablesForHost, wrapTablesForEditor } from './markdown-transforms';

// Single home of the markdown ⇄ ProseMirror pipeline. Round-trip byte-fidelity is the
// prime directive (AGENTS.md): any change here must keep the golden corpus in
// tests/unit/round-trip/ green and its documented deviations honest.

export const schema = defaultMarkdownParser.schema;

const markdownItParser = MarkdownIt('commonmark', {
  html: false,
  linkify: true,
});

const parserTokens = (
  defaultMarkdownParser as unknown as {
    tokens: Record<string, ParseSpec>;
  }
).tokens;

export const markdownParser = new MarkdownParser(schema, markdownItParser, parserTokens);
export const markdownSerializer = new MarkdownSerializer(
  defaultMarkdownSerializer.nodes,
  defaultMarkdownSerializer.marks,
);

export const parseHostMarkdown = (hostMarkdown: string): ProseMirrorNode =>
  markdownParser.parse(wrapTablesForEditor(hostMarkdown));

export const serializeToHostMarkdown = (document: ProseMirrorNode): string =>
  unwrapTablesForHost(markdownSerializer.serialize(document));
