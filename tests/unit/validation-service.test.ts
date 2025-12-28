import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { ValidationService } from '../../src/services/validation-service';

const createDocument = (text: string, options?: { scheme?: string; languageId?: string }) => {
  const lines = text.split('\n');
  return {
    languageId: options?.languageId ?? 'markdown',
    uri: vscode.Uri.parse(`${options?.scheme ?? 'file'}:/test.md`),
    lineCount: lines.length,
    lineAt: (index: number) => {
      const lineText = lines[index] ?? '';
      return {
        text: lineText,
        range: new vscode.Range(
          new vscode.Position(index, 0),
          new vscode.Position(index, lineText.length)
        ),
      };
    },
    getText: () => text,
  } as vscode.TextDocument;
};

describe('ValidationService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('detects markdown language', () => {
    const service = new ValidationService();
    const document = createDocument('content', { languageId: 'markdown' });

    expect(service.isMarkdownFile(document)).to.equal(true);
    expect(service.isMarkdownFile(createDocument('content', { languageId: 'plaintext' }))).to.equal(false);
  });

  it('detects diff and git schemes', () => {
    const service = new ValidationService();

    expect(service.isDiffView(createDocument('content', { scheme: 'diff' }))).to.equal(true);
    expect(service.isDiffView(createDocument('content', { scheme: 'git' }))).to.equal(true);
    expect(service.isDiffView(createDocument('content', { scheme: 'file' }))).to.equal(false);
  });

  it('detects conflict markers', () => {
    const service = new ValidationService();
    const document = createDocument('line\n<<<<<<< HEAD\nconflict\n>>>>>>> branch');

    expect(service.hasConflictMarkers(document)).to.equal(true);
  });

  it('returns false for empty documents when checking conflict markers', () => {
    const service = new ValidationService();
    const document = createDocument('');
    (document as unknown as { lineCount: number }).lineCount = 0;

    expect(service.hasConflictMarkers(document)).to.equal(false);
  });

  it('flags large files above the configured size', async () => {
    const service = new ValidationService();
    sinon.stub(vscode.workspace.fs, 'stat').resolves({ size: 2048 } as vscode.FileStat);

    const uri = vscode.Uri.file('/tmp/large.md');
    const result = await service.isLargeFile(uri, 1024);

    expect(result).to.equal(true);
  });

  it('treats unreadable files as not large', async () => {
    const service = new ValidationService();
    sinon.stub(vscode.workspace.fs, 'stat').rejects(new Error('missing'));

    const uri = vscode.Uri.file('/tmp/missing.md');
    const result = await service.isLargeFile(uri, 1024);

    expect(result).to.equal(false);
  });

  it('detects binary files when null bytes are present', async () => {
    const service = new ValidationService();
    sinon.stub(vscode.workspace.fs, 'readFile').resolves(Uint8Array.from([0, 1, 2]));

    const uri = vscode.Uri.file('/tmp/binary.md');
    const result = await service.isBinaryFile(uri);

    expect(result).to.equal(true);
  });

  it('returns false for readable text files', async () => {
    const service = new ValidationService();
    sinon.stub(vscode.workspace.fs, 'readFile').resolves(Buffer.from('hello'));

    const uri = vscode.Uri.file('/tmp/text.md');
    const result = await service.isBinaryFile(uri);

    expect(result).to.equal(false);
  });

  it('returns false when binary detection cannot read the file', async () => {
    const service = new ValidationService();
    sinon.stub(vscode.workspace.fs, 'readFile').rejects(new Error('boom'));

    const result = await service.isBinaryFile(vscode.Uri.file('/tmp/missing.md'));
    expect(result).to.equal(false);
  });

  it('returns false when binary detection encounters invalid utf8 without null bytes', async () => {
    const service = new ValidationService();
    sinon.stub(vscode.workspace.fs, 'readFile').resolves(new Uint8Array([0xC3, 0x28]));

    const result = await service.isBinaryFile(vscode.Uri.file('/tmp/invalid.md'));
    expect(result).to.equal(false);
  });
});
