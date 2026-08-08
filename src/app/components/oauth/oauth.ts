// src/app/components/oauth/oauth.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type ConnectionStatus = 'idle' | 'pending' | 'connected' | 'failed';

@Component({
  selector: 'app-oauth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth.html',
  styleUrls: ['./oauth.scss'],
})
export class Oauth implements OnInit, OnDestroy {
  @Output() connected = new EventEmitter<boolean>();

  protected readonly status = signal<ConnectionStatus>('idle');
  protected readonly loading = signal(false);
  protected readonly autoVerifying = signal(false);

  private portalId: string = '';
  private userEmail: string = '';

  private popupWindow: Window | null = null;
  private checkTabTimer: any = null;
  private autoPollTimer: any = null;

  constructor(private http: HttpClient) {
    const params = new URLSearchParams(window.location.search);
    this.portalId = params.get('portalId') || params.get('portalid') || '';
    this.userEmail = params.get('userEmail') || params.get('useremail') || '';
  }

  get oauthInitUrl(): string {
    return `${environment.hostUrl}/oauth/init?portalId=${this.portalId}&userEmail=${encodeURIComponent(this.userEmail)}`;
  }

  get formattedPortalId(): string {
    return this.portalId || 'Not specified';
  }

  get formattedUserEmail(): string {
    return this.userEmail || 'Not specified';
  }

  ngOnInit(): void {
    this.validate();
    this.setupMessageListener();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.checkTabTimer) {
      clearInterval(this.checkTabTimer);
      this.checkTabTimer = null;
    }
    if (this.autoPollTimer) {
      clearInterval(this.autoPollTimer);
      this.autoPollTimer = null;
    }
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (event.data === 'oauth_success' || event.data?.type === 'oauth_success') {
        if (this.popupWindow && !this.popupWindow.closed) {
          this.popupWindow.close();
        }
        this.clearTimers();
        this.validate();
      }
    });
  }

  validate(): void {
    this.loading.set(true);
    const url = `${environment.hostUrl}/oauth/connection/validate?portalid=${this.portalId}&useremail=${encodeURIComponent(this.userEmail)}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        const isConnected = data?.status === 'success';
        this.status.set(isConnected ? 'connected' : 'failed');
        this.connected.emit(isConnected);
        this.loading.set(false);
        this.autoVerifying.set(false);

        if (isConnected) {
          this.clearTimers();
        }
      },
      error: () => {
        this.status.set('failed');
        this.connected.emit(false);
        this.loading.set(false);
        this.autoVerifying.set(false);
      },
    });
  }

  startConnectFlow(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.status.set('pending');
    this.clearTimers();

    // 1. Open popup window
    const width = 640;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    this.popupWindow = window.open(
      this.oauthInitUrl,
      'HubSpotOAuth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1,resizable=1`
    );

    // Fallback if popup blocker blocked window.open
    if (!this.popupWindow || this.popupWindow.closed || typeof this.popupWindow.closed === 'undefined') {
      window.open(this.oauthInitUrl, '_blank');
    }

    // 2. Poll tab closed state every 600ms -> Auto verify on close!
    this.checkTabTimer = setInterval(() => {
      if (this.popupWindow && this.popupWindow.closed) {
        this.clearTimers();
        this.autoVerifying.set(true);
        this.validate();
      }
    }, 600);

    // 3. Background poll validation every 3 seconds while pending -> Auto detect success before tab close!
    this.autoPollTimer = setInterval(() => {
      if (this.status() === 'pending') {
        const url = `${environment.hostUrl}/oauth/connection/validate?portalid=${this.portalId}&useremail=${encodeURIComponent(this.userEmail)}`;
        this.http.get<any>(url).subscribe({
          next: (data) => {
            if (data?.status === 'success') {
              if (this.popupWindow && !this.popupWindow.closed) {
                this.popupWindow.close();
              }
              this.clearTimers();
              this.status.set('connected');
              this.connected.emit(true);
            }
          },
        });
      }
    }, 3000);
  }
}