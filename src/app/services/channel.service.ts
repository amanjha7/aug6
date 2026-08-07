// src/app/services/channel.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private base = environment.hostUrl;

  constructor(private http: HttpClient) {}

  // Channels
  getChannels(dashId: string): Observable<any> {
    return this.http.get(`${this.base}dashboard/${dashId}/channels`);
  }

  createTwilioChannel(dashId: string, payload: any): Observable<any> {
    return this.http.post(`${this.base}dashboard/${dashId}/channel`, payload);
  }

  updateTwilioChannel(dashId: string, channelId: string, payload: any): Observable<any> {
    return this.http.patch(`${this.base}dashboard/${dashId}/channel/${channelId}`, payload);
  }

  deleteChannel(dashId: string, channelId: string): Observable<any> {
    return this.http.delete(`${this.base}dashboard/${dashId}/channel/${channelId}`);
  }

  // Country codes
  getCountryCodes(): Observable<any> {
    return this.http.get(`${this.base}country-codes`);
  }

  // Regions
  getAvailableRegions(dashId: string): Observable<any> {
    return this.http.get(`${this.base}dashboard/${dashId}/regions`);
  }

  // Resources
  getResources(dashId: string): Observable<any> {
    return this.http.get(`${this.base}dashboard/${dashId}/resources`);
  }

  createResource(dashId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}dashboard/${dashId}/resource`, data);
  }

  updateResource(dashId: string, resourceId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}dashboard/${dashId}/resource/${resourceId}`, data);
  }

  deleteResource(dashId: string, resourceId: string): Observable<any> {
    return this.http.delete(`${this.base}dashboard/${dashId}/resource/${resourceId}`);
  }

  // AI Agents
  getAiAgents(dashId: string): Observable<any> {
    return this.http.get(`${this.base}dashboard/${dashId}/ai-agents`);
  }

  // Call Flows
  getCallFlows(dashId: string): Observable<any> {
    return this.http.get(`${this.base}dashboard/${dashId}/call-flows`);
  }

  // Trunk config
  refreshTrunkConfig(dashId: string, channelId: string): Observable<any> {
    return this.http.get(`${this.base}dashboard/${dashId}/channel/${channelId}/trunk-status`);
  }
}