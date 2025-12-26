import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { ValidationService } from '../../src/services/validation-service';

describe('ValidationService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('detects markdown documents', () => {
    const service = new ValidationService();
    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/test.md'),
    } as vscode.TextDocument;

    expect(service.isMarkdownFile(document)).to.equal(true);
  });

  it('detects diff views', () => {
    const service = new ValidationService();
    const document = { uri: vscode.Uri.parse('git:/tmp/test.md') } as vscode.TextDocument;

    expect(service.isDiffView(document)).to.equal(true);
  });

  it('flags large files using fs.stat', async () => {
    const service = new ValidationService();
    const largePath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'tests',
      'fixtures',
      'large-file.md'
    );
    const result = await service.isLargeFile(vscode.Uri.file(largePath), 1_048_576);
    expect(result).to.equal(true);
  });

  it('flags binary files based on null bytes', async () => {
    const service = new ValidationService();
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-reader-'));
    const binaryPath = path.join(temporaryDirectory, 'binary.md');
    fs.writeFileSync(binaryPath, Buffer.from([0, 1, 2, 3]));

    const result = await service.isBinaryFile(vscode.Uri.file(binaryPath));
    fs.unlinkSync(binaryPath);
    fs.rmdirSync(temporaryDirectory);
    expect(result).to.equal(true);
  });
});
