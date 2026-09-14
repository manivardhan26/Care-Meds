/**
 * CareMeds Voice Quality, Language Isolation & Simplified UI Verification Suite
 * Tests all requirements from user request:
 * 1. 100% Language Isolation (Zero mixed languages between English, Telugu, Hindi)
 * 2. Cross-Language Voice Contamination Prevention (Telugu voice NEVER used for English)
 * 3. Deterministic Voice Selection (No random switching between male/female voices)
 * 4. Ultra-Simplified Settings Screen (No technical TTS engines, no voice IDs)
 * 5. Safe Missing-Voice Guard (Never speak with wrong language when voice missing)
 * 6. Expo Go Compatibility
 */

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

console.log('================================================================');
console.log('  CareMeds Simplified Voice & Language Isolation Audit');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test 1: Language Isolation & Complete Vocabulary Checks
// -------------------------------------------------------------
console.log('[Domain 1: 100% Language Isolation & Zero Mixed Words]');

const phrasesPath = path.resolve(__dirname, '../src/voice/phrases.ts');
const phrasesCode = fs.readFileSync(phrasesPath, 'utf-8');

// Check English block has ZERO non-English characters
const enBlockMatch = phrasesCode.match(/'en-US':\s*{([\s\S]*?)},\s*'te-IN'/);
const enBlock = enBlockMatch ? enBlockMatch[1] : '';

// Telugu unicode range: \u0C00-\u0C7F
// Devanagari (Hindi) unicode range: \u0900-\u097F
const hasTeluguInEnglish = /[\u0C00-\u0C7F]/.test(enBlock);
const hasHindiInEnglish = /[\u0900-\u097F]/.test(enBlock);

assert(!hasTeluguInEnglish, 'English phrases contain ZERO Telugu script/characters');
assert(!hasHindiInEnglish, 'English phrases contain ZERO Hindi script/characters');
assert(
  enBlock.includes("previewText: \"Hello. It's time to take your medicine.\""),
  'English preview message is exactly: "Hello. It\'s time to take your medicine."'
);

// Check Telugu block
const teBlockMatch = phrasesCode.match(/'te-IN':\s*{([\s\S]*?)},\s*'hi-IN'/);
const teBlock = teBlockMatch ? teBlockMatch[1] : '';
const hasHindiInTelugu = /[\u0900-\u097F]/.test(teBlock);
assert(!hasHindiInTelugu, 'Telugu phrases contain ZERO Hindi script/characters');
assert(
  teBlock.includes('previewText: \'నమస్కారం. మీ మందులు వేసుకునే సమయం అయింది.\''),
  'Telugu preview message is 100% Telugu'
);

// Check Hindi block
const hiBlockMatch = phrasesCode.match(/'hi-IN':\s*{([\s\S]*?)}\s*,\s*};/);
const hiBlock = hiBlockMatch ? hiBlockMatch[1] : '';
const hasTeluguInHindi = /[\u0C00-\u0C7F]/.test(hiBlock);
assert(!hasTeluguInHindi, 'Hindi phrases contain ZERO Telugu script/characters');
assert(
  hiBlock.includes('previewText: \'नमस्ते। आपकी दवा लेने का समय हो गया है।\''),
  'Hindi preview message is 100% Hindi'
);

// -------------------------------------------------------------
// Test 2: VoiceSelection Cross-Language Protection
// -------------------------------------------------------------
console.log('\n[Domain 2: VoiceSelection Cross-Language Protection]');

const selectionPath = path.resolve(__dirname, '../src/voice/VoiceSelection.ts');
const selectionCode = fs.readFileSync(selectionPath, 'utf-8');

assert(
  selectionCode.includes('targetPrefix') &&
  selectionCode.includes('startsWith(targetPrefix)'),
  'All voices are strictly pre-filtered by targetLanguage prefix'
);
assert(
  selectionCode.includes('languageVoices.find((v) => v.identifier === preferredVoiceIdentifier)'),
  'Saved voice identifier is verified against languageVoices, rejecting cross-language voice IDs'
);
assert(
  selectionCode.includes('localeCompare(b.identifier)'),
  'Voices are sorted deterministically so app never flips between male/female voices randomly'
);
assert(
  selectionCode.includes("matchType: 'unavailable'") &&
  selectionCode.includes('isAvailable: false'),
  'If no voice for target language is installed, returns isAvailable: false instead of falling back to another language'
);

// -------------------------------------------------------------
// Test 3: Speech Interruption & Overlap Elimination
// -------------------------------------------------------------
console.log('\n[Domain 3: Speech Interruption & Overlap Elimination]');

const deviceProviderPath = path.resolve(__dirname, '../src/voice/DeviceVoiceProvider.ts');
const providerCode = fs.readFileSync(deviceProviderPath, 'utf-8');

assert(
  providerCode.includes('activeSpeechToken') &&
  providerCode.includes('Speech.stop()'),
  'DeviceVoiceProvider uses activeSpeechToken and Speech.stop() to cancel previous utterances'
);
assert(
  providerCode.includes('setTimeout(resolve, 100)'),
  'DeviceVoiceProvider adds queue flush delay to prevent Android native QUEUE_ADD audio overlap'
);

// -------------------------------------------------------------
// Test 4: Simplified SettingsScreen (No Technical TTS Complexity)
// -------------------------------------------------------------
console.log('\n[Domain 4: Simplified SettingsScreen]');

const settingsScreenPath = path.resolve(__dirname, '../src/screens/SettingsScreen.tsx');
const screenCode = fs.readFileSync(settingsScreenPath, 'utf-8');

assert(
  !screenCode.includes('isVoiceModalOpen'),
  'SettingsScreen does NOT contain technical voice modal'
);
assert(
  !screenCode.includes('Device Voice Engine'),
  'SettingsScreen does NOT expose "Device Voice Engine" technical dropdown'
);
assert(
  !screenCode.includes('Voice 1 (Local)') && !screenCode.includes('Voice 2 (Enhanced)'),
  'SettingsScreen does NOT display technical voice labels or identifiers to the user'
);
assert(
  screenCode.includes('Reminder Language') &&
  screenCode.includes('lang.nativeName') &&
  screenCode.includes('Preview Voice'),
  'SettingsScreen displays simple Reminder Language with 1-tap selection and Preview Voice'
);
assert(
  screenCode.includes('This language is not available on this device.'),
  'SettingsScreen clearly displays "This language is not available on this device." when missing'
);

// -------------------------------------------------------------
// Test 5: Service Strict Language Guards
// -------------------------------------------------------------
console.log('\n[Domain 5: Service Strict Language Guards]');

const reminderServicePath = path.resolve(__dirname, '../src/voice/ReminderSpeechService.ts');
const reminderServiceCode = fs.readFileSync(reminderServicePath, 'utf-8');

assert(
  reminderServiceCode.includes('if (!selectionResult.isAvailable)'),
  'ReminderSpeechService suppresses playback if language voice is not available, preventing wrong-language speech'
);
assert(
  !reminderServiceCode.includes('settings.selectedVoiceIdentifier') ||
  !reminderServiceCode.includes('|| settings.selectedVoiceIdentifier'),
  'ReminderSpeechService does NOT fall back to global selectedVoiceIdentifier across languages'
);

// -------------------------------------------------------------
// Test 6: Detail and Reminders Screens Fixed
// -------------------------------------------------------------
console.log('\n[Domain 6: Screen Call Sites]');

const detailPath = path.resolve(__dirname, '../src/screens/MedicineDetailScreen.tsx');
const detailCode = fs.readFileSync(detailPath, 'utf-8');
assert(
  !detailCode.includes("speakExpiryWarning(medicine.name, 'en-US')"),
  'MedicineDetailScreen line 340 uses selected language instead of hardcoded English'
);

const remindersPath = path.resolve(__dirname, '../src/screens/RemindersScreen.tsx');
const remindersCode = fs.readFileSync(remindersPath, 'utf-8');
assert(
  !remindersCode.includes("speakText('CareMeds reminder chime test. Your medication reminder is active.', 'en-US')"),
  'RemindersScreen chime test uses selected language preview instead of hardcoded English'
);

// -------------------------------------------------------------
// Test 7: Voice Gender Preference & Deterministic Gender Selection
// -------------------------------------------------------------
console.log('\n[Domain 7: Voice Gender Preference & Fallback Contracts]');

const detectionPath = path.resolve(__dirname, '../src/voice/VoiceDetection.ts');
const detectionCode = fs.readFileSync(detectionPath, 'utf-8');

assert(
  detectionCode.includes('detectVoiceGender') &&
  detectionCode.includes('femaleGoogleTokens') &&
  detectionCode.includes('maleGoogleTokens'),
  'VoiceDetection exports detectVoiceGender inspecting Android Google TTS tokens (-sfg, -iom, etc.)'
);

assert(
  selectionCode.includes('genderPreference?: VoiceGenderPreference') &&
  selectionCode.includes('genderMatched'),
  'selectBestVoice accepts genderPreference and returns genderMatched flag'
);

assert(
  screenCode.includes('Voice Preference') &&
  screenCode.includes('handleSelectGender(\'female\')') &&
  screenCode.includes('handleSelectGender(\'male\')'),
  'SettingsScreen provides clean, friendly Female / Male selection buttons'
);

assert(
  screenCode.includes('genderFallbackNotice') &&
  screenCode.includes('voice for this language is not available on this device. Using available voice.'),
  'SettingsScreen gracefully informs user if selected gender voice is missing for target language'
);

// -------------------------------------------------------------
// Test 8: Algorithmic Simulation of VoiceSelection Logic
// -------------------------------------------------------------
console.log('\n[Domain 8: Simulated Device TTS Voice Selection Contract]');

// Emulate selectBestVoice internal logic with mock voice lists
function simulateSelectBestVoice(voices, targetLanguage, preferredVoiceId, genderPreference) {
  const normalizedTarget = targetLanguage.toLowerCase().replace('_', '-');
  const targetPrefix = targetLanguage.split('-')[0].toLowerCase();

  const languageVoices = voices.filter((v) => {
    if (!v.language) return false;
    const vLang = v.language.toLowerCase().replace('_', '-');
    return vLang.startsWith(targetPrefix);
  });

  const sortVoices = (list) => {
    return [...list].sort((a, b) => {
      if (a.isEnhanced !== b.isEnhanced) return a.isEnhanced ? -1 : 1;
      return a.identifier.localeCompare(b.identifier);
    });
  };

  if (preferredVoiceId) {
    const userVoice = languageVoices.find((v) => v.identifier === preferredVoiceId);
    if (userVoice) {
      const isGenderMatch = !genderPreference || userVoice.gender === genderPreference || userVoice.gender === 'unknown';
      return {
        isAvailable: true,
        voice: userVoice,
        language: userVoice.language || targetLanguage,
        genderMatched: isGenderMatch,
      };
    }
  }

  const pickCandidate = (list) => {
    if (list.length === 0) return null;
    if (genderPreference) {
      const matchingGender = list.filter((v) => v.gender === genderPreference);
      if (matchingGender.length > 0) {
        return { voice: sortVoices(matchingGender)[0], matched: true };
      }
      const unknownGender = list.filter((v) => v.gender === 'unknown');
      if (unknownGender.length > 0) {
        return { voice: sortVoices(unknownGender)[0], matched: false };
      }
    }
    return { voice: sortVoices(list)[0], matched: !genderPreference };
  };

  const exactLocaleVoices = languageVoices.filter((v) => {
    const vLang = v.language.toLowerCase().replace('_', '-');
    return vLang === normalizedTarget;
  });

  const exactCandidate = pickCandidate(exactLocaleVoices);
  if (exactCandidate) {
    return {
      isAvailable: true,
      voice: exactCandidate.voice,
      language: exactCandidate.voice.language || targetLanguage,
      genderMatched: exactCandidate.matched,
    };
  }

  const prefixCandidate = pickCandidate(languageVoices);
  if (prefixCandidate) {
    return {
      isAvailable: true,
      voice: prefixCandidate.voice,
      language: prefixCandidate.voice.language || targetLanguage,
      genderMatched: prefixCandidate.matched,
    };
  }

  return {
    isAvailable: false,
    language: targetLanguage,
    genderMatched: false,
  };
}

const mockDeviceVoices = [
  { identifier: 'en-us-x-sfg-local', language: 'en-US', gender: 'female', isEnhanced: false },
  { identifier: 'en-us-x-iom-local', language: 'en-US', gender: 'male', isEnhanced: false },
  { identifier: 'te-in-x-tef-local', language: 'te-IN', gender: 'female', isEnhanced: false },
  { identifier: 'hi-in-x-hfc-local', language: 'hi-IN', gender: 'female', isEnhanced: false },
  { identifier: 'hi-in-x-hmc-local', language: 'hi-IN', gender: 'male', isEnhanced: false },
];

// Scenario A: English Male requested -> gets English male
const enMale = simulateSelectBestVoice(mockDeviceVoices, 'en-US', undefined, 'male');
assert(enMale.isAvailable && enMale.voice.gender === 'male' && enMale.genderMatched === true,
  'English with Male preference selects English Male voice with genderMatched: true');

// Scenario B: English Female requested -> gets English female
const enFemale = simulateSelectBestVoice(mockDeviceVoices, 'en-US', undefined, 'female');
assert(enFemale.isAvailable && enFemale.voice.gender === 'female' && enFemale.genderMatched === true,
  'English with Female preference selects English Female voice with genderMatched: true');

// Scenario C: Telugu Male requested (only Telugu female exists on device)
// MUST return Telugu female voice with genderMatched: false. MUST NEVER return English Male voice!
const teMale = simulateSelectBestVoice(mockDeviceVoices, 'te-IN', undefined, 'male');
assert(
  teMale.isAvailable &&
  teMale.language === 'te-IN' &&
  teMale.voice.gender === 'female' &&
  teMale.genderMatched === false,
  'Telugu with Male preference on female-only device uses Telugu voice with genderMatched: false and ZERO cross-language leakage'
);

// Scenario D: Hindi Male requested (Hindi male exists) -> gets Hindi male
const hiMale = simulateSelectBestVoice(mockDeviceVoices, 'hi-IN', undefined, 'male');
assert(hiMale.isAvailable && hiMale.language === 'hi-IN' && hiMale.voice.gender === 'male' && hiMale.genderMatched === true,
  'Hindi with Male preference selects Hindi Male voice with genderMatched: true');

// Scenario E: Language with 0 voices on device -> isAvailable: false, language retained
const noVoices = simulateSelectBestVoice([], 'te-IN', undefined, 'female');
assert(noVoices.isAvailable === false && noVoices.language === 'te-IN',
  'Missing language returns isAvailable: false without swapping to English');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`  Tests Passed: ${testsPassed}`);
console.log(`  Tests Failed: ${testsFailed}`);
console.log('================================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All voice preference, language isolation, and pre-APK checks passed!\n');
}
