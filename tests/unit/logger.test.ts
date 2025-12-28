import sinon from 'sinon';
import * as vscode from 'vscode';
import { Logger } from '../../src/services/logger';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



const createChannel = (
  appendLine: sinon.SinonStub,
  showStub?: sinon.SinonStub
): vscode.OutputChannel => ({
    name: 'test',
    append: sinon.stub(),
    appendLine,
    replace: sinon.stub(),
    clear: sinon.stub(),
    show: ((...arguments_: unknown[]) => {
      if (showStub) {
        showStub(...arguments_);
      }
    }) as unknown as vscode.OutputChannel['show'],
    hide: sinon.stub(),
    dispose: sinon.stub(),
  }) as unknown as vscode.OutputChannel;

describe('Logger', () => {
  it('formats info messages with severity', () => {
    const appendLine = sinon.stub();
    const logger = new Logger(createChannel(appendLine));

    logger.info('Hello');

    expect(appendLine.calledOnce).to.equal(true);
    const message = appendLine.firstCall.args[0];
    expect(message).to.include('[INFO]');
    expect(message).to.include('Hello');
  });

  it('logs error details when provided', () => {
    const appendLine = sinon.stub();
    const logger = new Logger(createChannel(appendLine));

    const error = new Error('Boom');
    logger.error('Failed', error);

    expect(appendLine.called).to.equal(true);
    expect(appendLine.firstCall.args[0]).to.include('[ERROR]');
  });

  it('logs warnings and shows output', () => {
    const appendLine = sinon.stub();
    const showStub = sinon.stub();
    const channel = createChannel(appendLine, showStub);
    const logger = new Logger(channel);

    logger.warn('Heads up');
    logger.show(false);

    expect(appendLine.called).to.equal(true);
    expect(showStub.calledOnce).to.equal(true);
    expect(showStub.firstCall.args[0]).to.equal(false);
  });

  it('logs non-error details for unknown values', () => {
    const appendLine = sinon.stub();
    const logger = new Logger(createChannel(appendLine));

    logger.error('Failed', 'details');

    expect(appendLine.called).to.equal(true);
    expect(appendLine.lastCall.args[0]).to.include('Details:');
  });
});
