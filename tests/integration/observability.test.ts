import sinon from 'sinon';
import * as vscode from 'vscode';
import { Logger } from '../../src/services/logger';
import { PreviewService } from '../../src/services/preview-service';
import { StateService } from '../../src/services/state-service';
import { ValidationService } from '../../src/services/validation-service';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



const createMemento = (): vscode.Memento => {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      if (store.has(key)) {
        return store.get(key) as T;
      }
      return defaultValue as T;
    },
    update: async (key: string, value: unknown): Promise<void> => {
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
};

const createLogger = (): Logger =>
  ({
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    show: sinon.stub(),
  }) as unknown as Logger;

describe('Observability and error handling', () => {
  beforeEach(() => {
    const l10nStub = sinon.stub(vscode.l10n, 't') as sinon.SinonStub;
    l10nStub.callsFake((message: string) => message);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('shows a fallback action when preview fails', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const logger = createLogger();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').rejects(new Error('boom'));
    const errorStub = sinon
      .stub(vscode.window, 'showErrorMessage')
      .resolves('Open in Editor' as unknown as vscode.MessageItem);
    const showStub = sinon.stub(vscode.window, 'showTextDocument').resolves();

    const uri = vscode.Uri.file('/tmp/failure.md');
    await previewService.showPreview(uri);

    expect(
      errorStub.calledWith('Unable to open markdown preview.', sinon.match.string)
    ).to.equal(true);
    expect(showStub.calledWith(uri, { preview: false })).to.equal(true);
    expect((logger.error as sinon.SinonStub).calledOnce).to.equal(true);
  });
});
