import { DiscoveredVoice, VoiceLanguage, SelectedVoiceResult, VoiceGenderPreference } from './types';
import { detectDeviceVoices } from './VoiceDetection';

export { SelectedVoiceResult };

/**
 * Resolve the best available voice with STRICT language isolation.
 * A voice is NEVER returned if its language does not match targetLanguage.
 * If a male or female voice is requested but not available for that language,
 * the best available voice for that language is used with genderMatched: false,
 * and language is NEVER switched.
 */
export async function selectBestVoice(
  targetLanguage: VoiceLanguage,
  preferredVoiceIdentifier?: string,
  genderPreference?: VoiceGenderPreference
): Promise<SelectedVoiceResult> {
  const allVoices = await detectDeviceVoices();
  const normalizedTarget = targetLanguage.toLowerCase().replace('_', '-');
  const targetPrefix = targetLanguage.split('-')[0].toLowerCase(); // 'en', 'te', 'hi'

  // Filter all voices strictly for this target language prefix
  const languageVoices = allVoices.filter((v) => {
    if (!v.language) return false;
    const vLang = v.language.toLowerCase().replace('_', '-');
    return vLang.startsWith(targetPrefix);
  });

  // Sort deterministically: Enhanced first, then stable alphabetical by identifier
  // This guarantees deterministic results without random voice flipping
  const sortVoices = (list: DiscoveredVoice[]) => {
    return [...list].sort((a, b) => {
      if (a.isEnhanced !== b.isEnhanced) return a.isEnhanced ? -1 : 1;
      return a.identifier.localeCompare(b.identifier);
    });
  };

  // 1. If user previously chose a specific voice, verify it strictly belongs to this language
  // AND matches the requested gender (if genderPreference is specified)
  if (preferredVoiceIdentifier) {
    const userVoice = languageVoices.find((v) => v.identifier === preferredVoiceIdentifier);
    if (userVoice) {
      const isGenderMatch = !genderPreference || userVoice.gender === genderPreference || userVoice.gender === 'unknown';
      if (isGenderMatch) {
        return {
          isAvailable: true,
          voice: userVoice,
          voiceIdentifier: userVoice.identifier,
          language: userVoice.language || targetLanguage,
          isEnhanced: userVoice.isEnhanced,
          genderMatched: true,
          genderRequested: genderPreference,
          matchType: 'user-selected',
        };
      }
      // If userVoice is known to be a different gender than requested, bypass it and find matching gender below
    }
  }

  // Helper to pick candidate based on gender preference
  const pickCandidate = (voices: DiscoveredVoice[]) => {
    if (voices.length === 0) return null;

    if (genderPreference) {
      // Look for exact gender match
      const matchingGender = voices.filter((v) => v.gender === genderPreference);
      if (matchingGender.length > 0) {
        return { voice: sortVoices(matchingGender)[0], matched: true };
      }
      // Look for unknown gender (may be acceptable fallback)
      const unknownGender = voices.filter((v) => v.gender === 'unknown');
      if (unknownGender.length > 0) {
        return { voice: sortVoices(unknownGender)[0], matched: false };
      }
    }

    // Default fallback: best quality voice in list
    return { voice: sortVoices(voices)[0], matched: !genderPreference };
  };

  // 2. Exact locale matches (e.g. 'en-US', 'te-IN', 'hi-IN')
  const exactLocaleVoices = languageVoices.filter((v) => {
    const vLang = v.language.toLowerCase().replace('_', '-');
    return vLang === normalizedTarget;
  });

  const exactCandidate = pickCandidate(exactLocaleVoices);
  if (exactCandidate) {
    const chosen = exactCandidate.voice;
    return {
      isAvailable: true,
      voice: chosen,
      voiceIdentifier: chosen.identifier,
      language: chosen.language || targetLanguage,
      isEnhanced: chosen.isEnhanced,
      genderMatched: exactCandidate.matched,
      genderRequested: genderPreference,
      matchType: chosen.isEnhanced ? 'exact-enhanced' : 'exact-locale',
    };
  }

  // 3. Broader prefix matches (e.g. 'en-GB' if 'en-US' not present)
  const prefixCandidate = pickCandidate(languageVoices);
  if (prefixCandidate) {
    const chosen = prefixCandidate.voice;
    return {
      isAvailable: true,
      voice: chosen,
      voiceIdentifier: chosen.identifier,
      language: chosen.language || targetLanguage,
      isEnhanced: chosen.isEnhanced,
      genderMatched: prefixCandidate.matched,
      genderRequested: genderPreference,
      matchType: chosen.isEnhanced ? 'prefix-enhanced' : 'prefix-locale',
    };
  }

  // 4. No compatible voice installed on this device for this language
  // DO NOT fall back to another language's voice!
  return {
    isAvailable: false,
    language: targetLanguage,
    isEnhanced: false,
    genderMatched: false,
    genderRequested: genderPreference,
    matchType: 'unavailable',
  };
}
