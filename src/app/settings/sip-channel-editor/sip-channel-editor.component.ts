import { Component, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Channel } from '../../core/models/channel.model';

@Component({
  selector: 'app-sip-channel-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sip-channel-editor.component.html',
  styleUrl: './sip-channel-editor.component.scss'
})
export class SipChannelEditorComponent implements OnInit {
  // Inputs & Outputs
  channelInput = input<Channel | null>(null);
  save = output<Channel>();
  cancel = output<void>();

  // Form State
  public editChannel!: Channel;

  // UI state signals
  public showPassword = signal<boolean>(false);
  public showServerDomain = signal<boolean>(false);
  public incomingOpen = signal<boolean>(true);
  public additionalOpen = signal<boolean>(false);
  public copiedField = signal<string | null>(null);

  ngOnInit(): void {
    const inputVal = this.channelInput();
    if (inputVal) {
      // Create deep copy to avoid mutations
      this.editChannel = JSON.parse(JSON.stringify(inputVal));
    } else {
      // Default / brand new channel
      this.editChannel = {
        id: 'sip_' + Math.random().toString(36).substring(2, 6),
        name: 'New SIP Channel',
        type: 'sip',
        enabled: true,
        incoming: false,
        outgoing: true,
        resource: '',
        mobileNumber: '',
        countryPrefix: '+91',
        sipUsername: '',
        sipPassword: '',
        portNumber: '5060',
        serverDomain: '',
        protocol: 'UDP',
        mediaEncryption: 'None',
        region: 'India',
        restrictedCallTimings: false,
        registration: false,
        trunkStatus: 'disconnected',
        gatewayConfig: {
          serverIp: 'sip.india.pronnel.com',
          serverPort: '5060',
          username: '9497035648_1204797517',
          authUsername: '9497035648_1204797517',
          authPassword: 'PLACEHOLDER_MOCK_PASSWORD'
        }
      };
    }

    // Default incoming properties if missing
    if (!this.editChannel.countryPrefix) this.editChannel.countryPrefix = '+91';
    if (!this.editChannel.portNumber) this.editChannel.portNumber = '5060';
    if (!this.editChannel.protocol) this.editChannel.protocol = 'UDP';
    if (!this.editChannel.mediaEncryption) this.editChannel.mediaEncryption = 'None';
    if (!this.editChannel.region) this.editChannel.region = 'India';
    if (!this.editChannel.gatewayConfig) {
      this.editChannel.gatewayConfig = {
        serverIp: 'sip.india.pronnel.com',
        serverPort: '5060',
        username: '9497035648_1204797517',
        authUsername: '9497035648_1204797517',
        authPassword: 'PLACEHOLDER_MOCK_PASSWORD'
      };
    }
    if (!this.editChannel.trunkStatus) {
      this.editChannel.trunkStatus = 'disconnected';
    }
  }

  // Set default mockup values on Type change to match inbound.png or image.png
  public onTypeChange(): void {
    if (this.editChannel.incoming) {
      // Set values matching inbound.png
      if (!this.editChannel.resource) this.editChannel.resource = 'C517India';
      if (!this.editChannel.mobileNumber) this.editChannel.mobileNumber = '1204797517';
      if (!this.editChannel.serverDomain) this.editChannel.serverDomain = '10.8.0.84';
      this.editChannel.protocol = 'TCP';
      this.editChannel.trunkStatus = 'disconnected'; // shown red in image
    } else {
      // Outbound SIP values matching image.png
      if (!this.editChannel.resource) this.editChannel.resource = '';
      if (!this.editChannel.mobileNumber) this.editChannel.mobileNumber = '8071387318';
      this.editChannel.protocol = 'UDP';
    }
  }

  public selectResource(): void {
    this.editChannel.resource = 'C517India';
  }

  public clearResource(): void {
    this.editChannel.resource = '';
  }

  public togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  public toggleServerDomain(): void {
    this.showServerDomain.set(!this.showServerDomain());
  }

  public toggleIncomingAccordion(): void {
    this.incomingOpen.set(!this.incomingOpen());
  }

  public toggleAdditionalAccordion(): void {
    this.additionalOpen.set(!this.additionalOpen());
  }

  public copyToClipboard(text: string, label: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedField.set(label);
        setTimeout(() => {
          if (this.copiedField() === label) {
            this.copiedField.set(null);
          }
        }, 2000);
      });
    }
  }

  public reloadTrunkStatus(): void {
    // Simulate refreshing trunk status
    this.editChannel.trunkStatus = 'connected';
    setTimeout(() => {
      this.editChannel.trunkStatus = 'connected';
    }, 1000);
  }

  public onUpdate(): void {
    // Save updated channel (sync back to original channels array)
    this.editChannel.connectedPhone = `${this.editChannel.countryPrefix} ${this.editChannel.mobileNumber}`;
    this.save.emit(this.editChannel);
  }

  public onCancel(): void {
    this.cancel.emit();
  }
}
