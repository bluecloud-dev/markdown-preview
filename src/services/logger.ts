import * as vscode from 'vscode';

/**
 * Logging service for the Markdown Reader extension.
 *
 * Provides structured logging with timestamps and severity levels to the
 * "Markdown Reader" output channel. All log messages include ISO timestamps
 * for easier debugging and support analysis.
 *
 * Log Levels:
 * - INFO: Normal operations (file opens, mode switches, config changes)
 * - WARN: Recoverable issues (large files, conflict markers detected)
 * - ERROR: Failures requiring attention (preview command failed)
 *
 * @example
 * ```typescript
 * const logger = new Logger(outputChannel);
 * logger.info('Extension activated');
 * logger.warn('Large file detected; prompting user');
 * logger.error('Preview failed', new Error('Command not found'));
 * ```
 */
export class Logger {
  constructor(private readonly channel: vscode.OutputChannel) {}

  /**
   * Format the current timestamp for log entries.
   *
   * Uses ISO 8601 format for consistency and machine-readability.
   * Example output: "2024-01-15T14:30:45.123Z"
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format a log entry with timestamp and severity level.
   *
   * Format: "[TIMESTAMP] [LEVEL] message"
   * Example: "[2024-01-15T14:30:45.123Z] [INFO] Extension activated"
   */
  private formatMessage(level: string, message: string): string {
    return `[${this.getTimestamp()}] [${level}] ${message}`;
  }

  /**
   * Log an informational message to the output channel.
   *
   * Use for normal operations that may be useful for debugging:
   * - Extension activation/deactivation
   * - File opens and mode switches
   * - Configuration changes
   * - User actions (entering/exiting edit mode)
   *
   * @param message - Descriptive message about the operation
   *
   * @example
   * ```typescript
   * logger.info('Opening preview for /path/to/file.md');
   * logger.info('Configuration changed; reloading settings');
   * ```
   */
  info(message: string): void {
    this.channel.appendLine(this.formatMessage('INFO', message));
  }

  /**
   * Log a warning message to the output channel.
   *
   * Use for recoverable issues that don't prevent operation:
   * - Large files that may slow down preview
   * - Files with conflict markers
   * - Deprecated settings or patterns
   * - Conditions where behavior differs from default
   *
   * @param message - Description of the warning condition
   *
   * @example
   * ```typescript
   * logger.warn('Large file detected; prompting for preview decision');
   * logger.warn('Conflict markers detected; opening in edit mode');
   * ```
   */
  warn(message: string): void {
    this.channel.appendLine(this.formatMessage('WARN', message));
  }

  /**
   * Log an error message with optional error details to the output channel.
   *
   * Use for failures that require attention:
   * - Preview command failures
   * - File system errors
   * - Unexpected exceptions
   *
   * When an Error object is provided, the stack trace is included for debugging.
   * For non-Error objects, the value is converted to string.
   *
   * @param message - Summary of what went wrong
   * @param error - Optional error object with details (Error, string, or unknown)
   *
   * @example
   * ```typescript
   * logger.error('Preview command failed: markdown.showPreview');
   * logger.error('Failed to read file', new Error('ENOENT: file not found'));
   * ```
   */
  error(message: string, error?: unknown): void {
    this.channel.appendLine(this.formatMessage('ERROR', message));
    if (error instanceof Error) {
      // Include full stack trace for debugging
      this.channel.appendLine(`  Stack: ${error.stack ?? error.message}`);
      return;
    }
    if (error !== undefined) {
      // Convert non-Error values to string representation
      this.channel.appendLine(`  Details: ${String(error)}`);
    }
  }

  /**
   * Reveal the output channel in the VS Code panel.
   *
   * Call this after logging important information that the user should see,
   * such as errors or warnings that require action.
   *
   * @param preserveFocus - If true, keeps focus on the current editor.
   *                        Set to false to focus the output panel.
   *
   * @example
   * ```typescript
   * logger.error('Preview failed', error);
   * logger.show(true); // Show output but keep editor focused
   * ```
   */
  show(preserveFocus = true): void {
    this.channel.show(preserveFocus);
  }
}
