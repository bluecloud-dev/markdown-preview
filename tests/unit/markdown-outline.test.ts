import { parseMarkdownOutline } from '../../src/outline/markdown-outline';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('markdown outline parsing', () => {
  it('extracts ATX headings, ignores fenced code, and shapes a heading tree', () => {
    const outline = parseMarkdownOutline(
      [
        '# Product',
        '',
        'Intro copy.',
        '## Goals',
        '### Detail',
        '```',
        '# Ignored',
        '```',
        '## Goals',
      ].join('\n'),
    );

    expect(outline).to.have.length(1);
    expect(outline[0]).to.include({
      id: 'h1-l1-product',
      title: 'Product',
      level: 1,
      line: 0,
      occurrence: 0,
    });
    expect(outline[0]?.children).to.have.length(2);
    expect(outline[0]?.children[0]).to.include({
      id: 'h2-l4-goals',
      title: 'Goals',
      level: 2,
      line: 3,
      occurrence: 0,
    });
    expect(outline[0]?.children[0]?.children[0]).to.include({
      id: 'h3-l5-detail',
      title: 'Detail',
      level: 3,
      line: 4,
      occurrence: 0,
    });
    expect(outline[0]?.children[1]).to.include({
      id: 'h2-l9-goals',
      title: 'Goals',
      level: 2,
      line: 8,
      occurrence: 1,
    });
  });

  it('normalizes empty heading text into a navigable section label', () => {
    const outline = parseMarkdownOutline('### ###');

    expect(outline).to.deep.equal([
      {
        id: 'h3-l1-section',
        title: 'Section',
        normalizedTitle: 'section',
        level: 3,
        line: 0,
        occurrence: 0,
        children: [],
      },
    ]);
  });
});
