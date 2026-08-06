import { Injectable } from '@angular/core';
import { Observable, map, take } from 'rxjs';
import { CrmAdapter } from './adapter.interface';
import { Settings } from '../models/settings.model';
import { Channel } from '../models/channel.model';
import { AIAgent } from '../models/ai-agent.model';
import { PostMessageService } from '../services/post-message.service';

/**
 * HubSpot Specific Data Format.
 * HubSpot saves settings inside portal-specific properties or config blocks.
 */
export interface HubSpotSettingsPayload {
  portalId: number;
  properties: {
    enabled_communication_channels: string; // JSON string of channels
    ai_agent_configurations: string;         // JSON string of agents
    primary_ai_agent_id: string;
    auto_reply_enabled: boolean;
  };
  lastModified: string;
}

@Injectable({
  providedIn: 'root',
})
export class HubSpotAdapter implements CrmAdapter {
  constructor(private postMessageService: PostMessageService) {}

  public loadSettings(): Observable<Settings> {
    // 1. Send request message to HubSpot parent page
    this.postMessageService.send('HUBSPOT_FETCH_SETTINGS', { timestamp: new Date().toISOString() });

    // 2. Listen for response, map HubSpot format -> internal format
    return this.postMessageService.listen<HubSpotSettingsPayload>('HUBSPOT_SETTINGS_DATA').pipe(
      take(1),
      map((envelope) => this.toInternal(envelope.payload))
    );
  }

  public saveSettings(settings: Settings): Observable<boolean> {
    const hsPayload = this.toHubSpot(settings);
    // 1. Send update message to HubSpot parent page
    this.postMessageService.send('HUBSPOT_UPDATE_SETTINGS', hsPayload);

    // 2. Wait for confirmation
    return this.postMessageService.listen<{ success: boolean }>('HUBSPOT_UPDATE_CONFIRM').pipe(
      take(1),
      map((envelope) => envelope.payload.success)
    );
  }

  /**
   * Translator: HubSpot -> Internal Settings
   */
  private toInternal(hs: HubSpotSettingsPayload): Settings {
    let channels: Channel[] = [];
    let agents: AIAgent[] = [];

    try {
      if (hs.properties.enabled_communication_channels) {
        // HubSpot format maps channel list differently (e.g. key-value objects)
        const parsed = JSON.parse(hs.properties.enabled_communication_channels);
        if (Array.isArray(parsed)) {
          channels = parsed.map((c: any) => ({
            id: c.id || String(c.key),
            name: c.name || c.label,
            type: c.type || 'sms',
            enabled: !!c.enabled,
            connectedPhone: c.phone || c.connectedPhone,
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing HubSpot channels:', e);
    }

    try {
      if (hs.properties.ai_agent_configurations) {
        const parsed = JSON.parse(hs.properties.ai_agent_configurations);
        if (Array.isArray(parsed)) {
          agents = parsed.map((a: any) => ({
            id: a.agentId || a.id,
            name: a.agentName || a.name,
            role: a.agentRole || a.role || '',
            temperature: typeof a.temp === 'number' ? a.temp : (a.temperature || 0.7),
            provider: a.provider || 'openai',
            systemPrompt: a.prompt || a.systemPrompt || '',
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing HubSpot agents:', e);
    }

    return {
      channels,
      agents,
      defaultAgentId: hs.properties.primary_ai_agent_id,
      autoResponseEnabled: hs.properties.auto_reply_enabled,
      updatedAt: hs.lastModified,
    };
  }

  /**
   * Translator: Internal Settings -> HubSpot Format
   */
  private toHubSpot(settings: Settings): HubSpotSettingsPayload {
    const channelsMapped = settings.channels.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      enabled: c.enabled,
      phone: c.connectedPhone,
    }));

    const agentsMapped = settings.agents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      agentRole: a.role,
      temp: a.temperature,
      provider: a.provider,
      prompt: a.systemPrompt,
    }));

    return {
      portalId: 10001, // Mock/placeholder portal ID
      properties: {
        enabled_communication_channels: JSON.stringify(channelsMapped),
        ai_agent_configurations: JSON.stringify(agentsMapped),
        primary_ai_agent_id: settings.defaultAgentId || '',
        auto_reply_enabled: settings.autoResponseEnabled,
      },
      lastModified: new Date().toISOString(),
    };
  }
}
