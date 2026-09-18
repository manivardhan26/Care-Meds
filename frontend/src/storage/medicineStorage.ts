import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine, AdherenceLog, AppSettings, AdherenceStatus, SnoozeRecord } from '../types';
import {
  getMedicinesApi,
  saveMedicineApi,
  deleteMedicineApi,
  updateSupplyApi,
  getAdherenceLogsApi,
  logAdherenceApi,
  getSettingsApi,
  saveSettingsApi,
} from '../services/api';

const MEDICINES_KEY = '@caremeds_medicines';
const ADHERENCE_KEY = '@caremeds_adherence_logs';
const SETTINGS_KEY = '@caremeds_settings';
const SNOOZE_KEY = '@caremeds_active_snoozes';

const DEFAULT_SETTINGS: AppSettings = {
  voiceRemindersEnabled: true,
  soundAlertsEnabled: true,
  snoozeMinutes: 15,
  isDarkMode: false,
  voiceLanguage: 'en-US',
  voiceGender: 'female',
  patientName: 'Your Name',
  patientAge: '',
};

let memorySnoozes: SnoozeRecord[] | null = null;

let memoryMedicines: Medicine[] | null = null;
let memoryLogs: AdherenceLog[] | null = null;
let memorySettings: AppSettings = DEFAULT_SETTINGS;

export async function getMedicines(): Promise<Medicine[]> {
  // 1. Fast path: return memory cache immediately if available
  if (memoryMedicines !== null) {
    return memoryMedicines;
  }

  // 2. Local-first: read AsyncStorage without blocking on network
  try {
    const data = await AsyncStorage.getItem(MEDICINES_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      memoryMedicines = Array.isArray(parsed) ? parsed : [];
    } else {
      memoryMedicines = [];
    }
  } catch (error) {
    console.warn('AsyncStorage getMedicines warning, falling back to cache:', error);
    memoryMedicines = memoryMedicines || [];
  }

  // 3. Non-blocking background sync with backend if available
  getMedicinesApi()
    .then(async (remote) => {
      if (remote && Array.isArray(remote) && remote.length > 0) {
        // Only merge if remote has data
        memoryMedicines = remote;
        await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(remote)).catch(() => {});
      }
    })
    .catch(() => {});

  return memoryMedicines;
}

export async function saveMedicine(medicine: Omit<Medicine, 'id' | 'createdAt'>, existingId?: string): Promise<Medicine> {
  const medicines = await getMedicines();
  let updatedMedicine: Medicine;

  const existing = existingId ? medicines.find((m) => m.id === existingId) : null;
  const resolvedQty = typeof medicine.currentQuantity === 'number'
    ? Math.max(0, medicine.currentQuantity)
    : (typeof medicine.supplyCount === 'number'
      ? Math.max(0, medicine.supplyCount)
      : (existing?.currentQuantity ?? existing?.supplyCount ?? 30));

  const normalizedMedicine: Omit<Medicine, 'id' | 'createdAt'> = {
    ...medicine,
    imageUri: medicine.imageUri !== undefined ? medicine.imageUri : (existing?.imageUri ?? null),
    supplyCount: resolvedQty,
    currentQuantity: resolvedQty,
    stockTrackingEnabled: typeof medicine.stockTrackingEnabled === 'boolean'
      ? medicine.stockTrackingEnabled
      : (existing?.stockTrackingEnabled ?? true),
    unitType: medicine.unitType?.trim() || existing?.unitType || 'tablets',
    quantityPerDose: typeof medicine.quantityPerDose === 'number' && medicine.quantityPerDose > 0
      ? medicine.quantityPerDose
      : (existing?.quantityPerDose ?? 1),
    lowStockThreshold: typeof medicine.lowStockThreshold === 'number' && medicine.lowStockThreshold >= 0
      ? medicine.lowStockThreshold
      : (existing?.lowStockThreshold ?? 3),
  };

  if (existingId) {
    updatedMedicine = {
      ...normalizedMedicine,
      id: existingId,
      createdAt: existing?.createdAt || Date.now(),
    };
    const index = medicines.findIndex((m) => m.id === existingId);
    if (index >= 0) {
      medicines[index] = updatedMedicine;
    } else {
      medicines.push(updatedMedicine);
    }
  } else {
    updatedMedicine = {
      ...normalizedMedicine,
      id: `med_${Date.now()}`,
      createdAt: Date.now(),
    };
    medicines.push(updatedMedicine);
  }

  memoryMedicines = medicines;
  try {
    await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
  } catch (e) {
    console.warn('AsyncStorage saveMedicine warning:', e);
  }

  // Trigger notification callback to auto-schedule all reminder times
  if (onSaveMedicineCallback) {
    try {
      await onSaveMedicineCallback(updatedMedicine);
    } catch (e) {
      console.warn('onSaveMedicineCallback error:', e);
    }
  }

  // Asynchronously sync with backend API
  saveMedicineApi(normalizedMedicine, existingId).catch(() => {});

  return updatedMedicine;
}

let onSaveMedicineCallback: ((medicine: Medicine) => void | Promise<void>) | null = null;
let onDeleteMedicineCallback: ((id: string) => void | Promise<void>) | null = null;

export function setOnSaveMedicineCallback(cb: (medicine: Medicine) => void | Promise<void>) {
  onSaveMedicineCallback = cb;
}

export function setOnDeleteMedicineCallback(cb: (id: string) => void | Promise<void>) {
  onDeleteMedicineCallback = cb;
}

export async function deleteMedicine(id: string): Promise<void> {
  const medicines = await getMedicines();
  const filtered = medicines.filter((m) => m.id !== id);
  memoryMedicines = filtered;
  try {
    await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('AsyncStorage deleteMedicine warning:', e);
  }

  // Also remove adherence logs for this medicine
  const logs = await getAdherenceLogs();
  const remainingLogs = logs.filter((l) => l.medicineId !== id);
  memoryLogs = remainingLogs;
  try {
    await AsyncStorage.setItem(ADHERENCE_KEY, JSON.stringify(remainingLogs));
  } catch (e) {
    console.warn('AsyncStorage delete adherence logs warning:', e);
  }

  // Clear active snooze record if any exists
  await clearSnoozeRecord(id);

  // Trigger notification service cancellation callback
  if (onDeleteMedicineCallback) {
    try {
      await onDeleteMedicineCallback(id);
    } catch (e) {
      console.warn('onDeleteMedicineCallback error:', e);
    }
  }

  // Sync deletion with backend API
  deleteMedicineApi(id).catch(() => {});
}

export async function updateSupply(id: string, count: number): Promise<void> {
  const medicines = await getMedicines();
  const target = medicines.find((m) => m.id === id);
  if (target) {
    const safeCount = Math.max(0, count);
    target.supplyCount = safeCount;
    target.currentQuantity = safeCount;
    memoryMedicines = medicines;
    try {
      await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
    } catch (e) {
      console.warn('AsyncStorage updateSupply warning:', e);
    }
    updateSupplyApi(id, safeCount).catch(() => {});
  }
}

export async function getAdherenceLogs(): Promise<AdherenceLog[]> {
  // 1. Fast path: return memory cache immediately
  if (memoryLogs !== null) {
    return memoryLogs;
  }

  // 2. Local-first: read AsyncStorage without blocking
  try {
    const data = await AsyncStorage.getItem(ADHERENCE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    memoryLogs = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('AsyncStorage getAdherenceLogs warning, falling back to cache:', error);
    memoryLogs = memoryLogs || [];
  }

  // 3. Non-blocking background sync
  getAdherenceLogsApi()
    .then(async (remote) => {
      if (remote && Array.isArray(remote) && remote.length > 0) {
        memoryLogs = remote;
        await AsyncStorage.setItem(ADHERENCE_KEY, JSON.stringify(remote)).catch(() => {});
      }
    })
    .catch(() => {});

  return memoryLogs;
}

export async function logAdherence(
  medicineId: string,
  medicineName: string,
  dosage: string,
  scheduledTime: string,
  dateString: string,
  status: AdherenceStatus,
  notes?: string
): Promise<AdherenceLog> {
  const logs = await getAdherenceLogs();
  const existingIndex = logs.findIndex(
    (l) => l.medicineId === medicineId && l.dateString === dateString && (!scheduledTime || l.scheduledTime === scheduledTime)
  );

  const wasAlreadyTaken = existingIndex >= 0 && logs[existingIndex].status === 'TAKEN';

  let record: AdherenceLog;
  if (existingIndex >= 0) {
    record = {
      ...logs[existingIndex],
      status,
      actionTimestamp: Date.now(),
      notes: notes || logs[existingIndex].notes,
    };
    logs[existingIndex] = record;
  } else {
    record = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      medicineId,
      medicineName,
      dosage,
      scheduledTime,
      dateString,
      actionTimestamp: Date.now(),
      status,
      notes,
    };
    logs.unshift(record);
  }

  memoryLogs = logs;
  try {
    await AsyncStorage.setItem(ADHERENCE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('AsyncStorage logAdherence warning:', e);
  }

  // Deduct stock ONLY ONCE when transition to TAKEN occurs
  // Snooze, Skip, or Missed never decrease stock
  if (status === 'TAKEN' && !wasAlreadyTaken) {
    const medicines = await getMedicines();
    const med = medicines.find((m) => m.id === medicineId);
    if (med) {
      const trackingEnabled = med.stockTrackingEnabled !== false;
      if (trackingEnabled) {
        const qtyPerDose = typeof med.quantityPerDose === 'number' && med.quantityPerDose > 0 ? med.quantityPerDose : 1;
        const current = typeof med.currentQuantity === 'number' ? med.currentQuantity : med.supplyCount;
        const newQty = Math.max(0, current - qtyPerDose);
        med.currentQuantity = newQty;
        med.supplyCount = newQty;
        memoryMedicines = medicines;
        try {
          await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
        } catch (e) {
          console.warn('AsyncStorage decrement supply warning:', e);
        }
      }
    }
  }

  // Clear active snooze if medicine has been resolved (TAKEN, SKIPPED, or NOT_SURE)
  if (status === 'TAKEN' || status === 'SKIPPED' || status === 'NOT_SURE') {
    await clearSnoozeRecord(medicineId);
  }

  // Asynchronously sync with backend API
  logAdherenceApi(medicineId, medicineName, dosage, scheduledTime, dateString, status, notes).catch(() => {});

  return record;
}

/**
 * Check if a scheduled dose was already logged today (e.g. TAKEN, NOT_SURE, SKIPPED)
 * and retrieve exact formatted action time for duplicate dose warnings.
 */
export async function getDoseStatusToday(
  medicineId: string,
  scheduledTime?: string
): Promise<{
  isRecorded: boolean;
  isTaken: boolean;
  status?: AdherenceStatus;
  actionTimestamp?: number;
  formattedTime?: string;
  record?: AdherenceLog;
}> {
  const today = new Date().toISOString().split('T')[0];
  const logs = await getAdherenceLogs();
  const log = logs.find(
    (l) => l.medicineId === medicineId && l.dateString === today && (!scheduledTime || l.scheduledTime === scheduledTime)
  );

  if (!log) {
    return { isRecorded: false, isTaken: false };
  }

  const formattedTime = log.actionTimestamp
    ? new Date(log.actionTimestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return {
    isRecorded: true,
    isTaken: log.status === 'TAKEN',
    status: log.status,
    actionTimestamp: log.actionTimestamp,
    formattedTime,
    record: log,
  };
}

export async function getActiveSnoozes(): Promise<SnoozeRecord[]> {
  try {
    const data = await AsyncStorage.getItem(SNOOZE_KEY);
    const parsed: SnoozeRecord[] = data ? JSON.parse(data) : [];
    memorySnoozes = parsed;
    return parsed;
  } catch {
    return memorySnoozes || [];
  }
}

export async function getActiveSnoozeForMedicine(medicineId: string): Promise<SnoozeRecord | null> {
  const all = await getActiveSnoozes();
  return all.find((s) => s.medicineId === medicineId) || null;
}

export async function saveSnoozeRecord(record: SnoozeRecord): Promise<void> {
  const all = await getActiveSnoozes();
  // Filter out any existing snooze for the same medicine to prevent duplicate records
  const filtered = all.filter((s) => s.medicineId !== record.medicineId);
  filtered.push(record);
  memorySnoozes = filtered;
  try {
    await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('AsyncStorage saveSnoozeRecord error:', e);
  }
}

export async function clearSnoozeRecord(medicineId: string): Promise<void> {
  const all = await getActiveSnoozes();
  const filtered = all.filter((s) => s.medicineId !== medicineId);
  memorySnoozes = filtered;
  try {
    await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('AsyncStorage clearSnoozeRecord error:', e);
  }
}

export async function getSettings(): Promise<AppSettings> {
  // 1. Fast path: return memory cache if initialized
  if (memorySettings && memorySettings !== DEFAULT_SETTINGS) {
    return memorySettings;
  }

  // 2. Local-first: read AsyncStorage without blocking
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    memorySettings = parsed;
  } catch (error) {
    memorySettings = memorySettings || DEFAULT_SETTINGS;
  }

  // 3. Non-blocking background sync
  getSettingsApi()
    .then(async (remote) => {
      if (remote) {
        memorySettings = { ...DEFAULT_SETTINGS, ...remote };
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memorySettings)).catch(() => {});
      }
    })
    .catch(() => {});

  return memorySettings;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  memorySettings = updated;
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('AsyncStorage saveSettings warning:', e);
  }

  saveSettingsApi(updated).catch(() => {});

  return updated;
}
