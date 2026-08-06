export interface Channel {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp' | 'voice' | 'email';
  enabled: boolean;
  connectedPhone?: string;
}
