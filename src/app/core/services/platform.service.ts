import { Injectable } from '@angular/core';

export type PlatformType = 'zoho' | 'hubspot' | 'salesforce' | 'mock';

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private activePlatform: PlatformType = 'mock';
  public userEmail: string = '';
  public portalId: string = '';

  constructor() {
    this.detectPlatform();
  }

  /**
   * Detect platform from URL parameters.
   * e.g., ?platform=zoho&portalid=123&useremail=test@email.com
   */
  private detectPlatform(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const plat = params.get('platform')?.toLowerCase();
      if (plat === 'zoho' || plat === 'hubspot' || plat === 'salesforce') {
        this.activePlatform = plat;
      } else {
        this.activePlatform = 'mock';
      }

      // Handle case-insensitive/variation of query parameter names
      this.portalId = params.get('portalid') || params.get('portalId') || '';
      this.userEmail = params.get('useremail') || params.get('userEmail') || '';
    }
  }

  /**
   * Get current platform.
   */
  public getPlatform(): PlatformType {
    return this.activePlatform;
  }

  /**
   * Overrides platform programmatically (useful for testing or switching in UI debug modes).
   */
  public setPlatform(platform: PlatformType): void {
    this.activePlatform = platform;
  }
}
