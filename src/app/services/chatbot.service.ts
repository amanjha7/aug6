// src/app/services/chatbot.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private hostUrl = environment.hostUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
  }

  private cleanBaseUrl(): string {
    return this.hostUrl.endsWith('/') ? this.hostUrl : `${this.hostUrl}/`;
  }

  // ──────────── AI AGENTS (/aiagent) ────────────
  getAiAgents(dashId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.get(`${this.cleanBaseUrl()}aiagent`, { headers: this.getHeaders(), params });
  }

  queryAIAgents(data: any): Observable<any> {
    return this.http.post(`${this.cleanBaseUrl()}aiagent/query`, data, { headers: this.getHeaders() });
  }

  createAIAgent(dashboardId: string, data: any): Observable<any> {
    return this.http.post(`${this.cleanBaseUrl()}aiagent`, { ...data, portal_id: dashboardId }, { headers: this.getHeaders() });
  }

  updateAIAgent(dashboardId: string, agentId: string, data: any): Observable<any> {
    return this.http.put(`${this.cleanBaseUrl()}aiagent/${agentId}`, { ...data, portal_id: dashboardId }, { headers: this.getHeaders() });
  }

  deleteAIAgent(dashboardId: string, agentId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashboardId);
    return this.http.delete(`${this.cleanBaseUrl()}aiagent/${agentId}`, { headers: this.getHeaders(), params });
  }

  // ──────────── PROMPTS (/prompt) ────────────
  getPrompts(data: any): Observable<any> {
    const params = new HttpParams()
      .set('portal_id', data?.dashboard_id?.[0] || data?.portal_id || '')
      .set('ai_agent_id', data?.ai_agent_ids?.[0] || data?.ai_agent_id || '');
    return this.http.get(`${this.cleanBaseUrl()}prompt`, { headers: this.getHeaders(), params });
  }

  queryPrompts(data: any): Observable<any> {
    return this.http.post(`${this.cleanBaseUrl()}prompt/query`, data, { headers: this.getHeaders() });
  }

  createPrompt(dashboardId: string, agentId: string, data: any): Observable<any> {
    return this.http.post(`${this.cleanBaseUrl()}prompt`, { ...data, portal_id: dashboardId, ai_agent_id: agentId }, { headers: this.getHeaders() });
  }

  updatePrompt(dashboardId: string, agentId: string, promptId: string, data: any): Observable<any> {
    return this.http.put(`${this.cleanBaseUrl()}prompt/${promptId}`, { ...data, portal_id: dashboardId, ai_agent_id: agentId }, { headers: this.getHeaders() });
  }

  deletePrompt(dashboardId: string, agentId: string, promptId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashboardId).set('ai_agent_id', agentId);
    return this.http.delete(`${this.cleanBaseUrl()}prompt/${promptId}`, { headers: this.getHeaders(), params });
  }

  // ──────────── PROMPT FLOWS (/promptflow) ────────────
  getPromptFlows(dashId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.get(`${this.cleanBaseUrl()}promptflow`, { headers: this.getHeaders(), params });
  }

  queryPromptFlows(dashId: string): Observable<any> {
    return this.http.post(`${this.cleanBaseUrl()}promptflow/query`, { portal_id: dashId }, { headers: this.getHeaders() });
  }

  createPromptFlow(dashId: string, data: any): Observable<any> {
    return this.http.post(`${this.cleanBaseUrl()}promptflow`, { ...data, portal_id: dashId }, { headers: this.getHeaders() });
  }

  updatePromptFlow(dashId: string, flowId: string, data: any): Observable<any> {
    return this.http.put(`${this.cleanBaseUrl()}promptflow/${flowId}`, { ...data, portal_id: dashId }, { headers: this.getHeaders() });
  }

  deletePromptFlow(dashId: string, flowId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashId);
    return this.http.delete(`${this.cleanBaseUrl()}promptflow/${flowId}`, { headers: this.getHeaders(), params });
  }

  // ──────────── FUNCTIONS / TOOLS ────────────
  getFunctions(data: any): Observable<any> {
    const params = new HttpParams()
      .set('portal_id', data?.dashboard_id?.[0] || data?.portal_id || '')
      .set('ai_agent_id', data?.ai_agent_ids?.[0] || data?.ai_agent_id || '');
    return this.http.get(`${this.cleanBaseUrl()}functiondefs`, { headers: this.getHeaders(), params });
  }

  createFunction(dashboardId: string, agentId: string, data: any): Observable<any> {
    return this.http.post(`${this.cleanBaseUrl()}functiondefs`, { ...data, portal_id: dashboardId, ai_agent_id: agentId }, { headers: this.getHeaders() });
  }

  updateFunction(dashboardId: string, agentId: string, functionId: string, data: any): Observable<any> {
    return this.http.put(`${this.cleanBaseUrl()}functiondefs/${functionId}`, { ...data, portal_id: dashboardId, ai_agent_id: agentId }, { headers: this.getHeaders() });
  }

  deleteFunction(dashboardId: string, agentId: string, functionId: string): Observable<any> {
    const params = new HttpParams().set('portal_id', dashboardId).set('ai_agent_id', agentId);
    return this.http.delete(`${this.cleanBaseUrl()}functiondefs/${functionId}`, { headers: this.getHeaders(), params });
  }
}