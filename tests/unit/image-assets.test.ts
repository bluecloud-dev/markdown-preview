import * as vscode from 'vscode';
import {
  appendDeduplicationSuffix,
  formatPasteImageFileName,
  getImageDestinationDirectory,
  getImageExtension,
  getMarkdownImagePath,
  normalizeImageDestination,
  resolveMarkdownImageUri,
  sanitizeImageFileName,
  validateImageAsset,
} from '../../src/custom-editor/image-assets';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('image asset helpers', () => {
  it('validates size and image type allowlist', () => {
    expect(validateImageAsset({ byteLength: 10, name: 'diagram.svg' })).to.deep.equal({
      ok: true,
      extension: 'svg',
    });
    expect(validateImageAsset({ byteLength: 10, mime: 'image/webp' })).to.deep.equal({
      ok: true,
      extension: 'webp',
    });
    expect(validateImageAsset({ byteLength: 0, name: 'empty.png' })).to.deep.equal({
      ok: false,
      reason: 'empty',
    });
    expect(
      validateImageAsset({ byteLength: 10 * 1024 * 1024 + 1, name: 'large.png' }),
    ).to.deep.equal({
      ok: false,
      reason: 'tooLarge',
    });
    expect(validateImageAsset({ byteLength: 10, name: 'photo.heic' })).to.deep.equal({
      ok: false,
      reason: 'unsupportedType',
    });
  });

  it('derives pasted names and original-file dedupe names', () => {
    expect(formatPasteImageFileName(new Date('2026-06-14T09:08:07Z'), 'png')).to.equal(
      'image-20260614-090807.png',
    );
    expect(sanitizeImageFileName('../Screen Shot.png', 'png')).to.equal('Screen Shot.png');
    expect(sanitizeImageFileName('', 'jpg')).to.equal('image.jpg');
    expect(appendDeduplicationSuffix('Screen Shot.png', 2)).to.equal('Screen Shot-2.png');
  });

  it('normalizes configured destinations relative to the document directory', () => {
    const documentUri = vscode.Uri.file('/workspace/docs/guide.md');

    expect(normalizeImageDestination('assets/screens/')).to.equal('assets/screens');
    expect(normalizeImageDestination('../images')).to.equal('images');
    expect(getImageDestinationDirectory(documentUri, 'assets/').fsPath).to.equal(
      '/workspace/docs/assets',
    );
  });

  it('creates markdown-relative paths and resolves local markdown images', () => {
    const documentUri = vscode.Uri.file('/workspace/docs/guide.md');
    const imageUri = vscode.Uri.file('/workspace/docs/images/Screen Shot #1.png');

    expect(getMarkdownImagePath(documentUri, imageUri)).to.equal('images/Screen%20Shot%20%231.png');
    expect(
      resolveMarkdownImageUri(documentUri, 'images/Screen%20Shot%20%231.png')?.fsPath,
    ).to.equal('/workspace/docs/images/Screen Shot #1.png');
    expect(resolveMarkdownImageUri(documentUri, 'https://example.com/chart.png')).to.equal(
      undefined,
    );
    expect(resolveMarkdownImageUri(documentUri, 'images/broken%zz.png')).to.equal(undefined);
  });

  it('maps mime types only when names do not carry extensions', () => {
    expect(getImageExtension(undefined, 'image/jpeg')).to.equal('jpg');
    expect(getImageExtension('diagram.PNG', 'image/jpeg')).to.equal('png');
  });
});
