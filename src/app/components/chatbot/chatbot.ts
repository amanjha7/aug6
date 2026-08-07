// src/app/components/chatbot/chatbot.ts
import { Component, Input, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from '../../services/chatbot.service';

interface Toast {
  type: 'success' | 'error';
  msg: string;
}

interface FunctionTypeMeta {
  value: string;
  label: string;
  color: string;
  textColor: string;
  description: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.scss'],
})
export class Chatbot implements OnInit {
  @Input() dashId!: string;

  agents: any[] = [];
  filteredAgents: any[] = [];
  isLoading = false;
  searchQuery = '';

  // Selection
  selectedAgent: any = null;

  // Agent form
  agentForm!: FormGroup;
  isEditingAgent = false;
  showAgentForm = false;
  agentSaving = false;

  // Prompts
  prompts: any[] = [];
  isPromptFormOpen = false;
  editingPrompt: any = null;
  promptForm!: FormGroup;
  promptSaving = false;
  showPrompts = true;

  // Functions
  functions: any[] = [];
  isFunctionFormOpen = false;
  editingFunction: any = null;
  functionForm!: FormGroup;
  functionSaving = false;
  showFunctions = true;

  // Delete confirm
  confirmDelete: { kind: 'agent' | 'prompt' | 'function'; id: string; name: string } | null = null;

  // Toast
  toast: Toast | null = null;
  private toastTimer: any = null;

  functionTypes: FunctionTypeMeta[] = [
    { value: 'CUSTOM',              label: 'Custom',              color: '#B8A9E8', textColor: '#5B21B6', description: 'Define your own function schema' },
    { value: 'QUERY_ITEM',          label: 'Query Item',          color: '#4ECDC4', textColor: '#115E59', description: 'Read data from a source' },
    { value: 'CREATE_ITEM',         label: 'Create Item',         color: '#4ADE80', textColor: '#166534', description: 'Create a new record' },
    { value: 'UPDATE_ITEM',         label: 'Update Item',         color: '#F5A623', textColor: '#92400E', description: 'Modify existing records' },
    { value: 'AUTOMATION_TRIGGER',  label: 'Automation Trigger',  color: '#FF6B6B', textColor: '#DC2626', description: 'Fire an automation flow' },
  ];

  constructor(private fb: FormBuilder, private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.initAgentForm();
    this.initPromptForm();
    this.initFunctionForm();
    this.loadAgents();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmDelete) this.confirmDelete = null;
    else if (this.isPromptFormOpen) this.closePromptForm();
    else if (this.isFunctionFormOpen) this.closeFunctionForm();
    else if (this.selectedAgent) this.closeAgentDetail();
    else if (this.showAgentForm) this.showAgentForm = false;
  }

  // ---------- Forms ----------
  initAgentForm(agent?: any): void {
    this.agentForm = this.fb.group({
      name: [agent?.name || '', [Validators.required, Validators.minLength(3)]],
    });
    this.isEditingAgent = !!agent;
  }

  initPromptForm(prompt?: any): void {
    this.promptForm = this.fb.group({
      name: [prompt?.name || '', [Validators.required]],
      instruction: [prompt?.instruction || ''],
      first_message: [prompt?.first_message || ''],
      assistant_name: [prompt?.assistant_name || ''],
      voicemail_reply: [prompt?.voicemail_reply || ''],
    });
  }

  initFunctionForm(func?: any): void {
    this.functionForm = this.fb.group({
      name: [func?.name || '', [Validators.required]],
      function_type: [func?.function_type || 'CUSTOM'],
      description: [func?.function_def?.description || ''],
      parameters: [JSON.stringify(func?.function_def?.parameters || {}, null, 2)],
    });
  }

  // ---------- Agents ----------
  loadAgents(): void {
    this.isLoading = true;
    const payload = {
      dashboard_id: [this.dashId],
      type: ['AI_AGENT'],
    };
    this.chatbotService.queryAIAgents(payload).subscribe({
      next: (res: any) => {
        this.agents = res?.result?.chatbots || [];
        this.applyAgentFilter();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('error', 'Failed to load agents');
        this.isLoading = false;
      },
    });
  }

  applyAgentFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredAgents = q
      ? this.agents.filter(a => (a.name || '').toLowerCase().includes(q))
      : this.agents.slice();
  }

  onSearchChange(v: string): void {
    this.searchQuery = v;
    this.applyAgentFilter();
  }

  openCreateAgentForm(): void {
    this.initAgentForm();
    this.showAgentForm = true;
  }

  cancelAgentForm(): void {
    this.showAgentForm = false;
    this.agentForm.reset();
  }

  createAgent(): void {
    if (this.agentForm.invalid) {
      this.agentForm.markAllAsTouched();
      return;
    }
    this.agentSaving = true;
    this.chatbotService.createAIAgent(this.dashId, this.agentForm.value).subscribe({
      next: () => {
        this.agentSaving = false;
        this.showToast('success', 'Agent created');
        this.showAgentForm = false;
        this.agentForm.reset();
        this.loadAgents();
      },
      error: () => {
        this.agentSaving = false;
        this.showToast('error', 'Create failed');
      },
    });
  }

  updateAgent(): void {
    if (this.agentForm.invalid || !this.selectedAgent) return;
    this.agentSaving = true;
    this.chatbotService.updateAIAgent(this.dashId, this.selectedAgent.ai_agent_id, this.agentForm.value).subscribe({
      next: () => {
        this.agentSaving = false;
        this.showToast('success', 'Agent updated');
        this.loadAgents();
        // update in-place
        if (this.selectedAgent) this.selectedAgent.name = this.agentForm.value.name;
      },
      error: () => {
        this.agentSaving = false;
        this.showToast('error', 'Update failed');
      },
    });
  }

  requestDeleteAgent(agent: any, evt: Event): void {
    evt.stopPropagation();
    this.confirmDelete = { kind: 'agent', id: agent.ai_agent_id, name: agent.name };
  }

  openAgent(agent: any): void {
    this.selectedAgent = agent;
    this.initAgentForm(agent);
    this.loadPrompts();
    this.loadFunctions();
  }

  closeAgentDetail(): void {
    this.selectedAgent = null;
    this.prompts = [];
    this.functions = [];
    this.isPromptFormOpen = false;
    this.isFunctionFormOpen = false;
  }

  // ---------- Prompts ----------
  loadPrompts(): void {
    if (!this.selectedAgent) return;
    this.chatbotService.getPrompts({
      ai_agent_ids: [this.selectedAgent.ai_agent_id],
      dashboard_id: [this.dashId],
    }).subscribe({
      next: (res: any) => (this.prompts = res?.result || []),
      error: () => this.showToast('error', 'Failed to load prompts'),
    });
  }

  openPromptForm(prompt?: any): void {
    this.editingPrompt = prompt || null;
    this.initPromptForm(prompt);
    this.isPromptFormOpen = true;
  }

  closePromptForm(): void {
    this.isPromptFormOpen = false;
    this.editingPrompt = null;
  }

  savePrompt(): void {
    if (this.promptForm.invalid) { this.promptForm.markAllAsTouched(); return; }
    this.promptSaving = true;
    const data = this.promptForm.value;
    const agentId = this.selectedAgent.ai_agent_id;
    const req = this.editingPrompt
      ? this.chatbotService.updatePrompt(this.dashId, agentId, this.editingPrompt._id, data)
      : this.chatbotService.createPrompt(this.dashId, agentId, data);
    req.subscribe({
      next: () => {
        this.promptSaving = false;
        this.showToast('success', 'Prompt saved');
        this.closePromptForm();
        this.loadPrompts();
      },
      error: () => {
        this.promptSaving = false;
        this.showToast('error', 'Failed to save prompt');
      },
    });
  }

  requestDeletePrompt(p: any): void {
    this.confirmDelete = { kind: 'prompt', id: p._id, name: p.name };
  }

  // ---------- Functions ----------
  loadFunctions(): void {
    if (!this.selectedAgent) return;
    this.chatbotService.getFunctions({
      ai_agent_ids: [this.selectedAgent.ai_agent_id],
      dashboard_id: [this.dashId],
    }).subscribe({
      next: (res: any) => (this.functions = res?.result || []),
      error: () => this.showToast('error', 'Failed to load functions'),
    });
  }

  openFunctionForm(func?: any): void {
    this.editingFunction = func || null;
    this.initFunctionForm(func);
    this.isFunctionFormOpen = true;
  }

  closeFunctionForm(): void {
    this.isFunctionFormOpen = false;
    this.editingFunction = null;
  }

  saveFunction(): void {
    if (this.functionForm.invalid) { this.functionForm.markAllAsTouched(); return; }
    this.functionSaving = true;
    const formVal = this.functionForm.value;
    const agentId = this.selectedAgent.ai_agent_id;

    let parsedParams: any = {};
    if (formVal.function_type === 'CUSTOM') {
      try {
        parsedParams = JSON.parse(formVal.parameters || '{}');
      } catch {
        this.functionSaving = false;
        this.showToast('error', 'Parameters must be valid JSON');
        return;
      }
    }

    const payload: any = {
      name: formVal.name,
      function_type: formVal.function_type,
      function_def: {
        name: formVal.name,
        description: formVal.description || '',
        parameters: parsedParams,
      },
    };

    const req = this.editingFunction
      ? this.chatbotService.updateFunction(this.dashId, agentId, this.editingFunction._id, payload)
      : this.chatbotService.createFunction(this.dashId, agentId, payload);

    req.subscribe({
      next: () => {
        this.functionSaving = false;
        this.showToast('success', 'Function saved');
        this.closeFunctionForm();
        this.loadFunctions();
      },
      error: () => {
        this.functionSaving = false;
        this.showToast('error', 'Failed to save function');
      },
    });
  }

  requestDeleteFunction(f: any): void {
    this.confirmDelete = { kind: 'function', id: f._id, name: f.name };
  }

  // ---------- Delete confirm ----------
  cancelDelete(): void { this.confirmDelete = null; }

  performDelete(): void {
    if (!this.confirmDelete) return;
    const { kind, id } = this.confirmDelete;

    if (kind === 'agent') {
      this.chatbotService.deleteAIAgent(this.dashId, id).subscribe({
        next: () => {
          this.showToast('success', 'Agent deleted');
          if (this.selectedAgent?.ai_agent_id === id) this.closeAgentDetail();
          this.loadAgents();
          this.confirmDelete = null;
        },
        error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
      });
    } else if (kind === 'prompt') {
      this.chatbotService.deletePrompt(this.dashId, this.selectedAgent.ai_agent_id, id).subscribe({
        next: () => {
          this.showToast('success', 'Prompt deleted');
          this.loadPrompts();
          this.confirmDelete = null;
        },
        error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
      });
    } else if (kind === 'function') {
      this.chatbotService.deleteFunction(this.dashId, this.selectedAgent.ai_agent_id, id).subscribe({
        next: () => {
          this.showToast('success', 'Function deleted');
          this.loadFunctions();
          this.confirmDelete = null;
        },
        error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
      });
    }
  }

  // ---------- Helpers ----------
  getFunctionMeta(type: string): FunctionTypeMeta {
    return this.functionTypes.find(t => t.value === type) || {
      value: type, label: type, color: '#B8A9E8', textColor: '#5B21B6', description: '',
    };
  }

  getAgentInitials(name: string): string {
    return (name || 'AI')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join('') || 'AI';
  }

  getAgentColor(agent: any): string {
    const palette = ['#B8A9E8', '#4ECDC4', '#F5A623', '#4ADE80', '#FF6B6B'];
    const key = (agent?.ai_agent_id || agent?.name || '').toString();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash << 5) - hash + key.charCodeAt(i);
    return palette[Math.abs(hash) % palette.length];
  }

  hasError(form: FormGroup | undefined, field: string, err: string): boolean {
    if (!form) return false;
    const c = form.get(field);
    return !!(c && c.touched && c.errors && c.errors[err]);
  }

  showToast(type: 'success' | 'error', msg: string): void {
    this.toast = { type, msg };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 2500);
  }

  trackAgent(_: number, a: any): any { return a.ai_agent_id || a.name; }
  trackPrompt(_: number, p: any): any { return p._id || p.name; }
  trackFunc(_: number, f: any): any { return f._id || f.name; }
}