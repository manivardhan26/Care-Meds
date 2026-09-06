export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  notes: string;
  expiryDate: string; // e.g. "2027-12-31" or "12/2026"
  frequency: string; // e.g. "Once daily", "Twice daily"
  reminderTime: string; // e.g. "08:00 AM"
  timeOfDay: string; // "Morning" | "Noon" | "Evening" | "Night"
  imageUri?: string | null;
  supplyCount: number;
  isLowSupply?: boolean;
  createdAt: number;
}

export type AdherenceStatus = 'UPCOMING' | 'TAKEN' | 'MISSED' | 'SKIPPED' | 'SNOOZED';

export interface AdherenceLog {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  dateString: string; // "YYYY-MM-DD"
  actionTimestamp: number;
  status: AdherenceStatus;
  notes?: string;
}

export type ExpiryState = 'SAFE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';

export interface ExpiryStatus {
  state: ExpiryState;
  message: string;
  daysRemaining?: number;
  isAlert: boolean;
}

export interface DailyMedicineItem {
  medicine: Medicine;
  status: AdherenceStatus;
  expiryStatus: ExpiryStatus;
}

export interface AppSettings {
  voiceRemindersEnabled: boolean;
  soundAlertsEnabled: boolean;
  snoozeMinutes: number;
  isDarkMode: boolean;
}
