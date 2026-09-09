import * as Speech from 'expo-speech';
import { VoiceLanguage } from '../types';

export async function speakReminder(
  medicineName: string,
  dosage: string,
  param3?: VoiceLanguage | string,
  param4?: VoiceLanguage | string
) {
  let instructions: string | undefined = undefined;

  if (typeof param3 === 'string' && param3 !== 'en-US' && param3 !== 'te-IN') {
    instructions = param3;
  } else if (typeof param4 === 'string' && param4 !== 'en-US' && param4 !== 'te-IN') {
    instructions = param4;
  }

  const text = `It is time to take your medicine: ${medicineName}, dosage ${dosage}. ${
    instructions ? 'Instructions: ' + instructions : ''
  }`;

  await speakText(text, 'en-US');
}

export async function speakTakenConfirmation(
  medicineName: string,
  _language: VoiceLanguage = 'en-US'
) {
  const text = `${medicineName} marked as taken. Great job taking your medication on time!`;
  await speakText(text, 'en-US');
}

export async function speakExpiryWarning(
  medicineName: string,
  _language: VoiceLanguage = 'en-US'
) {
  const text = `Warning! ${medicineName} has expired. Please do not consume it, consult your doctor or pharmacist.`;
  await speakText(text, 'en-US');
}

export async function speakText(text: string, language: VoiceLanguage = 'en-US') {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }
    Speech.speak(text, {
      rate: 0.85,
      pitch: 1.0,
      language: language === 'te-IN' ? 'en-US' : language,
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
