import { VoiceProvider, DiscoveredVoice, SpeakOptions, VoiceProviderType } from './types';
import { defaultDeviceVoiceProvider } from './DeviceVoiceProvider';

/**
 * Architectural blueprint for future Cloud AI TTS providers (e.g., ElevenLabs, Google Cloud Neural2, OpenAI TTS).
 * This provider implements the exact same VoiceProvider interface as DeviceVoiceProvider.
 *
 * When an API key and cloud backend are provisioned in the future, Pill Me On Time can toggle between
 * 'device' and 'cloud' without modifying any reminder logic or UI screens.
 */
export interface CloudVoiceConfig {
  providerName: 'elevenlabs' | 'google-cloud' | 'openai';
  apiKey?: string;
  voiceModelId?: string;
  baseUrl?: string;
}

export class FutureCloudVoiceProvider implements VoiceProvider {
  public readonly id: VoiceProviderType = 'cloud';
  public readonly name = 'Cloud AI Voice Service (Future Provider)';

  private config: CloudVoiceConfig;
  private _isSpeaking = false;

  constructor(config?: Partial<CloudVoiceConfig>) {
    this.config = {
      providerName: config?.providerName || 'elevenlabs',
      apiKey: config?.apiKey,
      voiceModelId: config?.voiceModelId,
      baseUrl: config?.baseUrl,
    };
  }

  public async isAvailable(): Promise<boolean> {
    // Requires an active API key or configured backend proxy
    return Boolean(this.config.apiKey && this.config.apiKey.length > 0);
  }

  public async getVoices(): Promise<DiscoveredVoice[]> {
    // In production with an active cloud provider, this fetches curated natural AI voice models:
    // e.g. Warm Elderly Companion, Caring Nurse Voice, Multilingual Indic AI Voice.
    return [
      {
        identifier: 'cloud_ai_caring_en',
        name: 'Pill Me On Time Warm Companion (Cloud AI)',
        quality: 'Enhanced',
        language: 'en-US',
        locale: 'en-US',
        isEnhanced: true,
        displayName: 'Pill Me On Time Caring Voice (Cloud AI - High Clarity)',
        gender: 'female',
      },
      {
        identifier: 'cloud_ai_indic_te',
        name: 'Pill Me On Time Telugu Natural AI (Cloud AI)',
        quality: 'Enhanced',
        language: 'te-IN',
        locale: 'te-IN',
        isEnhanced: true,
        displayName: 'Telugu Natural Voice (Cloud AI)',
        gender: 'female',
      },
      {
        identifier: 'cloud_ai_indic_hi',
        name: 'Pill Me On Time Hindi Natural AI (Cloud AI)',
        quality: 'Enhanced',
        language: 'hi-IN',
        locale: 'hi-IN',
        isEnhanced: true,
        displayName: 'Hindi Natural Voice (Cloud AI)',
        gender: 'female',
      },
    ];
  }

  public async speak(text: string, options?: SpeakOptions): Promise<void> {
    const isCloudConfigured = await this.isAvailable();
    if (!isCloudConfigured) {
      // Graceful automatic fallback to device TTS so Expo Go never crashes
      console.log('FutureCloudVoiceProvider: Cloud API key not provisioned. Seamlessly routing to DeviceVoiceProvider.');
      await defaultDeviceVoiceProvider.speak(text, options);
      return;
    }

    try {
      this._isSpeaking = true;
      options?.onStart?.();

      // Future workflow:
      // 1. POST text to Cloud TTS endpoint (ElevenLabs/Google Cloud TTS)
      // 2. Stream audio or download temporary MP3 file
      // 3. Play via expo-av Audio.Sound.createAsync(uri)
      // 4. Trigger onDone() upon completion

      this._isSpeaking = false;
      options?.onDone?.();
    } catch (error) {
      this._isSpeaking = false;
      console.warn('FutureCloudVoiceProvider error, falling back to device:', error);
      await defaultDeviceVoiceProvider.speak(text, options);
    }
  }

  public async stop(): Promise<void> {
    this._isSpeaking = false;
    await defaultDeviceVoiceProvider.stop();
  }

  public async isSpeaking(): Promise<boolean> {
    return this._isSpeaking || (await defaultDeviceVoiceProvider.isSpeaking());
  }
}

/**
 * Factory to resolve the active VoiceProvider based on user settings
 */
export function getVoiceProvider(type: VoiceProviderType = 'device'): VoiceProvider {
  if (type === 'cloud') {
    return new FutureCloudVoiceProvider();
  }
  return defaultDeviceVoiceProvider;
}
