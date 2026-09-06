export type AdherenceStatus = 'TAKEN' | 'SKIPPED' | 'MISSED' | 'PENDING';

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  notes: string;
  expiryDate: string; // YYYY-MM-DD
  frequency: string;
  reminderTime: string; // e.g. "08:00 AM"
  timeOfDay: TimeOfDay;
  supplyCount: number;
  createdAt: number;
}

export interface AdherenceLog {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  dateString: string; // YYYY-MM-DD
  actionTimestamp: number;
  status: AdherenceStatus;
  notes?: string;
}

export interface AppSettings {
  voiceRemindersEnabled: boolean;
  soundAlertsEnabled: boolean;
  snoozeMinutes: number;
  isDarkMode: boolean;
}
