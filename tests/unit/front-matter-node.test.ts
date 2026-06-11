import { DEFAULT_WEBVIEW_STRINGS } from '../../src/shared/webview-strings';
import {
  parseHostMarkdown,
  serializeToHostMarkdown,
} from '../../src/webview/editor/markdown-codec';
import { getFrontMatterDisplayText } from '../../src/webview/editor/nodes/front-matter-node-view';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('front matter codec and rendering helpers', () => {
  it('round-trips YAML front matter byte-for-byte except for the existing final-newline defect', () => {
    const markdown = [
      '---',
      'title: Muninn',
      'tags: [notes, markdown]',
      '---',
      '',
      '# Document body',
      '',
    ].join('\n');

    expect(serializeToHostMarkdown(parseHostMarkdown(markdown))).to.equal(markdown.trimEnd());
  });

  it('keeps mid-document thematic breaks as markdown, not front matter', () => {
    const markdown = ['# Before', '', '---', '', '# After', ''].join('\n');

    expect(serializeToHostMarkdown(parseHostMarkdown(markdown))).to.equal(markdown.trimEnd());
  });

  it('renders a localized label and displays only the YAML body text', () => {
    const raw = '---\ntitle: Muninn\nnested:\n  - markdown\n---\n';

    expect(DEFAULT_WEBVIEW_STRINGS.frontMatterLabel).to.equal('Front matter');
    expect(DEFAULT_WEBVIEW_STRINGS.frontMatterAriaLabel).to.equal('Front matter metadata block');
    expect(getFrontMatterDisplayText(raw)).to.equal('title: Muninn\nnested:\n  - markdown');
  });
});
