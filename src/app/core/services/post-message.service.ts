import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface PostMessageEnvelope<T = any> {
  type: string;
  payload: T;
  source?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PostMessageService {
  private messageSubject = new Subject<PostMessageEnvelope>();

  // Expose recent logs for diagnostic debugging in the UI
  logs = signal<{ timestamp: Date; type: 'sent' | 'received'; data: any }[]>([]);

  constructor() {
    this.setupListener();
  }

  /**
   * Listens for postMessage events from the parent or window.
   */
  private setupListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        // Here we could check origin if needed, but since it runs in different CRMs,
        // we accept any origin or structure matching our Envelope.
        if (event.data && typeof event.data === 'object' && 'type' in event.data) {
          const envelope: PostMessageEnvelope = {
            type: event.data.type,
            payload: event.data.payload,
            source: 'parent',
          };
          this.log('received', envelope);
          this.messageSubject.next(envelope);
        }
      });
    }
  }

  /**
   * Log communication for debugging/diagnostic view in the UI.
   */
  private log(direction: 'sent' | 'received', data: any): void {
    const current = this.logs();
    this.logs.set([
      { timestamp: new Date(), type: direction, data },
      ...current.slice(0, 49), // Keep last 50 logs
    ]);
  }

  /**
   * Send a message to the parent window/frame.
   */
  public send<T>(type: string, payload: T): void {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const message: PostMessageEnvelope<T> = { type, payload };
      this.log('sent', message);
      window.parent.postMessage(message, '*');
    } else {
      // Fallback log for local standalone testing
      const message: PostMessageEnvelope<T> = { type, payload };
      this.log('sent', { ...message, warning: 'No parent iframe detected' });
    }
  }

  /**
   * Listen for specific message types.
   */
  public listen<T>(type: string): Observable<PostMessageEnvelope<T>> {
    return this.messageSubject.asObservable().pipe(
      filter((msg) => msg.type === type)
    ) as Observable<PostMessageEnvelope<T>>;
  }
}
