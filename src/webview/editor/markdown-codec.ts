import MarkdownIt from 'markdown-it';
import frontMatterPlugin from 'markdown-it-front-matter';
import { Schema, type Node as ProseMirrorNode } from 'prosemirror-model';
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

const defaultSchema = defaultMarkdownParser.schema;

export const schema = new Schema({
  nodes: defaultSchema.spec.nodes.addToEnd('front_matter', {
    attrs: { raw: {} },
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,
  }),
  marks: defaultSchema.spec.marks,
});

const markdownItParser = MarkdownIt('commonmark', {
  html: false,
  linkify: true,
}).use(frontMatterPlugin, () => {});

const parserTokens = {
  ...(
    defaultMarkdownParser as unknown as {
      tokens: Record<string, ParseSpec>;
    }
  ).tokens,
  front_matter: {
    block: 'front_matter',
    getAttrs: (token) => ({ raw: `${token.markup}\n` }),
    noCloseToken: true,
  },
} satisfies Record<string, ParseSpec>;

export const markdownParser = new MarkdownParser(schema, markdownItParser, parserTokens);
export const markdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    front_matter: (state, node) => {
      const raw = typeof node.attrs.raw === 'string' ? node.attrs.raw : '';
      state.write(raw.endsWith('\n') ? raw : `${raw}\n`);
      state.closeBlock(node);
    },
  },
  defaultMarkdownSerializer.marks,
);

export const parseHostMarkdown = (hostMarkdown: string): ProseMirrorNode =>
  markdownParser.parse(wrapTablesForEditor(hostMarkdown));

export const serializeToHostMarkdown = (document: ProseMirrorNode): string =>
  unwrapTablesForHost(markdownSerializer.serialize(document));
