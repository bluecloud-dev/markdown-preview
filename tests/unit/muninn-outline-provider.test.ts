import * as vscode from 'vscode';
import { MuninnOutlineProvider } from '../../src/outline/muninn-outline-provider';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const createDocument = (uri: vscode.Uri, text: string): vscode.TextDocument =>
  ({
    uri,
    getText: () => text,
  }) as vscode.TextDocument;

describe('MuninnOutlineProvider', () => {
  it('renders tree items, children, and lookup from the active document headings', () => {
    const provider = new MuninnOutlineProvider();
    const uri = vscode.Uri.file('/workspace/spec.md');
    provider.setDocument(createDocument(uri, '# Spec\n\n## Goals\n\n## Risks'));

    const roots = provider.getChildren();
    expect(roots).to.have.length(1);
    expect(provider.getSections()).to.equal(roots);
    expect(provider.getFlatSections().map((section) => section.title)).to.deep.equal([
      'Spec',
      'Goals',
      'Risks',
    ]);

    const root = roots[0];
    expect(root?.children.map((section) => section.title)).to.deep.equal(['Goals', 'Risks']);
    expect(provider.getChildren(root).map((section) => section.title)).to.deep.equal([
      'Goals',
      'Risks',
    ]);

    const treeItem = provider.getTreeItem(root!);
    expect(treeItem.label).to.equal('Spec');
    expect(treeItem.description).to.equal('Line 1');
    expect(treeItem.contextValue).to.equal('muninnOutlineSection');
    expect(treeItem.command?.command).to.equal('muninn.goToSection');
    expect(treeItem.command?.arguments?.[0]).to.equal(root);

    expect(provider.findSectionById('h2-l3-goals')?.title).to.equal('Goals');
  });

  it('refreshes only the active outline document and clears when no document is active', () => {
    const provider = new MuninnOutlineProvider();
    const activeUri = vscode.Uri.file('/workspace/active.md');
    const otherUri = vscode.Uri.file('/workspace/other.md');

    provider.setDocument(createDocument(activeUri, '# Active'));
    provider.refreshDocument(createDocument(otherUri, '# Other'));
    expect(provider.getFlatSections().map((section) => section.title)).to.deep.equal(['Active']);

    provider.refreshDocument(createDocument(activeUri, '# Updated'));
    expect(provider.getFlatSections().map((section) => section.title)).to.deep.equal(['Updated']);

    provider.setDocument(undefined);
    expect(provider.getChildren()).to.deep.equal([]);
  });
});
