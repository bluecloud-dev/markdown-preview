export type ApplyDocumentPayload = {
  markdown: string;
  revision: number;
};

type SyncOptions = {
  debounceMs: number;
  postApply: (payload: ApplyDocumentPayload) => void;
};

export class HostSyncController {
  private currentRevision = 0;
  private inFlightApply = false;
  private pendingApply = false;
  private applyFlushTimer: ReturnType<typeof setTimeout> | undefined;
  private suppressSync = false;

  constructor(private readonly options: SyncOptions) {}

  getRevision(): number {
    return this.currentRevision;
  }

  setRevision(revision: number): void {
    this.currentRevision = revision;
  }

  withSuppressedSync<T>(run: () => T): T {
    this.suppressSync = true;
    try {
      return run();
    } finally {
      this.suppressSync = false;
    }
  }

  queueApply(getMarkdown: () => string): void {
    if (this.suppressSync) {
      return;
    }

    this.pendingApply = true;
    if (this.inFlightApply || this.applyFlushTimer) {
      return;
    }

    this.applyFlushTimer = setTimeout(() => {
      this.applyFlushTimer = undefined;
      if (!this.pendingApply || this.inFlightApply) {
        return;
      }
      this.postApply(getMarkdown);
    }, this.options.debounceMs);
  }

  flushApply(getMarkdown: () => string): void {
    if (this.suppressSync || this.inFlightApply || !this.pendingApply) {
      return;
    }

    if (this.applyFlushTimer) {
      clearTimeout(this.applyFlushTimer);
      this.applyFlushTimer = undefined;
    }

    this.postApply(getMarkdown);
  }

  handleHostDocumentChanged(revision: number): boolean {
    this.currentRevision = revision;
    this.inFlightApply = false;
    return this.pendingApply;
  }

  handleHostError(): boolean {
    this.inFlightApply = false;
    return this.pendingApply;
  }

  dispose(): void {
    if (!this.applyFlushTimer) {
      return;
    }
    clearTimeout(this.applyFlushTimer);
    this.applyFlushTimer = undefined;
  }

  private postApply(getMarkdown: () => string): void {
    this.inFlightApply = true;
    this.pendingApply = false;
    this.options.postApply({
      markdown: getMarkdown(),
      revision: this.currentRevision,
    });
  }
}
