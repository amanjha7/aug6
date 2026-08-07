// src/app/services/channel.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private hostUrl = environment.hostUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
  }

  // ---------- Generic Channel Endpoints ----------
  getChannels(dashId: string, filters: any = {}): Observable<any> {
    const url = `${this.hostUrl}dashboard/channel/query`;
    const body = { dashboard_id: [dashId], ...filters };
    return this.http.post(url, body, { headers: this.getHeaders() });
  }

  createChannel(dashId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashId}/channel`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  updateChannel(dashId: string, channelId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashId}/channel/${channelId}`;
    return this.http.patch(url, data, { headers: this.getHeaders() });
  }

  deleteChannel(dashId: string, channelId: string): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashId}/channel/${channelId}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  // ---------- Twilio / Calling Channel Endpoints ----------
  createTwilioChannel(dashId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashId}/twiliochannel`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  updateTwilioChannel(dashId: string, channelId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashId}/twiliochannel/${channelId}`;
    return this.http.patch(url, data, { headers: this.getHeaders() });
  }

  // ---------- Utilities ----------
  getCountryCodes(): Observable<any> {
    // Pronnel uses a currency/country endpoint; we'll reuse it.
    return this.http.get(`${this.hostUrl}api/countries/info`, { headers: this.getHeaders() });
  }

  getAvailableRegions(dashId: string): Observable<any> {
    return this.http.get(`${this.hostUrl}dashboard/${dashId}/region`, { headers: this.getHeaders() });
  }
}