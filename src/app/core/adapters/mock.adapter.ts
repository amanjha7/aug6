import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CrmAdapter } from './adapter.interface';
import { Settings } from '../models/settings.model';

@Injectable({
  providedIn: 'root',
})
export class MockAdapter implements CrmAdapter {
  private localState: Settings = {
    channels: [
      { id: 'ch_sms_1', name: 'Main SMS Line', type: 'sms', enabled: true, connectedPhone: '+15551234567' },
      { id: 'ch_wa_1', name: 'WhatsApp Support', type: 'whatsapp', enabled: false, connectedPhone: '+15559876543' },
      { id: 'ch_voice_1', name: 'IVR Voice Bot', type: 'voice', enabled: true, connectedPhone: '+15555555555' },
    ],
    agents: [
      {
        id: 'ag_support',
        name: 'Support Agent Bot',
        role: 'Customer Service Specialist',
        temperature: 0.5,
        provider: 'openai',
        systemPrompt: 'You are a friendly and polite customer support agent. Help resolve any issue.',
      },
      {
        id: 'ag_sales',
        name: 'Sales Copilot',
        role: 'Lead Qualifier',
        temperature: 0.8,
        provider: 'anthropic',
        systemPrompt: 'You are a witty, enthusiastic sales assistant. Qualify the client and schedule a demo.',
      },
    ],
    defaultAgentId: 'ag_support',
    autoResponseEnabled: true,
    updatedAt: new Date().toISOString(),
  };

  public loadSettings(): Observable<Settings> {
    // Simulate minor asynchronous latency
    return of({ ...this.localState }).pipe(delay(200));
  }

  public saveSettings(settings: Settings): Observable<boolean> {
    this.localState = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    return of(true).pipe(delay(200));
  }
}
