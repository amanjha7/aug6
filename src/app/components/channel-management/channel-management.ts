// src/app/components/channel-management/channel-management.ts
import { Component, Input, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
}

interface Toast {
  type: 'success' | 'error';
  msg: string;
}

@Component({
  selector: 'app-channel-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './channel-management.html',
  styleUrls: ['./channel-management.scss'],
})
export class ChannelManagement implements OnInit {
  @Input() dashId!: string;

  channels: any[] = [];
  filteredChannels: any[] = [];
  isLoading = false;

  // Filters
  searchQuery = '';
  typeFilter: string = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Modal state
  showModal = false;
  isEditMode = false;
  editingChannel: any = null;
  saving = false;

  // Password visibility
  showAuthToken = false;
  showPassword = false;

  // Delete confirmation
  confirmDelete: any = null;

  // Toast
  toast: Toast | null = null;
  private toastTimer: any = null;

  channelForm!: FormGroup;

  channelTypes: ChannelTypeMeta[] = [
    {
      value: 'TWILIO',
      label: 'Twilio',
      icon: 'phone',
      color: '#FF6B6B',
      textColor: '#DC2626',
      bgTint: 'rgba(255, 107, 107, 0.05)',
      borderTint: 'rgba(255, 107, 107, 0.15)',
      description: 'Cloud telephony via Twilio API',
    },
    {
      value: 'SIP',
      label: 'SIP (Outbound)',
      icon: 'radio',
      color: '#4ECDC4',
      textColor: '#115E59',
      bgTint: 'rgba(78, 205, 196, 0.05)',
      borderTint: 'rgba(78, 205, 196, 0.15)',
      description: 'Outbound SIP trunk with registration',
    },
    {
      value: 'SIP_GATEWAY_HARDWARE',
      label: 'SIP Gateway (Inbound)',
      icon: 'server',
      color: '#F5A623',
      textColor: '#92400E',
      bgTint: 'rgba(245, 166, 35, 0.05)',
      borderTint: 'rgba(245, 166, 35, 0.15)',
      description: 'On-premise inbound gateway',
    },
  ];

  countryCodes: any[] = [];
  regions: any[] = [];

  get selectedType(): string {
    return this.channelForm?.get('type')?.value || '';
  }

  get selectedTypeMeta(): ChannelTypeMeta | null {
    return this.channelTypes.find(t => t.value === this.selectedType) || null;
  }

  // ---- Stats getters ----
  get totalCount(): number { return this.channels.length; }
  get activeCount(): number { return this.channels.filter(c => c.is_enabled).length; }
  get inactiveCount(): number { return this.channels.filter(c => !c.is_enabled).length; }
  get regionCount(): number {
    return new Set(
      this.channels
        .map(c => c.sip_settings?.domain || c.region)
        .filter(Boolean)
    ).size;
  }

  constructor(private fb: FormBuilder, private channelService: ChannelService) {}

  ngOnInit(): void {
    this.initForm();
    this.loadChannels();
    this.loadCountryCodes();
    this.loadRegions();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showModal) this.closeModal();
    if (this.confirmDelete) this.confirmDelete = null;
  }

  // ---------- Form ----------
  initForm(channel?: any): void {
    this.channelForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['', Validators.required],
      incoming: [false],
      outgoing: [false],
      accountSID: [''],
      authToken: [''],
      mobileCountryCode: [''],
      mobileNumber: ['', [Validators.pattern(/^\d+$/)]],
      username: [''],
      password: [''],
      port: [''],
      server_uri: [''],
      protocol: ['UDP'],
      server_ip: ['', [Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      registrationEnabled: [false],
      mediaencryption: ['none'],
      region: [''],
    });

    this.showAuthToken = false;
    this.showPassword = false;

    if (channel) {
      this.isEditMode = true;
      this.editingChannel = channel;
      this.patchForm(channel);
    } else {
      this.isEditMode = false;
      this.editingChannel = null;
    }
  }

  patchForm(channel: any): void {
    const formValue: any = {
      name: channel.name || '',
      type: channel.type || channel.channel_type || '',
      incoming: channel.call_type?.includes('INCOMING') || false,
      outgoing: channel.call_type?.includes('OUTGOING') || false,
    };

    if (channel.twilio_settings) {
      formValue.accountSID = channel.twilio_settings.account_sid || '';
      formValue.authToken = channel.twilio_settings.auth_token || '';
    }
    if (channel.sip_settings) {
      formValue.username = channel.sip_settings.username || '';
      formValue.password = channel.sip_settings.password || '';
      formValue.port = channel.sip_settings.port || '';
      formValue.server_uri = channel.sip_settings.server_uri || '';
      formValue.server_ip = channel.sip_settings.server_ip || '';
      formValue.protocol = channel.sip_settings.protocol || 'UDP';
      formValue.mediaencryption = channel.sip_settings.media_encryption || 'none';
      formValue.region = channel.sip_settings.domain || '';
    }
    if (channel.mobile_number) {
      formValue.mobileCountryCode = channel.mobile_number.country_code || '';
      formValue.mobileNumber = channel.mobile_number.mobile_number || '';
    }
    formValue.registrationEnabled = channel.registration || false;

    this.channelForm.patchValue(formValue);
  }

  // ---------- API Calls ----------
  loadChannels(): void {
    this.isLoading = true;
    this.channelService.getChannels(this.dashId).subscribe({
      next: (res: any) => {
        this.channels = res?.result?.channels || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('error', 'Failed to load channels');
        this.isLoading = false;
      },
    });
  }

  loadCountryCodes(): void {
    this.channelService.getCountryCodes().subscribe({
      next: (res: any) => (this.countryCodes = res || []),
      error: () => console.error('Failed to load country codes'),
    });
  }

  loadRegions(): void {
    this.channelService.getAvailableRegions(this.dashId).subscribe({
      next: (res: any) => (this.regions = res || []),
      error: () => console.error('Failed to load regions'),
    });
  }

  // ---------- Filters ----------
  applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredChannels = this.channels.filter(ch => {
      const chType = ch.type || ch.channel_type || '';
      if (q) {
        const name = (ch.name || '').toLowerCase();
        const typeStr = chType.toLowerCase();
        if (!name.includes(q) && !typeStr.includes(q)) return false;
      }
      if (this.typeFilter !== 'all' && chType !== this.typeFilter) return false;
      if (this.statusFilter === 'active' && !ch.is_enabled) return false;
      if (this.statusFilter === 'inactive' && ch.is_enabled) return false;
      return true;
    });
  }

  onSearchChange(v: string): void {
    this.searchQuery = v;
    this.applyFilters();
  }

  setTypeFilter(v: string): void {
    this.typeFilter = this.typeFilter === v ? 'all' : v;
    this.applyFilters();
  }

  setStatusFilter(v: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = v;
    this.applyFilters();
  }

  clearTypeFilter(): void {
    this.typeFilter = 'all';
    this.applyFilters();
  }

  getTypeCount(type: string): number {
    return this.channels.filter(c => (c.type || c.channel_type) === type).length;
  }

  // ---------- Modal actions ----------
  openCreateModal(): void {
    this.initForm(null);
    this.showModal = true;
  }

  openEditModal(channel: any): void {
    this.initForm(channel);
    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.editingChannel = null;
  }

  selectChannelType(type: string): void {
    if (this.isEditMode) return;
    this.channelForm.patchValue({ type });
  }

  toggleDirection(field: 'incoming' | 'outgoing'): void {
    const current = this.channelForm.get(field)?.value;
    this.channelForm.patchValue({ [field]: !current });
  }

  onSubmit(): void {
    if (this.channelForm.invalid) {
      this.channelForm.markAllAsTouched();
      this.showToast('error', 'Please fix the errors and try again');
      return;
    }

    const raw = this.channelForm.value;
    const isCallingChannel = ['TWILIO', 'SIP', 'SIP_GATEWAY_HARDWARE'].includes(raw.type);
    if (!isCallingChannel) return;

    this.saving = true;
    const payload = this.buildCallingPayload(raw);

    if (this.isEditMode && this.editingChannel) {
      const channelId = this.editingChannel._id || this.editingChannel.twilio_channel_id;
      this.channelService.updateTwilioChannel(this.dashId, channelId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.showToast('success', 'Channel updated');
          this.loadChannels();
          this.showModal = false;
        },
        error: () => {
          this.saving = false;
          this.showToast('error', 'Update failed');
        },
      });
    } else {
      this.channelService.createTwilioChannel(this.dashId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.showToast('success', 'Channel created');
          this.loadChannels();
          this.showModal = false;
        },
        error: () => {
          this.saving = false;
          this.showToast('error', 'Creation failed');
        },
      });
    }
  }

  private buildCallingPayload(form: any): any {
    const payload: any = {
      name: form.name.trim(),
      type: [],
      channel_type: form.type,
    };

    if (form.incoming) payload.type.push('INCOMING');
    if (form.outgoing) payload.type.push('OUTGOING');

    if (form.type === 'TWILIO') {
      payload.mobile_number = {
        country_code: form.mobileCountryCode,
        mobile_number: form.mobileNumber?.trim(),
      };
      payload.twilio_settings = {
        account_sid: form.accountSID?.trim(),
        auth_token: form.authToken?.trim(),
      };
    }

    if (form.type === 'SIP') {
      payload.sip_settings = {
        username: form.username?.trim(),
        password: form.password?.trim(),
        port: form.port,
        server_uri: form.server_uri?.trim(),
        protocol: form.protocol,
        media_encryption: form.mediaencryption,
        domain: form.region,
      };
      payload.registration = form.registrationEnabled;
    }

    if (form.type === 'SIP_GATEWAY_HARDWARE') {
      payload.sip_settings = {
        server_ip: form.server_ip?.trim(),
        protocol: form.protocol,
        domain: form.region,
      };
    }

    return payload;
  }

  // ---------- Delete ----------
  requestDelete(ch: any, evt: Event): void {
    evt.stopPropagation();
    this.confirmDelete = ch;
  }

  cancelDelete(): void {
    this.confirmDelete = null;
  }

  performDelete(): void {
    if (!this.confirmDelete) return;
    const channelId = this.confirmDelete._id || this.confirmDelete.twilio_channel_id;
    this.channelService.deleteChannel(this.dashId, channelId).subscribe({
      next: () => {
        this.showToast('success', 'Channel deleted');
        this.confirmDelete = null;
        this.loadChannels();
      },
      error: () => {
        this.showToast('error', 'Delete failed');
        this.confirmDelete = null;
      },
    });
  }

  // ---------- Helpers ----------
  getTypeMeta(type: string): ChannelTypeMeta {
    return this.channelTypes.find(t => t.value === type) || {
      value: type, label: type, icon: 'phone',
      color: '#B8A9E8', textColor: '#5B21B6',
      bgTint: 'rgba(184,169,232,0.05)', borderTint: 'rgba(184,169,232,0.15)',
      description: '',
    };
  }

  getChannelType(ch: any): string {
    return ch.type || ch.channel_type || '';
  }

  hasError(field: string, err: string): boolean {
    const c = this.channelForm.get(field);
    return !!(c && c.touched && c.errors && c.errors[err]);
  }

  hasAnyError(field: string): boolean {
    const c = this.channelForm.get(field);
    return !!(c && c.touched && c.invalid);
  }

  showToast(type: 'success' | 'error', msg: string): void {
    this.toast = { type, msg };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 2500);
  }

  onlyDigits(value: string): string {
    return (value || '').replace(/\D/g, '');
  }

  onMobileNumberInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const digits = this.onlyDigits(target.value);
    target.value = digits;
    this.channelForm.patchValue({ mobileNumber: digits });
  }

  trackById(_: number, item: any): any {
    return item._id || item.twilio_channel_id || item.name;
  }
}