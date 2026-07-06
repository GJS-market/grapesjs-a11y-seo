import type { Editor } from 'grapesjs';

type Handler = (...args: any[]) => void;
interface Subscription {
  event: string;
  cb: Handler;
}

/**
 * Leak-proof wrapper around `editor.on/off`. Every subscription is tracked so
 * {@link EditorBridge.disposeAll} can detach them all on teardown, returning
 * `editor.getModel()._events` to its baseline. Mirrors the pattern proven in
 * `grapesjs-devtools`.
 */
export class EditorBridge {
  private subs: Subscription[] = [];
  private disposed = false;

  constructor(private readonly editor: Editor) {}

  /** Subscribe and track. */
  on(event: string, cb: Handler): this {
    if (this.disposed) return this;
    this.editor.on(event, cb);
    this.subs.push({ event, cb });
    return this;
  }

  /** Subscribe once; the wrapper self-removes after firing. */
  once(event: string, cb: Handler): this {
    const wrapped: Handler = (...args) => {
      this.off(event, wrapped);
      cb(...args);
    };
    return this.on(event, wrapped);
  }

  /** Unsubscribe a specific handler. */
  off(event: string, cb: Handler): this {
    this.editor.off(event, cb);
    this.subs = this.subs.filter((s) => !(s.event === event && s.cb === cb));
    return this;
  }

  /** Detach every tracked subscription. Safe to call on a destroyed editor. */
  disposeAll(): void {
    for (const { event, cb } of this.subs) {
      try {
        this.editor.off(event, cb);
      } catch {
        /* editor may already be destroyed */
      }
    }
    this.subs = [];
    this.disposed = true;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}
