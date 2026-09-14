import * as Speech from 'expo-speech';
import { VoiceLanguage } from '../types';
import { getSettings } from '../storage/medicineStorage';
import {
  detectDeviceVoices,
  isVoiceInstalledForLanguage,
  reminderSpeechService,
  playVoicePreview,
  VOICE_TEMPLATES,
} from '../voice';

export interface LocalizedPhrases {
  reminder: (name: string, dose: string, instructions?: string) => string;
  taken: (name: string) => string;
  expiry: (name: string) => string;
  snooze: (name: string, dose: string) => string;
  test: string;
}

export const VOICE_TEXTS: Record<VoiceLanguage, LocalizedPhrases> = {
  'en-US': {
    reminder: (name, dose, instructions) =>
      VOICE_TEMPLATES['en-US'].reminder(name, dose, undefined, instructions),
    taken: (name) => VOICE_TEMPLATES['en-US'].taken(name),
    expiry: (name) => VOICE_TEMPLATES['en-US'].expiry(name),
    snooze: (name, dose) => VOICE_TEMPLATES['en-US'].snooze(name, dose),
    test: VOICE_TEMPLATES['en-US'].previewText,
  },
  'te-IN': {
    reminder: (name, dose, instructions) =>
      VOICE_TEMPLATES['te-IN'].reminder(name, dose, undefined, instructions),
    taken: (name) => VOICE_TEMPLATES['te-IN'].taken(name),
    expiry: (name) => VOICE_TEMPLATES['te-IN'].expiry(name),
    snooze: (name, dose) => VOICE_TEMPLATES['te-IN'].snooze(name, dose),
    test: VOICE_TEMPLATES['te-IN'].previewText,
  },
  'hi-IN': {
    reminder: (name, dose, instructions) =>
      VOICE_TEMPLATES['hi-IN'].reminder(name, dose, undefined, instructions),
    taken: (name) => VOICE_TEMPLATES['hi-IN'].taken(name),
    expiry: (name) => VOICE_TEMPLATES['hi-IN'].expiry(name),
    snooze: (name, dose) => VOICE_TEMPLATES['hi-IN'].snooze(name, dose),
    test: VOICE_TEMPLATES['hi-IN'].previewText,
  },
};

/**
 * Detect all speech voices installed on the device (delegates to VoiceDetection)
 */
export async function getDetectedVoices(): Promise<Speech.Voice[]> {
  try {
    const raw = await Speech.getAvailableVoicesAsync();
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    console.warn('Could not query device voices:', e);
    return [];
  }
}

/**
 * Check if a specific language is installed/detected on the device
 */
export async function isLanguageVoiceDetected(lang: VoiceLanguage): Promise<boolean> {
  return await isVoiceInstalledForLanguage(lang);
}

/**
 * Core text-to-speech function applying user-selected voice, speed, and pitch
 */
export async function speakText(
  text: string,
  language: VoiceLanguage = 'en-US',
  options?: { force?: boolean; voiceId?: string }
): Promise<void> {
  await reminderSpeechService.speakCustomText(text, language, options);
}

/**
 * Natural reminder speech dispatching with time-of-day contextual templates
 */
export async function speakReminder(
  medicineName: string,
  dosage: string,
  param3?: VoiceLanguage | string,
  param4?: VoiceLanguage | string
): Promise<void> {
  let instructions: string | undefined = undefined;
  let language: VoiceLanguage = 'en-US';

  const isLang = (val: any): val is VoiceLanguage =>
    val === 'en-US' || val === 'te-IN' || val === 'hi-IN';

  if (isLang(param3)) {
    language = param3;
    if (typeof param4 === 'string') instructions = param4;
  } else if (isLang(param4)) {
    language = param4;
    if (typeof param3 === 'string') instructions = param3;
  } else {
    if (typeof param3 === 'string') instructions = param3;
    const settings = await getSettings();
    if (settings.voiceLanguage) language = settings.voiceLanguage;
  }

  await reminderSpeechService.speakReminder(
    {
      medicineName,
      dosage,
      instructions,
    },
    language
  );
}

export async function speakTakenConfirmation(
  medicineName: string,
  language?: VoiceLanguage
): Promise<void> {
  await reminderSpeechService.speakTakenConfirmation(medicineName, language);
}

export async function speakExpiryWarning(
  medicineName: string,
  language?: VoiceLanguage
): Promise<void> {
  await reminderSpeechService.speakExpiryWarning(medicineName, language);
}

export async function speakSnoozeNotice(
  medicineName: string,
  dosage: string,
  language?: VoiceLanguage
): Promise<void> {
  await reminderSpeechService.speakSnoozeNotice(medicineName, dosage, language);
}

export async function speakTestPreview(language: VoiceLanguage): Promise<void> {
  const settings = await getSettings();
  await playVoicePreview({
    language,
    speedPreset: settings.speechSpeed,
  });
}

export async function stopSpeech(): Promise<void> {
  await reminderSpeechService.stop();
}
