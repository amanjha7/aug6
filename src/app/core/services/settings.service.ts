import { Injectable, signal } from '@angular/core';
import { Observable, catchError, of, tap, switchMap } from 'rxjs';
import { Settings } from '../models/settings.model';
import { PlatformService, PlatformType } from './platform.service';
import { AdapterFactory } from '../adapters/adapter.factory';
import { HubSpotAdapter } from '../adapters/hubspot.adapter';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  // Main settings state exposed as signals to UI components
  public settings = signal<Settings | null>(null);
  public loading = signal<boolean>(false);
  public saving = signal<boolean>(false);
  public error = signal<string | null>(null);

  // Connection and OAuth status for platforms that require active connection (HubSpot)
  public isConnected = signal<boolean>(true); // default true for non-oauth platforms
  public checkingConnection = signal<boolean>(false);

  constructor(
    private platformService: PlatformService,
    private adapterFactory: AdapterFactory
  ) {}

  /**
   * Loads settings from the currently active platform's CRM adapter.
   * If platform is HubSpot, it will first validate the OAuth connection.
   */
  public load(): Observable<Settings | null> {
    this.loading.set(true);
    this.error.set(null);

    const platform = this.platformService.getPlatform();

    if (platform === 'hubspot') {
      this.checkingConnection.set(true);
      const hubspotAdapter = this.adapterFactory.getAdapter('hubspot') as HubSpotAdapter;
      const portalId = this.platformService.portalId;
      const userEmail = this.platformService.userEmail;

      return hubspotAdapter.validateConnection(portalId, userEmail).pipe(
        tap((connected) => {
          this.isConnected.set(connected);
          this.checkingConnection.set(false);
        }),
        switchMap((connected) => {
          if (!connected) {
            this.loading.set(false);
            // Return empty configuration or null since we are not connected
            return of(null);
          }
          const adapter = this.adapterFactory.getAdapter(platform);
          return adapter.loadSettings();
        }),
        tap((res) => {
          if (res) {
            this.settings.set(res);
          }
          this.loading.set(false);
        }),
        catchError((err) => {
          console.error('Failed to load settings from HubSpot:', err);
          this.error.set('Failed to load settings from HubSpot platform.');
          this.loading.set(false);
          return of(null);
        })
      );
    } else {
      this.isConnected.set(true);
      const adapter = this.adapterFactory.getAdapter(platform);
      return adapter.loadSettings().pipe(
        tap((res) => {
          this.settings.set(res);
          this.loading.set(false);
        }),
        catchError((err) => {
          console.error('Failed to load settings from CRM:', err);
          this.error.set('Failed to load settings from the CRM platform.');
          this.loading.set(false);
          return of(null);
        })
      );
    }
  }

  /**
   * Check connection status specifically.
   */
  public checkHubspotConnectionState(): Observable<boolean> {
    const platform = this.platformService.getPlatform();
    if (platform !== 'hubspot') {
      this.isConnected.set(true);
      return of(true);
    }

    const hubspotAdapter = this.adapterFactory.getAdapter('hubspot') as HubSpotAdapter;
    const portalId = this.platformService.portalId;
    const userEmail = this.platformService.userEmail;

    this.checkingConnection.set(true);
    return hubspotAdapter.validateConnection(portalId, userEmail).pipe(
      tap((connected) => {
        this.isConnected.set(connected);
        this.checkingConnection.set(false);
      }),
      catchError(() => {
        this.isConnected.set(false);
        this.checkingConnection.set(false);
        return of(false);
      })
    );
  }

  /**
   * Get HubSpot OAuth Init URL
   */
  public getHubspotOAuthUrl(): string {
    const hubspotAdapter = this.adapterFactory.getAdapter('hubspot') as HubSpotAdapter;
    const portalId = this.platformService.portalId;
    const userEmail = this.platformService.userEmail;
    return hubspotAdapter.getOAuthUrl(portalId, userEmail);
  }

  /**
   * Saves updated settings using the currently active platform's CRM adapter.
   */
  public save(updatedSettings: Settings): Observable<boolean> {
    this.saving.set(true);
    this.error.set(null);

    const platform = this.platformService.getPlatform();
    const adapter = this.adapterFactory.getAdapter(platform);

    return adapter.saveSettings(updatedSettings).pipe(
      tap((success) => {
        if (success) {
          this.settings.set({ ...updatedSettings, updatedAt: new Date().toISOString() });
        } else {
          this.error.set('CRM refused to save the settings.');
        }
        this.saving.set(false);
      }),
      catchError((err) => {
        console.error('Failed to save settings to CRM:', err);
        this.error.set('Failed to save settings to the CRM platform.');
        this.saving.set(false);
        return of(false);
      })
    );
  }

  /**
   * Direct getter for current platform name.
   */
  public getActivePlatform(): PlatformType {
    return this.platformService.getPlatform();
  }

  /**
   * Manually override active platform (for real-time debugger switching).
   */
  public changePlatform(platform: PlatformType): void {
    this.platformService.setPlatform(platform);
    this.load().subscribe();
  }
}
