export interface GatewayConfig {
  serverIp?: string;
  serverPort?: string;
  username?: string;
  authUsername?: string;
  authPassword?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp' | 'voice' | 'email' | 'sip';
  enabled: boolean;
  connectedPhone?: string;

  // Detailed SIP Configuration Parameters
  incoming?: boolean;
  outgoing?: boolean;
  resource?: string;
  mobileNumber?: string;
  countryPrefix?: string;
  sipUsername?: string;
  sipPassword?: string;
  portNumber?: string;
  serverDomain?: string;
  protocol?: 'UDP' | 'TCP' | 'TLS';
  mediaEncryption?: 'None' | 'SRTP' | 'ZRTP';
  region?: string;
  restrictedCallTimings?: boolean;
  registration?: boolean;

  // Operational State (for high-fidelity simulation)
  trunkStatus?: 'connected' | 'disconnected';
  gatewayConfig?: GatewayConfig;
}
