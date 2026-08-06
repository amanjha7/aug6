import { Observable } from 'rxjs';
import { Settings } from '../models/settings.model';

export interface CrmAdapter {
  /**
   * Request settings from the CRM and translate them to internal Settings format.
   */
  loadSettings(): Observable<Settings>;

  /**
   * Translate internal Settings to CRM payload and send them to CRM.
   */
  saveSettings(settings: Settings): Observable<boolean>;
}
