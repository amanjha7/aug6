// src/app/components/prompt-flow/prompt-flow.ts
import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot.service';

interface FlowNode {
  id: string;
  type: 'PROMPT' | 'CALLFLOW';
  name: string;
  targetId?: string;
  isStart?: boolean;
  position: { x: number; y: number };
}

interface FlowConnection {
  source: string;
  target: string;
  handover?: {
    name?: string;
    description?: string;
    default_message?: string;
    variables?: any[];
  };
}

@Component({
  selector: 'app-prompt-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prompt-flow.html',
  styleUrls: ['./prompt-flow.scss'],
})
export class PromptFlow implements OnInit {
  @Input() dashId!: string;
  @Input() promptFlowId?: string;
  @Input() agentId?: string;
  @Output() closeEmit = new EventEmitter<void>();

  flowData: any = {
    name: 'Untitled Flow',
    nodes: [],
    connections: [],
    start_node_id: null,
  };

  nodes: FlowNode[] = [];
  connections: FlowConnection[] = [];
  startNodeId: string | null = null;
  isLoading = false;
  saving = false;
  isEditingName = false;

  // Modals / Panels
  showAddNodeModal = false;
  newNodeType: 'PROMPT' | 'CALLFLOW' = 'PROMPT';
  newNodeName = '';
  newNodeTargetId = '';

  selectedConnection: FlowConnection | null = null;
  showHandoverModal = false;
  handoverForm = {
    name: '',
    description: '',
    default_message: '',
  };

  // Available options
  promptsList: any[] = [];
  callFlowsList: any[] = [];

  constructor(private chatbotService: ChatbotService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.promptFlowId) {
      this.loadFlowDetails();
    } else {
      this.initDefaultFlow();
    }
    this.loadPrompts();
    this.loadCallFlows();
  }

  initDefaultFlow(): void {
    const startNode: FlowNode = {
      id: 'node_start',
      type: 'PROMPT',
      name: 'Initial Greeting Prompt',
      isStart: true,
      position: { x: 100, y: 150 },
    };
    this.nodes = [startNode];
    this.startNodeId = 'node_start';
    this.flowData.name = 'New Prompt Flow';
  }

  loadFlowDetails(): void {
    this.isLoading = true;
    this.chatbotService.getPromptFlows(this.dashId).subscribe({
      next: (res: any) => {
        const flows = Array.isArray(res) ? res : (res?.result || []);
        const found = flows.find((f: any) => (f._id || f.prompt_flow_id) === this.promptFlowId) || flows[0];
        if (found) {
          this.flowData = found;
          this.nodes = found.nodes || [];
          this.connections = found.connections || [];
          this.startNodeId = found.start_node_id || (this.nodes[0]?.id || null);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPrompts(): void {
    if (!this.agentId) return;
    this.chatbotService.getPrompts({ portal_id: this.dashId, ai_agent_ids: [this.agentId] }).subscribe({
      next: (res: any) => (this.promptsList = Array.isArray(res) ? res : (res?.result || [])),
      error: () => {},
    });
  }

  loadCallFlows(): void {
    this.chatbotService.queryPromptFlows(this.dashId).subscribe({
      next: (res: any) => (this.callFlowsList = res?.result || []),
      error: () => {},
    });
  }

  // ── Node Actions ──
  openAddNodeModal(): void {
    this.newNodeName = '';
    this.newNodeType = 'PROMPT';
    this.newNodeTargetId = '';
    this.showAddNodeModal = true;
  }

  closeAddNodeModal(): void {
    this.showAddNodeModal = false;
  }

  addNode(): void {
    if (!this.newNodeName.trim()) return;
    const newId = `node_${Date.now()}`;
    const offset = (this.nodes.length + 1) * 60;
    const node: FlowNode = {
      id: newId,
      type: this.newNodeType,
      name: this.newNodeName.trim(),
      targetId: this.newNodeTargetId,
      position: { x: 120 + (offset % 300), y: 100 + (offset % 200) },
    };
    this.nodes.push(node);
    if (!this.startNodeId) {
      this.startNodeId = newId;
      node.isStart = true;
    }
    this.closeAddNodeModal();
  }

  setStartNode(nodeId: string): void {
    this.startNodeId = nodeId;
    this.nodes.forEach(n => (n.isStart = n.id === nodeId));
  }

  deleteNode(nodeId: string): void {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(c => c.source !== nodeId && c.target !== nodeId);
    if (this.startNodeId === nodeId) {
      this.startNodeId = this.nodes[0]?.id || null;
      if (this.nodes[0]) this.nodes[0].isStart = true;
    }
  }

  // ── Connections ──
  connectNodes(sourceId: string, targetId: string): void {
    if (sourceId === targetId) return;
    const exists = this.connections.some(c => c.source === sourceId && c.target === targetId);
    if (!exists) {
      this.connections.push({
        source: sourceId,
        target: targetId,
        handover: { name: 'Handover Rule', description: '', default_message: '' },
      });
    }
  }

  deleteConnection(idx: number): void {
    this.connections.splice(idx, 1);
  }

  openHandoverModal(conn: FlowConnection): void {
    this.selectedConnection = conn;
    this.handoverForm = {
      name: conn.handover?.name || 'Handover Rule',
      description: conn.handover?.description || '',
      default_message: conn.handover?.default_message || '',
    };
    this.showHandoverModal = true;
  }

  saveHandoverModal(): void {
    if (this.selectedConnection) {
      this.selectedConnection.handover = {
        ...this.selectedConnection.handover,
        name: this.handoverForm.name,
        description: this.handoverForm.description,
        default_message: this.handoverForm.default_message,
      };
    }
    this.showHandoverModal = false;
  }

  getNodeName(id: string): string {
    return this.nodes.find(n => n.id === id)?.name || id;
  }

  // ── Save Flow ──
  saveFlow(): void {
    this.saving = true;
    const payload = {
      name: this.flowData.name,
      nodes: this.nodes,
      connections: this.connections,
      start_node_id: this.startNodeId,
      ai_agent_id: this.agentId,
    };

    const req = this.promptFlowId
      ? this.chatbotService.updatePromptFlow(this.dashId, this.promptFlowId, payload)
      : this.chatbotService.createPromptFlow(this.dashId, payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.closeEmit.emit();
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  close(): void {
    this.closeEmit.emit();
  }
}
