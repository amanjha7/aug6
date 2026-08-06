import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../core/services/settings.service';
import { PostMessageService } from '../core/services/post-message.service';
import { ChannelListComponent } from './channel-list/channel-list.component';
import { AgentSelectComponent } from './agent-select/agent-select.component';
import { Channel } from '../core/models/channel.model';
import { AIAgent } from '../core/models/ai-agent.model';
import { Settings } from '../core/models/settings.model';
import { PlatformType } from '../core/services/platform.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChannelListComponent,
    AgentSelectComponent,
  ],
  template: `
    <div class="settings-wrapper">
      <!-- Top banner showing the CRM state -->
      <header class="crm-banner" [ngClass]="activePlatform()">
        <div class="banner-content">
          <span class="platform-badge">{{ activePlatform() | uppercase }} MODE</span>
          <h1>CRM Settings Integration</h1>
          <p>This settings page translates state mapping perfectly depending on the active CRM container.</p>
        </div>
        <div class="banner-actions">
          <label for="platform-debug-switch" class="sr-only">Choose Platform (Debug)</label>
          <select
            id="platform-debug-switch"
            [ngModel]="activePlatform()"
            (ngModelChange)="onPlatformSwitch($event)"
            class="platform-select"
          >
            <option value="mock">Sandbox Standalone</option>
            <option value="hubspot">HubSpot Portal</option>
            <option value="zoho">Zoho CRM Widget</option>
            <option value="salesforce">Salesforce Canvas</option>
          </select>
        </div>
      </header>

      <main class="settings-container">
        <!-- Error alert -->
        <div *ngIf="settingsService.error() as errMsg" class="alert error-alert">
          <strong>Mapping Error:</strong> {{ errMsg }}
        </div>

        <!-- Success notification -->
        <div *ngIf="showSuccess" class="alert success-alert">
          <strong>Success:</strong> Settings payload sent and successfully updated in CRM!
        </div>

        <div class="layout-grid">
          <!-- Main settings controls -->
          <div class="main-column">
            @if (settingsService.loading()) {
              <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Establishing communication & loading CRM configurations...</p>
              </div>
            } @else if (settingsService.settings(); as currentSettings) {
              <!-- Auto Response Switch -->
              <div class="card toggle-card">
                <div class="toggle-row">
                  <div class="toggle-text">
                    <h3>Autopilot Instant Response</h3>
                    <p>Trigger instant AI voice and text replies upon detecting inbound CRM communication</p>
                  </div>
                  <label class="switch large">
                    <input
                      type="checkbox"
                      [checked]="currentSettings.autoResponseEnabled"
                      (change)="toggleAutopilot(currentSettings)"
                    />
                    <span class="slider round"></span>
                  </label>
                </div>
              </div>

              <!-- Channel list component -->
              <app-channel-list
                [channels]="currentSettings.channels"
                (channelsChange)="onChannelsChange(currentSettings, $event)"
              ></app-channel-list>

              <!-- Agent configurations component -->
              <app-agent-select
                [agents]="currentSettings.agents"
                [selectedAgentId]="currentSettings.defaultAgentId"
                (agentsChange)="onAgentsChange(currentSettings, $event)"
                (selectedAgentIdChange)="onDefaultAgentIdChange(currentSettings, $event)"
              ></app-agent-select>

              <!-- Save Actions footer -->
              <div class="footer-actions">
                <button
                  [disabled]="settingsService.saving()"
                  (click)="onSave(currentSettings)"
                  class="btn btn-primary"
                >
                  <span *ngIf="settingsService.saving()" class="spinner-inline"></span>
                  {{ settingsService.saving() ? 'Syncing to CRM...' : 'Sync Settings with CRM' }}
                </button>
                <span class="sync-time" *ngIf="currentSettings.updatedAt">
                  Last Sync: {{ currentSettings.updatedAt | date:'mediumTime' }}
                </span>
              </div>
            } @else {
              <div class="empty-state">
                <p>No active settings configurations loaded yet.</p>
                <button (click)="loadInitial()" class="btn btn-secondary">Force Reload</button>
              </div>
            }
          </div>

          <!-- Diagnostic / PostMessage Debug panel -->
          <div class="sidebar-column">
            <div class="card debug-card">
              <div class="card-header">
                <h3>PostMessage Envelope Live-Logger</h3>
                <p class="subtitle">Diagnostic debugger representing real-time adapter translations</p>
              </div>
              <div class="card-body debug-logs">
                <div class="logs-container">
                  @for (log of postMessageService.logs(); track log.timestamp) {
                    <div class="log-item" [class.sent]="log.type === 'sent'">
                      <div class="log-meta">
                        <span class="log-direction">{{ log.type | uppercase }}</span>
                        <span class="log-time">{{ log.timestamp | date:'HH:mm:ss.SSS' }}</span>
                      </div>
                      <pre class="log-payload">{{ log.data | json }}</pre>
                    </div>
                  } @empty {
                    <div class="no-logs">
                      <p>No messages sent or received yet.</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .settings-wrapper {
      min-height: 100%;
      background-color: #f8fafc;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .crm-banner {
      color: #ffffff;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      transition: background-color 0.3s ease;
    }
    .crm-banner.mock { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); }
    .crm-banner.hubspot { background: linear-gradient(135deg, #ff7a59 0%, #d9532f 100%); }
    .crm-banner.zoho { background: linear-gradient(135deg, #15803d 0%, #14532d 100%); }
    .crm-banner.salesforce { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); }

    .banner-content h1 {
      margin: 8px 0 4px;
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .banner-content p {
      margin: 0;
      opacity: 0.85;
      font-size: 0.9rem;
    }
    .platform-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .platform-select {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: white;
      padding: 8px 12px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      outline: none;
    }
    .platform-select option {
      color: #1e293b;
    }

    .settings-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px;
    }
    .alert {
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 0.92rem;
      margin-bottom: 24px;
    }
    .error-alert {
      background-color: #fef2f2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }
    .success-alert {
      background-color: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }

    .layout-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 32px;
    }
    @media (max-width: 1024px) {
      .layout-grid {
        grid-template-columns: 1fr;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
    }
    .toggle-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      margin-bottom: 24px;
      padding: 20px;
    }
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toggle-text h3 {
      margin: 0 0 4px;
      font-size: 1.05rem;
      color: #1e293b;
      font-weight: 600;
    }
    .toggle-text p {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 8px;
    }
    .btn {
      padding: 12px 24px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }
    .btn-primary {
      background-color: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #1d4ed8;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-secondary {
      background-color: #e2e8f0;
      color: #334155;
    }
    .sync-time {
      font-size: 0.82rem;
      color: #64748b;
    }

    /* Diagnostics Sidebar */
    .debug-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      color: #cbd5e1;
      height: 600px;
      display: flex;
      flex-direction: column;
    }
    .debug-card .card-header {
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 16px 20px;
    }
    .debug-card h3 {
      color: #f1f5f9;
      font-size: 0.95rem;
      margin: 0;
    }
    .debug-card .subtitle {
      color: #94a3b8;
      font-size: 0.78rem;
    }
    .debug-logs {
      padding: 12px;
      flex: 1;
      overflow-y: auto;
    }
    .logs-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .log-item {
      background: #1e293b;
      border-left: 4px solid #ef4444; /* Sent color: Red */
      border-radius: 6px;
      padding: 10px;
    }
    .log-item.sent {
      border-left-color: #10b981; /* Received color: Green */
    }
    .log-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .log-direction {
      color: #94a3b8;
    }
    .log-time {
      color: #64748b;
    }
    .log-payload {
      margin: 0;
      font-family: monospace;
      font-size: 0.78rem;
      color: #e2e8f0;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .no-logs {
      text-align: center;
      padding-top: 40px;
      color: #64748b;
      font-size: 0.88rem;
    }

    .loading-spinner {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }
    .spinner {
      border: 4px solid rgba(0,0,0,0.1);
      border-top-color: #2563eb;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    .spinner-inline {
      display: inline-block;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      animation: spin 1s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Global Switch */
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: .3s;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
    }
    input:checked + .slider {
      background-color: #2563eb;
    }
    input:checked + .slider:before {
      transform: translateX(20px);
    }
    .slider.round {
      border-radius: 34px;
    }
    .slider.round:before {
      border-radius: 50%;
    }
    .switch.large {
      width: 52px;
      height: 28px;
    }
    .switch.large .slider:before {
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
    }
    input:checked + .switch.large .slider:before {
      transform: translateX(24px);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `]
})
export class SettingsComponent implements OnInit {
  protected readonly settingsService: SettingsService;
  protected readonly postMessageService: PostMessageService;
  protected showSuccess = false;

  constructor(settingsService: SettingsService, postMessageService: PostMessageService) {
    this.settingsService = settingsService;
    this.postMessageService = postMessageService;
  }

  ngOnInit(): void {
    this.loadInitial();
  }

  loadInitial(): void {
    this.settingsService.load().subscribe();
  }

  activePlatform(): PlatformType {
    return this.settingsService.getActivePlatform();
  }

  onPlatformSwitch(platform: PlatformType): void {
    this.settingsService.changePlatform(platform);
  }

  onChannelsChange(current: Settings, channels: Channel[]): void {
    this.settingsService.settings.set({ ...current, channels });
  }

  onAgentsChange(current: Settings, agents: AIAgent[]): void {
    this.settingsService.settings.set({ ...current, agents });
  }

  onDefaultAgentIdChange(current: Settings, defaultAgentId: string): void {
    this.settingsService.settings.set({ ...current, defaultAgentId });
  }

  toggleAutopilot(current: Settings): void {
    this.settingsService.settings.set({
      ...current,
      autoResponseEnabled: !current.autoResponseEnabled,
    });
  }

  onSave(currentSettings: Settings): void {
    this.settingsService.save(currentSettings).subscribe((success) => {
      if (success) {
        this.showSuccess = true;
        setTimeout(() => (this.showSuccess = false), 4000);
      }
    });
  }
}
