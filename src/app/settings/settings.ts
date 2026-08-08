// src/app/settings/settings.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelManagement } from '../components/channel-management/channel-management.component';
import { Chatbot } from '../components/chatbot/chatbot';

interface SettingsSection {
  id: string;
  label: string;
  description: string;
  icon: string;        // svg-key from the template
  color: string;
  bgTint: string;
  badge?: string;      // optional label like "New", "Beta"
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ChannelManagement, Chatbot],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings {
  dashId = '246705749'; // Replace with actual ID from route/parent

  activeSection = 'channels';
  searchQuery = '';

  // 👇 To add a new section in the future, just add a new entry here + a new <ng-container> in the HTML.
  sections: SettingsSection[] = [
    {
      id: 'channels',
      label: 'Channels',
      description: 'Telephony channels — Twilio, SIP & Gateways',
      icon: 'signal',
      color: '#B8A9E8',
      bgTint: 'rgba(184,169,232,0.15)',
    },
    {
      id: 'chatbot',
      label: 'AI Agents',
      description: 'Chatbot agents, prompts & functions',
      icon: 'bot',
      color: '#4ECDC4',
      bgTint: 'rgba(78,205,196,0.15)',
    },
    // Future sections example (add here, then render below):
    // { id: 'billing',  label: 'Billing', description: 'Plans & invoices', icon: 'card',  color: '#F5A623', bgTint: 'rgba(245,166,35,0.15)' },
    // { id: 'team',     label: 'Team',    description: 'Members & roles',   icon: 'users', color: '#4ADE80', bgTint: 'rgba(74,222,128,0.15)' },
  ];

  get filteredSections(): SettingsSection[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.sections;
    return this.sections.filter(
      s =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }

  get activeMeta(): SettingsSection | undefined {
    return this.sections.find(s => s.id === this.activeSection);
  }

  selectSection(id: string): void {
    this.activeSection = id;
  }
}