import { VoiceLanguage, SpeechSpeedPreset, VoiceGenderPreference } from './types';
import { AppSettings } from '../types';
import { getSettings, saveSettings } from '../storage/medicineStorage';

export const SPEED_RATES: Record<SpeechSpeedPreset, number> = {
  slow: 0.78,
  normal: 0.88, // Optimal cadence for elderly comprehension & natural phrasing
  fast: 1.0,
};

export const DEFAULT_SPEED: SpeechSpeedPreset = 'normal';
export const DEFAULT_PITCH = 1.0;

/**
 * Convert a preset ('slow' | 'normal' | 'fast') to numeric speech rate
 */
export function getRateForSpeedPreset(preset?: SpeechSpeedPreset): number {
  if (preset && SPEED_RATES[preset]) {
    return SPEED_RATES[preset];
  }
  return SPEED_RATES[DEFAULT_SPEED];
}

/**
 * Retrieve active voice configuration from storage
 */
export async function loadVoiceSettings(): Promise<AppSettings> {
  return await getSettings();
}

/**
 * Persist updated voice settings to device storage
 */
export async function updateVoiceSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return await saveSettings(patch);
}

/**
 * Persist the user's preferred voice for a specific language
 */
export async function savePreferredVoiceForLanguage(
  language: VoiceLanguage,
  voiceIdentifier: string
): Promise<AppSettings> {
  const current = await getSettings();
  const preferredMap = {
    ...(current.preferredVoiceByLanguage || {}),
    [language]: voiceIdentifier,
  };

  return await saveSettings({
    voiceLanguage: language,
    selectedVoiceIdentifier: voiceIdentifier,
    preferredVoiceByLanguage: preferredMap,
  });
}

/**
 * Persist the user's preferred voice gender ('female' | 'male')
 */
export async function saveVoiceGenderPreference(
  gender: VoiceGenderPreference
): Promise<AppSettings> {
  return await saveSettings({ voiceGender: gender });
}
