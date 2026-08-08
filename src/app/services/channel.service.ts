// src/app/services/channel.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private base = environment.hostUrl + '/';
  private orgId = "246705749";

  constructor(private http: HttpClient) {}

  // ──────────── CHANNELS ────────────
  // GET  /channel           → List (scoped by portal_id in query params)
  // GET  /channel/:id       → Read one
  // POST /channel           → Create (body includes dashboard_id)
  // PUT  /channel/:id       → Update
  // DELETE /channel/:id     → Delete
  // POST /channel/query     → Options for workflow dropdowns

  getChannels(dashId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.get(`${this.base}channel`, { params });
  }

  createTwilioChannel(dashId: string, payload: any): Observable<any> {
    // backend expects dashboard_id in body
    return this.http.post(`${this.base}channel`, { ...payload, dashboard_id: dashId });
  }

  updateTwilioChannel(dashId: string, channelId: string, payload: any): Observable<any> {
    return this.http.put(`${this.base}channel/${channelId}`, { ...payload, dashboard_id: dashId });
  }

  deleteChannel(dashId: string, channelId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.delete(`${this.base}channel/${channelId}`, { params });
  }

  channelOptions(dashId: string): Observable<any> {
    return this.http.post(`${this.base}channel/query`, { portal_id: dashId });
  }

  // ──────────── RESOURCES ────────────
  // GET  /resource          → List
  // GET  /resource/:id      → Read
  // POST /resource          → Create
  // PUT  /resource/:id      → Update
  // DELETE /resource/:id    → Delete

  getResources(dashId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.get(`${this.base}resource`, { params });
  }

  createResource(dashId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}resource`, { ...data, portal_id: dashId, org_id: dashId });
  }

  updateResource(dashId: string, resourceId: string, data: any): Observable<any> {
    return this.http.put(`${this.base}resource/${resourceId}`, { ...data, portal_id: dashId });
  }

  deleteResource(dashId: string, resourceId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.delete(`${this.base}resource/${resourceId}`, { params });
  }

  // ──────────── AI AGENTS ────────────
  // GET  /aiagent           → List
  // POST /aiagent/query     → Options for workflow dropdowns

  getAiAgents(dashId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.get(`${this.base}aiagent`, { params });
  }

  aiAgentOptions(dashId: string): Observable<any> {
    return this.http.post(`${this.base}aiagent/query`, { portal_id: dashId });
  }

  // ──────────── CALL FLOWS ────────────
  // POST /callflow/query    → Options for workflow dropdowns

  getCallFlows(dashId: string): Observable<any> {
    return this.http.post(`${this.base}callflow/query`, { portal_id: dashId });
  }

  // ──────────── COUNTRY CODES ────────────
  getCountryCodes(): Observable<any> {
    return this.http.get(`${this.base}country-codes`);
  }

  // ──────────── REGIONS ────────────
  getAvailableRegions(dashId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.get(`${this.base}regions`, { params });
  }

  // ──────────── TRUNK STATUS ────────────
  refreshTrunkConfig(dashId: string, channelId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.get(`${this.base}channel/${channelId}`, { params });
  }
}