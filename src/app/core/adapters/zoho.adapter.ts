import { Injectable } from '@angular/core';
import { Observable, map, take } from 'rxjs';
import { CrmAdapter } from './adapter.interface';
import { Settings } from '../models/settings.model';
import { Channel } from '../models/channel.model';
import { AIAgent } from '../models/ai-agent.model';
import { PostMessageService } from '../services/post-message.service';

/**
 * Zoho CRM Custom Extension Settings Payload.
 * Zoho widgets receive custom variable mappings or key-value properties.
 */
export interface ZohoSettingsPayload {
  orgId: string;
  variables: {
    communicationChannels: {
      uid: string;
      title: string;
      kind: 'sms' | 'whatsapp' | 'voice' | 'email' | 'sip';
      isActive: boolean;
      phoneNumber?: string;
    }[];
    aiAgents: {
      uniqueId: string;
      displayName: string;
      responsibility: string;
      creativity: number; // maps to temperature
      engine: 'openai' | 'anthropic' | 'gemini';
      basePrompt: string;
    }[];
    activeAgentId: string;
    isAutoPilotOn: boolean;
  };
  modifiedTime: string;
}

@Injectable({
  providedIn: 'root',
})
export class ZohoAdapter implements CrmAdapter {
  constructor(private postMessageService: PostMessageService) {}

  public loadSettings(): Observable<Settings> {
    // 1. Send fetch message to Zoho SDK or container wrapper
    this.postMessageService.send('ZOHO_LOAD_DATA', {});

    // 2. Listen for the response
    return this.postMessageService.listen<ZohoSettingsPayload>('ZOHO_DATA_RESPONSE').pipe(
      take(1),
      map((envelope) => this.toInternal(envelope.payload))
    );
  }

  public saveSettings(settings: Settings): Observable<boolean> {
    const zohoPayload = this.toZoho(settings);
    // 1. Send update message to Zoho SDK or container wrapper
    this.postMessageService.send('ZOHO_SAVE_DATA', zohoPayload);

    // 2. Listen for the save callback confirmation
    return this.postMessageService.listen<{ status: string }>('ZOHO_SAVE_STATUS').pipe(
      take(1),
      map((envelope) => envelope.payload.status === 'success')
    );
  }

  /**
   * Translate: Zoho -> Internal
   */
  private toInternal(zoho: ZohoSettingsPayload): Settings {
    const channels: Channel[] = (zoho.variables.communicationChannels || []).map((ch) => ({
      id: ch.uid,
      name: ch.title,
      type: ch.kind,
      enabled: ch.isActive,
      connectedPhone: ch.phoneNumber,
    }));

    const agents: AIAgent[] = (zoho.variables.aiAgents || []).map((ag) => ({
      id: ag.uniqueId,
      name: ag.displayName,
      role: ag.responsibility,
      temperature: ag.creativity,
      provider: ag.engine,
      systemPrompt: ag.basePrompt,
    }));

    return {
      channels,
      agents,
      defaultAgentId: zoho.variables.activeAgentId,
      autoResponseEnabled: zoho.variables.isAutoPilotOn,
      updatedAt: zoho.modifiedTime,
    };
  }

  /**
   * Translate: Internal -> Zoho
   */
  private toZoho(settings: Settings): ZohoSettingsPayload {
    const communicationChannels = settings.channels.map((c) => ({
      uid: c.id,
      title: c.name,
      kind: c.type,
      isActive: c.enabled,
      phoneNumber: c.connectedPhone,
    }));

    const aiAgents = settings.agents.map((a) => ({
      uniqueId: a.id,
      displayName: a.name,
      responsibility: a.role,
      creativity: a.temperature,
      engine: a.provider,
      basePrompt: a.systemPrompt,
    }));

    return {
      orgId: 'ZOHO_ORG_12345',
      variables: {
        communicationChannels,
        aiAgents,
        activeAgentId: settings.defaultAgentId || '',
        isAutoPilotOn: settings.autoResponseEnabled,
      },
      modifiedTime: new Date().toISOString(),
    };
  }
}
