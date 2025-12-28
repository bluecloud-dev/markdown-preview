/**
 * @fileoverview Type definitions for file state management.
 *
 * These types define the state structure used to track each markdown file's
 * current view mode and related metadata. State is managed by StateService
 * and persists in memory for the duration of the VS Code session.
 *
 * @module types/state
 */

/**
 * Enumeration of available view modes for markdown files.
 *
 * - Preview: Read-only rendered view (default for file opens)
 * - Edit: Split view with text editor and live preview
 */
export enum ViewMode {
  /** Read-only rendered markdown preview */
  Preview = 'preview',
  /** Split view with text editor (left) and live preview (right) */
  Edit = 'edit',
}

/**
 * Represents the current state of a markdown file.
 *
 * Each open markdown file maintains its own independent state, allowing
 * users to have different files in different modes simultaneously.
 * This interface is used as the value type in StateService's internal Map.
 *
 * @example
 * ```typescript
 * const state: FileState = {
 *   uri: 'file:///path/to/readme.md',
 *   mode: ViewMode.Edit,
 *   lastModeChange: Date.now(),
 *   editorVisible: true,
 *   lastSelection: { line: 10, character: 5 }
 * };
 * ```
 */
export interface FileState {
  /** File URI as string (used as the Map key in StateService) */
  uri: string;

  /** Current view mode (preview or edit) */
  mode: ViewMode;

  /** Timestamp of the last mode change (for debugging/logging) */
  lastModeChange: number;

  /** Whether the text editor pane is currently visible */
  editorVisible?: boolean;

  /**
   * Last cursor position in the text editor.
   * Stored when exiting edit mode and restored when re-entering.
   * Not persisted across VS Code sessions.
   */
  lastSelection?: {
    /** Zero-based line number */
    line: number;
    /** Zero-based character position within the line */
    character: number;
  };
}
