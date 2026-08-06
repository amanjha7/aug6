export interface AIAgent {
  id: string;
  name: string;
  role: string;
  temperature: number; // e.g. 0.0 to 1.0
  provider: 'openai' | 'anthropic' | 'gemini';
  systemPrompt: string;
}
