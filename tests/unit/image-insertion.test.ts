import { EditorState, TextSelection } from 'prosemirror-state';
import {
  createImageInsertionTransaction,
  getImageAltTextFromSelection,
} from '../../src/webview/editor/image-insertion';
import {
  markdownParser,
  schema,
  serializeToHostMarkdown,
} from '../../src/webview/editor/markdown-codec';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('webview image insertion helpers', () => {
  it('uses selected text as alt text and serializes markdown image syntax', () => {
    const documentNode = markdownParser.parse('A screenshot appears here.');
    const selectedFrom = 3;
    const selectedTo = 'A screenshot'.length + 1;
    const state = EditorState.create({
      doc: documentNode,
      selection: TextSelection.create(documentNode, selectedFrom, selectedTo),
    });

    expect(getImageAltTextFromSelection(state)).to.equal('screenshot');

    const transaction = createImageInsertionTransaction(
      state,
      schema.nodes.image,
      'images/screenshot.png',
    );
    expect(serializeToHostMarkdown(transaction.doc)).to.equal(
      'A ![screenshot](images/screenshot.png) appears here.',
    );
  });

  it('keeps empty alt text when no text is selected', () => {
    const documentNode = markdownParser.parse('Before after.');
    const state = EditorState.create({
      doc: documentNode,
      selection: TextSelection.create(documentNode, 8),
    });
    const transaction = createImageInsertionTransaction(
      state,
      schema.nodes.image,
      'images/empty.png',
    );

    expect(getImageAltTextFromSelection(state)).to.equal('');
    expect(serializeToHostMarkdown(transaction.doc)).to.equal('Before ![](images/empty.png)after.');
  });
});
