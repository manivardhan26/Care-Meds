import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AppSettings, VoiceLanguage, VoiceGenderPreference } from '../types';
import { getSettings, saveSettings } from '../storage/medicineStorage';
import {
  selectBestVoice,
  savePreferredVoiceForLanguage,
  saveVoiceGenderPreference,
  playVoicePreview,
  stopVoicePreview,
  getPreviewSentence,
  isVoiceInstalledForLanguage,
} from '../voice';

const LANGUAGES: { code: VoiceLanguage; name: string; nativeName: string }[] = [
  { code: 'en-US', name: 'English (United States)', nativeName: 'English' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();

  const [settings, setSettings] = useState<AppSettings>({
    voiceRemindersEnabled: true,
    soundAlertsEnabled: true,
    snoozeMinutes: 15,
    isDarkMode: isDarkMode,
    voiceLanguage: 'en-US',
  });

  const [voiceAvailabilityMap, setVoiceAvailabilityMap] = useState<Record<VoiceLanguage, boolean>>({
    'en-US': true,
    'te-IN': true,
    'hi-IN': true,
  });
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [genderFallbackNotice, setGenderFallbackNotice] = useState<string | null>(null);

  // Profile modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileAgeInput, setProfileAgeInput] = useState('');

  const currentLang: VoiceLanguage = settings.voiceLanguage || 'en-US';
  const currentGender: VoiceGenderPreference = settings.voiceGender || 'female';

  const checkLanguageAvailability = useCallback(async () => {
    try {
      const results: Record<VoiceLanguage, boolean> = {
        'en-US': await isVoiceInstalledForLanguage('en-US'),
        'te-IN': await isVoiceInstalledForLanguage('te-IN'),
        'hi-IN': await isVoiceInstalledForLanguage('hi-IN'),
      };
      setVoiceAvailabilityMap(results);
    } catch (e) {
      console.warn('checkLanguageAvailability error:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      await checkLanguageAvailability();
    })();

    return () => {
      stopVoicePreview().catch(() => {});
    };
  }, [checkLanguageAvailability]);

  const update = async (patch: Partial<AppSettings>) => {
    const updated = await saveSettings(patch);
    setSettings(updated);
  };

  const handleOpenEditProfile = () => {
    setProfileNameInput(settings.patientName?.trim() || 'CareMeds Patient');
    setProfileAgeInput(settings.patientAge?.trim() || '');
    setIsEditProfileOpen(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditProfileOpen(false);
  };

  const handleSaveProfile = async () => {
    const trimmedName = profileNameInput.trim();
    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter a patient name, or use "CareMeds Patient".');
      return;
    }

    const trimmedAge = profileAgeInput.trim();
    if (trimmedAge) {
      const parsedAge = parseInt(trimmedAge, 10);
      if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 125) {
        Alert.alert(
          'Invalid Age',
          'Please enter a valid age between 1 and 125, or leave age empty.'
        );
        return;
      }
    }

    await update({
      patientName: trimmedName,
      patientAge: trimmedAge,
    });

    setIsEditProfileOpen(false);
  };

  const handleToggleDarkMode = async (val: boolean) => {
    await toggleDarkMode(val);
    setSettings((prev) => ({ ...prev, isDarkMode: val }));
  };

  const handleSelectLanguage = async (langCode: VoiceLanguage) => {
    // 1. Immediately stop any active preview or reminder speech
    await stopVoicePreview();
    setIsPlayingPreview(false);
    setGenderFallbackNotice(null);

    // 2. Automatically resolve and save the best compatible voice strictly for this language
    const voiceResult = await selectBestVoice(langCode, undefined, currentGender);
    let updated: AppSettings;
    if (voiceResult.isAvailable && voiceResult.voiceIdentifier) {
      updated = await savePreferredVoiceForLanguage(langCode, voiceResult.voiceIdentifier);
    } else {
      updated = await saveSettings({
        voiceLanguage: langCode,
        selectedVoiceIdentifier: undefined,
      });
    }

    if (voiceResult.isAvailable && voiceResult.genderMatched === false) {
      setGenderFallbackNotice(
        `${currentGender === 'male' ? 'Male' : 'Female'} voice for this language is not available on this device. Using available voice.`
      );
    } else {
      setGenderFallbackNotice(null);
    }

    setSettings(updated);
  };

  const handleSelectGender = async (gender: VoiceGenderPreference) => {
    await stopVoicePreview();
    setIsPlayingPreview(false);

    const updated = await saveVoiceGenderPreference(gender);
    setSettings(updated);

    // Check if target language supports this gender
    const voiceResult = await selectBestVoice(currentLang, undefined, gender);
    if (voiceResult.isAvailable && voiceResult.genderMatched === false) {
      setGenderFallbackNotice(
        `${gender === 'male' ? 'Male' : 'Female'} voice for this language is not available on this device. Using available voice.`
      );
    } else {
      setGenderFallbackNotice(null);
    }
  };

  const handleTogglePreview = async () => {
    if (isPlayingPreview) {
      await stopVoicePreview();
      setIsPlayingPreview(false);
      return;
    }

    const isAvailable = voiceAvailabilityMap[currentLang];
    if (!isAvailable) {
      Alert.alert(
        'Language Not Available',
        `This language is not installed on this device's speech engine. Please install it in Android Settings > Accessibility > Text-to-speech output, or select another language.`
      );
      return;
    }

    setIsPlayingPreview(true);
    const result = await playVoicePreview({
      language: currentLang,
      genderPreference: currentGender,
      onStart: () => setIsPlayingPreview(true),
      onDone: () => setIsPlayingPreview(false),
      onStopped: () => setIsPlayingPreview(false),
      onError: (err) => {
        setIsPlayingPreview(false);
        Alert.alert(
          'Preview Notice',
          'This language is not available on this device. Reminders cannot speak in this language until installed on your phone.'
        );
      },
    });

    if (result && result.isAvailable && result.genderMatched === false) {
      setGenderFallbackNotice(
        `${currentGender === 'male' ? 'Male' : 'Female'} voice for this language is not available on this device. Using available voice.`
      );
    }
  };

  const previewText = getPreviewSentence(currentLang);
  const currentLangAvailable = voiceAvailabilityMap[currentLang];

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Text style={styles.topBarTitle}>Profile & Settings</Text>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Reminders')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={34} color={isDarkMode ? colors.accentTeal : colors.primary} />
          </View>
          <View style={styles.profileInfoCol}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName} numberOfLines={1}>
                {settings.patientName?.trim() || 'CareMeds Patient'}
              </Text>
              {Boolean(settings.patientAge?.trim()) && (
                <View style={styles.ageBadge}>
                  <Text style={styles.ageBadgeText}>Age {settings.patientAge?.trim()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileSubtitle}>Senior Medication Companion</Text>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={handleOpenEditProfile}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="create-outline"
                size={14}
                color={isDarkMode ? colors.accentTeal : colors.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* General Section */}
        <Text style={styles.sectionHeader}>General</Text>
        <View style={styles.card}>
          {/* Units */}
          <TouchableOpacity
            style={styles.cardRow}
            onPress={() =>
              Alert.alert(
                'Measurement Units',
                'Metric units (mg, g, ml) are standard for prescription dosages.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="scale-outline"
                size={20}
                color={isDarkMode ? colors.accentTeal : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Units</Text>
              <Text style={styles.rowSubtitle}>Metric (g, mg, ml)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Dark Mode Toggle */}
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="moon-outline"
                size={20}
                color={isDarkMode ? colors.accentTeal : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Dark Mode / High Contrast</Text>
              <Text style={styles.rowSubtitle}>
                {isDarkMode
                  ? 'High-contrast dark slate enabled'
                  : 'Clean healthcare light enabled'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: colors.border, true: colors.primaryContainer }}
              thumbColor={isDarkMode ? colors.primary : '#FFF'}
            />
          </View>
        </View>

        {/* Voice & Audio Reminders Section (Simple, Friendly, Isolated) */}
        <Text style={styles.sectionHeader}>Voice & Audio Reminders</Text>
        <View style={styles.card}>
          {/* Spoken Voice Reminders Toggle */}
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="mic-outline"
                size={20}
                color={isDarkMode ? colors.accentTeal : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Voice Reminders</Text>
              <Text style={styles.rowSubtitle}>Read medicine guidance aloud when due</Text>
            </View>
            <Switch
              value={settings.voiceRemindersEnabled}
              onValueChange={(val) => update({ voiceRemindersEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primaryContainer }}
              thumbColor={settings.voiceRemindersEnabled ? colors.primary : '#FFF'}
            />
          </View>

          {settings.voiceRemindersEnabled && (
            <>
              <View style={styles.divider} />

              {/* Language Selection Header */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.subSectionTitle}>Reminder Language</Text>
                <Text style={styles.subSectionSubtitle}>
                  Select one language for all spoken reminders.
                </Text>
              </View>

              {/* 3 Simple Language Options (English, Telugu, Hindi) */}
              <View style={styles.langList}>
                {LANGUAGES.map((lang) => {
                  const isSelected = currentLang === lang.code;
                  const isAvailable = voiceAvailabilityMap[lang.code];

                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langCard,
                        {
                          backgroundColor: isSelected
                            ? (isDarkMode ? colors.surfaceWarm : '#E0F2F1')
                            : colors.surfaceWarm,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => handleSelectLanguage(lang.code)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.langLeft}>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={22}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <View style={{ marginLeft: 14 }}>
                          <Text style={[styles.langNativeText, { color: colors.textPrimary }]}>
                            {lang.nativeName}
                          </Text>
                          <Text style={[styles.langNameText, { color: colors.textSecondary }]}>
                            {lang.name}
                          </Text>
                        </View>
                      </View>

                      {!isAvailable && (
                        <View style={styles.unavailableBadge}>
                          <Text style={styles.unavailableBadgeText}>Not on device</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notice if the selected language is unavailable on this device */}
              {!currentLangAvailable && (
                <View style={[styles.warningNotice, { backgroundColor: isDarkMode ? '#2D2214' : '#FFF7ED', borderColor: '#F59E0B' }]}>
                  <Ionicons name="alert-circle" size={18} color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={[styles.warningNoticeText, { color: isDarkMode ? '#FDE68A' : '#92400E' }]}>
                    This language is not available on this device.
                  </Text>
                </View>
              )}

              {/* Voice Preference (Female / Male) */}
              <View style={styles.divider} />
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.subSectionTitle}>Voice Preference</Text>
                <Text style={styles.subSectionSubtitle}>
                  Choose female or male voice (if supported by your device).
                </Text>
              </View>

              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderBtn,
                    currentGender === 'female' && styles.genderBtnActive,
                    {
                      backgroundColor: currentGender === 'female'
                        ? (isDarkMode ? colors.surfaceWarm : '#E0F2F1')
                        : colors.surfaceWarm,
                      borderColor: currentGender === 'female' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelectGender('female')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={currentGender === 'female' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={currentGender === 'female' ? colors.primary : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.genderBtnText,
                      { color: currentGender === 'female' ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    Female
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderBtn,
                    currentGender === 'male' && styles.genderBtnActive,
                    {
                      backgroundColor: currentGender === 'male'
                        ? (isDarkMode ? colors.surfaceWarm : '#E0F2F1')
                        : colors.surfaceWarm,
                      borderColor: currentGender === 'male' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelectGender('male')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={currentGender === 'male' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={currentGender === 'male' ? colors.primary : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.genderBtnText,
                      { color: currentGender === 'male' ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    Male
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Informative notice if device doesn't have the requested gender */}
              {genderFallbackNotice && currentLangAvailable && (
                <View style={[styles.infoNotice, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoNoticeText, { color: colors.textSecondary }]}>
                    {genderFallbackNotice}
                  </Text>
                </View>
              )}

              {/* Single Simple Voice Preview Experience */}
              <View style={styles.divider} />
              <View style={styles.previewSection}>
                <TouchableOpacity
                  style={[
                    styles.previewButton,
                    {
                      backgroundColor: isPlayingPreview
                        ? '#DC2626'
                        : currentLangAvailable
                        ? colors.primary
                        : colors.textMuted,
                    },
                  ]}
                  onPress={handleTogglePreview}
                  activeOpacity={0.85}
                  disabled={!currentLangAvailable && !isPlayingPreview}
                >
                  <Ionicons
                    name={isPlayingPreview ? 'stop-circle' : 'volume-high'}
                    size={22}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.previewButtonText}>
                    {isPlayingPreview ? 'Stop Preview' : 'Preview Voice'}
                  </Text>
                </TouchableOpacity>

                {/* Sample phrase quote */}
                <View style={[styles.sampleQuoteBox, { backgroundColor: isDarkMode ? colors.surfaceWarm : '#F8FAFC' }]}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={[styles.sampleQuoteText, { color: colors.textPrimary }]}>
                    "{previewText}"
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* Sound & Vibrate Alerts */}
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="musical-notes-outline"
                size={20}
                color={isDarkMode ? colors.accentTeal : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Sound & Vibrate Alerts</Text>
              <Text style={styles.rowSubtitle}>Alert for scheduled dose times</Text>
            </View>
            <Switch
              value={settings.soundAlertsEnabled}
              onValueChange={(val) => update({ soundAlertsEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primaryContainer }}
              thumbColor={settings.soundAlertsEnabled ? colors.primary : '#FFF'}
            />
          </View>
        </View>

        {/* Data & Privacy */}
        <Text style={styles.sectionHeader}>Data & Privacy</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardRow}
            onPress={() =>
              Alert.alert(
                'Offline Storage',
                'All prescriptions, stock records, and adherence logs are safely stored in your local device storage with zero cloud dependency.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={isDarkMode ? colors.accentTeal : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Local Storage Status</Text>
              <Text style={styles.rowSubtitle}>Offline-First Active (Zero Cloud Dependency)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.cardRow}
            onPress={() =>
              Alert.alert(
                'About CareMeds',
                'CareMeds v1.0.0\nA caring, high-contrast, elderly-friendly medication manager with clear voice reminders.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={isDarkMode ? colors.accentTeal : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>About App</Text>
              <Text style={styles.rowSubtitle}>Version 1.0.0 • English • తెలుగు • हिन्दी</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditProfileOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEditProfile}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons
                    name="person-circle-outline"
                    size={26}
                    color={isDarkMode ? colors.accentTeal : colors.primary}
                  />
                </View>
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>
              <TouchableOpacity
                onPress={handleCancelEditProfile}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Personalize your name and optional age for your CareMeds companion.
            </Text>

            {/* Patient Name Input */}
            <Text style={styles.modalFieldLabel}>Patient Name</Text>
            <TextInput
              style={styles.modalInput}
              value={profileNameInput}
              onChangeText={setProfileNameInput}
              placeholder="e.g. Eleanor Vance"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              maxLength={50}
            />

            {/* Age Input (Optional) */}
            <Text style={styles.modalFieldLabel}>Age (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={profileAgeInput}
              onChangeText={setProfileAgeInput}
              placeholder="e.g. 74"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.modalHelpText}>
              Age is optional and stored only on this device.
            </Text>

            {/* Action Buttons: Cancel and Save */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelEditProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDarkMode: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 50,
      paddingBottom: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topBarTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: 18,
      paddingBottom: 40,
    },
    profileCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    avatarCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#E0F2F1',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    profileInfoCol: {
      flex: 1,
    },
    profileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 3,
    },
    profileName: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    ageBadge: {
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#E0F2F1',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    ageBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    profileSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EEF6F8',
      alignSelf: 'flex-start',
    },
    editProfileBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 6,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? colors.surfaceWarm : colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 18,
      lineHeight: 18,
    },
    modalFieldLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    modalInput: {
      height: 52,
      fontSize: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceWarm,
      color: colors.textPrimary,
      marginBottom: 14,
    },
    modalHelpText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -8,
      marginBottom: 20,
    },
    modalBtnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F0F4F4',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    modalSaveBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    modalSaveBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    sectionHeader: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EDF6F7',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    rowSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    subSectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    subSectionSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
    },
    langList: {
      gap: 10,
    },
    langCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    langLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    langNativeText: {
      fontSize: 17,
      fontWeight: '800',
    },
    langNameText: {
      fontSize: 12,
      marginTop: 2,
    },
    unavailableBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#2D2214' : '#FEE2E2',
    },
    unavailableBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#DC2626',
    },
    warningNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 12,
    },
    warningNoticeText: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    previewSection: {
      marginTop: 4,
    },
    previewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    previewButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    sampleQuoteBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 12,
      marginTop: 10,
    },
    sampleQuoteText: {
      fontSize: 14,
      lineHeight: 20,
      flex: 1,
      fontStyle: 'italic',
    },
    genderRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 6,
    },
    genderBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    genderBtnActive: {
      borderWidth: 2,
    },
    genderBtnText: {
      fontSize: 16,
      fontWeight: '700',
    },
    infoNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 8,
      marginBottom: 4,
    },
    infoNoticeText: {
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
      lineHeight: 18,
    },
  });
}
