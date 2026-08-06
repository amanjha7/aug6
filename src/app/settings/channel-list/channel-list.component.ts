import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Channel } from '../../core/models/channel.model';

@Component({
  selector: 'app-channel-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card channel-card">
      <div class="card-header">
        <h3>Communication Channels</h3>
        <p class="subtitle">Enable/disable connected channels for automated AI interaction</p>
      </div>
      <div class="card-body">
        <div class="channels-grid">
          @for (channel of channels(); track channel.id) {
            <div class="channel-row" [class.enabled]="channel.enabled">
              <div class="channel-info">
                <span class="channel-icon" [ngSwitch]="channel.type">
                  <span *ngSwitchCase="'sms'">💬</span>
                  <span *ngSwitchCase="'whatsapp'">🟢</span>
                  <span *ngSwitchCase="'voice'">📞</span>
                  <span *ngSwitchCase="'email'">✉️</span>
                  <span *ngSwitchDefault>🔗</span>
                </span>
                <div class="channel-text">
                  <div class="channel-name">{{ channel.name }}</div>
                  <div class="channel-meta" *ngIf="channel.connectedPhone">
                    {{ channel.connectedPhone }}
                  </div>
                </div>
              </div>
              <div class="channel-action">
                <label class="switch">
                  <input
                    type="checkbox"
                    [checked]="channel.enabled"
                    (change)="toggleChannel(channel.id)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .channel-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      margin-bottom: 24px;
      overflow: hidden;
    }
    .card-header {
      background: #f8fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .card-header h3 {
      margin: 0;
      font-size: 1.15rem;
      color: #1e293b;
      font-weight: 600;
    }
    .subtitle {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: #64748b;
    }
    .card-body {
      padding: 20px;
    }
    .channels-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .channel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fdfdfd;
      transition: all 0.2s ease;
    }
    .channel-row.enabled {
      border-color: #cbd5e1;
      background: #f8fafc;
    }
    .channel-info {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .channel-icon {
      font-size: 1.4rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    .channel-name {
      font-weight: 600;
      color: #334155;
      font-size: 0.95rem;
    }
    .channel-meta {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 2px;
    }

    /* Toggle switch styles */
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
    input:focus + .slider {
      box-shadow: 0 0 1px #2563eb;
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
  `]
})
export class ChannelListComponent {
  channels = input.required<Channel[]>();
  channelsChange = output<Channel[]>();

  toggleChannel(id: string): void {
    const updated = this.channels().map((c) => {
      if (c.id === id) {
        return { ...c, enabled: !c.enabled };
      }
      return c;
    });
    this.channelsChange.emit(updated);
  }
}
