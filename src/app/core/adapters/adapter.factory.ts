import { Injectable, Injector } from '@angular/core';
import { CrmAdapter } from './adapter.interface';
import { ZohoAdapter } from './zoho.adapter';
import { HubSpotAdapter } from './hubspot.adapter';
import { SalesforceAdapter } from './salesforce.adapter';
import { MockAdapter } from './mock.adapter';
import { PlatformType } from '../services/platform.service';

@Injectable({
  providedIn: 'root',
})
export class AdapterFactory {
  constructor(private injector: Injector) {}

  /**
   * Retrieves the corresponding CRM adapter based on current platform string.
   */
  public getAdapter(platform: PlatformType): CrmAdapter {
    switch (platform) {
      case 'zoho':
        return this.injector.get(ZohoAdapter);
      case 'hubspot':
        return this.injector.get(HubSpotAdapter);
      case 'salesforce':
        return this.injector.get(SalesforceAdapter);
      case 'mock':
      default:
        return this.injector.get(MockAdapter);
    }
  }
}
