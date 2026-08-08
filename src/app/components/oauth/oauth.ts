import { Component, OnInit, Output, EventEmitter, signal } from '@angular/core';
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
export class Oauth implements OnInit {
  @Output() connected = new EventEmitter<boolean>();

  protected readonly status = signal<ConnectionStatus>('idle');
  protected readonly loading = signal(false);

  private portalId: string = '';
  private userEmail: string = '';

  constructor(private http: HttpClient) {
    const params = new URLSearchParams(window.location.search);
    this.portalId = params.get('portalId') || params.get('portalid') || '';
    this.userEmail = params.get('userEmail') || params.get('useremail') || '';
  }

  get oauthInitUrl(): string {
    return `${environment.hostUrl}/oauth/init?portalId=${this.portalId}&userEmail=${encodeURIComponent(this.userEmail)}`;
  }

  ngOnInit(): void {
    this.validate();
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
      },
      error: () => {
        this.status.set('failed');
        this.connected.emit(false);
        this.loading.set(false);
      },
    });
  }

  onConnectClick(): void {
    this.status.set('pending');
  }
}