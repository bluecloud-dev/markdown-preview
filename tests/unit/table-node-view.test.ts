import { DEFAULT_WEBVIEW_STRINGS } from '../../src/shared/webview-strings';
import { schema } from '../../src/webview/editor/markdown-codec';
import {
  DEFAULT_TABLE_SOURCE,
  getTableGridAriaLabel,
  getTableNodeDocumentIndex,
  TABLE_FENCE_LANGUAGE,
  type MarkdownTable,
} from '../../src/webview/editor/nodes/table-node-view';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const createTableNode = () =>
  schema.nodes.code_block.create(
    { params: TABLE_FENCE_LANGUAGE },
    schema.text(DEFAULT_TABLE_SOURCE),
  );

describe('table node view accessibility helpers', () => {
  it('formats localized grid names from the parsed table model', () => {
    const table: MarkdownTable = {
      headers: ['Name', 'Score', 'Notes'],
      rows: [
        ['Alice', '7', ''],
        ['Ben', '9', ''],
      ],
    };

    expect(DEFAULT_WEBVIEW_STRINGS.tableGridAriaLabelTemplate).to.equal(
      'Table {0}: {1} columns, {2} rows',
    );
    expect(getTableGridAriaLabel(2, table)).to.equal('Table 2: 3 columns, 2 rows');
  });

  it('counts only editable table nodes when deriving document-order table names', () => {
    const firstTable = createTableNode();
    const secondTable = createTableNode();
    const documentNode = schema.nodes.doc.create(undefined, [
      firstTable,
      schema.nodes.code_block.create({ params: 'typescript' }, schema.text('const value = 1;')),
      schema.nodes.paragraph.create(undefined, schema.text('Between tables')),
      secondTable,
    ]);

    const tablePositions: number[] = [];
    documentNode.descendants((node, position) => {
      if (node.type.name === 'code_block' && node.attrs.params === TABLE_FENCE_LANGUAGE) {
        tablePositions.push(position);
      }
      return true;
    });

    expect(tablePositions).to.have.length(2);
    expect(getTableNodeDocumentIndex(documentNode, tablePositions[0])).to.equal(1);
    expect(getTableNodeDocumentIndex(documentNode, tablePositions[1])).to.equal(2);
  });
});
