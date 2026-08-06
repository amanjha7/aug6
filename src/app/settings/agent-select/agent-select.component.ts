import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIAgent } from '../../core/models/ai-agent.model';

@Component({
  selector: 'app-agent-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card agent-card">
      <div class="card-header">
        <h3>Primary AI Copilot</h3>
        <p class="subtitle">Select and configure the specialized bot that triggers on automated calls</p>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label for="agent-select-dropdown">Selected Agent</label>
          <select
            id="agent-select-dropdown"
            [ngModel]="selectedAgentId()"
            (ngModelChange)="onAgentSelect($event)"
            class="form-control"
          >
            @for (agent of agents(); track agent.id) {
              <option [value]="agent.id">{{ agent.name }} ({{ agent.provider | uppercase }})</option>
            }
          </select>
        </div>

        @if (currentAgent(); as agent) {
          <div class="agent-details">
            <div class="details-grid">
              <div class="form-group">
                <label for="agent-role-input">Role/Title</label>
                <input
                  id="agent-role-input"
                  type="text"
                  [ngModel]="agent.role"
                  (ngModelChange)="updateAgentField('role', $event)"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="agent-provider-select">AI Provider</label>
                <select
                  id="agent-provider-select"
                  [ngModel]="agent.provider"
                  (ngModelChange)="updateAgentField('provider', $event)"
                  class="form-control"
                >
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude 3.5)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              <div class="form-group full-width">
                <div class="slider-label">
                  <label for="agent-temp-input">Temperature (Creativity): <span>{{ agent.temperature }}</span></label>
                </div>
                <input
                  id="agent-temp-input"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  [ngModel]="agent.temperature"
                  (ngModelChange)="updateAgentField('temperature', $event)"
                  class="slider-control"
                />
              </div>

              <div class="form-group full-width">
                <label for="agent-prompt-textarea">System Prompt Instructions</label>
                <textarea
                  id="agent-prompt-textarea"
                  rows="4"
                  [ngModel]="agent.systemPrompt"
                  (ngModelChange)="updateAgentField('systemPrompt', $event)"
                  class="form-control textarea"
                ></textarea>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .agent-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      margin-bottom: 24px;
      overflow: hidden;
    }
    .card-header {
      background: #f8fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .card-header h3 {
      margin: 0;
      font-size: 1.15rem;
      color: #1e293b;
      font-weight: 600;
    }
    .subtitle {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: #64748b;
    }
    .card-body {
      padding: 20px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    .form-group label {
      display: block;
      font-size: 0.88rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      padding: 10px 12px;
      font-size: 0.95rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #1e293b;
      transition: border-color 0.15s ease-in-out;
      box-sizing: border-box;
    }
    .form-control:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
    }
    .textarea {
      resize: vertical;
      font-family: inherit;
    }
    .agent-details {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full-width {
      grid-column: span 2;
    }
    .slider-label {
      display: flex;
      justify-content: space-between;
    }
    .slider-label span {
      background: #eff6ff;
      color: #2563eb;
      padding: 2px 6px;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 4px;
    }
    .slider-control {
      width: 100%;
      height: 6px;
      background: #cbd5e1;
      outline: none;
      border-radius: 3px;
      cursor: pointer;
    }
    @media (max-width: 600px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
      .full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class AgentSelectComponent {
  agents = input.required<AIAgent[]>();
  selectedAgentId = input<string | undefined>();

  agentsChange = output<AIAgent[]>();
  selectedAgentIdChange = output<string>();

  currentAgent() {
    return this.agents().find((a) => a.id === this.selectedAgentId());
  }

  onAgentSelect(id: string): void {
    this.selectedAgentIdChange.emit(id);
  }

  updateAgentField(field: keyof AIAgent, val: any): void {
    const activeId = this.selectedAgentId();
    if (!activeId) return;

    // Map range slider values correctly to numbers
    const parsedVal = field === 'temperature' ? parseFloat(val) : val;

    const updated = this.agents().map((a) => {
      if (a.id === activeId) {
        return { ...a, [field]: parsedVal };
      }
      return a;
    });

    this.agentsChange.emit(updated);
  }
}
