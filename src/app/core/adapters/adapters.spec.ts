import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { HubSpotAdapter, HubSpotSettingsPayload } from './hubspot.adapter';
import { ZohoAdapter, ZohoSettingsPayload } from './zoho.adapter';
import { SalesforceAdapter, SalesforceSettingsPayload } from './salesforce.adapter';
import { PostMessageService } from '../services/post-message.service';
import { Settings } from '../models/settings.model';

describe('CRM Adapters Translation Logic', () => {
  let postMessageService: PostMessageService;

  const mockInternalSettings: Settings = {
    channels: [
      { id: 'ch_1', name: 'SMS', type: 'sms', enabled: true, connectedPhone: '+123' }
    ],
    agents: [
      { id: 'ag_1', name: 'Bot', role: 'Support', temperature: 0.5, provider: 'openai', systemPrompt: 'System' }
    ],
    defaultAgentId: 'ag_1',
    autoResponseEnabled: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PostMessageService]
    });
    postMessageService = TestBed.inject(PostMessageService);
  });

  describe('HubSpotAdapter', () => {
    it('should correctly parse HubSpot specific payloads to internal Settings', async () => {
      const adapter = new HubSpotAdapter(postMessageService);

      const mockHubSpotPayload: HubSpotSettingsPayload = {
        portalId: 101,
        properties: {
          enabled_communication_channels: JSON.stringify([
            { id: 'ch_1', name: 'SMS', type: 'sms', enabled: true, phone: '+123' }
          ]),
          ai_agent_configurations: JSON.stringify([
            { agentId: 'ag_1', agentName: 'Bot', agentRole: 'Support', temp: 0.5, provider: 'openai', prompt: 'System' }
          ]),
          primary_ai_agent_id: 'ag_1',
          auto_reply_enabled: true
        },
        lastModified: '2026-08-06T00:00:00.000Z'
      };

      // Spy on postMessage send
      const sendSpy = vi.spyOn(postMessageService, 'send');

      // Stub the listen observable to return our mock hubspot payload
      vi.spyOn(postMessageService, 'listen').mockReturnValue(of({
        type: 'HUBSPOT_SETTINGS_DATA',
        payload: mockHubSpotPayload
      }));

      const loadedSettings = await firstValueFrom(adapter.loadSettings());

      expect(sendSpy).toHaveBeenCalledWith('HUBSPOT_FETCH_SETTINGS', expect.any(Object));
      expect(loadedSettings.defaultAgentId).toBe('ag_1');
      expect(loadedSettings.autoResponseEnabled).toBe(true);
      expect(loadedSettings.channels[0].connectedPhone).toBe('+123');
      expect(loadedSettings.agents[0].temperature).toBe(0.5);
    });

    it('should correctly translate internal Settings to HubSpot specific payloads during save', async () => {
      const adapter = new HubSpotAdapter(postMessageService);

      const sendSpy = vi.spyOn(postMessageService, 'send');
      vi.spyOn(postMessageService, 'listen').mockReturnValue(of({
        type: 'HUBSPOT_UPDATE_CONFIRM',
        payload: { success: true }
      }));

      const isSuccess = await firstValueFrom(adapter.saveSettings(mockInternalSettings));

      expect(isSuccess).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith('HUBSPOT_UPDATE_SETTINGS', expect.objectContaining({
        portalId: 10001,
        properties: expect.objectContaining({
          primary_ai_agent_id: 'ag_1',
          auto_reply_enabled: true
        })
      }));
    });

    it('should construct correct OAuth initialized connection URL', () => {
      const adapter = new HubSpotAdapter(postMessageService);
      const url = adapter.getOAuthUrl('456', 'foo@bar.com');
      expect(url).toContain('portalId=456');
      expect(url).toContain('userEmail=foo%40bar.com');
    });

    it('should validate connection using check connection GET endpoint', async () => {
      const adapter = new HubSpotAdapter(postMessageService);
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success' })
        } as Response);
      });

      const validated = await firstValueFrom(adapter.validateConnection('456', 'foo@bar.com'));
      expect(fetchSpy.mock.calls[0][0]).toContain('validate?portalid=456&useremail=foo%40bar.com');
      expect(validated).toBe(true);
      fetchSpy.mockRestore();
    });
  });

  describe('ZohoAdapter', () => {
    it('should translate Zoho specific format to internal model', async () => {
      const adapter = new ZohoAdapter(postMessageService);

      const mockZohoPayload: ZohoSettingsPayload = {
        orgId: 'Z_123',
        variables: {
          communicationChannels: [
            { uid: 'ch_1', title: 'SMS', kind: 'sms', isActive: true, phoneNumber: '+123' }
          ],
          aiAgents: [
            { uniqueId: 'ag_1', displayName: 'Bot', responsibility: 'Support', creativity: 0.5, engine: 'openai', basePrompt: 'System' }
          ],
          activeAgentId: 'ag_1',
          isAutoPilotOn: true
        },
        modifiedTime: '2026-08-06T00:00:00.000Z'
      };

      vi.spyOn(postMessageService, 'listen').mockReturnValue(of({
        type: 'ZOHO_DATA_RESPONSE',
        payload: mockZohoPayload
      }));

      const loadedSettings = await firstValueFrom(adapter.loadSettings());
      expect(loadedSettings.defaultAgentId).toBe('ag_1');
      expect(loadedSettings.channels[0].name).toBe('SMS');
      expect(loadedSettings.agents[0].temperature).toBe(0.5);
    });
  });

  describe('SalesforceAdapter', () => {
    it('should translate Salesforce specific record to internal model', async () => {
      const adapter = new SalesforceAdapter(postMessageService);

      const mockSalesforcePayload: SalesforceSettingsPayload = {
        sfInstanceUrl: 'https://test.salesforce.com',
        record: {
          Channels_JSON__c: JSON.stringify([
            { id: 'ch_1', name: 'SMS', type: 'sms', enabled: true, connectedPhone: '+123' }
          ]),
          AI_Agents_JSON__c: JSON.stringify([
            { id: 'ag_1', name: 'Bot', role: 'Support', temperature: 0.5, provider: 'openai', systemPrompt: 'System' }
          ]),
          Default_Agent_Id__c: 'ag_1',
          Auto_Respond__c: true,
          Last_Sync__c: '2026-08-06T00:00:00.000Z'
        }
      };

      vi.spyOn(postMessageService, 'listen').mockReturnValue(of({
        type: 'SF_SETTINGS_RECORD_DATA',
        payload: mockSalesforcePayload
      }));

      const loadedSettings = await firstValueFrom(adapter.loadSettings());
      expect(loadedSettings.defaultAgentId).toBe('ag_1');
      expect(loadedSettings.autoResponseEnabled).toBe(true);
      expect(loadedSettings.channels[0].id).toBe('ch_1');
    });
  });
});
