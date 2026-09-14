import { Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine, SnoozeRecord } from '../types';
import {
  saveSnoozeRecord,
  clearSnoozeRecord,
  getSettings,
  setOnDeleteMedicineCallback,
} from '../storage/medicineStorage';
import { speakReminder, speakSnoozeNotice } from '../utils/voiceReminder';

const SCHEDULED_REMINDERS_KEY = '@caremeds_scheduled_reminders_store';

// Automatically cancel pending notifications when a medicine is deleted
setOnDeleteMedicineCallback(async (medicineId: string) => {
  await cancelMedicineNotification(medicineId);
});

export interface ScheduledReminderItem {
  identifier: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  instructions: string;
  triggerTimestamp: number;
  isSnooze: boolean;
  snoozeMinutes: number;
  scheduledAt: number;
}

type ReminderTriggerCallback = (item: ScheduledReminderItem) => void;

let activeTimers: Map<string, any> = new Map();
let triggerListeners: Set<ReminderTriggerCallback> = new Set();

/**
 * Register a callback when any scheduled reminder triggers in-app
 */
export function addReminderTriggerListener(cb: ReminderTriggerCallback): () => void {
  triggerListeners.add(cb);
  return () => {
    triggerListeners.delete(cb);
  };
}

/**
 * Retrieve all persistent scheduled reminders from storage
 */
async function getStoredReminders(): Promise<ScheduledReminderItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_REMINDERS_KEY);
    const list: ScheduledReminderItem[] = raw ? JSON.parse(raw) : [];
    return list;
  } catch {
    return [];
  }
}

/**
 * Persist scheduled reminders list
 */
async function saveStoredReminders(items: ScheduledReminderItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('saveStoredReminders error:', e);
  }
}

async function fireReminder(item: ScheduledReminderItem) {
  const settings = await getSettings();

  // 1. Device vibration
  if (settings.soundAlertsEnabled !== false) {
    try {
      Vibration.vibrate([0, 500, 250, 500]);
    } catch {}
  }

  // 2. Voice chime / guidance in selected language
  if (settings.voiceRemindersEnabled !== false) {
    try {
      const lang = settings.voiceLanguage || 'en-US';
      if (item.isSnooze) {
        await speakSnoozeNotice(item.medicineName, item.dosage, lang);
      } else {
        await speakReminder(item.medicineName, item.dosage, lang, item.instructions);
      }
    } catch (e) {
      console.warn('Voice reminder playback error:', e);
    }
  }

  // 3. Notify UI listeners (opens ReminderModal)
  triggerListeners.forEach((listener) => {
    try {
      listener(item);
    } catch (e) {
      console.warn('Reminder listener error:', e);
    }
  });

  // 4. Remove triggered item from active tracking
  cancelMedicineNotification(item.medicineId).catch(() => {});
}

/**
 * Re-arm all stored reminders upon app start
 */
export async function initNotifications(): Promise<void> {
  const items = await getStoredReminders();
  const now = Date.now();
  const remaining: ScheduledReminderItem[] = [];

  for (const item of items) {
    const delayMs = item.triggerTimestamp - now;
    if (delayMs > 0) {
      // Re-schedule memory timer
      const timer = setTimeout(() => {
        fireReminder(item);
      }, delayMs);
      activeTimers.set(item.medicineId, timer);
      remaining.push(item);
    }
  }

  await saveStoredReminders(remaining);
}

/**
 * Cancel any existing scheduled reminder for a specific medicine
 * Guarantees zero duplicate notifications
 */
export async function cancelMedicineNotification(medicineId: string): Promise<void> {
  // Clear memory timer
  if (activeTimers.has(medicineId)) {
    clearTimeout(activeTimers.get(medicineId));
    activeTimers.delete(medicineId);
  }

  // Remove from storage
  const list = await getStoredReminders();
  const filtered = list.filter((item) => item.medicineId !== medicineId);
  await saveStoredReminders(filtered);
}

/**
 * Schedule a local reminder for a medicine with strict duplicate prevention
 */
export async function scheduleMedicineNotification(
  medicine: Medicine,
  triggerDate: Date,
  isSnooze: boolean = false,
  snoozeMinutes: number = 0
): Promise<string> {
  // 1. Cancel previous pending reminder for this medicine to prevent duplicates
  await cancelMedicineNotification(medicine.id);

  const identifier = `rem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const triggerTimestamp = triggerDate.getTime();
  const delayMs = Math.max(1000, triggerTimestamp - Date.now());

  const item: ScheduledReminderItem = {
    identifier,
    medicineId: medicine.id,
    medicineName: medicine.name,
    dosage: medicine.dosage,
    instructions: medicine.instructions || '',
    triggerTimestamp,
    isSnooze,
    snoozeMinutes,
    scheduledAt: Date.now(),
  };

  // Set timeout
  const timer = setTimeout(() => {
    fireReminder(item);
  }, delayMs);
  activeTimers.set(medicine.id, timer);

  // Persist
  const list = await getStoredReminders();
  list.push(item);
  await saveStoredReminders(list);

  return identifier;
}

/**
 * Reschedule the same medicine reminder for a chosen snooze duration
 * Supported test & prod durations: 1, 2, 5, 10, 15, 30 minutes
 * Guarantees:
 * - Cancels old pending reminder
 * - Does NOT mark as Taken
 * - Does NOT decrease stock
 * - Does NOT create a permanent Missed history record
 * - Preserves dose and medicine context
 * - Updates active snooze state
 */
export async function scheduleSnooze(
  medicine: Medicine,
  snoozeMinutes: number,
  todayIso: string
): Promise<{ notificationId: string; snoozeUntil: Date }> {
  const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

  // 1. Schedule exactly one new reminder
  const notificationId = await scheduleMedicineNotification(medicine, snoozeUntil, true, snoozeMinutes);

  // 2. Save active snooze record in storage (preserves context without corrupting stock or history)
  const snoozeRecord: SnoozeRecord = {
    medicineId: medicine.id,
    medicineName: medicine.name,
    dosage: medicine.dosage,
    instructions: medicine.instructions || '',
    scheduledTime: medicine.reminderTime,
    dateString: todayIso,
    snoozedAt: Date.now(),
    snoozeUntil: snoozeUntil.getTime(),
    snoozeMinutes,
    notificationId,
  };
  await saveSnoozeRecord(snoozeRecord);

  return { notificationId, snoozeUntil };
}

/**
 * Schedule a quick test reminder X minutes from now (e.g. 1, 2, 5 minutes)
 */
export async function scheduleQuickTestReminder(
  medicine: Medicine,
  minutesFromNow: number
): Promise<{ notificationId: string; triggerDate: Date }> {
  const triggerDate = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const notificationId = await scheduleMedicineNotification(medicine, triggerDate, false, 0);
  return { notificationId, triggerDate };
}

/**
 * Retrieve all currently scheduled reminders
 */
export async function getActiveScheduledReminders(): Promise<ScheduledReminderItem[]> {
  const list = await getStoredReminders();
  const now = Date.now();
  // Filter out any stale items
  return list.filter((item) => item.triggerTimestamp > now);
}

/**
 * Cancel all scheduled reminders
 */
export async function cancelAllScheduledReminders(): Promise<void> {
  activeTimers.forEach((timer) => clearTimeout(timer));
  activeTimers.clear();
  await AsyncStorage.removeItem(SCHEDULED_REMINDERS_KEY);
}
