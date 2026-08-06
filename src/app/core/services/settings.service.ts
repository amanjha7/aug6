import { Injectable, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { Settings } from '../models/settings.model';
import { PlatformService, PlatformType } from './platform.service';
import { AdapterFactory } from '../adapters/adapter.factory';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  // Main settings state exposed as signals to UI components
  public settings = signal<Settings | null>(null);
  public loading = signal<boolean>(false);
  public saving = signal<boolean>(false);
  public error = signal<string | null>(null);

  constructor(
    private platformService: PlatformService,
    private adapterFactory: AdapterFactory
  ) {}

  /**
   * Loads settings from the currently active platform's CRM adapter.
   */
  public load(): Observable<Settings | null> {
    this.loading.set(true);
    this.error.set(null);

    const platform = this.platformService.getPlatform();
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
