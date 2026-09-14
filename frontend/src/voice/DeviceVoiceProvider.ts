import * as Speech from 'expo-speech';
import { VoiceProvider, DiscoveredVoice, SpeakOptions, VoiceProviderType } from './types';
import { detectDeviceVoices } from './VoiceDetection';

export class DeviceVoiceProvider implements VoiceProvider {
  public readonly id: VoiceProviderType = 'device';
  public readonly name = 'Device Text-To-Speech (Expo)';

  private activeSpeechToken = 0;

  public async isAvailable(): Promise<boolean> {
    try {
      await Speech.isSpeakingAsync();
      return true;
    } catch {
      return false;
    }
  }

  public async getVoices(): Promise<DiscoveredVoice[]> {
    return await detectDeviceVoices();
  }

  public async speak(text: string, options?: SpeakOptions): Promise<void> {
    const currentToken = ++this.activeSpeechToken;

    try {
      // 1. Immediately stop any active speech
      await Speech.stop();

      // 2. Short pause to allow Android native TextToSpeech queue to flush
      await new Promise((resolve) => setTimeout(resolve, 100));

      // If another speech was triggered during this pause, abort this one
      if (this.activeSpeechToken !== currentToken) {
        return;
      }

      const speechOptions: Speech.SpeechOptions = {
        rate: typeof options?.rate === 'number' ? options.rate : 0.88,
        pitch: typeof options?.pitch === 'number' ? options.pitch : 1.0,
        language: options?.language || 'en-US',
      };

      if (options?.voiceId) {
        speechOptions.voice = options.voiceId;
      }

      speechOptions.onStart = () => {
        if (this.activeSpeechToken === currentToken) {
          options?.onStart?.();
        }
      };

      speechOptions.onDone = () => {
        if (this.activeSpeechToken === currentToken) {
          options?.onDone?.();
        }
      };

      speechOptions.onStopped = () => {
        if (this.activeSpeechToken === currentToken) {
          options?.onStopped?.();
        }
      };

      speechOptions.onError = (error) => {
        if (this.activeSpeechToken === currentToken) {
          options?.onError?.(error);
        }
      };

      Speech.speak(text, speechOptions);
    } catch (error) {
      console.warn('DeviceVoiceProvider speak error:', error);
      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }
    }
  }

  public async stop(): Promise<void> {
    this.activeSpeechToken++;
    try {
      await Speech.stop();
    } catch (error) {
      console.warn('DeviceVoiceProvider stop error:', error);
    }
  }

  public async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch {
      return false;
    }
  }
}

export const defaultDeviceVoiceProvider = new DeviceVoiceProvider();
