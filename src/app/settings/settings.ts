// src/app/settings/settings.ts
import { Component } from '@angular/core';
import { ChannelManagement } from '../components/channel-management/channel-management';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ChannelManagement],  // 👈 import the component
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  // Hardcoded dashId for demo; you can pass from parent or route param
  dashId = 'your-dashboard-id';  // Replace with actual ID from parent
}