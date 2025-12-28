/**
 * @fileoverview Localization utilities for user-facing strings.
 *
 * This module provides a wrapper around VS Code's l10n API for
 * internationalization support. All user-facing strings in the extension
 * should be passed through the `t()` function to enable localization.
 *
 * @module utils/l10n
 */

import * as vscode from 'vscode';

/**
 * Localize a message using VS Code's l10n API.
 * @param message The message key or default string.
 * @param values Optional interpolation values.
 * @returns The localized string.
 * @throws No errors expected.
 */
export const t = (
  message: string,
  ...values: Array<string | number | boolean>
): string => vscode.l10n.t(message, ...values);
