import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { SettingsService } from './settings.service';
import { PlatformService } from './platform.service';
import { AdapterFactory } from '../adapters/adapter.factory';
import { MockAdapter } from '../adapters/mock.adapter';
import { ZohoAdapter } from '../adapters/zoho.adapter';
import { HubSpotAdapter } from '../adapters/hubspot.adapter';
import { SalesforceAdapter } from '../adapters/salesforce.adapter';
import { PostMessageService } from './post-message.service';

describe('SettingsService and Factory Resolution', () => {
  let settingsService: SettingsService;
  let platformService: PlatformService;
  let adapterFactory: AdapterFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        PlatformService,
        AdapterFactory,
        MockAdapter,
        ZohoAdapter,
        HubSpotAdapter,
        SalesforceAdapter,
        PostMessageService
      ]
    });

    settingsService = TestBed.inject(SettingsService);
    platformService = TestBed.inject(PlatformService);
    adapterFactory = TestBed.inject(AdapterFactory);
  });

  it('should correctly switch active adapters dynamically', () => {
    platformService.setPlatform('mock');
    let activeAdapter = adapterFactory.getAdapter(platformService.getPlatform());
    expect(activeAdapter).toBeInstanceOf(MockAdapter);

    platformService.setPlatform('hubspot');
    activeAdapter = adapterFactory.getAdapter(platformService.getPlatform());
    expect(activeAdapter).toBeInstanceOf(HubSpotAdapter);

    platformService.setPlatform('zoho');
    activeAdapter = adapterFactory.getAdapter(platformService.getPlatform());
    expect(activeAdapter).toBeInstanceOf(ZohoAdapter);

    platformService.setPlatform('salesforce');
    activeAdapter = adapterFactory.getAdapter(platformService.getPlatform());
    expect(activeAdapter).toBeInstanceOf(SalesforceAdapter);
  });

  it('should check connection on load for hubspot and return null settings if disconnected', async () => {
    platformService.setPlatform('hubspot');
    platformService.portalId = '111';
    platformService.userEmail = 'test@example.com';

    const hubspotAdapter = adapterFactory.getAdapter('hubspot') as HubSpotAdapter;
    vi.spyOn(hubspotAdapter, 'validateConnection').mockReturnValue(of(false));

    const result = await firstValueFrom(settingsService.load());
    expect(result).toBeNull();
    expect(settingsService.isConnected()).toBe(false);
  });

  it('should load settings from correct CRM adapter depending on set platform once connected', async () => {
    // Force active platform to hubspot
    platformService.setPlatform('hubspot');
    platformService.portalId = '111';
    platformService.userEmail = 'test@example.com';

    const mockHubSpotSettings = {
      channels: [{ id: 'ch_hs', name: 'HubSpot SMS', type: 'sms' as const, enabled: true }],
      agents: [],
      autoResponseEnabled: false
    };

    const hubspotAdapter = adapterFactory.getAdapter('hubspot') as HubSpotAdapter;
    vi.spyOn(hubspotAdapter, 'validateConnection').mockReturnValue(of(true));
    const loadSpy = vi.spyOn(hubspotAdapter, 'loadSettings').mockReturnValue(of(mockHubSpotSettings));

    const result = await firstValueFrom(settingsService.load());

    expect(loadSpy).toHaveBeenCalled();
    expect(result).toEqual(mockHubSpotSettings);
    expect(settingsService.settings()).toEqual(mockHubSpotSettings);
    expect(settingsService.isConnected()).toBe(true);
  });
});
