import sinon from 'sinon';
import * as vscode from 'vscode';
import {

  formatBold,
  formatBulletList,
  formatCodeBlock,
  formatHeading1,
  formatHeading2,
  formatHeading3,
  formatInlineCode,
  formatItalic,
  formatLink,
  formatNumberedList,
  formatStrikethrough,
} from '../../src/commands/format-commands';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});


const createEditor = (languageId: string) => ({
  document: { languageId },
});

describe('format commands', () => {
  it('invokes formatting service for markdown editors', async () => {
    const formattingServiceStubs = {
      wrapSelection: sinon.stub().resolves(),
    };
    const formattingService =
      formattingServiceStubs as unknown as import('../../src/services/formatting-service').FormattingService;

    await formatBold(createEditor('markdown') as unknown as vscode.TextEditor, formattingService);

    expect(formattingServiceStubs.wrapSelection.calledOnce).to.equal(true);
    expect(formattingServiceStubs.wrapSelection.firstCall.args[1]).to.equal('**');
  });

  it('routes commands to correct formatting service APIs', async () => {
    const formattingServiceStubs = {
      wrapSelection: sinon.stub().resolves(),
      toggleLinePrefix: sinon.stub().resolves(),
      wrapBlock: sinon.stub().resolves(),
      insertLink: sinon.stub().resolves(),
    };
    const formattingService =
      formattingServiceStubs as unknown as import('../../src/services/formatting-service').FormattingService;

    const editor = createEditor('markdown') as unknown as vscode.TextEditor;
    await formatItalic(editor, formattingService);
    await formatStrikethrough(editor, formattingService);
    await formatInlineCode(editor, formattingService);
    await formatCodeBlock(editor, formattingService);
    await formatBulletList(editor, formattingService);
    await formatNumberedList(editor, formattingService);
    await formatHeading1(editor, formattingService);
    await formatHeading2(editor, formattingService);
    await formatHeading3(editor, formattingService);
    await formatLink(editor, formattingService);

    expect(formattingServiceStubs.wrapSelection.callCount).to.equal(3);
    expect(formattingServiceStubs.wrapBlock.calledOnce).to.equal(true);
    expect(formattingServiceStubs.toggleLinePrefix.callCount).to.equal(5);
    expect(formattingServiceStubs.insertLink.calledOnce).to.equal(true);
  });

  it('skips formatting for non-markdown editors', async () => {
    const formattingServiceStubs = {
      wrapSelection: sinon.stub().resolves(),
      insertLink: sinon.stub().resolves(),
    };
    const formattingService =
      formattingServiceStubs as unknown as import('../../src/services/formatting-service').FormattingService;

    await formatBold(createEditor('plaintext') as unknown as vscode.TextEditor, formattingService);
    await formatLink(createEditor('plaintext') as unknown as vscode.TextEditor, formattingService);

    expect(formattingServiceStubs.wrapSelection.called).to.equal(false);
    expect(formattingServiceStubs.insertLink.called).to.equal(false);
  });
});
