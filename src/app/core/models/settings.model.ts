import { Channel } from './channel.model';
import { AIAgent } from './ai-agent.model';

export interface Settings {
  channels: Channel[];
  agents: AIAgent[];
  defaultAgentId?: string;
  autoResponseEnabled: boolean;
  updatedAt?: string;
}
