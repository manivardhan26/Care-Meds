import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { saveMedicine } from '../storage/medicineStorage';
import { scheduleMedicineNotifications } from '../services/notificationService';

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00 AM' },
  { label: 'Noon', time: '12:00 PM' },
  { label: 'Evening', time: '06:00 PM' },
  { label: 'Night', time: '09:00 PM' },
];

export default function ScanReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const extracted = route.params?.extracted || {};

  const { colors, isDarkMode } = useTheme();

  const [name, setName] = useState(extracted.name || '');
  const [dosage, setDosage] = useState(extracted.dosage || '');
  const [instructions, setInstructions] = useState(extracted.instructions || '');

  // Safety rule: track if expiry was detected from OCR
  const isExpiryDetected = extracted.isExpiryDetected || Boolean(extracted.expiryDate);
  const [expiryDate, setExpiryDate] = useState(extracted.expiryDate || '');
  const [expiryConfirmed, setExpiryConfirmed] = useState(false);

  // Suggested reminder time based on instructions (e.g. morning -> 08:00 AM)
  const defaultSuggestedTime = extracted.suggestedReminderTime || '08:00 AM';
  const [reminderTime, setReminderTime] = useState(defaultSuggestedTime);
  const [frequency, setFrequency] = useState(
    (extracted.instructions || '').toLowerCase().includes('twice')
      ? 'Twice a day'
      : (extracted.instructions || '').toLowerCase().includes('three')
      ? 'Three times a day'
      : 'Once a day'
  );

  const [supplyCountStr, setSupplyCountStr] = useState(extracted.supplyCount?.toString() || '30');
  const [imageUri] = useState<string | null>(extracted.imageUri || null);

  const doSave = async (finalExpiry: string) => {
    const supply = parseInt(supplyCountStr, 10) || 30;

    const saved = await saveMedicine({
      name: name.trim(),
      dosage: dosage.trim() || '1 dose',
      instructions: instructions.trim(),
      notes: instructions.trim(),
      // Safety rule: never invent a date if not provided
      expiryDate: finalExpiry.trim(),
      frequency,
      reminderTime,
      reminderTimes: [reminderTime],
      timeOfDay: reminderTime.includes('AM') ? 'Morning' : 'Evening',
      imageUri: imageUri || null,
      supplyCount: supply,
      stockTrackingEnabled: true,
      currentQuantity: supply,
      unitType: 'tablets',
      quantityPerDose: 1,
      lowStockThreshold: 3,
    });

    await scheduleMedicineNotifications(saved);
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  const handleConfirmSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter a medicine name.');
      return;
    }

    const trimmedExpiry = expiryDate.trim();

    // Safety rule: Require user to confirm detected expiry before saving
    if (trimmedExpiry && isExpiryDetected && !expiryConfirmed) {
      Alert.alert(
        'Verify Expiry Date',
        `Detected expiry date: ${trimmedExpiry}\n\nPlease check the physical medicine packaging to ensure this date is accurate before saving.`,
        [
          { text: 'Edit Date', style: 'cancel' },
          {
            text: 'Confirm & Save',
            onPress: () => {
              setExpiryConfirmed(true);
              doSave(trimmedExpiry);
            },
          },
        ]
      );
      return;
    }

    await doSave(trimmedExpiry);
  };

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.reviewNotice}>
          Please verify the extracted details below. You can tap any field to correct it before saving.
        </Text>

        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Name</Text>
          <TextInput
            style={[styles.input, styles.inputBold]}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosage (e.g. 500mg)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instructions / Schedule</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholderTextColor={colors.textMuted}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Reminder Time (Suggested preset - user can review and change) */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Reminder Time</Text>
            <Text style={styles.subLabel}>Suggested based on instructions</Text>
          </View>
          <View style={styles.presetWrap}>
            {TIME_PRESETS.map((p) => {
              const isSelected = reminderTime === p.time;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.presetChip, isSelected && styles.presetChipActive]}
                  onPress={() => setReminderTime(p.time)}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                    {p.label} ({p.time})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 6 }]}
            placeholder="Custom Time (e.g. 08:30 AM)"
            placeholderTextColor={colors.textMuted}
            value={reminderTime}
            onChangeText={setReminderTime}
          />
        </View>

        {/* Expiry Date with Safety Indicator */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Expiry Date (YYYY-MM-DD or MM/YYYY)</Text>
            {isExpiryDetected ? (
              <View style={styles.detectedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={styles.detectedBadgeText}>Detected by OCR</Text>
              </View>
            ) : (
              <View style={styles.unclearBadge}>
                <Ionicons name="information-circle" size={12} color={colors.warningAmber || '#D97706'} />
                <Text style={styles.unclearBadgeText}>Not detected</Text>
              </View>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder={isExpiryDetected ? 'YYYY-MM-DD' : 'Leave blank or enter manually if known'}
            placeholderTextColor={colors.textMuted}
            value={expiryDate}
            onChangeText={(txt) => {
              setExpiryDate(txt);
              setExpiryConfirmed(false);
            }}
          />
          {isExpiryDetected ? (
            <Text style={styles.expiryNotice}>
              ⚠️ Detected from packaging. Please inspect the box and verify this date.
            </Text>
          ) : (
            <Text style={styles.expiryNoticeMuted}>
              No expiry date was detected on packaging. Please enter it manually if known.
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Supply Count (Pills/Capsules)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            value={supplyCountStr}
            onChangeText={setSupplyCountStr}
            keyboardType="numeric"
          />
        </View>

        {/* Confirm & Save Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSave}>
          <Ionicons name="checkmark-circle-outline" size={24} color={isDarkMode ? colors.onPrimary : '#FFF'} />
          <Text style={styles.confirmButtonText}>Confirm & Save to Meds</Text>
        </TouchableOpacity>

        {/* Retake Button */}
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.retakeButtonText}>Scan Again / Pick Another</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 54,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    reviewNotice: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 20,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      height: 54,
      paddingHorizontal: 16,
      fontSize: 18,
      color: colors.textPrimary,
    },
    inputBold: {
      fontWeight: 'bold',
      fontSize: 20,
    },
    textArea: {
      height: 80,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    confirmButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 14,
      elevation: 3,
    },
    confirmButtonText: {
      color: isDarkMode ? colors.onPrimary : '#FFF',
      fontSize: 19,
      fontWeight: 'bold',
    },
    retakeButton: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
    },
    imagePreviewContainer: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      height: 160,
      backgroundColor: colors.surfaceCard,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    retakeButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    subLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    presetWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    presetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surfaceWarm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    presetChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    presetChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    presetChipTextActive: {
      color: '#FFFFFF',
    },
    detectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDarkMode ? '#052e16' : '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    detectedBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: isDarkMode ? '#4ADE80' : '#15803D',
    },
    unclearBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDarkMode ? '#451a03' : '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    unclearBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: isDarkMode ? '#FBBF24' : '#B45309',
    },
    expiryNotice: {
      fontSize: 12,
      fontWeight: '600',
      color: isDarkMode ? '#FBBF24' : '#B45309',
      marginTop: 4,
    },
    expiryNoticeMuted: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
