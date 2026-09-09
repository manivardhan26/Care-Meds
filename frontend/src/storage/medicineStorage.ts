import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicine, AdherenceLog, AppSettings, AdherenceStatus } from '../types';
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

const DEFAULT_SETTINGS: AppSettings = {
  voiceRemindersEnabled: true,
  soundAlertsEnabled: true,
  snoozeMinutes: 15,
  isDarkMode: false,
  voiceLanguage: 'en-US',
};

const SEED_MEDICINES: Medicine[] = [
  {
    id: 'med_1',
    name: 'Aspirin Cardio',
    dosage: '81mg',
    instructions: 'Take 1 tablet daily with breakfast',
    notes: 'Take 1 tablet daily with breakfast',
    expiryDate: '2027-12-31',
    frequency: 'Once daily',
    reminderTime: '08:00 AM',
    timeOfDay: 'Morning',
    supplyCount: 28,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'med_2',
    name: 'Lisinopril',
    dosage: '10mg',
    instructions: 'Take in the morning with water',
    notes: 'For blood pressure maintenance',
    expiryDate: '2026-11-30',
    frequency: 'Once daily',
    reminderTime: '09:00 AM',
    timeOfDay: 'Morning',
    supplyCount: 15,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'med_3',
    name: 'Metformin',
    dosage: '500mg',
    instructions: 'Take after evening meal',
    notes: 'Take after evening meal',
    expiryDate: '2028-04-15',
    frequency: 'Once daily',
    reminderTime: '06:00 PM',
    timeOfDay: 'Evening',
    supplyCount: 45,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'med_4',
    name: 'Atorvastatin (Expired Sample)',
    dosage: '20mg',
    instructions: 'Take 1 tablet at bedtime',
    notes: 'Check with pharmacy for replacement bottle',
    expiryDate: '2025-01-10', // Intentionally expired to demonstrate the critical safety banner
    frequency: 'Once daily',
    reminderTime: '09:00 PM',
    timeOfDay: 'Night',
    supplyCount: 8,
    createdAt: Date.now() - 86400000 * 40,
  },
];

let memoryMedicines: Medicine[] | null = null;
let memoryLogs: AdherenceLog[] | null = null;
let memorySettings: AppSettings = DEFAULT_SETTINGS;

export async function getMedicines(): Promise<Medicine[]> {
  // First attempt to fetch from backend API
  try {
    const remote = await getMedicinesApi();
    if (remote && Array.isArray(remote) && remote.length > 0) {
      memoryMedicines = remote;
      await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(remote)).catch(() => {});
      return remote;
    }
  } catch {
    // Graceful fallback to local storage
  }

  try {
    const data = await AsyncStorage.getItem(MEDICINES_KEY);
    if (!data) {
      // Seed initial medicines for immediate demonstration
      memoryMedicines = SEED_MEDICINES;
      await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(SEED_MEDICINES)).catch(() => {});
      return SEED_MEDICINES;
    }
    const parsed = JSON.parse(data);
    memoryMedicines = parsed;
    return parsed;
  } catch (error) {
    console.warn('AsyncStorage getMedicines warning, falling back to cache:', error);
    if (!memoryMedicines) {
      memoryMedicines = SEED_MEDICINES;
    }
    return memoryMedicines;
  }
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

  // Asynchronously sync with backend API
  saveMedicineApi(normalizedMedicine, existingId).catch(() => {});

  return updatedMedicine;
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
  // First attempt to fetch from backend API
  try {
    const remote = await getAdherenceLogsApi();
    if (remote && Array.isArray(remote)) {
      memoryLogs = remote;
      await AsyncStorage.setItem(ADHERENCE_KEY, JSON.stringify(remote)).catch(() => {});
      return remote;
    }
  } catch {
    // Graceful fallback to local storage
  }

  try {
    const data = await AsyncStorage.getItem(ADHERENCE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    memoryLogs = parsed;
    return parsed;
  } catch (error) {
    console.warn('AsyncStorage getAdherenceLogs warning, falling back to cache:', error);
    return memoryLogs || [];
  }
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

  // Asynchronously sync with backend API
  logAdherenceApi(medicineId, medicineName, dosage, scheduledTime, dateString, status, notes).catch(() => {});

  return record;
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const remote = await getSettingsApi();
    if (remote) {
      memorySettings = remote;
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(remote)).catch(() => {});
      return remote;
    }
  } catch {
    // Fallback to local storage
  }

  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    memorySettings = parsed;
    return parsed;
  } catch (error) {
    return memorySettings || DEFAULT_SETTINGS;
  }
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
