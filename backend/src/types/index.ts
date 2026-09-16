export type AdherenceStatus = 'UPCOMING' | 'TAKEN' | 'MISSED' | 'SKIPPED' | 'NOT_SURE' | 'SNOOZED';

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
  reminderTimes?: string[];
  timeOfDay: TimeOfDay;
  imageUri?: string | null;
  supplyCount: number;
  createdAt: number;
  stockTrackingEnabled?: boolean;
  currentQuantity?: number;
  unitType?: string;
  quantityPerDose?: number;
  lowStockThreshold?: number;
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

export type VoiceLanguage = 'en-US' | 'te-IN' | 'hi-IN';

export type SpeechSpeedPreset = 'slow' | 'normal' | 'fast';
export type VoiceProviderType = 'device' | 'cloud';
export type VoiceGenderPreference = 'female' | 'male';

export interface AppSettings {
  voiceRemindersEnabled: boolean;
  soundAlertsEnabled: boolean;
  snoozeMinutes: number;
  isDarkMode: boolean;
  voiceLanguage?: VoiceLanguage;
  selectedVoiceIdentifier?: string;
  voiceGender?: VoiceGenderPreference;
  speechSpeed?: SpeechSpeedPreset;
  speechPitch?: number;
  voiceProvider?: VoiceProviderType;
  preferredVoiceByLanguage?: Partial<Record<VoiceLanguage, string>>;
  patientName?: string;
  patientAge?: string;
}
