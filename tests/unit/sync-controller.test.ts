import sinon from 'sinon';
import { HostSyncController, type ApplyDocumentPayload } from '../../src/webview/editor/sync';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('HostSyncController', () => {
  let clock: sinon.SinonFakeTimers;
  let posted: ApplyDocumentPayload[];
  let controller: HostSyncController;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    posted = [];
    controller = new HostSyncController({
      debounceMs: 80,
      postApply: (payload) => posted.push(payload),
    });
  });

  afterEach(() => {
    controller.dispose();
    clock.restore();
  });

  it('coalesces rapid edits and serializes at flush time', () => {
    // Production always passes the same serializeMarkdownForHost function; the
    // debounce timer captures the FIRST closure, so the content that gets
    // posted is whatever the document holds when the timer fires.
    let markdown = 'draft one';
    const getMarkdown = (): string => markdown;

    controller.queueApply(getMarkdown);
    markdown = 'draft two';
    controller.queueApply(getMarkdown);
    expect(posted.length).to.equal(0);

    clock.tick(80);
    expect(posted).to.deep.equal([{ markdown: 'draft two', revision: 0 }]);
  });

  it('holds further applies until the host replies, then retries pending edits', () => {
    controller.queueApply(() => 'first');
    clock.tick(80);
    expect(posted.length).to.equal(1);

    controller.queueApply(() => 'second');
    clock.tick(10_000);
    expect(posted.length).to.equal(1);

    const shouldRetry = controller.handleHostDocumentChanged(1);
    expect(shouldRetry).to.equal(true);

    controller.queueApply(() => 'second');
    clock.tick(80);
    expect(posted.length).to.equal(2);
    expect(posted[1]).to.deep.equal({ markdown: 'second', revision: 1 });
  });

  it('never posts again if the host stays silent after an apply', () => {
    // Documents the contract the host MUST honor: every view.applyDocument
    // needs a reply (host.documentChanged or host.error). Without one the
    // latch below is permanent by design — see the no-op ack in the provider.
    controller.queueApply(() => 'first');
    clock.tick(80);
    expect(posted.length).to.equal(1);

    controller.queueApply(() => 'second');
    controller.flushApply(() => 'second');
    clock.tick(60_000);
    expect(posted.length).to.equal(1);
  });

  it('flushApply posts pending content immediately and cancels the timer', () => {
    controller.queueApply(() => 'pending');
    controller.flushApply(() => 'pending');
    expect(posted).to.deep.equal([{ markdown: 'pending', revision: 0 }]);

    clock.tick(80);
    expect(posted.length).to.equal(1);
  });

  it('flushApply does nothing when no edit is pending', () => {
    controller.flushApply(() => 'never sent');
    expect(posted.length).to.equal(0);
  });

  it('ignores edits queued while sync is suppressed', () => {
    controller.withSuppressedSync(() => {
      controller.queueApply(() => 'suppressed');
    });
    clock.tick(80);
    expect(posted.length).to.equal(0);
  });

  it('handleHostError releases the latch and reports pending work', () => {
    controller.queueApply(() => 'first');
    clock.tick(80);
    controller.queueApply(() => 'second');

    const shouldRetry = controller.handleHostError();
    expect(shouldRetry).to.equal(true);

    controller.queueApply(() => 'second');
    clock.tick(80);
    expect(posted.length).to.equal(2);
  });

  it('dispose cancels a scheduled apply', () => {
    controller.queueApply(() => 'pending');
    controller.dispose();
    clock.tick(80);
    expect(posted.length).to.equal(0);
  });

  it('tracks the host revision in posted payloads', () => {
    controller.setRevision(7);
    controller.queueApply(() => 'revisioned');
    clock.tick(80);
    expect(posted).to.deep.equal([{ markdown: 'revisioned', revision: 7 }]);
  });
});
