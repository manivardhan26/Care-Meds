import * as Speech from 'expo-speech';

export async function speakReminder(medicineName: string, dosage: string) {
  const text = `It is time to take your medicine: ${medicineName}, ${dosage}.`;
  await speakText(text);
}

export async function speakText(text: string) {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }
    Speech.speak(text, {
      rate: 0.85, // Friendly, slower rate tailored for elderly comprehension
      pitch: 1.0,
      language: 'en-US',
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
