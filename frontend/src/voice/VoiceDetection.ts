import * as Speech from 'expo-speech';
import { DiscoveredVoice, VoiceLanguage } from './types';

let cachedDiscoveredVoices: DiscoveredVoice[] | null = null;

/**
 * Format a raw TTS voice name/identifier into a friendly display name without hardcoding
 */
function formatVoiceDisplayName(voice: Speech.Voice, index: number): string {
  const isEnhanced = voice.quality === Speech.VoiceQuality.Enhanced || (voice.quality as any) === 'Enhanced';
  const lang = voice.language || 'Unknown';

  // Extract a readable label if possible from identifier
  // e.g., "en-us-x-sfg-local" -> "Voice 1 (Local)"
  // e.g., "en-us-x-tpf-network" -> "Voice 2 (Enhanced)"
  let cleanSuffix = '';
  const rawId = (voice.identifier || voice.name || '').toLowerCase();
  
  if (rawId.includes('network')) {
    cleanSuffix = ' (Network)';
  } else if (rawId.includes('local')) {
    cleanSuffix = ' (Device)';
  }

  const qualityTag = isEnhanced ? ' [Enhanced]' : '';
  const label = `Voice ${index + 1}${cleanSuffix}${qualityTag} - ${lang}`;
  return label;
}

/**
 * Detect voice gender based on standard Android / Google TTS / iOS voice identifiers and names.
 * When cannot be determined, returns 'unknown'.
 */
export function detectVoiceGender(voice: { identifier?: string; name?: string }): 'female' | 'male' | 'unknown' {
  const text = `${voice.identifier || ''} ${voice.name || ''}`.toLowerCase();

  // 1. Explicit tokens (check 'female' before 'male' to prevent substring collision)
  if (text.includes('female') || text.includes('woman') || text.includes('femme') || text.includes('#female')) {
    return 'female';
  }
  // Check for standalone word 'male' or 'man' to avoid matching 'female'
  if (/\b(male|homme|man)\b/.test(text) || text.includes('_male') || text.includes('-male') || text.includes('#male')) {
    return 'male';
  }

  // 2. Google Speech Services (Android) voice token conventions:
  // Tokens like -sfg, -tpf, -iol map to male voices on Android
  const maleGoogleTokens = [
    '-sfg', '-tpf', '-iol', '-tef', '-sfc', '-hfe', '-lfe',
    '-dfa', '-wfb', '-cfb', '-hfc', '-gfa', '-efc', '-zfc'
  ];
  if (maleGoogleTokens.some((t) => text.includes(t))) {
    return 'male';
  }

  // Tokens like -iom, -cwm, -iob, -tem map to female voices on Android
  const femaleGoogleTokens = [
    '-iom', '-cwm', '-iob', '-tem', '-smc', '-hma', '-lma',
    '-dma', '-wmb', '-cmb', '-hmc', '-gma', '-emc', '-zmc'
  ];
  if (femaleGoogleTokens.some((t) => text.includes(t))) {
    return 'female';
  }

  // 3. Known TTS voice names (Windows SAPI, iOS AVFoundation, Android TTS packages):
  const femaleNames = [
    'zira', 'samantha', 'kavya', 'kalpana', 'ananya', 'victoria',
    'karen', 'veena', 'leela', 'geeta', 'priya', 'ayushi', 'neerja', 'swara'
  ];
  if (femaleNames.some((n) => text.includes(n))) {
    return 'female';
  }

  const maleNames = [
    'david', 'mark', 'george', 'pradeep', 'madhav', 'arun',
    'rahul', 'amit', 'ravi', 'daniel', 'oliver', 'rishi'
  ];
  if (maleNames.some((n) => text.includes(n))) {
    return 'male';
  }

  return 'unknown';
}

/**
 * Detect all voices actually installed on the Android / iOS device
 */
export async function detectDeviceVoices(forceRefresh = false): Promise<DiscoveredVoice[]> {
  if (cachedDiscoveredVoices && !forceRefresh) {
    return cachedDiscoveredVoices;
  }

  try {
    const rawVoices = await Speech.getAvailableVoicesAsync();
    if (!Array.isArray(rawVoices) || rawVoices.length === 0) {
      cachedDiscoveredVoices = [];
      return [];
    }

    const discovered: DiscoveredVoice[] = rawVoices.map((v, idx) => {
      const isEnhanced =
        v.quality === Speech.VoiceQuality.Enhanced ||
        (v.quality as any) === 'Enhanced' ||
        (typeof (v as any).quality === 'number' && (v as any).quality > 300);

      const gender = detectVoiceGender(v);

      return {
        identifier: v.identifier || v.name,
        name: v.name || v.identifier,
        quality: isEnhanced ? 'Enhanced' : 'Default',
        language: v.language || '',
        locale: v.language || '',
        isEnhanced,
        displayName: formatVoiceDisplayName(v, idx),
        gender,
      };
    });

    cachedDiscoveredVoices = discovered;
    return discovered;
  } catch (error) {
    console.warn('VoiceDetection: Failed to query available voices:', error);
    cachedDiscoveredVoices = [];
    return [];
  }
}

/**
 * Filter detected voices for a given target language (e.g. 'en-US', 'te-IN', 'hi-IN')
 */
export async function getVoicesForLanguage(
  targetLanguage: VoiceLanguage,
  forceRefresh = false
): Promise<DiscoveredVoice[]> {
  const allVoices = await detectDeviceVoices(forceRefresh);
  const langPrefix = targetLanguage.split('-')[0].toLowerCase(); // 'en', 'te', 'hi'

  // Match language prefix or full BCP-47
  return allVoices.filter((v) => {
    if (!v.language) return false;
    const vLang = v.language.toLowerCase().replace('_', '-');
    return vLang.startsWith(langPrefix);
  });
}

/**
 * Check if the device has at least one installed voice for the specified language
 */
export async function isVoiceInstalledForLanguage(
  language: VoiceLanguage,
  forceRefresh = false
): Promise<boolean> {
  const matching = await getVoicesForLanguage(language, forceRefresh);
  return matching.length > 0;
}
