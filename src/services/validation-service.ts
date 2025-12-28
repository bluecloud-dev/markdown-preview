/**
 * @fileoverview Validation service for file and document checks.
 *
 * This service provides validation logic to determine how files should be handled:
 * - File type detection (markdown vs other languages)
 * - View type detection (diff views, custom editors)
 * - Content analysis (conflict markers, binary content)
 * - Size checks (large file detection)
 *
 * The validation results are used by the file handler and preview service to
 * decide whether to show preview, edit mode, or skip interception entirely.
 *
 * @module services/validation-service
 */

import * as vscode from 'vscode';

/**
 * Number of bytes to sample when detecting binary content.
 * Checking the first 8KB is sufficient to detect null bytes that indicate binary files.
 */
const BINARY_SAMPLE_SIZE = 8 * 1024;

/**
 * Service for validating files and documents before processing.
 *
 * Provides synchronous and asynchronous checks to determine how files
 * should be handled by the extension. All methods are designed to be
 * fault-tolerant, returning safe defaults on errors.
 *
 * @example
 * ```typescript
 * const validationService = new ValidationService();
 *
 * // Check if document is markdown
 * if (!validationService.isMarkdownFile(document)) return;
 *
 * // Check for conditions that require edit mode
 * if (validationService.hasConflictMarkers(document)) {
 *   await enterEditMode(document.uri);
 * }
 *
 * // Check for large or binary files
 * if (await validationService.isLargeFile(uri, maxSize)) {
 *   promptForPreview();
 * }
 * ```
 */
export class ValidationService {
  /**
   * Determine whether the document is markdown.
   * @param document The document to inspect.
   * @returns True when the document language is markdown.
   * @throws No errors expected.
   */
  isMarkdownFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'markdown';
  }

  /**
   * Determine whether the document is a diff view.
   * @param document The document to inspect.
   * @returns True when the document is a diff view.
   * @throws No errors expected.
   */
  isDiffView(document: vscode.TextDocument): boolean {
    return document.uri.scheme === 'git' || document.uri.scheme === 'diff';
  }

  /**
   * Detect common git conflict markers in the document.
   * @param document The document to inspect.
   * @returns True when conflict markers are present.
   * @throws No errors expected.
   */
  hasConflictMarkers(document: vscode.TextDocument): boolean {
    const sampleLines = Math.min(document.lineCount, 500);
    if (sampleLines === 0) {
      return false;
    }
    const lastLine = document.lineAt(sampleLines - 1);
    const sample = document.getText(
      new vscode.Range(new vscode.Position(0, 0), lastLine.range.end)
    );
    return /^(<<<<<<<|=======|>>>>>>>)/m.test(sample);
  }

  /**
   * Determine whether a file is larger than the configured size limit.
   * @param uri The file URI to inspect.
   * @param maxFileSize The maximum allowed size in bytes.
   * @returns True when the file exceeds the limit.
   * @throws No errors expected.
   */
  async isLargeFile(uri: vscode.Uri, maxFileSize: number): Promise<boolean> {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      return stat.size > maxFileSize;
    } catch {
      return false;
    }
  }

  /**
   * Determine whether a file appears to be binary.
   * @param uri The file URI to inspect.
   * @returns True when the file appears to be binary.
   * @throws No errors expected.
   */
  async isBinaryFile(uri: vscode.Uri): Promise<boolean> {
    try {
      const data = await vscode.workspace.fs.readFile(uri);
      const sample = data.slice(0, BINARY_SAMPLE_SIZE);

      for (const byte of sample) {
        if (byte === 0) {
          return true;
        }
      }

      const decoder = new TextDecoder('utf8', { fatal: true });
      decoder.decode(sample);
      return false;
    } catch {
      return false;
    }
  }
}
