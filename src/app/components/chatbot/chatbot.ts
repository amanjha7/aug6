// src/app/components/chatbot/chatbot.ts
import { Component, Input, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from '../../services/chatbot.service';
import { PromptFlow } from '../prompt-flow/prompt-flow';

interface Toast {
  type: 'success' | 'error';
  msg: string;
}

interface FunctionTypeMeta {
  value: string;
  label: string;
  color: string;
  textColor: string;
  bgTint: string;
  description: string;
  category: 'ITEM' | 'CALENDAR' | 'CUSTOM';
}

interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  provider: 'Cartesia' | 'ElevenLabs' | 'OpenAI';
  description: string;
}

interface BackgroundSoundOption {
  id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PromptFlow],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.scss'],
})
export class Chatbot implements OnInit {
  @Input() dashId!: string;

  // ── Top Level Data ──
  agents: any[] = [];
  filteredAgents: any[] = [];
  isLoading = false;
  searchQuery = '';

  // ── Views State ──
  showVariables = false;
  selectedAgent: any = null; // When set, we are in Bot Settings View
  isRenamingAgentHeader = false;

  // ── Selected Agent Sub-items ──
  prompts: any[] = [];
  selectedPrompt: any = null; // When set, we are in Prompt Detail View
  promptForm!: FormGroup;
  promptSaving = false;
  creatingPrompt = false;

  promptFlows: any[] = [];
  selectedPromptFlow: any = null;
  showPromptFlowModal = false;
  creatingPromptFlow = false;

  functions: any[] = [];
  selectedFunction: any = null; // When set, we are in Function Detail View
  functionForm!: FormGroup;
  functionSaving = false;
  creatingFunction = false;
  showFunctionCategoryMenu = false;
  customHeaderKey = '';
  customHeaderVal = '';
  customHeaders: { key: string; value: string }[] = [];

  // ── Delete confirmation modal ──
  confirmDelete: { kind: 'agent' | 'prompt' | 'promptflow' | 'function'; id: string; name: string } | null = null;

  // ── Toast ──
  toast: Toast | null = null;
  private toastTimer: any = null;

  // ── Reference Catalogs ──
  useCases = [
    { value: 'Customer Support', label: 'Customer Support', desc: 'Inbound customer service and Q&A' },
    { value: 'Lead Qualification', label: 'Lead Qualification', desc: 'Outbound qualification and CRM lead capture' },
    { value: 'Appointment Booking', label: 'Appointment Booking', desc: 'Calendar scheduling and confirmation' },
    { value: 'Inbound Receptionist', label: 'Inbound Receptionist', desc: 'Call routing and assistant triage' },
    { value: 'Outbound Sales', label: 'Outbound Sales', desc: 'Cold outreach and promotion calls' },
  ];

  llmModels = [
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)', provider: 'OpenAI' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)', provider: 'OpenAI' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'Google' },
  ];

  languages = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'hi-IN', label: 'Hindi' },
  ];

  voicesList: VoiceOption[] = [
    { id: 'cartesia_female_sarah', name: 'Sarah (Professional Warm)', gender: 'female', provider: 'Cartesia', description: 'Friendly and confident tone, great for support' },
    { id: 'cartesia_male_alex', name: 'Alex (Executive Male)', gender: 'male', provider: 'Cartesia', description: 'Clear corporate voice for sales and qualification' },
    { id: 'eleven_rachel', name: 'Rachel (Calm Natural)', gender: 'female', provider: 'ElevenLabs', description: 'Conversational and empathetic voice' },
    { id: 'eleven_josh', name: 'Josh (Deep Dynamic)', gender: 'male', provider: 'ElevenLabs', description: 'Engaging, upbeat voice for receptionist' },
    { id: 'openai_alloy', name: 'Alloy (Balanced Neutral)', gender: 'female', provider: 'OpenAI', description: 'Neutral tone for automated routing' },
  ];

  backgroundSounds: BackgroundSoundOption[] = [
    { id: 'none', name: 'None (Pure Digital)', description: 'No ambient background noise' },
    { id: 'office', name: 'Subtle Office Ambience', description: 'Gentle keyboard taps and room atmosphere' },
    { id: 'call_center', name: 'Call Center Background', description: 'Realistic telephone call center hum' },
    { id: 'soft_music', name: 'Soft Waiting Music', description: 'Muted acoustic waiting sound' },
  ];

  // Exactly matching Pronnel promptVarArr
  promptVariables = [
    { key: 'assistant_name', label: 'Assistant Name', desc: 'Name of the AI agent' },
    { key: 'assistant_mobile_number', label: 'Assistant Mobile Number', desc: 'Phone number assigned' },
    { key: 'call_direction', label: 'Call Direction', desc: 'INCOMING or OUTGOING' },
    { key: 'customer_name', label: 'Customer Name', desc: 'Caller or lead name' },
    { key: 'todayDate', label: 'Today\'s Date', desc: 'Formatted current date' },
    { key: 'iana_timezone', label: 'Timezone', desc: 'Local IANA timezone' },
    { key: 'language', label: 'Language', desc: 'Active primary language' },
    { key: 'model_name', label: 'Model Name', desc: 'LLM model engine' },
    { key: 'use_case', label: 'Use Case', desc: 'Active chatbot use case' },
  ];

  // Exactly matching Pronnel aiAgentFunctionTypesArr Categorized
  functionTypesCategorized = [
    {
      category: 'ITEM',
      label: 'CRM & Entity Actions',
      types: [
        { value: 'QUERY_ITEM', label: 'Query Lead / Record', desc: 'Look up lead or CRM record details' },
        { value: 'CREATE_ITEM', label: 'Create Lead / Record', desc: 'Create new lead or CRM entity' },
        { value: 'UPDATE_ITEM', label: 'Update Record', desc: 'Update CRM lead properties during call' },
        { value: 'AUTOMATION_TRIGGER', label: 'Trigger Automation', desc: 'Fire a Pronnel workflow automation' },
      ],
    },
    {
      category: 'CALENDAR',
      label: 'Calendar & Appointment Actions',
      types: [
        { value: 'QUERY_CALENDAR', label: 'Query Calendar', desc: 'Check available slots in calendar' },
        { value: 'BOOK_APPOINTMENT', label: 'Book Appointment', desc: 'Schedule appointment slot with caller' },
        { value: 'QUERY_HOST', label: 'Query Host', desc: 'Check calendar host availability' },
        { value: 'QUERY_APPOINTMENTS', label: 'Query Appointments', desc: 'Lookup existing bookings' },
        { value: 'DELETE_APPOINTMENT', label: 'Delete Appointment', desc: 'Cancel an existing booking' },
        { value: 'RESCHEDULE_APPOINTMENT', label: 'Reschedule Appointment', desc: 'Move booking slot' },
      ],
    },
    {
      category: 'CUSTOM',
      label: 'Custom Webhooks',
      types: [
        { value: 'CUSTOM', label: 'Custom REST API Webhook', desc: 'Call external API endpoint with JSON payload' },
      ],
    },
  ];

  // Exactly matching Pronnel aiAgentFunctionTypesArr
  functionTypes: FunctionTypeMeta[] = [
    { value: 'QUERY_ITEM', label: 'Query Lead / Record', color: '#4ECDC4', textColor: '#115E59', bgTint: 'rgba(78,205,196,0.1)', description: 'Look up lead or CRM record details', category: 'ITEM' },
    { value: 'CREATE_ITEM', label: 'Create Lead / Record', color: '#4ADE80', textColor: '#166534', bgTint: 'rgba(74,222,128,0.1)', description: 'Create new lead or CRM entity', category: 'ITEM' },
    { value: 'UPDATE_ITEM', label: 'Update Record', color: '#F5A623', textColor: '#92400E', bgTint: 'rgba(245,166,35,0.1)', description: 'Update CRM lead properties during call', category: 'ITEM' },
    { value: 'AUTOMATION_TRIGGER', label: 'Trigger Automation', color: '#FF6B6B', textColor: '#DC2626', bgTint: 'rgba(255,107,107,0.1)', description: 'Fire a Pronnel workflow automation', category: 'ITEM' },
    { value: 'QUERY_CALENDAR', label: 'Query Calendar', color: '#8B5CF6', textColor: '#5B21B6', bgTint: 'rgba(139,92,246,0.1)', description: 'Check available slots in calendar', category: 'CALENDAR' },
    { value: 'BOOK_APPOINTMENT', label: 'Book Appointment', color: '#3B82F6', textColor: '#1E40AF', bgTint: 'rgba(59,130,246,0.1)', description: 'Schedule appointment slot with caller', category: 'CALENDAR' },
    { value: 'QUERY_HOST', label: 'Query Host', color: '#6366F1', textColor: '#3730A3', bgTint: 'rgba(99,102,241,0.1)', description: 'Check calendar host availability', category: 'CALENDAR' },
    { value: 'QUERY_APPOINTMENTS', label: 'Query Appointments', color: '#0EA5E9', textColor: '#075985', bgTint: 'rgba(14,165,233,0.1)', description: 'Lookup existing bookings', category: 'CALENDAR' },
    { value: 'DELETE_APPOINTMENT', label: 'Delete Appointment', color: '#EF4444', textColor: '#991B1B', bgTint: 'rgba(239,68,68,0.1)', description: 'Cancel an existing booking', category: 'CALENDAR' },
    { value: 'RESCHEDULE_APPOINTMENT', label: 'Reschedule Appointment', color: '#F59E0B', textColor: '#92400E', bgTint: 'rgba(245,158,11,0.1)', description: 'Move booking slot', category: 'CALENDAR' },
    { value: 'CUSTOM', label: 'Custom REST API', color: '#B8A9E8', textColor: '#5B21B6', bgTint: 'rgba(184,169,232,0.1)', description: 'Call external webhook/API endpoint', category: 'CUSTOM' },
  ];

  constructor(private fb: FormBuilder, private chatbotService: ChatbotService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initPromptForm();
    this.initFunctionForm();
    this.loadAgents();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmDelete) { this.confirmDelete = null; return; }
    if (this.showPromptFlowModal) { this.closePromptFlowModal(); return; }
    if (this.selectedPrompt) { this.selectedPrompt = null; return; }
    if (this.selectedFunction) { this.selectedFunction = null; return; }
    if (this.selectedAgent) { this.closeAgentDetail(); return; }
  }

  // ═══════════════════ AGENT LIST & SETTINGS VIEW ═══════════════════
  loadAgents(): void {
    this.isLoading = true;
    this.chatbotService.getAiAgents(this.dashId).subscribe({
      next: (res: any) => {
        let list = Array.isArray(res) ? res : (res?.result?.chatbots || res?.result || []);
        this.agents = list.map((a: any) => ({ ...a, is_publish: a.is_publish ?? true }));
        this.applyAgentFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.chatbotService.queryAIAgents({ dashboard_id: [this.dashId], type: ['AI_AGENT'] }).subscribe({
          next: (res: any) => {
            this.agents = (res?.result?.chatbots || res?.result || []).map((a: any) => ({ ...a, is_publish: a.is_publish ?? true }));
            this.applyAgentFilter();
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.showToast('error', 'Failed to load AI agents');
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  applyAgentFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredAgents = q
      ? this.agents.filter((a: any) => (a.name || '').toLowerCase().includes(q) || (a.use_case || '').toLowerCase().includes(q))
      : this.agents.slice();
  }

  onSearchChange(v: string): void {
    this.searchQuery = v;
    this.applyAgentFilter();
  }

  createAIAgent(): void {
    const payload = {
      name: `AI Call Agent ${this.agents.length + 1}`,
      description: 'Voice bot for customer support and triage',
      use_case: 'Customer Support',
      language: 'en-US',
      voice_id: 'cartesia_female_sarah',
      background_sound: 'none',
      model_name: 'gpt-4o',
      type: 'AI_AGENT',
      is_publish: true,
    };

    this.chatbotService.createAIAgent(this.dashId, payload).subscribe({
      next: (res: any) => {
        const createdAgent = res?.result || res || payload;
        this.showToast('success', 'AI Call Agent created');
        this.loadAgents();
        if (createdAgent) {
          this.openAgentDetail(createdAgent);
          // Create initial prompt and prompt flow automatically
          const agentId = createdAgent.ai_agent_id || createdAgent._id || createdAgent.id;
          if (agentId) {
            this.chatbotService.createPrompt(this.dashId, agentId, {
              name: 'System Instructions',
              instruction: 'You are Sarah, a helpful AI call assistant for Pronnel. Greet callers warmly, answer questions accurately, and offer to schedule appointments when requested.',
              first_message: 'Hello! Thanks for calling Pronnel support. How can I help you today?',
              assistant_name: 'Sarah',
              voicemail_reply: 'Hello, I am leaving a message on behalf of our team. Please call us back at your convenience.',
              is_default: true,
            }).subscribe(() => this.loadPrompts());

            this.chatbotService.createPromptFlow(this.dashId, {
              name: 'Main Support Call Flow',
              ai_agent_id: agentId,
              start_node_id: 'node_start',
              nodes: [{ id: 'node_start', type: 'PROMPT', name: 'Greeting Step', isStart: true, position: { x: 100, y: 150 } }],
              connections: [],
              is_default: true,
            }).subscribe(() => this.loadPromptFlows());
          }
        }
      },
      error: () => this.showToast('error', 'Failed to create AI agent'),
    });
  }

  openAgentDetail(agent: any): void {
    this.selectedAgent = agent;
    this.selectedPrompt = null;
    this.selectedFunction = null;
    this.loadPrompts();
    this.loadPromptFlows();
    this.loadFunctions();
  }

  closeAgentDetail(): void {
    this.selectedAgent = null;
    this.selectedPrompt = null;
    this.selectedFunction = null;
    this.prompts = [];
    this.promptFlows = [];
    this.functions = [];
  }

  togglePublish(agent: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    agent.is_publish = !agent.is_publish;
    const agentId = agent.ai_agent_id || agent._id;
    this.chatbotService.updateAIAgent(this.dashId, agentId, { is_publish: agent.is_publish }).subscribe({
      next: () => this.showToast('success', agent.is_publish ? 'Agent Published' : 'Agent Unpublished'),
      error: () => {
        agent.is_publish = !agent.is_publish;
        this.showToast('error', 'Publish toggle failed');
      },
    });
  }

  toggleRenaming(agent: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    agent.isRenaming = !agent.isRenaming;
  }

  renameAgent(agent: any): void {
    agent.isRenaming = false;
    if (!agent.name?.trim()) return;
    const agentId = agent.ai_agent_id || agent._id;
    this.chatbotService.updateAIAgent(this.dashId, agentId, { name: agent.name.trim() }).subscribe({
      next: () => this.showToast('success', 'Agent renamed'),
      error: () => this.showToast('error', 'Rename failed'),
    });
  }

  renameSelectedAgentHeader(): void {
    this.isRenamingAgentHeader = false;
    if (!this.selectedAgent || !this.selectedAgent.name?.trim()) return;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    this.chatbotService.updateAIAgent(this.dashId, agentId, { name: this.selectedAgent.name.trim() }).subscribe({
      next: () => this.showToast('success', 'Agent renamed'),
      error: () => this.showToast('error', 'Rename failed'),
    });
  }

  duplicateAIAgent(agent: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    const payload = {
      name: `${agent.name} (Copy)`,
      description: agent.description,
      use_case: agent.use_case,
      language: agent.language,
      voice_id: agent.voice_id,
      background_sound: agent.background_sound,
      model_name: agent.model_name,
      type: 'AI_AGENT',
      is_publish: true,
    };
    this.chatbotService.createAIAgent(this.dashId, payload).subscribe({
      next: () => {
        this.showToast('success', 'Agent duplicated');
        this.loadAgents();
      },
      error: () => this.showToast('error', 'Duplication failed'),
    });
  }

  // ═══════════════════ PROMPTS SECTION ═══════════════════
  loadPrompts(): void {
    if (!this.selectedAgent) return;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    this.chatbotService.getPrompts({
      ai_agent_ids: [agentId],
      dashboard_id: [this.dashId],
      portal_id: this.dashId,
    }).subscribe({
      next: (res: any) => {
        let list = Array.isArray(res) ? res : (res?.result || []);
        this.prompts = list;
        this.cdr.detectChanges();
      },
      error: () => {
        this.prompts = [];
        this.cdr.detectChanges();
      },
    });
  }

  createAIAgentPromptNew(): void {
    if (!this.selectedAgent) return;
    this.creatingPrompt = true;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    const payload = {
      name: `Prompt ${this.prompts.length + 1}`,
      instruction: 'You are Sarah, a helpful AI assistant. Greet the caller politely and assist with their inquiries.',
      first_message: 'Hello! Thanks for calling. How can I help you today?',
      assistant_name: 'Sarah',
      voicemail_reply: 'Hello, leaving a message on behalf of our team. Please call us back.',
      is_default: this.prompts.length === 0,
      variable_map: {},
    };

    this.chatbotService.createPrompt(this.dashId, agentId, payload).subscribe({
      next: (res: any) => {
        this.creatingPrompt = false;
        const newPrompt = res?.result || res || { ...payload, _id: `prompt_${Date.now()}` };
        this.showToast('success', 'System Prompt created');
        this.loadPrompts();
        this.setSelectedPrompt(newPrompt);
      },
      error: () => {
        this.creatingPrompt = false;
        this.showToast('error', 'Failed to create prompt');
      },
    });
  }

  setSelectedPrompt(prompt: any): void {
    this.selectedPrompt = JSON.parse(JSON.stringify(prompt));
    this.initPromptForm(this.selectedPrompt);
  }

  initPromptForm(prompt?: any): void {
    this.promptForm = this.fb.group({
      name: [prompt?.name || 'System Instructions', [Validators.required]],
      instruction: [prompt?.instruction || prompt?.system_prompt || 'You are Sarah, a helpful AI assistant for Pronnel. Greet callers warmly, answer questions accurately, and offer to schedule appointments.'],
      first_message: [prompt?.first_message || 'Hello! Thanks for reaching out to Pronnel. How can I assist you today?'],
      assistant_name: [prompt?.assistant_name || 'Sarah'],
      voicemail_reply: [prompt?.voicemail_reply || 'Hello, I am leaving a message on behalf of our team. Please call us back at your convenience.'],
      model_name: [prompt?.model_name || this.selectedAgent?.model_name || 'gpt-4o'],
      temperature: [prompt?.temperature ?? 0.7],
      max_tokens: [prompt?.max_tokens ?? 500],
      function_def_ids: [prompt?.function_def_ids || []],
    });
  }

  makePromptDefault(prompt: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    if (!this.selectedAgent || !prompt) return;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    const promptId = prompt._id || prompt.prompt_id;
    this.chatbotService.updatePrompt(this.dashId, agentId, promptId, { is_default: true }).subscribe({
      next: () => {
        this.showToast('success', 'Set as default prompt');
        this.loadPrompts();
      },
      error: () => this.showToast('error', 'Failed to set default'),
    });
  }

  duplicatePrompt(prompt: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    if (!this.selectedAgent || !prompt) return;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    const payload = {
      ...prompt,
      _id: undefined,
      prompt_id: undefined,
      name: `${prompt.name} (Copy)`,
      is_default: false,
    };
    this.chatbotService.createPrompt(this.dashId, agentId, payload).subscribe({
      next: () => {
        this.showToast('success', 'Prompt duplicated');
        this.loadPrompts();
      },
      error: () => this.showToast('error', 'Duplication failed'),
    });
  }

  insertVariable(varKey: string): void {
    const currentText = this.promptForm.get('instruction')?.value || '';
    const varTag = `{{${varKey}}}`;
    this.promptForm.patchValue({ instruction: `${currentText} ${varTag}` });
    this.showToast('success', `Inserted ${varTag}`);
  }

  savePrompt(): void {
    if (this.promptForm.invalid || !this.selectedAgent || !this.selectedPrompt) return;
    this.promptSaving = true;
    const data = this.promptForm.value;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    const promptId = this.selectedPrompt._id || this.selectedPrompt.prompt_id;

    this.chatbotService.updatePrompt(this.dashId, agentId, promptId, data).subscribe({
      next: (res: any) => {
        this.promptSaving = false;
        this.showToast('success', 'System prompt saved');
        this.loadPrompts();
        this.selectedPrompt = null;
      },
      error: () => {
        this.promptSaving = false;
        this.showToast('error', 'Failed to save prompt');
      },
    });
  }

  // ═══════════════════ PROMPT FLOWS SECTION ═══════════════════
  loadPromptFlows(): void {
    if (!this.selectedAgent) return;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    this.chatbotService.getPromptFlows(this.dashId).subscribe({
      next: (res: any) => {
        const flows = Array.isArray(res) ? res : (res?.result || []);
        this.promptFlows = flows.filter((f: any) => f.ai_agent_id === agentId || !f.ai_agent_id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.promptFlows = [];
        this.cdr.detectChanges();
      },
    });
  }

  createPromptFlow(): void {
    if (!this.selectedAgent) return;
    this.creatingPromptFlow = true;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    const payload = {
      name: `Prompt Flow ${this.promptFlows.length + 1}`,
      ai_agent_id: agentId,
      nodes: [
        { id: 'node_start', type: 'PROMPT', name: 'Initial Step', isStart: true, position: { x: 100, y: 150 } }
      ],
      connections: [],
      start_node_id: 'node_start',
      is_default: this.promptFlows.length === 0,
    };
    this.chatbotService.createPromptFlow(this.dashId, payload).subscribe({
      next: (res: any) => {
        this.creatingPromptFlow = false;
        this.showToast('success', 'Prompt Flow created');
        const newFlow = res?.result || res || payload;
        this.loadPromptFlows();
        this.openPromptFlow(newFlow);
      },
      error: () => {
        this.creatingPromptFlow = false;
        this.showToast('error', 'Failed to create Prompt Flow');
      },
    });
  }

  makePromptFlowDefault(flow: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    const flowId = flow._id || flow.prompt_flow_id;
    this.chatbotService.updatePromptFlow(this.dashId, flowId, { is_default: true }).subscribe({
      next: () => {
        this.showToast('success', 'Set as default flow');
        this.loadPromptFlows();
      },
      error: () => this.showToast('error', 'Failed to set default'),
    });
  }

  openPromptFlow(flow: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    this.selectedPromptFlow = flow;
    this.showPromptFlowModal = true;
  }

  closePromptFlowModal(): void {
    this.showPromptFlowModal = false;
    this.selectedPromptFlow = null;
    this.loadPromptFlows();
  }

  duplicatePromptFlow(flow: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    const agentId = this.selectedAgent?.ai_agent_id || this.selectedAgent?._id;
    const payload = {
      name: `${flow.name} (Copy)`,
      ai_agent_id: agentId,
      nodes: flow.nodes || [],
      connections: flow.connections || [],
      is_default: false,
    };
    this.chatbotService.createPromptFlow(this.dashId, payload).subscribe({
      next: () => {
        this.showToast('success', 'Prompt Flow duplicated');
        this.loadPromptFlows();
      },
      error: () => this.showToast('error', 'Duplication failed'),
    });
  }

  // ═══════════════════ FUNCTIONS / TOOLS SECTION ═══════════════════
  loadFunctions(): void {
    if (!this.selectedAgent) return;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    this.chatbotService.getFunctions({
      ai_agent_ids: [agentId],
      dashboard_id: [this.dashId],
      portal_id: this.dashId,
    }).subscribe({
      next: (res: any) => {
        this.functions = Array.isArray(res) ? res : (res?.result || []);
        this.cdr.detectChanges();
      },
      error: () => {
        this.functions = [];
        this.cdr.detectChanges();
      },
    });
  }

  createAIAgentNewFunctionObj(type: string = 'CUSTOM'): void {
    this.showFunctionCategoryMenu = false;
    const typeMeta = this.getFunctionMeta(type);
    const funcName = `${type.toLowerCase()}_tool_${Date.now().toString().slice(-4)}`;
    const defaultPayload = {
      name: funcName,
      function_type: type,
      description: typeMeta.description || 'Function tool for AI agent',
      function_def: {
        name: funcName,
        description: typeMeta.description || '',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Input parameter' } },
          required: ['query'],
        },
      },
      api_settings: type === 'CUSTOM' ? {
        url: 'https://api.example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      } : undefined,
    };
    this.setSelectedFunction(defaultPayload);
  }

  setSelectedFunction(func: any): void {
    this.selectedFunction = JSON.parse(JSON.stringify(func));
    this.initFunctionForm(this.selectedFunction);
  }

  initFunctionForm(func?: any): void {
    let headersArr: { key: string; value: string }[] = [];
    if (func?.api_settings?.headers) {
      if (typeof func.api_settings.headers === 'object') {
        headersArr = Object.entries(func.api_settings.headers).map(([k, v]) => ({ key: k, value: String(v) }));
      }
    }
    this.customHeaders = headersArr;

    this.functionForm = this.fb.group({
      name: [func?.name || '', [Validators.required]],
      function_type: [func?.function_type || 'CUSTOM'],
      description: [func?.function_def?.description || func?.description || ''],
      parameters: [JSON.stringify(func?.function_def?.parameters || { type: 'object', properties: { query: { type: 'string', description: 'Input parameter' } }, required: ['query'] }, null, 2)],
      api_url: [func?.api_settings?.url || 'https://api.example.com/webhook'],
      api_method: [func?.api_settings?.method || 'POST'],
    });
  }

  addCustomHeader(): void {
    if (!this.customHeaderKey.trim()) return;
    this.customHeaders.push({ key: this.customHeaderKey.trim(), value: this.customHeaderVal.trim() });
    this.customHeaderKey = '';
    this.customHeaderVal = '';
  }

  removeCustomHeader(idx: number): void {
    this.customHeaders.splice(idx, 1);
  }

  saveFunction(): void {
    if (this.functionForm.invalid || !this.selectedAgent) {
      this.functionForm.markAllAsTouched();
      return;
    }
    this.functionSaving = true;
    const raw = this.functionForm.value;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;

    let parsedParams: any = {};
    try {
      parsedParams = JSON.parse(raw.parameters || '{}');
    } catch {
      this.functionSaving = false;
      this.showToast('error', 'Parameters must be valid JSON');
      return;
    }

    const headersObj: any = {};
    this.customHeaders.forEach(h => { if (h.key) headersObj[h.key] = h.value; });

    const payload: any = {
      name: raw.name,
      function_type: raw.function_type,
      description: raw.description,
      function_def: {
        name: raw.name,
        description: raw.description || '',
        parameters: parsedParams,
      },
    };

    if (raw.function_type === 'CUSTOM') {
      payload.api_settings = {
        url: raw.api_url,
        method: raw.api_method,
        headers: headersObj,
      };
    }

    const req = (this.selectedFunction && this.selectedFunction._id)
      ? this.chatbotService.updateFunction(this.dashId, agentId, this.selectedFunction._id, payload)
      : this.chatbotService.createFunction(this.dashId, agentId, payload);

    req.subscribe({
      next: (res: any) => {
        this.functionSaving = false;
        this.showToast('success', 'Tool / Function saved successfully');
        this.loadFunctions();
        this.selectedFunction = null;
      },
      error: () => {
        this.functionSaving = false;
        this.showToast('error', 'Failed to save tool');
      },
    });
  }

  // ═══════════════════ VOICE & VOICE SETTINGS ═══════════════════
  selectVoice(voiceId: string): void {
    if (!this.selectedAgent) return;
    this.selectedAgent.voice_id = voiceId;
    this.saveAgentSettings();
  }

  selectBackgroundSound(soundId: string): void {
    if (!this.selectedAgent) return;
    this.selectedAgent.background_sound = soundId;
    this.saveAgentSettings();
  }

  saveAgentSettings(): void {
    if (!this.selectedAgent) return;
    const agentId = this.selectedAgent.ai_agent_id || this.selectedAgent._id;
    this.chatbotService.updateAIAgent(this.dashId, agentId, {
      name: this.selectedAgent.name,
      description: this.selectedAgent.description,
      use_case: this.selectedAgent.use_case,
      language: this.selectedAgent.language,
      voice_id: this.selectedAgent.voice_id,
      background_sound: this.selectedAgent.background_sound,
      model_name: this.selectedAgent.model_name,
    }).subscribe({
      next: () => {
        this.showToast('success', 'Agent settings saved');
        this.loadAgents();
      },
      error: () => this.showToast('error', 'Failed to save settings'),
    });
  }

  // ═══════════════════ DELETE CONFIRM ═══════════════════
  requestDeleteAgent(agent: any, evt: Event): void {
    evt.stopPropagation();
    this.confirmDelete = { kind: 'agent', id: agent.ai_agent_id || agent._id, name: agent.name };
  }

  requestDeletePrompt(p: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    this.confirmDelete = { kind: 'prompt', id: p._id || p.prompt_id, name: p.name };
  }

  requestDeletePromptFlow(flow: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    this.confirmDelete = { kind: 'promptflow', id: flow._id || flow.prompt_flow_id, name: flow.name };
  }

  requestDeleteFunction(f: any, evt?: Event): void {
    if (evt) evt.stopPropagation();
    this.confirmDelete = { kind: 'function', id: f._id || f.function_id, name: f.name };
  }

  cancelDelete(): void { this.confirmDelete = null; }

  performDelete(): void {
    if (!this.confirmDelete) return;
    const { kind, id } = this.confirmDelete;
    const agentId = this.selectedAgent?.ai_agent_id || this.selectedAgent?._id;

    if (kind === 'agent') {
      this.chatbotService.deleteAIAgent(this.dashId, id).subscribe({
        next: () => {
          this.showToast('success', 'Agent deleted');
          if (this.selectedAgent?.ai_agent_id === id || this.selectedAgent?._id === id) this.closeAgentDetail();
          this.confirmDelete = null;
          this.loadAgents();
        },
        error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
      });
    } else if (kind === 'prompt') {
      this.chatbotService.deletePrompt(this.dashId, agentId, id).subscribe({
        next: () => {
          this.showToast('success', 'Prompt deleted');
          this.confirmDelete = null;
          if (this.selectedPrompt?._id === id || this.selectedPrompt?.prompt_id === id) this.selectedPrompt = null;
          this.loadPrompts();
        },
        error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
      });
    } else if (kind === 'promptflow') {
      this.chatbotService.deletePromptFlow(this.dashId, id).subscribe({
        next: () => {
          this.showToast('success', 'Prompt Flow deleted');
          this.confirmDelete = null;
          this.loadPromptFlows();
        },
        error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
      });
    } else if (kind === 'function') {
      this.chatbotService.deleteFunction(this.dashId, agentId, id).subscribe({
        next: () => {
          this.showToast('success', 'Tool deleted');
          this.confirmDelete = null;
          if (this.selectedFunction?._id === id || this.selectedFunction?.function_id === id) this.selectedFunction = null;
          this.loadFunctions();
        },
        error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
      });
    }
  }

  // ═══════════════════ HELPERS ═══════════════════
  getFunctionMeta(type: string): FunctionTypeMeta {
    return this.functionTypes.find((t: any) => t.value === type) || {
      value: type, label: type, color: '#B8A9E8', textColor: '#5B21B6', bgTint: 'rgba(184,169,232,0.1)', description: '', category: 'CUSTOM',
    };
  }

  getVoiceMeta(voiceId: string): VoiceOption {
    return this.voicesList.find((v: any) => v.id === voiceId) || this.voicesList[0];
  }

  getAgentInitials(name: string): string {
    return (name || 'AI')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join('') || 'AI';
  }

  getAgentColor(agent: any): string {
    const palette = ['#B8A9E8', '#4ECDC4', '#F5A623', '#4ADE80', '#FF6B6B'];
    const key = (agent?.ai_agent_id || agent?._id || agent?.name || '').toString();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash << 5) - hash + key.charCodeAt(i);
    return palette[Math.abs(hash) % palette.length];
  }

  showToast(type: 'success' | 'error', msg: string): void {
    this.toast = { type, msg };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 2500);
  }

  trackAgent(_: number, a: any): any { return a.ai_agent_id || a._id || a.name; }
  trackPrompt(_: number, p: any): any { return p._id || p.name; }
  trackFlow(_: number, f: any): any { return f._id || f.prompt_flow_id || f.name; }
  trackFunc(_: number, f: any): any { return f._id || f.name; }
}