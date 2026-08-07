import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Settings } from './settings/settings';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [Settings, RouterOutlet],
  standalone: true,
})
export class App {
  protected readonly title = signal('generic-settings-page-aicallapp');
}
