import { VoiceLanguage, ReminderContext, SpeakOptions } from './types';
import { VOICE_TEMPLATES } from './phrases';
import { loadVoiceSettings, getRateForSpeedPreset } from './VoiceSettings';
import { selectBestVoice } from './VoiceSelection';
import { getVoiceProvider } from './FutureCloudVoiceProvider';

class ReminderSpeechService {
  /**
   * Speak an upcoming or due medication reminder with natural, single-language cadence
   */
  public async speakReminder(
    context: ReminderContext,
    overrideLanguage?: VoiceLanguage
  ): Promise<void> {
    const settings = await loadVoiceSettings();
    if (!settings.voiceRemindersEnabled) {
      return;
    }

    const language: VoiceLanguage =
      overrideLanguage || settings.voiceLanguage || 'en-US';
    const templates = VOICE_TEMPLATES[language] || VOICE_TEMPLATES['en-US'];

    const message = templates.reminder(
      context.medicineName,
      context.dosage,
      context.timeOfDay,
      context.instructions
    );

    await this.speakTextInternal(message, language, false);
  }

  /**
   * Speak a friendly confirmation when the user marks a medicine as taken
   */
  public async speakTakenConfirmation(
    medicineName: string,
    overrideLanguage?: VoiceLanguage
  ): Promise<void> {
    const settings = await loadVoiceSettings();
    if (!settings.voiceRemindersEnabled) {
      return;
    }

    const language: VoiceLanguage =
      overrideLanguage || settings.voiceLanguage || 'en-US';
    const templates = VOICE_TEMPLATES[language] || VOICE_TEMPLATES['en-US'];
    const message = templates.taken(medicineName);

    await this.speakTextInternal(message, language, false);
  }

  /**
   * Speak an expiry safety advisory
   */
  public async speakExpiryWarning(
    medicineName: string,
    overrideLanguage?: VoiceLanguage
  ): Promise<void> {
    const settings = await loadVoiceSettings();
    if (!settings.voiceRemindersEnabled) {
      return;
    }

    const language: VoiceLanguage =
      overrideLanguage || settings.voiceLanguage || 'en-US';
    const templates = VOICE_TEMPLATES[language] || VOICE_TEMPLATES['en-US'];
    const message = templates.expiry(medicineName);

    await this.speakTextInternal(message, language, false);
  }

  /**
   * Speak a snoozed dose notification
   */
  public async speakSnoozeNotice(
    medicineName: string,
    dosage: string,
    overrideLanguage?: VoiceLanguage
  ): Promise<void> {
    const settings = await loadVoiceSettings();
    if (!settings.voiceRemindersEnabled) {
      return;
    }

    const language: VoiceLanguage =
      overrideLanguage || settings.voiceLanguage || 'en-US';
    const templates = VOICE_TEMPLATES[language] || VOICE_TEMPLATES['en-US'];
    const message = templates.snooze(medicineName, dosage);

    await this.speakTextInternal(message, language, false);
  }

  /**
   * Generic text speech applying user voice settings, speed presets, and strict language isolation
   */
  public async speakCustomText(
    text: string,
    language?: VoiceLanguage,
    options?: SpeakOptions
  ): Promise<void> {
    const settings = await loadVoiceSettings();
    if (!options?.force && !settings.voiceRemindersEnabled) {
      return;
    }

    const targetLang = language || settings.voiceLanguage || 'en-US';
    await this.speakTextInternal(text, targetLang, options?.force ?? false, options);
  }

  /**
   * Stop any active audio speech
   */
  public async stop(): Promise<void> {
    const settings = await loadVoiceSettings();
    const provider = getVoiceProvider(settings.voiceProvider || 'device');
    await provider.stop();
  }

  /**
   * Internal pipeline: selects best voice, applies rate and pitch, and dispatches to active provider
   */
  private async speakTextInternal(
    text: string,
    language: VoiceLanguage,
    force: boolean,
    customOptions?: SpeakOptions
  ): Promise<void> {
    try {
      const settings = await loadVoiceSettings();
      if (!force && !settings.voiceRemindersEnabled) {
        return;
      }

      // Check for user-saved preferred voice specifically for THIS language
      const savedVoiceId =
        customOptions?.voiceId ||
        settings.preferredVoiceByLanguage?.[language];

      // Select the best available voice strictly for this language and gender preference
      const selectionResult = await selectBestVoice(
        language,
        savedVoiceId,
        settings.voiceGender || 'female'
      );

      // If language voice is not available on device, do NOT speak with another language voice
      if (!selectionResult.isAvailable) {
        console.warn(
          `ReminderSpeechService: Language ${language} is not installed on this device. Speech suppressed to prevent mixed-language audio.`
        );
        return;
      }

      // Resolve speech rate suitable for elderly listeners
      const rate =
        typeof customOptions?.rate === 'number'
          ? customOptions.rate
          : getRateForSpeedPreset(settings.speechSpeed);

      const pitch =
        typeof customOptions?.pitch === 'number'
          ? customOptions.pitch
          : settings.speechPitch || 1.0;

      const provider = getVoiceProvider(settings.voiceProvider || 'device');

      await provider.speak(text, {
        voiceId: selectionResult.voiceIdentifier,
        language: selectionResult.language,
        rate,
        pitch,
        force,
        onStart: customOptions?.onStart,
        onDone: customOptions?.onDone,
        onStopped: customOptions?.onStopped,
        onError: customOptions?.onError,
      });
    } catch (error) {
      console.warn('ReminderSpeechService: Speech playback warning (handled safely):', error);
    }
  }
}

export const reminderSpeechService = new ReminderSpeechService();
