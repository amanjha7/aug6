import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../core/services/settings.service';
import { PostMessageService } from '../core/services/post-message.service';
import { ChannelListComponent } from './channel-list/channel-list.component';
import { AgentSelectComponent } from './agent-select/agent-select.component';
import { SipChannelEditorComponent } from './sip-channel-editor/sip-channel-editor.component';
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
    SipChannelEditorComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
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
  protected newChannelType: 'sms' | 'whatsapp' | 'voice' | 'sip' = 'sms';
  protected newChannelPhone = '';
  protected showChannelForm = false;

  // --- SIP Channel Form & Editor State ---
  protected activeSipChannel: Channel | null = null;
  protected showSipChannelForm = false;

  startSipCreation(): void {
    this.showSipChannelForm = true;
    this.showChannelForm = false;
  }

  createSipChannelPlaceholder(): void {
    if (!this.newChannelName.trim()) {
      return;
    }
    this.activeSipChannel = {
      id: 'sip_' + Math.random().toString(36).substring(2, 6),
      name: this.newChannelName,
      type: 'sip',
      enabled: true,
      incoming: true,
      outgoing: true,
      countryPrefix: '+91',
      mobileNumber: this.newChannelPhone || '1204797517',
      resource: 'mock_resource_id',
      sipUsername: '',
      sipPassword: '',
      portNumber: '5060',
      serverDomain: '',
      protocol: 'TCP',
      mediaEncryption: 'None',
      region: 'India',
      restrictedCallTimings: false,
      registration: false,
      trunkStatus: 'disconnected',
      gatewayConfig: {
        serverIp: 'sip.example.com',
        serverPort: '5060',
        username: 'mock_sip_user',
        authUsername: 'mock_sip_user',
        authPassword: 'PLACEHOLDER_MOCK_PASSWORD'
      }
    };
    this.newChannelName = '';
    this.newChannelPhone = '';
    this.showSipChannelForm = false;
  }

  saveSipChannel(updatedChannel: Channel, current: Settings): void {
    const exists = current.channels.some(c => c.id === updatedChannel.id);
    let updatedChannels: Channel[];
    if (exists) {
      updatedChannels = current.channels.map(c => c.id === updatedChannel.id ? updatedChannel : c);
    } else {
      updatedChannels = [...current.channels, updatedChannel];
    }

    this.settingsService.settings.set({ ...current, channels: updatedChannels });
    this.activeSipChannel = null;
    this.showSuccess = true;
    setTimeout(() => (this.showSuccess = false), 4000);
  }

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
