import { VoiceLanguage, SpeechSpeedPreset, VoiceProviderType, VoiceGenderPreference } from '../types';

export { VoiceLanguage, SpeechSpeedPreset, VoiceProviderType, VoiceGenderPreference };

/**
 * Normalized representation of an audio voice discovered on device or cloud
 */
export interface DiscoveredVoice {
  identifier: string;
  name: string;
  quality: 'Enhanced' | 'Default';
  language: string; // BCP-47 e.g. "en-US", "te-IN", "hi-IN"
  locale: string;
  isEnhanced: boolean;
  displayName: string;
  gender: 'female' | 'male' | 'unknown';
}

/**
 * Result of resolving a voice for a language
 */
export interface SelectedVoiceResult {
  isAvailable: boolean;
  voice?: DiscoveredVoice;
  voiceIdentifier?: string;
  language: string;
  isEnhanced: boolean;
  genderMatched?: boolean;
  genderRequested?: VoiceGenderPreference;
  matchType: 'user-selected' | 'exact-enhanced' | 'exact-locale' | 'prefix-enhanced' | 'prefix-locale' | 'unavailable';
}

/**
 * Options passed to the active VoiceProvider for speech synthesis
 */
export interface SpeakOptions {
  voiceId?: string;
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  force?: boolean;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Generic interface supported by Device TTS and future Cloud AI TTS providers
 */
export interface VoiceProvider {
  readonly id: VoiceProviderType;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  getVoices(): Promise<DiscoveredVoice[]>;
  speak(text: string, options?: SpeakOptions): Promise<void>;
  stop(): Promise<void>;
  isSpeaking(): Promise<boolean>;
}

/**
 * Contextual information for constructing natural medication reminders
 */
export interface ReminderContext {
  medicineName: string;
  dosage: string;
  instructions?: string;
  timeOfDay?: string; // "Morning" | "Noon" | "Afternoon" | "Evening" | "Night"
}
