import * as Speech from 'expo-speech';
import { VoiceLanguage } from '../types';

export interface VoiceSuggestion {
  id: string;
  category: string;
  categoryTelugu: string;
  titleTelugu: string;
  titleEnglish: string;
  teluguText: string;
  englishText: string;
}

export const TELUGU_VOICE_SUGGESTIONS: VoiceSuggestion[] = [
  {
    id: 'reminder_dose',
    category: 'రిమైండర్ (Reminder)',
    categoryTelugu: 'మందుల రిమైండర్',
    titleTelugu: 'మందులు వేసుకునే సమయం',
    titleEnglish: 'Medication Time',
    teluguText: 'ఇది మీ మందులు వేసుకునే సమయం. దయచేసి మీ మందులు సమయానికి తీసుకోండి.',
    englishText: 'It is time to take your medicine. Please take your medication on time.',
  },
  {
    id: 'taken_confirm',
    category: 'నిర్ధారణ (Confirmation)',
    categoryTelugu: 'పూర్తయిన సమాచారం',
    titleTelugu: 'మందులు వేసుకున్న నిర్ధారణ',
    titleEnglish: 'Intake Confirmation',
    teluguText: 'మందులు వేసుకున్నారు. చాలా మంచిది! మీ ఆరోగ్యం పట్ల ఎల్లప్పుడూ శ్రద్ధ వహించండి.',
    englishText: 'Medicine marked as taken. Good job! Take good care of your health.',
  },
  {
    id: 'refill_alert',
    category: 'రీఫిల్ (Refill Alert)',
    categoryTelugu: 'రీఫిల్ సమాచారం',
    titleTelugu: 'మందుల నిల్వ తక్కువగా ఉంది',
    titleEnglish: 'Low Supply Warning',
    teluguText: 'హెచ్చరిక! మీ మందుల నిల్వ త్వరలో అయిపోతుంది. దయచేసి ముందే మెడికల్ షాప్‌లో రీఫిల్ తీసుకోండి.',
    englishText: 'Warning: Your medicine supply is running low. Please get a refill soon.',
  },
  {
    id: 'expiry_warning',
    category: 'భద్రత (Safety Alert)',
    categoryTelugu: 'భద్రతా హెచ్చరిక',
    titleTelugu: 'గడువు ముగింపు హెచ్చరిక',
    titleEnglish: 'Expired Medicine Warning',
    teluguText: 'జాగ్రత్త! ఈ మందు గడువు ముగిసింది. దయచేసి దీనిని అస్సలు వాడవద్దు, డాక్టర్‌ను సంప్రదించండి.',
    englishText: 'Caution! This medicine has expired. Please do not consume it, consult your doctor.',
  },
  {
    id: 'water_tip',
    category: 'ఆరోగ్య సూచన (Health Tip)',
    categoryTelugu: 'ఆరోగ్య సలహా',
    titleTelugu: 'మంచినీరు త్రాగే సూచన',
    titleEnglish: 'Hydration Tip',
    teluguText: 'మందులు వేసుకునేటప్పుడు తగినంత మంచినీరు త్రాగడం మర్చిపోకండి.',
    englishText: 'Remember to drink plenty of water while taking your medicines.',
  },
  {
    id: 'food_instructions',
    category: 'ఆహార సూచన (Food Instruction)',
    categoryTelugu: 'ఆహార నిబంధన',
    titleTelugu: 'భోజనం తర్వాత మందులు',
    titleEnglish: 'After Meals Advice',
    teluguText: 'ఈ మందును కడుపు నిండా భోజనం లేదా అల్పాహారం తిన్న తర్వాత మాత్రమే వేసుకోవాలి.',
    englishText: 'Take this medicine only after having your meal or breakfast.',
  },
];

export async function speakReminder(
  medicineName: string,
  dosage: string,
  param3?: VoiceLanguage | string,
  param4?: VoiceLanguage | string
) {
  let language: VoiceLanguage = 'te-IN';
  let instructions: string | undefined = undefined;

  if (param3 === 'te-IN' || param3 === 'en-US') {
    language = param3;
    if (typeof param4 === 'string' && param4 !== 'te-IN' && param4 !== 'en-US') {
      instructions = param4;
    }
  } else if (typeof param3 === 'string') {
    instructions = param3;
    if (param4 === 'te-IN' || param4 === 'en-US') {
      language = param4;
    }
  } else if (param4 === 'te-IN' || param4 === 'en-US') {
    language = param4;
  }

  let text = '';
  if (language === 'te-IN') {
    text = `ఇది మీ మందు వేసుకునే సమయం: ${medicineName}, మోతాదు ${dosage}. ${instructions ? 'సూచన: ' + instructions : ''}`;
  } else {
    text = `It is time to take your medicine: ${medicineName}, dosage ${dosage}. ${instructions ? 'Instructions: ' + instructions : ''}`;
  }
  await speakText(text, language);
}

export async function speakTakenConfirmation(
  medicineName: string,
  language: VoiceLanguage = 'en-US'
) {
  let text = '';
  if (language === 'te-IN') {
    text = `${medicineName} మందు వేసుకున్నారు. చాలా మంచిది! ఆరోగ్యం పట్ల శ్రద్ధ వహించండి.`;
  } else {
    text = `${medicineName} marked as taken. Good job!`;
  }
  await speakText(text, language);
}

export async function speakExpiryWarning(
  medicineName: string,
  language: VoiceLanguage = 'en-US'
) {
  let text = '';
  if (language === 'te-IN') {
    text = `జాగ్రత్త! ${medicineName} మందు గడువు ముగిసింది. దయచేసి దీనిని వాడవద్దు!`;
  } else {
    text = `Warning! ${medicineName} has expired. Please do not consume it!`;
  }
  await speakText(text, language);
}

export async function speakText(text: string, language: VoiceLanguage = 'en-US') {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }
    Speech.speak(text, {
      rate: language === 'te-IN' ? 0.82 : 0.85,
      pitch: 1.0,
      language: language,
    });
  } catch (error) {
    console.warn('Speech error:', error);
  }
}

export async function stopSpeech() {
  try {
    await Speech.stop();
  } catch (error) {
    console.warn('Stop speech error:', error);
  }
}
