import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { AppSettings } from '../types';
import { getSettings, saveSettings } from '../storage/medicineStorage';
import { speakText, TELUGU_VOICE_SUGGESTIONS } from '../utils/voiceReminder';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    voiceRemindersEnabled: true,
    soundAlertsEnabled: true,
    snoozeMinutes: 15,
    isDarkMode: false,
  });

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
    })();
  }, []);

  const update = async (patch: Partial<AppSettings>) => {
    const updated = await saveSettings(patch);
    setSettings(updated);
  };

  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleTestVoice = () => {
    if (settings.voiceLanguage === 'te-IN') {
      speakText('ఇది కేర్‌మెడ్స్ వాయిస్ రిమైండర్ పరీక్ష. మీరు ఈరోజు మీ మందులు వేసుకున్నారా?', 'te-IN');
    } else {
      speakText('This is a test of your CareMeds voice reminder. Have you taken your medicine today?', 'en-US');
    }
  };

  const handlePlaySuggestion = async (suggestion: any) => {
    setPlayingId(suggestion.id);
    await speakText(suggestion.teluguText, 'te-IN');
    setTimeout(() => {
      setPlayingId(null);
    }, 4500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Voice Reminders Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="mic" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Spoken Voice Reminders</Text>
              <Text style={styles.rowSubtitle}>Read reminders aloud when due</Text>
            </View>
            <Switch
              value={settings.voiceRemindersEnabled}
              onValueChange={(val) => update({ voiceRemindersEnabled: val })}
              trackColor={{ false: Colors.border, true: Colors.primaryContainer }}
              thumbColor={settings.voiceRemindersEnabled ? Colors.primary : '#FFF'}
            />
          </View>

          {settings.voiceRemindersEnabled && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subLabel}>Voice Language (వాయిస్ భాష)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.snoozeChip,
                    (settings.voiceLanguage === 'te-IN' || !settings.voiceLanguage) && styles.snoozeChipActive,
                  ]}
                  onPress={() => update({ voiceLanguage: 'te-IN' })}
                >
                  <Text
                    style={[
                      styles.snoozeChipText,
                      (settings.voiceLanguage === 'te-IN' || !settings.voiceLanguage) && styles.snoozeChipTextActive,
                    ]}
                  >
                    తెలుగు (Telugu)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.snoozeChip,
                    settings.voiceLanguage === 'en-US' && styles.snoozeChipActive,
                  ]}
                  onPress={() => update({ voiceLanguage: 'en-US' })}
                >
                  <Text
                    style={[
                      styles.snoozeChipText,
                      settings.voiceLanguage === 'en-US' && styles.snoozeChipTextActive,
                    ]}
                  >
                    English
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.testVoiceButton} onPress={handleTestVoice}>
                <Ionicons name="volume-high-outline" size={20} color={Colors.primary} />
                <Text style={styles.testVoiceText}>
                  {settings.voiceLanguage === 'te-IN' ? 'వాయిస్ రిమైండర్ పరీక్షించండి (Test Telugu Voice)' : 'Test Voice Reminder'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Telugu Voice Suggestions Card */}
        {settings.voiceRemindersEnabled && (
          <View style={styles.card}>
            <View style={styles.suggestionsHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>తెలుగు వాయిస్ సూచనలు</Text>
                <Text style={styles.rowSubtitle}>Telugu Voice Prompts & Suggestions</Text>
              </View>
            </View>

            <Text style={styles.suggestionsTip}>
              మందుల సమయం, ధ్రువీకరణ, రీఫిల్ మరియు ఆరోగ్య సూచనల ఆడియో వినడానికి క్రింది బటన్ నొక్కండి:
            </Text>

            <View style={styles.suggestionsList}>
              {TELUGU_VOICE_SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.suggestionCard,
                    playingId === item.id && styles.suggestionCardActive,
                  ]}
                  onPress={() => handlePlaySuggestion(item)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.suggestionTagRow}>
                      <Text style={styles.suggestionCategory}>{item.categoryTelugu}</Text>
                      <Text style={styles.suggestionTitleEn}>• {item.titleEnglish}</Text>
                    </View>
                    <Text style={styles.suggestionTeluguText}>{item.teluguText}</Text>
                    <Text style={styles.suggestionEnglishText}>{item.englishText}</Text>
                  </View>
                  <View
                    style={[
                      styles.playIconButton,
                      playingId === item.id && styles.playIconButtonActive,
                    ]}
                  >
                    <Ionicons
                      name={playingId === item.id ? 'volume-high' : 'volume-medium-outline'}
                      size={22}
                      color={playingId === item.id ? '#FFF' : Colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Timing & Alerts Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Alerts & Timing</Text>

          <View style={[styles.cardRow, { marginBottom: 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Sound & Vibrate Alerts</Text>
              <Text style={styles.rowSubtitle}>Play audio tone for scheduled doses</Text>
            </View>
            <Switch
              value={settings.soundAlertsEnabled}
              onValueChange={(val) => update({ soundAlertsEnabled: val })}
              trackColor={{ false: Colors.border, true: Colors.primaryContainer }}
              thumbColor={settings.soundAlertsEnabled ? Colors.primary : '#FFF'}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.subLabel}>Snooze Duration</Text>
          <View style={styles.chipRow}>
            {[10, 15, 30].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.snoozeChip,
                  settings.snoozeMinutes === mins && styles.snoozeChipActive,
                ]}
                onPress={() => update({ snoozeMinutes: mins })}
              >
                <Text
                  style={[
                    styles.snoozeChipText,
                    settings.snoozeMinutes === mins && styles.snoozeChipTextActive,
                  ]}
                >
                  {mins} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Display & Appearance Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Appearance & Accessibility</Text>

          <View style={[styles.cardRow, { marginBottom: 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>High Contrast / Dark Mode</Text>
              <Text style={styles.rowSubtitle}>Easier on the eyes in dim lighting</Text>
            </View>
            <Switch
              value={settings.isDarkMode}
              onValueChange={(val) => update({ isDarkMode: val })}
              trackColor={{ false: Colors.border, true: Colors.primaryContainer }}
              thumbColor={settings.isDarkMode ? Colors.primary : '#FFF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.rowTitle}>Language</Text>
            <Text style={styles.langValue}>English (Default)</Text>
          </View>
        </View>

        {/* Healthcare Disclaimer */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
            <Text style={styles.disclaimerTitle}>Healthcare Notice</Text>
          </View>
          <Text style={styles.disclaimerText}>
            CareMeds is a personal medication-management assistant only. It never diagnoses conditions,
            recommends medications, or changes dosage. Always consult your doctor or pharmacist.
          </Text>
          <Text style={styles.versionText}>CareMeds v1.0 • Built with Care</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    elevation: 1,
  },
  cardSectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  testVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    height: 46,
    marginTop: 14,
  },
  testVoiceText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  subLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  snoozeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  snoozeChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  snoozeChipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  snoozeChipTextActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  langValue: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  disclaimerCard: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 16,
    padding: 18,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  disclaimerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  versionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: 'bold',
    marginTop: 10,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  suggestionsTip: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  suggestionTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  suggestionCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  suggestionTitleEn: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  suggestionTeluguText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    lineHeight: 22,
    marginVertical: 2,
  },
  suggestionEnglishText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  playIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
