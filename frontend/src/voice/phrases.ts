import { VoiceLanguage } from './types';

export interface LocalizedVoiceTemplates {
  previewText: string;
  reminder: (name: string, dose: string, timeOfDay?: string, instructions?: string) => string;
  taken: (name: string) => string;
  expiry: (name: string) => string;
  snooze: (name: string, dose: string) => string;
  test: string;
}

export const VOICE_TEMPLATES: Record<VoiceLanguage, LocalizedVoiceTemplates> = {
  'en-US': {
    previewText: "Hello. It's time to take your medicine.",
    reminder: (name: string, dose: string, timeOfDay?: string, instructions?: string) => {
      const tod = (timeOfDay || '').toLowerCase();
      let greeting = 'Hello.';
      let timePhrase = 'scheduled';

      if (tod.includes('morning')) {
        greeting = 'Good morning.';
        timePhrase = 'morning';
      } else if (tod.includes('noon') || tod.includes('afternoon')) {
        greeting = 'Good afternoon.';
        timePhrase = 'afternoon';
      } else if (tod.includes('evening')) {
        greeting = 'Good evening.';
        timePhrase = 'evening';
      } else if (tod.includes('night') || tod.includes('bedtime')) {
        greeting = 'Hello.';
        timePhrase = 'night';
      }

      const base = `${greeting} It's time to take your ${timePhrase} medicine: ${name}, dosage ${dose}.`;
      if (instructions && instructions.trim().length > 0) {
        return `${base} Please remember: ${instructions.trim()}.`;
      }
      return base;
    },
    taken: (name: string) =>
      `Great job! ${name} has been marked as taken. Thank you for staying on schedule.`,
    expiry: (name: string) =>
      `Important reminder. ${name} has expired. Please check with your pharmacist or doctor before taking it.`,
    snooze: (name: string, dose: string) =>
      `Reminder. It is time to take your snoozed medicine: ${name}, dosage ${dose}.`,
    test: "Hello. This is a voice test for CareMeds. Your medication reminders will sound like this.",
  },

  'te-IN': {
    previewText: 'నమస్కారం. మీ మందులు వేసుకునే సమయం అయింది.',
    reminder: (name: string, dose: string, timeOfDay?: string, instructions?: string) => {
      const tod = (timeOfDay || '').toLowerCase();
      let timeContext = '';
      if (tod.includes('morning')) {
        timeContext = 'ఉదయపు ';
      } else if (tod.includes('noon') || tod.includes('afternoon')) {
        timeContext = 'మధ్యాహ్న ';
      } else if (tod.includes('evening')) {
        timeContext = 'సాయంత్రపు ';
      } else if (tod.includes('night')) {
        timeContext = 'రాత్రి ';
      }

      const base = `నమస్కారం. మీ ${timeContext}మందు తీసుకునే సమయం అయింది: ${name}, మోతాదు ${dose}.`;
      if (instructions && instructions.trim().length > 0) {
        return `${base} సూచన: ${instructions.trim()}.`;
      }
      return base;
    },
    taken: (name: string) =>
      `${name} మందు తీసుకున్నట్లు నమోదు చేయబడింది. సమయానికి మందులు వేసుకుంటున్నందుకు ధన్యవాదాలు!`,
    expiry: (name: string) =>
      `హెచ్చరిక. ${name} మందు గడువు ముగిసింది. దయచేసి దీనిని ఉపయోగించవద్దు, మీ వైద్యుడిని సంప్రదించండి.`,
    snooze: (name: string, dose: string) =>
      `వాయిదా వేసిన మందు సమయం. ${name}, మోతాదు ${dose} తీసుకునే సమయం అయింది.`,
    test: 'నమస్కారం. ఇది మీ కేర్‌మెడ్స్ వాయిస్ రిమైండర్ పరీక్ష. మీ రిమైండర్ ఇలా వినిపిస్తుంది.',
  },

  'hi-IN': {
    previewText: 'नमस्ते। आपकी दवा लेने का समय हो गया है।',
    reminder: (name: string, dose: string, timeOfDay?: string, instructions?: string) => {
      const tod = (timeOfDay || '').toLowerCase();
      let timeContext = '';
      if (tod.includes('morning')) {
        timeContext = 'सुबह की ';
      } else if (tod.includes('noon') || tod.includes('afternoon')) {
        timeContext = 'दोपहर की ';
      } else if (tod.includes('evening')) {
        timeContext = 'शाम की ';
      } else if (tod.includes('night')) {
        timeContext = 'रात की ';
      }

      const base = `नमस्ते। आपकी ${timeContext}दवा लेने का समय हो गया है: ${name}, खुराक ${dose}।`;
      if (instructions && instructions.trim().length > 0) {
        return `${base} निर्देश: ${instructions.trim()}।`;
      }
      return base;
    },
    taken: (name: string) =>
      `${name} दवा ली गई के रूप में दर्ज की गई। समय पर दवा लेने के लिए बहुत बढ़िया!`,
    expiry: (name: string) =>
      `कृपया ध्यान दें। ${name} दवा की अवधि समाप्त हो चुकी है। कृपया इसका सेवन न करें और डॉक्टर से संपर्क करें।`,
    snooze: (name: string, dose: string) =>
      `याद दिला रहे हैं। ${name}, खुराक ${dose} लेने का समय हो गया है।`,
    test: 'नमस्ते। यह आपके केयरमेड्स वॉयस रिमाइंडर का परीक्षण है। आपकी आवाज ऐसी सुनाई देगी।',
  },
};
