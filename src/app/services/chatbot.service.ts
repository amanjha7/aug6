// src/app/services/chatbot.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  // ---------- AI Agent (Chatbot) ----------
  // Query AI Agents (type = 'AI_AGENT')
  queryAIAgents(data: any): Observable<any> {
    const url = `${this.hostUrl}dashboard/chatbot/query`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  createAIAgent(dashboardId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashboardId}/aiagent`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  updateAIAgent(dashboardId: string, agentId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashboardId}/aiagent/${agentId}`;
    return this.http.patch(url, data, { headers: this.getHeaders() });
  }

  deleteAIAgent(dashboardId: string, agentId: string): Observable<any> {
    const url = `${this.hostUrl}dashboard/${dashboardId}/aiagent/${agentId}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  // ---------- Prompts ----------
  getPrompts(data: any): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/aiagent/prompt/query`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  createPrompt(dashboardId: string, agentId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/${dashboardId}/aiagent/${agentId}/prompt`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  updatePrompt(dashboardId: string, agentId: string, promptId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/${dashboardId}/aiagent/${agentId}/prompt/${promptId}`;
    return this.http.patch(url, data, { headers: this.getHeaders() });
  }

  deletePrompt(dashboardId: string, agentId: string, promptId: string): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/${dashboardId}/aiagent/${agentId}/prompt/${promptId}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  // ---------- Functions ----------
  getFunctions(data: any): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/aiagent/functiondefs/query`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  createFunction(dashboardId: string, agentId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/${dashboardId}/aiagent/${agentId}/functiondefs`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  updateFunction(dashboardId: string, agentId: string, functionId: string, data: any): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/${dashboardId}/aiagent/${agentId}/functiondefs/${functionId}`;
    return this.http.put(url, data, { headers: this.getHeaders() });
  }

  deleteFunction(dashboardId: string, agentId: string, functionId: string): Observable<any> {
    const url = `${this.hostUrl}api/dashboard/${dashboardId}/aiagent/${agentId}/functiondefs/${functionId}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }
}