import { VoiceLanguage, SpeechSpeedPreset, VoiceGenderPreference, SelectedVoiceResult } from './types';
import { VOICE_TEMPLATES } from './phrases';
import { getRateForSpeedPreset } from './VoiceSettings';
import { selectBestVoice } from './VoiceSelection';
import { defaultDeviceVoiceProvider } from './DeviceVoiceProvider';

export interface PreviewOptions {
  language: VoiceLanguage;
  genderPreference?: VoiceGenderPreference;
  speedPreset?: SpeechSpeedPreset;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Returns a short, natural, friendly preview sentence in the target language
 */
export function getPreviewSentence(language: VoiceLanguage): string {
  const templates = VOICE_TEMPLATES[language] || VOICE_TEMPLATES['en-US'];
  return templates.previewText;
}

/**
 * Speak the natural preview message with STRICT language isolation
 */
export async function playVoicePreview(options: PreviewOptions): Promise<SelectedVoiceResult> {
  const { language, genderPreference, speedPreset, onStart, onDone, onStopped, onError } = options;
  const text = getPreviewSentence(language);
  const rate = getRateForSpeedPreset(speedPreset);

  // Stop any ongoing audio immediately
  await defaultDeviceVoiceProvider.stop();

  // Find the best voice strictly matching this language and gender preference
  const selection = await selectBestVoice(language, undefined, genderPreference);

  // If the device does not have voices installed for this language, inform user and do NOT speak in wrong language
  if (!selection.isAvailable) {
    const error = new Error(`This language is not available on this device.`);
    onError?.(error);
    return selection;
  }

  await defaultDeviceVoiceProvider.speak(text, {
    voiceId: selection.voiceIdentifier,
    language: selection.language,
    rate,
    pitch: genderPreference === 'male' ? 0.92 : 1.05,
    force: true,
    onStart,
    onDone,
    onStopped,
    onError,
  });

  return selection;
}

/**
 * Stop any active preview audio
 */
export async function stopVoicePreview(): Promise<void> {
  await defaultDeviceVoiceProvider.stop();
}

/**
 * Check if the preview is currently playing
 */
export async function isPreviewPlaying(): Promise<boolean> {
  return await defaultDeviceVoiceProvider.isSpeaking();
}
