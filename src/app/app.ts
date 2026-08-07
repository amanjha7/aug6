import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Settings } from './settings/settings';
import { Oauth } from './components/oauth/oauth';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [Settings, RouterOutlet, Oauth],
  standalone: true,
})
export class App {
  protected readonly title = signal('generic-settings-page-aicallapp');
  protected readonly isConnected = signal(false);
  protected readonly isAuthChecked = signal(false);

  onConnectionChange(connected: boolean): void {
    console.log('Connection status changed:', connected);
    this.isConnected.set(connected);
    this.isAuthChecked.set(true);
  }
}