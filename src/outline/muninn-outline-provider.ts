import * as vscode from 'vscode';
import { t } from '../utils/l10n';
import {
  flattenMarkdownOutline,
  MarkdownOutlineSection,
  parseMarkdownOutline,
} from './markdown-outline';

export const MUNINN_OUTLINE_VIEW_ID = 'muninn.outline';

export class MuninnOutlineProvider implements vscode.TreeDataProvider<MarkdownOutlineSection> {
  private readonly changedEmitter = new vscode.EventEmitter<
    MarkdownOutlineSection | undefined | null | void
  >();
  readonly onDidChangeTreeData = this.changedEmitter.event;

  private documentUri: vscode.Uri | undefined;
  private sections: MarkdownOutlineSection[] = [];

  setDocument(document: vscode.TextDocument | undefined): void {
    this.documentUri = document?.uri;
    this.sections = document ? parseMarkdownOutline(document.getText()) : [];
    this.changedEmitter.fire();
  }

  refreshDocument(document: vscode.TextDocument): void {
    if (document.uri.toString() !== this.documentUri?.toString()) {
      return;
    }
    this.setDocument(document);
  }

  getSections(): readonly MarkdownOutlineSection[] {
    return this.sections;
  }

  getFlatSections(): MarkdownOutlineSection[] {
    return flattenMarkdownOutline(this.sections);
  }

  findSectionById(id: string): MarkdownOutlineSection | undefined {
    return this.getFlatSections().find((section) => section.id === id);
  }

  getTreeItem(element: MarkdownOutlineSection): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.title,
      element.children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    item.description = t('Line {0}', String(element.line + 1));
    item.tooltip = t('{0} (line {1})', element.title, String(element.line + 1));
    item.contextValue = 'muninnOutlineSection';
    item.command = {
      command: 'muninn.goToSection',
      title: t('Go to Section'),
      arguments: [element],
    };
    return item;
  }

  getChildren(element?: MarkdownOutlineSection): MarkdownOutlineSection[] {
    return element ? element.children : this.sections;
  }
}
