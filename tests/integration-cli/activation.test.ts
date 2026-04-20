import * as vscode from 'vscode';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('Integration CLI: activation', () => {
  it('activates the extension successfully', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
    expect(extension).to.not.equal(undefined);

    await extension?.activate();
    expect(extension?.isActive).to.equal(true);
  });

  it('does not rewrite workbench editor associations on activation', async () => {
    const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
    expect(extension).to.not.equal(undefined);

    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    await workbenchConfig.update('editorAssociations', undefined, vscode.ConfigurationTarget.Workspace);
    const beforeActivation = workbenchConfig.get('editorAssociations');

    await extension?.activate();

    const afterActivation = workbenchConfig.get('editorAssociations');
    expect(afterActivation).to.deep.equal(beforeActivation);
  });
});
