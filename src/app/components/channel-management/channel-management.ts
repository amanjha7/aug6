// src/app/components/channel-management/channel-management.ts
import { Component, Input, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChannelService } from '../../services/channel.service';

interface ChannelTypeMeta {
  value: string;
  label: string;
  icon: string;
  color: string;
  textColor: string;
  bgTint: string;
  borderTint: string;
  description: string;
  requiresResource: boolean;
}

interface Toast {
  type: 'success' | 'error';
  msg: string;
}

interface Resource {
  _id?: string;
  name: string;
  channel_limit: number;
  delay_between_calls?: number;
}

@Component({
  selector: 'app-channel-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './channel-management.html',
  styleUrls: ['./channel-management.scss'],
})
export class ChannelManagement implements OnInit {
  @Input() dashId!: string;

  // ── Data ──
  channels: any[] = [];
  filteredChannels: any[] = [];
  isLoading = false;

  // ── Filters ──
  searchQuery = '';
  typeFilter: string = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // ── Modal ──
  showModal = false;
  isEditMode = false;
  editingChannel: any = null;
  saving = false;

  // ── Password toggles ──
  showAuthToken = false;
  showPassword = false;
  showServerUri = false;

  // ── Delete ──
  confirmDelete: any = null;

  // ── Toast ──
  toast: Toast | null = null;
  private toastTimer: any = null;

  // ── Additional Settings panels ──
  showAdditionalSettings = false;
  activePanel: string = '';

  // ── Incoming call settings ──
  incomingCallOption: 'aiAgent' | 'callFlow' = 'aiAgent';
  incomingCallExpanded = false;

  // ── Resource ──
  resourcesList: Resource[] = [];
  loadingResources = false;
  selectedResourceId: string | null = null;
  selectedResourceName = '';
  showResourcePopover = false;
  resourceRequiredError = false;
  showResourceModal = false;
  editingResourceId: string | null = null;
  resourceForm: Resource = { name: '', channel_limit: 1, delay_between_calls: 1 };

  // ── Trunk config ──
  trunkConfigStatus = 'NONE';

  // ── Time settings ──
  timeSettingsObj: any = { is_enabled: false };

  // ── Channel health ──
  channelHealthExpanded = false;

  // ── Conversation close ──
  conversationCloseExpanded = false;

  // ── Data lists ──
  aiAgentsList: any[] = [];
  callFlowList: any[] = [];
  countryCodes: any[] = [];
  regions: any[] = [];

  // ── Protocol / Encryption ──
  protocolList = [
    { label: 'UDP', value: 'UDP' },
    { label: 'TCP', value: 'TCP' },
    { label: 'TLS', value: 'TLS' },
  ];
  mediaencryptionList = [
    { label: 'None', value: 'none' },
    { label: 'SDES', value: 'sdes' },
  ];
  conversationCloseModes = [
    { label: 'After Last Message', value: 'after_last_message' },
    { label: 'Fixed Time', value: 'fixed_time' },
    { label: 'Never', value: 'never' },
  ];
  conversationLastMsgOptions = [
    { label: 'User Message', value: 'user' },
    { label: 'Bot Message', value: 'bot' },
    { label: 'Any Message', value: 'any' },
  ];

  // ── Forms ──
  channelForm!: FormGroup;
  forwardedNumbersForm!: FormGroup;
  forwardToNumbersForm!: FormGroup;

  channelTypes: ChannelTypeMeta[] = [
    {
      value: 'TWILIO',
      label: 'Twilio',
      icon: 'phone',
      color: '#FF6B6B',
      textColor: '#DC2626',
      bgTint: 'rgba(255,107,107,0.05)',
      borderTint: 'rgba(255,107,107,0.15)',
      description: 'Cloud telephony via Twilio API',
      requiresResource: true,
    },
    {
      value: 'SIP',
      label: 'SIP Outbound',
      icon: 'radio',
      color: '#4ECDC4',
      textColor: '#115E59',
      bgTint: 'rgba(78,205,196,0.05)',
      borderTint: 'rgba(78,205,196,0.15)',
      description: 'Outbound SIP trunk with registration',
      requiresResource: true,
    },
    {
      value: 'SIP_GATEWAY_HARDWARE',
      label: 'SIP Gateway Inbound',
      icon: 'server',
      color: '#F5A623',
      textColor: '#92400E',
      bgTint: 'rgba(245,166,35,0.05)',
      borderTint: 'rgba(245,166,35,0.15)',
      description: 'On-premise inbound gateway',
      requiresResource: true,
    },
  ];

  // ═══════════════════ GETTERS ═══════════════════
  get selectedType(): string { return this.channelForm?.get('type')?.value || ''; }
  get selectedTypeMeta(): ChannelTypeMeta | null { return this.channelTypes.find(t => t.value === this.selectedType) || null; }

  isSipOrGateway(): boolean { return ['SIP', 'SIP_GATEWAY_HARDWARE'].includes(this.selectedType); }
  isResourceRequired(): boolean { return this.selectedTypeMeta?.requiresResource ?? false; }

  get totalCount(): number { return this.channels.length; }
  get activeCount(): number { return this.channels.filter(c => c.is_enabled).length; }
  get inactiveCount(): number { return this.channels.filter(c => !c.is_enabled).length; }
  get regionCount(): number { return new Set(this.channels.map(c => c.sip_settings?.domain || c.region).filter(Boolean)).size; }

  get forwardedNumbers(): FormArray { return this.forwardedNumbersForm?.get('forwardedNumbers') as FormArray; }
  get forwardToNumbers(): FormArray { return this.forwardToNumbersForm?.get('forwardToNumbers') as FormArray; }
  get ipMatchList(): FormArray { return this.channelForm?.get('additionalSettings.ipMatchList') as FormArray; }

  constructor(private fb: FormBuilder, private channelService: ChannelService) {}

  // ═══════════════════ INIT ═══════════════════
  ngOnInit(): void {
    this.initForm();
    this.initForwardedNumbersForm();
    this.initForwardToNumbersForm();
    this.loadChannels();
    this.loadCountryCodes();
    this.loadRegions();
    this.loadAiAgents();
    this.loadCallFlows();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showResourceModal) { this.closeResourceModal(); return; }
    if (this.activePanel) { this.activePanel = ''; return; }
    if (this.showModal) this.closeModal();
    if (this.confirmDelete) this.confirmDelete = null;
  }

  // ═══════════════════ FORM INIT ═══════════════════
  initForm(channel?: any): void {
    this.channelForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['', Validators.required],
      incoming: [false],
      outgoing: [false],
      // Twilio
      accountSID: [''],
      authToken: [''],
      mobileCountryCode: [''],
      mobileNumber: ['', [Validators.pattern(/^\d+$/)]],
      // SIP
      username: [''],
      password: [''],
      port: [''],
      server_uri: [''],
      protocol: ['UDP'],
      server_ip: ['', [Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      registrationEnabled: [false],
      mediaencryption: ['none'],
      region: [''],
      // AI / Call Flow
      aiAgentId: [''],
      callFlowId: [''],
      // Additional Settings
      additionalSettings: this.fb.group({
        ipMatchList: this.fb.array([]),
        pingTimeout: [''],
        allowedCallsCount: [''],
      }),
      // Time settings
      timeSettingsEnabled: [false],
      // Channel health
      parallelCount: [''],
      delay: [''],
      chatbotResponseDelay: [''],
      totalMessagesCountPerDay: [''],
      // Conversation close
      conversationCloseTiming: [null],
      conversationLastMessage: ['user'],
    });

    this.showAuthToken = false;
    this.showPassword = false;
    this.showServerUri = false;

    if (channel) {
      this.isEditMode = true;
      this.editingChannel = channel;
      this.patchForm(channel);
    } else {
      this.isEditMode = false;
      this.editingChannel = null;
    }
  }

  initForwardedNumbersForm(data?: any[]): void {
    const arr = this.fb.array((data || []).map((n: any) => this.fb.group({
      country_code: [n.country_code || '', Validators.required],
      mobile_number: [n.mobile_number || '', [Validators.required, Validators.pattern(/^\d+$/)]],
    })));
    if (arr.length === 0) arr.push(this.createFwdNumberGroup());
    this.forwardedNumbersForm = this.fb.group({ forwardedNumbers: arr });
  }

  initForwardToNumbersForm(data?: any): void {
    const arr = this.fb.array(
      data ? [this.fb.group({
        country_code: [data.country_code || '', Validators.required],
        mobile_number: [data.mobile_number || '', [Validators.required, Validators.pattern(/^\d+$/)]],
      })] : [this.createFwdNumberGroup()]
    );
    this.forwardToNumbersForm = this.fb.group({ forwardToNumbers: arr });
  }

  createFwdNumberGroup(): FormGroup {
    return this.fb.group({
      country_code: ['', Validators.required],
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    });
  }

  addForwardedNumber(): void { this.forwardedNumbers.push(this.createFwdNumberGroup()); }
  removeForwardedNumber(i: number): void { if (this.forwardedNumbers.length > 1) this.forwardedNumbers.removeAt(i); }
  removeForwardToNumber(i: number): void { if (this.forwardToNumbers.length > 1) this.forwardToNumbers.removeAt(i); }

  addIpMatch(): void { this.ipMatchList.push(this.fb.control('')); }
  removeIpMatch(i: number): void { this.ipMatchList.removeAt(i); }

  patchForm(channel: any): void {
    const fv: any = {
      name: channel.name || '',
      type: channel.type || channel.channel_type || '',
      incoming: channel.call_type?.includes('INCOMING') || false,
      outgoing: channel.call_type?.includes('OUTGOING') || false,
    };

    if (channel.twilio_settings) {
      fv.accountSID = channel.twilio_settings.account_sid || '';
      fv.authToken = channel.twilio_settings.auth_token || '';
    }
    if (channel.sip_settings) {
      fv.username = channel.sip_settings.username || '';
      fv.password = channel.sip_settings.password || '';
      fv.port = channel.sip_settings.port || '';
      fv.server_uri = channel.sip_settings.server_uri || '';
      fv.server_ip = channel.sip_settings.server_ip || '';
      fv.protocol = channel.sip_settings.protocol || 'UDP';
      fv.mediaencryption = channel.sip_settings.media_encryption || 'none';
      fv.region = channel.sip_settings.domain || '';
    }
    if (channel.mobile_number) {
      fv.mobileCountryCode = channel.mobile_number.country_code || '';
      fv.mobileNumber = channel.mobile_number.mobile_number || '';
    }
    fv.registrationEnabled = channel.registration || false;
    fv.aiAgentId = channel.ai_agent_id || '';
    fv.callFlowId = channel.call_flow_id || '';

    // Additional settings
    const addSet: any = {};
    addSet.ipMatchList = channel.additional_settings?.ip_match_list || [];
    addSet.pingTimeout = channel.additional_settings?.ping_timeout || '';
    addSet.allowedCallsCount = channel.additional_settings?.allowed_calls_count || '';
    fv.additionalSettings = addSet;

    fv.timeSettingsEnabled = channel.time_settings?.is_enabled || false;
    this.timeSettingsObj = channel.time_settings || { is_enabled: false };

    fv.parallelCount = channel.broadcast?.parallel_count || '';
    fv.delay = channel.broadcast?.delay || '';
    fv.chatbotResponseDelay = channel.broadcast?.chatbot_response_delay || '';
    fv.totalMessagesCountPerDay = channel.broadcast?.total_messages_count_per_day || '';

    fv.conversationCloseTiming = channel.conversation_close_timing ?? null;
    fv.conversationLastMessage = channel.conversation_last_message || 'user';

    // Resource
    if (channel.resource_id) {
      this.selectedResourceId = channel.resource_id;
      this.selectedResourceName = channel.resource_name || channel.resource_id;
    }

    // Forwarded numbers
    if (channel.forwarded_numbers?.length) this.initForwardedNumbersForm(channel.forwarded_numbers);
    if (channel.forward_to_number) this.initForwardToNumbersForm(channel.forward_to_number);

    // IP Match list
    const ipList = channel.additional_settings?.ip_match_list || channel.ip_match_list || [];
    while (this.ipMatchList.length) this.ipMatchList.removeAt(0);
    ipList.forEach((ip: string) => this.ipMatchList.push(this.fb.control(ip)));
    if (this.ipMatchList.length === 0) this.ipMatchList.push(this.fb.control(''));

    // Trunk
    if (this.isSipOrGateway()) this.trunkConfigStatus = channel.trunk_config_status || 'NONE';

    this.channelForm.patchValue(fv);
  }

  // ═══════════════════ API CALLS ═══════════════════
  loadChannels(): void {
    this.isLoading = true;
    this.channelService.getChannels(this.dashId).subscribe({
      next: (res: any) => { this.channels = res?.result?.channels || []; this.applyFilters(); this.isLoading = false; },
      error: () => { this.showToast('error', 'Failed to load channels'); this.isLoading = false; },
    });
  }

  loadCountryCodes(): void {
    this.channelService.getCountryCodes().subscribe({
      next: (res: any) => this.countryCodes = res || [],
      error: () => console.error('Failed to load country codes'),
    });
  }

  loadRegions(): void {
    this.channelService.getAvailableRegions(this.dashId).subscribe({
      next: (res: any) => this.regions = res || [],
      error: () => console.error('Failed to load regions'),
    });
  }

  loadAiAgents(): void {
    this.channelService.getAiAgents(this.dashId).subscribe({
      next: (res: any) => this.aiAgentsList = res?.result || res || [],
      error: () => console.error('Failed to load AI agents'),
    });
  }

  loadCallFlows(): void {
    this.channelService.getCallFlows(this.dashId).subscribe({
      next: (res: any) => this.callFlowList = res?.result || res || [],
      error: () => console.error('Failed to load call flows'),
    });
  }

  loadResources(): void {
    this.loadingResources = true;
    this.channelService.getResources(this.dashId).subscribe({
      next: (res: any) => { this.resourcesList = res?.result || res || []; this.loadingResources = false; },
      error: () => { this.loadingResources = false; },
    });
  }

  refreshTrunkConfig(): void {
    if (!this.editingChannel) return;
    this.trunkConfigStatus = 'LOADING';
    this.channelService.refreshTrunkConfig(this.dashId, this.editingChannel._id).subscribe({
      next: (res: any) => { this.trunkConfigStatus = res?.status || 'ACTIVE'; },
      error: () => { this.trunkConfigStatus = 'ERROR'; },
    });
  }

  // ═══════════════════ FILTERS ═══════════════════
  applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredChannels = this.channels.filter(ch => {
      const chType = ch.type || ch.channel_type || '';
      if (q && !(ch.name || '').toLowerCase().includes(q) && !chType.toLowerCase().includes(q)) return false;
      if (this.typeFilter !== 'all' && chType !== this.typeFilter) return false;
      if (this.statusFilter === 'active' && !ch.is_enabled) return false;
      if (this.statusFilter === 'inactive' && ch.is_enabled) return false;
      return true;
    });
  }

  onSearchChange(v: string): void { this.searchQuery = v; this.applyFilters(); }
  setTypeFilter(v: string): void { this.typeFilter = this.typeFilter === v ? 'all' : v; this.applyFilters(); }
  setStatusFilter(v: 'all' | 'active' | 'inactive'): void { this.statusFilter = v; this.applyFilters(); }
  clearTypeFilter(): void { this.typeFilter = 'all'; this.applyFilters(); }
  getTypeCount(type: string): number { return this.channels.filter(c => (c.type || c.channel_type) === type).length; }

  // ═══════════════════ RESOURCE ═══════════════════
  selectResource(res: Resource): void {
    this.selectedResourceId = res._id || null;
    this.selectedResourceName = res.name;
    this.resourceRequiredError = false;
    this.showResourcePopover = false;
  }

  openResourceForm(res?: Resource): void {
    this.editingResourceId = res?._id || null;
    this.resourceForm = { name: res?.name || '', channel_limit: res?.channel_limit || 1, delay_between_calls: res?.delay_between_calls || 1 };
    this.showResourceModal = true;
  }

  closeResourceModal(): void { this.showResourceModal = false; }

  saveResource(): void {
    if (!this.resourceForm.name?.trim()) return;
    const req = this.editingResourceId
      ? this.channelService.updateResource(this.dashId, this.editingResourceId, this.resourceForm)
      : this.channelService.createResource(this.dashId, this.resourceForm);
    req.subscribe({
      next: () => { this.showToast('success', this.editingResourceId ? 'Resource updated' : 'Resource created'); this.loadResources(); },
      error: () => this.showToast('error', 'Failed'),
    });
    this.showResourceModal = false;
  }

  deleteResource(res: Resource): void {
    if (!confirm(`Delete resource "${res.name}"?`)) return;
    this.channelService.deleteResource(this.dashId, res._id!).subscribe({
      next: () => { this.showToast('success', 'Resource deleted'); this.loadResources(); },
      error: () => this.showToast('error', 'Delete failed'),
    });
  }

  // ═══════════════════ MODAL ═══════════════════
  openCreateModal(): void {
    this.initForm(null);
    this.initForwardedNumbersForm();
    this.initForwardToNumbersForm();
    this.selectedResourceId = null;
    this.selectedResourceName = '';
    this.resourceRequiredError = false;
    this.trunkConfigStatus = 'NONE';
    this.incomingCallOption = 'aiAgent';
    this.showAdditionalSettings = false;
    this.activePanel = '';
    this.channelHealthExpanded = false;
    this.conversationCloseExpanded = false;
    this.incomingCallExpanded = false;
    this.showModal = true;
  }

  openEditModal(channel: any): void { this.initForm(channel); this.showModal = true; }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.editingChannel = null;
    this.activePanel = '';
  }

  selectChannelType(type: string): void {
    if (this.isEditMode) return;
    this.channelForm.patchValue({ type });
    this.selectedResourceId = null;
    this.selectedResourceName = '';
  }

  toggleDirection(field: 'incoming' | 'outgoing'): void {
    this.channelForm.patchValue({ [field]: !this.channelForm.get(field)?.value });
  }

  openPanel(panel: string): void { this.activePanel = panel; }
  closePanel(): void { this.activePanel = ''; }

  getTimeSettingsObjCopy(): void {
    this.timeSettingsObj = { ...this.timeSettingsObj, is_enabled: this.channelForm?.value?.timeSettingsEnabled || false };
    this.openPanel('timeSettings');
  }

  updateTimeSetting(event: any): void {
    this.timeSettingsObj = event;
    this.channelForm?.patchValue({ timeSettingsEnabled: event?.is_enabled || false });
    this.closePanel();
  }

  // ═══════════════════ SUBMIT ═══════════════════
  onSubmit(): void {
    if (this.isResourceRequired() && !this.selectedResourceId) {
      this.resourceRequiredError = true;
      this.showToast('error', 'Please select a resource');
      return;
    }

    const raw = this.channelForm.value;

    if (!raw.incoming && !raw.outgoing) {
      this.showToast('error', 'Please select at least one call direction');
      return;
    }

    if (this.channelForm.invalid) {
      this.channelForm.markAllAsTouched();
      this.showToast('error', 'Please fix the errors');
      return;
    }

    this.saving = true;
    const payload = this.buildPayload(raw);

    const req = this.isEditMode && this.editingChannel
      ? this.channelService.updateTwilioChannel(this.dashId, this.editingChannel._id || this.editingChannel.twilio_channel_id, payload)
      : this.channelService.createTwilioChannel(this.dashId, payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.showToast('success', this.isEditMode ? 'Channel updated' : 'Channel created');
        this.loadChannels();
        this.showModal = false;
      },
      error: () => { this.saving = false; this.showToast('error', this.isEditMode ? 'Update failed' : 'Creation failed'); },
    });
  }

  private buildPayload(form: any): any {
    const payload: any = {
      name: form.name.trim(),
      type: [] as string[],
      channel_type: form.type,
      resource_id: this.selectedResourceId,
    };
    if (form.incoming) payload.type.push('INCOMING');
    if (form.outgoing) payload.type.push('OUTGOING');

    // AI Agent / Call Flow routing
    if (!this.isSipOrGateway()) {
      if (form.aiAgentId) payload.ai_agent_id = form.aiAgentId;
    } else {
      if (this.incomingCallOption === 'aiAgent' && form.aiAgentId) payload.ai_agent_id = form.aiAgentId;
      if (this.incomingCallOption === 'callFlow' && form.callFlowId) payload.call_flow_id = form.callFlowId;
    }

    // TWILIO
    if (form.type === 'TWILIO') {
      payload.mobile_number = { country_code: form.mobileCountryCode, mobile_number: form.mobileNumber?.trim() };
      payload.twilio_settings = { account_sid: form.accountSID?.trim(), auth_token: form.authToken?.trim() };
    }

    // SIP OUTBOUND
    if (form.type === 'SIP') {
      payload.sip_settings = {
        username: form.username?.trim(), password: form.password?.trim(),
        port: form.port, server_uri: form.server_uri?.trim(),
        protocol: form.protocol, media_encryption: form.mediaencryption,
        domain: form.region,
      };
      payload.registration = form.registrationEnabled;
    }

    // SIP GATEWAY INBOUND
    if (form.type === 'SIP_GATEWAY_HARDWARE') {
      payload.sip_settings = { server_ip: form.server_ip?.trim(), protocol: form.protocol, domain: form.region };
    }

    // Additional settings
    const addSet: any = {};
    const ipList = (form.additionalSettings?.ipMatchList || []).filter((ip: string) => ip.trim());
    if (ipList.length) addSet.ip_match_list = ipList;
    if (form.additionalSettings?.pingTimeout) addSet.ping_timeout = Number(form.additionalSettings.pingTimeout);
    if (form.additionalSettings?.allowedCallsCount) addSet.allowed_calls_count = Number(form.additionalSettings.allowedCallsCount);
    if (Object.keys(addSet).length) payload.additional_settings = addSet;

    // Time settings
    if (this.timeSettingsObj?.is_enabled || form.timeSettingsEnabled) payload.time_settings = this.timeSettingsObj;

    // Channel health
    const broadcast: any = {};
    if (form.parallelCount) broadcast.parallel_count = Number(form.parallelCount);
    if (form.delay) broadcast.delay = Number(form.delay);
    if (form.chatbotResponseDelay) broadcast.chatbot_response_delay = Number(form.chatbotResponseDelay);
    if (form.totalMessagesCountPerDay) broadcast.total_messages_count_per_day = Number(form.totalMessagesCountPerDay);
    if (Object.keys(broadcast).length) payload.broadcast = broadcast;

    // Conversation close
    if (form.conversationCloseTiming !== null && form.conversationCloseTiming !== undefined) {
      payload.conversation_close_timing = form.conversationCloseTiming;
      payload.conversation_last_message = form.conversationLastMessage;
    }

    return payload;
  }

  // ═══════════════════ DELETE ═══════════════════
  requestDelete(ch: any, evt: Event): void { evt.stopPropagation(); this.confirmDelete = ch; }
  cancelDelete(): void { this.confirmDelete = null; }

  performDelete(): void {
    if (!this.confirmDelete) return;
    const id = this.confirmDelete._id || this.confirmDelete.twilio_channel_id;
    this.channelService.deleteChannel(this.dashId, id).subscribe({
      next: () => { this.showToast('success', 'Channel deleted'); this.confirmDelete = null; this.loadChannels(); },
      error: () => { this.showToast('error', 'Delete failed'); this.confirmDelete = null; },
    });
  }

  // ═══════════════════ HELPERS ═══════════════════
  getTypeMeta(type: string): ChannelTypeMeta {
    return this.channelTypes.find(t => t.value === type) || {
      value: type, label: type, icon: 'phone', color: '#B8A9E8', textColor: '#5B21B6',
      bgTint: 'rgba(184,169,232,0.05)', borderTint: 'rgba(184,169,232,0.15)', description: '', requiresResource: false,
    };
  }

  getChannelType(ch: any): string { return ch.type || ch.channel_type || ''; }

  hasError(field: string, err: string): boolean {
    const c = this.channelForm.get(field);
    return !!(c && c.touched && c.errors && c.errors[err]);
  }

  hasAnyError(field: string): boolean {
    const c = this.channelForm.get(field);
    return !!(c && c.touched && c.invalid);
  }

  copyValue(val: any): void { navigator.clipboard.writeText(String(val || '')); this.showToast('success', 'Copied!'); }

  showToast(type: 'success' | 'error', msg: string): void {
    this.toast = { type, msg };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast = null, 2500);
  }

  onMobileNumberInput(event: Event): void {
    const t = event.target as HTMLInputElement;
    t.value = (t.value || '').replace(/\D/g, '');
    this.channelForm.patchValue({ mobileNumber: t.value });
  }

  trackById(_: number, item: any): any { return item._id || item.twilio_channel_id || item.name; }
}