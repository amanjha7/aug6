import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

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

        <!-- Connection Screen for HubSpot OAuth (if disconnected) -->
        <div *ngIf="activePlatform() === 'hubspot' && !settingsService.isConnected()" class="connection-screen">
          <div class="card connection-card">
            <div class="connection-header">
              <span class="hubspot-logo">🟠</span>
              <h2>Connect with HubSpot</h2>
              <p>Authorize this AI application to access and manage your communication channels and bots.</p>
            </div>

            <div class="connection-body">
              <button
                [disabled]="settingsService.checkingConnection() || isPolling"
                (click)="connectToHubspot()"
                class="btn btn-primary oauth-btn"
              >
                {{ isPolling ? 'Connecting and verifying...' : 'Connect to HubSpot' }}
              </button>

              <div *ngIf="isPolling" class="polling-indicator">
                <div class="spinner"></div>
                <p>Waiting for OAuth connection to complete in the new tab...</p>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="activePlatform() !== 'hubspot' || settingsService.isConnected()" class="layout-grid">
          <!-- Main settings controls -->
          <div class="main-column">
            <!-- Tabs Navigation for HubSpot -->
            <div *ngIf="activePlatform() === 'hubspot'" class="tabs-navigation">
              <button
                class="tab-btn"
                [class.active]="activeTab === 'channels'"
                (click)="activeTab = 'channels'"
              >
                📞 Channels Integration
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'chatbots'"
                (click)="activeTab = 'chatbots'"
              >
                🤖 AI Chatbots / Agents
              </button>
            </div>

            @if (settingsService.loading()) {
              <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Establishing communication & loading CRM configurations...</p>
              </div>
            } @else if (settingsService.settings(); as currentSettings) {

              <!-- Channels Tab Content -->
              <div *ngIf="activePlatform() !== 'hubspot' || activeTab === 'channels'">
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

                <!-- Create Channel Placeholder Card (Pronnel integration) -->
                <div class="card creation-card" *ngIf="activePlatform() === 'hubspot'">
                  <div class="creation-header">
                    <span class="header-icon">📞</span>
                    <div class="header-text">
                      <h3>Register New Channel</h3>
                      <p class="notice-badge">ℹ️ Note: This channel will be created and hosted in Pronnel for AI calling</p>
                    </div>
                  </div>

                  <div class="creation-body">
                    <button *ngIf="!showChannelForm" (click)="showChannelForm = true" class="btn btn-secondary">
                      + Register Channel in Pronnel
                    </button>

                    <div *ngIf="showChannelForm" class="creation-form">
                      <div class="form-grid">
                        <div class="form-group">
                          <label for="ch-name">Channel Name</label>
                          <input
                            id="ch-name"
                            type="text"
                            [(ngModel)]="newChannelName"
                            placeholder="e.g. HubSpot Support Line"
                            class="form-control"
                          />
                        </div>
                        <div class="form-group">
                          <label for="ch-type">Channel Type</label>
                          <select id="ch-type" [(ngModel)]="newChannelType" class="form-control">
                            <option value="sms">SMS / Texting</option>
                            <option value="voice">AI Voice Call</option>
                            <option value="whatsapp">WhatsApp Business</option>
                          </select>
                        </div>
                        <div class="form-group">
                          <label for="ch-phone">Phone Number</label>
                          <input
                            id="ch-phone"
                            type="text"
                            [(ngModel)]="newChannelPhone"
                            placeholder="e.g. +1 (555) 019-2834"
                            class="form-control"
                          />
                        </div>
                      </div>

                      <div class="form-actions" style="margin-top: 16px; display: flex; gap: 8px;">
                        <button (click)="createChannel(currentSettings)" class="btn btn-primary" [disabled]="!newChannelName">
                          Create Channel
                        </button>
                        <button (click)="showChannelForm = false" class="btn btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Chatbots Tab Content -->
              <div *ngIf="activePlatform() !== 'hubspot' || activeTab === 'chatbots'">
                <!-- Agent configurations component -->
                <app-agent-select
                  [agents]="currentSettings.agents"
                  [selectedAgentId]="currentSettings.defaultAgentId"
                  (agentsChange)="onAgentsChange(currentSettings, $event)"
                  (selectedAgentIdChange)="onDefaultAgentIdChange(currentSettings, $event)"
                ></app-agent-select>

                <!-- Create Chatbot Placeholder Card (Pronnel integration) -->
                <div class="card creation-card" *ngIf="activePlatform() === 'hubspot'">
                  <div class="creation-header">
                    <span class="header-icon">🤖</span>
                    <div class="header-text">
                      <h3>Configure New Chatbot Agent</h3>
                      <p class="notice-badge">ℹ️ Note: This chatbot will be created and hosted in Pronnel for AI calling</p>
                    </div>
                  </div>

                  <div class="creation-body">
                    <button *ngIf="!showAgentForm" (click)="showAgentForm = true" class="btn btn-secondary">
                      + Configure Chatbot in Pronnel
                    </button>

                    <div *ngIf="showAgentForm" class="creation-form">
                      <div class="form-grid">
                        <div class="form-group">
                          <label for="ag-name">Agent Name</label>
                          <input
                            id="ag-name"
                            type="text"
                            [(ngModel)]="newAgentName"
                            placeholder="e.g. Sales Assistant"
                            class="form-control"
                          />
                        </div>
                        <div class="form-group">
                          <label for="ag-role">Agent Role</label>
                          <input
                            id="ag-role"
                            type="text"
                            [(ngModel)]="newAgentRole"
                            placeholder="e.g. Inbound Concierge"
                            class="form-control"
                          />
                        </div>
                        <div class="form-group">
                          <label for="ag-temp">Creativity / Temp ({{ newAgentTemp }})</label>
                          <input
                            id="ag-temp"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            [(ngModel)]="newAgentTemp"
                            class="form-control"
                          />
                        </div>
                      </div>

                      <div class="form-group" style="margin-top: 16px;">
                        <label for="ag-prompt">System Prompt instructions</label>
                        <textarea
                          id="ag-prompt"
                          rows="3"
                          [(ngModel)]="newAgentPrompt"
                          placeholder="You are an helpful AI calling agent..."
                          class="form-control"
                          style="resize: vertical; font-family: inherit;"
                        ></textarea>
                      </div>

                      <div class="form-actions" style="margin-top: 16px; display: flex; gap: 8px;">
                        <button (click)="createChatbot(currentSettings)" class="btn btn-primary" [disabled]="!newAgentName">
                          Create Chatbot
                        </button>
                        <button (click)="showAgentForm = false" class="btn btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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

    /* Tabs Navigation Styling */
    .tabs-navigation {
      display: flex;
      border-bottom: 2px solid #cbd5e1;
      margin-bottom: 28px;
      gap: 12px;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 12px 24px;
      font-size: 1.05rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tab-btn:hover {
      color: #ff7a59;
    }
    .tab-btn.active {
      color: #ff7a59;
      border-bottom-color: #ff7a59;
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

    /* Connection Card Styling */
    .connection-screen {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 0;
    }
    .connection-card {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      max-width: 480px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .hubspot-logo {
      font-size: 4rem;
      display: block;
      margin-bottom: 20px;
    }
    .connection-header h2 {
      margin: 0 0 10px 0;
      color: #1e293b;
      font-size: 1.6rem;
    }
    .connection-header p {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .oauth-btn {
      width: 100%;
      margin-top: 24px;
      padding: 14px 28px;
      font-size: 1.05rem;
      border-radius: 8px;
    }
    .polling-indicator {
      margin-top: 24px;
      color: #64748b;
      font-size: 0.88rem;
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
    .creation-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      margin-top: 24px;
      padding: 24px;
    }
    .creation-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 16px;
    }
    .header-icon {
      font-size: 2.2rem;
    }
    .creation-header h3 {
      margin: 0 0 4px 0;
      font-size: 1.2rem;
      color: #1e293b;
      font-weight: 600;
    }
    .notice-badge {
      margin: 0;
      font-size: 0.85rem;
      color: #ff7a59;
      font-weight: 600;
      background-color: #fffaf0;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px dashed #ff7a59;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
    }
    .form-control {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #1e293b;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-control:focus {
      border-color: #ff7a59;
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
export class SettingsComponent implements OnInit, OnDestroy {
  protected readonly settingsService: SettingsService;
  protected readonly postMessageService: PostMessageService;
  protected showSuccess = false;
  protected isPolling = false;
  protected activeTab: 'channels' | 'chatbots' = 'channels';
  private pollSub?: Subscription;

  constructor(settingsService: SettingsService, postMessageService: PostMessageService) {
    this.settingsService = settingsService;
    this.postMessageService = postMessageService;
  }

  ngOnInit(): void {
    this.loadInitial();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadInitial(): void {
    this.settingsService.load().subscribe();
  }

  activePlatform(): PlatformType {
    return this.settingsService.getActivePlatform();
  }

  onPlatformSwitch(platform: PlatformType): void {
    this.stopPolling();
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

  // --- Channel Form & Mock Creation ---
  protected newChannelName = '';
  protected newChannelType: 'sms' | 'whatsapp' | 'voice' = 'sms';
  protected newChannelPhone = '';
  protected showChannelForm = false;

  createChannel(current: Settings): void {
    if (!this.newChannelName.trim()) {
      return;
    }
    const newCh = {
      id: 'ch_new_' + Math.random().toString(36).substring(2, 6),
      name: this.newChannelName,
      type: this.newChannelType,
      enabled: true,
      connectedPhone: this.newChannelPhone || '+1 (555) 000-0000'
    };
    const updatedChannels = [...current.channels, newCh];
    this.settingsService.settings.set({ ...current, channels: updatedChannels });

    // Reset form
    this.newChannelName = '';
    this.newChannelType = 'sms';
    this.newChannelPhone = '';
    this.showChannelForm = false;

    // Visual success
    this.showSuccess = true;
    setTimeout(() => (this.showSuccess = false), 4000);
  }

  // --- Chatbot Form & Mock Creation ---
  protected newAgentName = '';
  protected newAgentRole = '';
  protected newAgentPrompt = '';
  protected newAgentTemp = 0.7;
  protected showAgentForm = false;

  createChatbot(current: Settings): void {
    if (!this.newAgentName.trim()) {
      return;
    }
    const newAgent = {
      id: 'ag_new_' + Math.random().toString(36).substring(2, 6),
      name: this.newAgentName,
      role: this.newAgentRole || 'Support Specialist',
      temperature: this.newAgentTemp,
      provider: 'openai' as const,
      systemPrompt: this.newAgentPrompt || 'You are an AI calling agent.'
    };
    const updatedAgents = [...current.agents, newAgent];
    const defaultId = current.defaultAgentId || newAgent.id;

    this.settingsService.settings.set({
      ...current,
      agents: updatedAgents,
      defaultAgentId: defaultId
    });

    // Reset form
    this.newAgentName = '';
    this.newAgentRole = '';
    this.newAgentPrompt = '';
    this.newAgentTemp = 0.7;
    this.showAgentForm = false;

    // Visual success
    this.showSuccess = true;
    setTimeout(() => (this.showSuccess = false), 4000);
  }

  onSave(currentSettings: Settings): void {
    this.settingsService.save(currentSettings).subscribe((success) => {
      if (success) {
        this.showSuccess = true;
        setTimeout(() => (this.showSuccess = false), 4000);
      }
    });
  }

  /**
   * Triggers the HubSpot OAuth connection flow.
   * Opens in a new tab, then begins polling to validate connection state.
   */
  connectToHubspot(): void {
    const oauthUrl = this.settingsService.getHubspotOAuthUrl();
    if (typeof window !== 'undefined') {
      window.open(oauthUrl, '_blank');
    }
    this.startPolling();
  }

  private startPolling(): void {
    this.stopPolling();
    this.isPolling = true;

    // Check every 3 seconds, up to 10 minutes max (200 times)
    let checksLeft = 200;
    this.pollSub = interval(3000).pipe(
      takeWhile(() => checksLeft > 0 && this.isPolling)
    ).subscribe(() => {
      checksLeft--;
      this.settingsService.checkHubspotConnectionState().subscribe((connected) => {
        if (connected) {
          this.stopPolling();
          this.loadInitial();
        }
      });
    });
  }

  private stopPolling(): void {
    this.isPolling = false;
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
  }
}
