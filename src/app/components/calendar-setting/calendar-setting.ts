// src/app/components/calendar-setting/calendar-setting.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar-setting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-setting.html',
  styleUrls: ['./calendar-setting.scss'],
})
export class CalendarSetting implements OnInit {
  @Input() selectedScheduleObj: any = {};
  @Input() showConfig: any = {
    showHeader: true,
    weeklyTimeSlots: true,
    specificDateTimeSlots: true,
    emitRequired: true,
    apiCallRequired: true,
    nameEditAllowed: true,
  };
  @Output() closeSetting = new EventEmitter<boolean>();
  @Output() updateSchedule = new EventEmitter<any>();

  // ── Week days ──
  weekDays = [
    { key: 'MON', name: 'Monday' },
    { key: 'TUE', name: 'Tuesday' },
    { key: 'WED', name: 'Wednesday' },
    { key: 'THU', name: 'Thursday' },
    { key: 'FRI', name: 'Friday' },
    { key: 'SAT', name: 'Saturday' },
    { key: 'SUN', name: 'Sunday' },
  ];

  // ── Time suggestions ──
  timeSuggestions: { timeString: string; totalMinutes: number }[] = [];
  selectedTimeIndex: 'from' | 'to' = 'from';
  editingSlotDay: string = '';
  editingSlotIndex: number = -1;

  // ── Date specific ──
  convertedDates: Date[] = [];

  constructor() {}

  ngOnInit(): void {
    // Ensure defaults
    if (!this.selectedScheduleObj?.weekly_time_slots) {
      this.selectedScheduleObj.weekly_time_slots = {
        SUN: [], MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [],
      };
    }
    if (!this.selectedScheduleObj?.specific_date_time_slots) {
      this.selectedScheduleObj.specific_date_time_slots = [];
    }
  }

  // ── Timing helpers ──
  minutesToTimeString(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${m < 10 ? '0' + m : m} ${suffix}`;
  }

  timeStringToMinutes(str: string): number {
    const parts = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) return 0;
    let h = parseInt(parts[1]);
    const m = parseInt(parts[2]);
    const mer = parts[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  generateTimeSuggestions(): void {
    this.timeSuggestions = [];
    for (let i = 0; i < 48; i++) {
      const mins = i * 30;
      this.timeSuggestions.push({ timeString: this.minutesToTimeString(mins), totalMinutes: mins });
    }
  }

  // ── Weekly time slots ──
  addTimeSlot(dayKey: string): void {
    if (!this.selectedScheduleObj.weekly_time_slots[dayKey]) {
      this.selectedScheduleObj.weekly_time_slots[dayKey] = [];
    }
    this.selectedScheduleObj.weekly_time_slots[dayKey].push({ from: 600, to: 1020 });
    this.emitChange();
  }

  removeTimeSlot(dayKey: string, index: number): void {
    this.selectedScheduleObj.weekly_time_slots[dayKey].splice(index, 1);
    this.emitChange();
  }

  onTimeSelect(timeItem: { timeString: string; totalMinutes: number }, dayKey: string, slotIndex: number, which: 'from' | 'to'): void {
    const slot = this.selectedScheduleObj.weekly_time_slots[dayKey]?.[slotIndex];
    if (!slot) return;
    slot[which] = timeItem.totalMinutes;

    // Ensure from < to
    if (slot.from >= slot.to) {
      if (which === 'from') slot.to = slot.from + 30;
      else slot.from = Math.max(0, slot.to - 30);
    }
    this.timeSuggestions = []; // close popup
    this.emitChange();
  }

  getFromDisplay(dayKey: string, i: number): string {
    const from = this.selectedScheduleObj?.weekly_time_slots?.[dayKey]?.[i]?.from;
    return from != null ? this.minutesToTimeString(from) : 'unavailable';
  }

  getToDisplay(dayKey: string, i: number): string {
    const to = this.selectedScheduleObj?.weekly_time_slots?.[dayKey]?.[i]?.to;
    return to != null ? this.minutesToTimeString(to) : 'unavailable';
  }

  // ── Date-specific time slots ──
  addDateTimeSlot(): void {
    this.selectedScheduleObj.specific_date_time_slots.push({
      date: this.dateTo1900(new Date()),
      dateStr: new Date().toISOString().split('T')[0],
      time_slots: [{ from: 300, to: 420 }],
    });
    this.emitChange();
  }

  removeDateTimeSlot(index: number): void {
    this.selectedScheduleObj.specific_date_time_slots.splice(index, 1);
    this.emitChange();
  }

  addTimeSlotForOverride(slotIndex: number): void {
    if (!this.selectedScheduleObj.specific_date_time_slots[slotIndex].time_slots) {
      this.selectedScheduleObj.specific_date_time_slots[slotIndex].time_slots = [];
    }
    this.selectedScheduleObj.specific_date_time_slots[slotIndex].time_slots.push({ from: 300, to: 420 });
    this.emitChange();
  }

  deleteTimeStampFromOverride(dateIdx: number, timeIdx: number): void {
    this.selectedScheduleObj.specific_date_time_slots[dateIdx]?.time_slots.splice(timeIdx, 1);
    this.emitChange();
  }

  onDateSpecificTimeSelect(
    timeItem: { timeString: string; totalMinutes: number },
    dateIdx: number,
    slotIdx: number,
    which: 'from' | 'to'
  ): void {
    const slot = this.selectedScheduleObj?.specific_date_time_slots?.[dateIdx]?.time_slots?.[slotIdx];
    if (!slot) return;
    slot[which] = timeItem.totalMinutes;
    if (slot.from >= slot.to) {
      if (which === 'from') slot.to = slot.from + 30;
      else slot.from = Math.max(0, slot.to - 30);
    }
    this.timeSuggestions = [];
    this.emitChange();
  }

  onDateChange(dateStr: string, index: number): void {
    const date = new Date(dateStr);
    this.selectedScheduleObj.specific_date_time_slots[index].date = this.dateTo1900(date);
    this.selectedScheduleObj.specific_date_time_slots[index].dateStr = dateStr;
    this.emitChange();
  }

  dateStrToDisplay(dateSlot: any): string {
    if (dateSlot.dateStr) return dateSlot.dateStr;
    // convert 1900-based number back to date string
    if (typeof dateSlot.date === 'number') {
      const d = this.dateFrom1900(dateSlot.date);
      return d.toISOString().split('T')[0];
    }
    return '';
  }

  // ── 1900 date system (matching Pronnel) ──
  private dateTo1900(d: Date): number {
    const epoch1900 = new Date(1899, 11, 30).getTime();
    return Math.floor((d.getTime() - epoch1900) / 86400000);
  }

  private dateFrom1900(n: number): Date {
    const epoch1900 = new Date(1899, 11, 30).getTime();
    return new Date(epoch1900 + n * 86400000);
  }

  // ── Emit ──
  private emitChange(): void {
    const clean = this.buildCleanPayload();
    if (this.showConfig.emitRequired) {
      this.updateSchedule.emit(clean);
    }
  }

  /** Build clean payload matching Pronnel's API format */
  buildCleanPayload(): any {
    const obj = JSON.parse(JSON.stringify(this.selectedScheduleObj));
    // Clean up UI-only fields from weekly time slots
    Object.keys(obj.weekly_time_slots || {}).forEach(day => {
      obj.weekly_time_slots[day] = obj.weekly_time_slots[day].map((slot: any) => ({
        from: slot.from,
        to: slot.to,
      }));
    });
    // Remove UI fields from specific date time slots
    if (obj.specific_date_time_slots) {
      obj.specific_date_time_slots = obj.specific_date_time_slots.map((s: any) => ({
        date: s.date,
        time_slots: (s.time_slots || []).map((ts: any) => ({ from: ts.from, to: ts.to })),
      }));
    }
    // Remove UI-only top-level fields
    delete obj.dateStr;
    return obj;
  }

  onClose(): void {
    this.closeSetting.emit(false);
    this.updateSchedule.emit(this.buildCleanPayload());
  }
}