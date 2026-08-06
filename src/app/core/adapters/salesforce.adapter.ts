import { Injectable } from '@angular/core';
import { Observable, map, take } from 'rxjs';
import { CrmAdapter } from './adapter.interface';
import { Settings } from '../models/settings.model';
import { Channel } from '../models/channel.model';
import { AIAgent } from '../models/ai-agent.model';
import { PostMessageService } from '../services/post-message.service';

/**
 * Salesforce Specific Data Format (e.g. customized Custom Metadata or SObject properties).
 */
export interface SalesforceSettingsPayload {
  sfInstanceUrl: string;
  record: {
    Channels_JSON__c: string;
    AI_Agents_JSON__c: string;
    Default_Agent_Id__c: string;
    Auto_Respond__c: boolean;
    Last_Sync__c: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SalesforceAdapter implements CrmAdapter {
  constructor(private postMessageService: PostMessageService) {}

  public loadSettings(): Observable<Settings> {
    // 1. Send fetch message to SF canvas or Lightning wrapper
    this.postMessageService.send('SF_GET_SETTINGS_RECORD', {});

    // 2. Listen for the response
    return this.postMessageService.listen<SalesforceSettingsPayload>('SF_SETTINGS_RECORD_DATA').pipe(
      take(1),
      map((envelope) => this.toInternal(envelope.payload))
    );
  }

  public saveSettings(settings: Settings): Observable<boolean> {
    const sfPayload = this.toSalesforce(settings);
    // 1. Send update message to SF canvas or Lightning wrapper
    this.postMessageService.send('SF_SAVE_SETTINGS_RECORD', sfPayload);

    // 2. Listen for the confirmation
    return this.postMessageService.listen<{ isSuccess: boolean }>('SF_SAVE_CONFIRMATION').pipe(
      take(1),
      map((envelope) => envelope.payload.isSuccess)
    );
  }

  /**
   * Translate: SF -> Internal
   */
  private toInternal(sf: SalesforceSettingsPayload): Settings {
    let channels: Channel[] = [];
    let agents: AIAgent[] = [];

    try {
      if (sf.record.Channels_JSON__c) {
        const parsed = JSON.parse(sf.record.Channels_JSON__c);
        if (Array.isArray(parsed)) {
          channels = parsed.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            enabled: !!c.enabled,
            connectedPhone: c.connectedPhone,
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing SF channels JSON:', e);
    }

    try {
      if (sf.record.AI_Agents_JSON__c) {
        const parsed = JSON.parse(sf.record.AI_Agents_JSON__c);
        if (Array.isArray(parsed)) {
          agents = parsed.map((a: any) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            temperature: a.temperature,
            provider: a.provider,
            systemPrompt: a.systemPrompt,
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing SF agents JSON:', e);
    }

    return {
      channels,
      agents,
      defaultAgentId: sf.record.Default_Agent_Id__c,
      autoResponseEnabled: sf.record.Auto_Respond__c,
      updatedAt: sf.record.Last_Sync__c,
    };
  }

  /**
   * Translate: Internal -> SF
   */
  private toSalesforce(settings: Settings): SalesforceSettingsPayload {
    return {
      sfInstanceUrl: 'https://custom-domain.my.salesforce.com',
      record: {
        Channels_JSON__c: JSON.stringify(settings.channels),
        AI_Agents_JSON__c: JSON.stringify(settings.agents),
        Default_Agent_Id__c: settings.defaultAgentId || '',
        Auto_Respond__c: settings.autoResponseEnabled,
        Last_Sync__c: new Date().toISOString(),
      },
    };
  }
}
