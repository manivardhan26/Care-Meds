import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medicine, AppSettings } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { scheduleSnooze, cancelMedicineNotification } from '../services/notificationService';
import { logAdherence, getSettings } from '../storage/medicineStorage';
import { speakTakenConfirmation } from '../utils/voiceReminder';
import { getLocalTodayIso } from '../utils/dateUtils';

interface ReminderModalProps {
  visible: boolean;
  medicine: Medicine | null;
  isSnoozed?: boolean;
  settings?: AppSettings;
  onDismiss: () => void;
  onActionComplete?: () => void;
}

const TEST_SNOOZE_DURATIONS = [1, 2, 5, 10, 15];

export default function ReminderModal({
  visible,
  medicine,
  isSnoozed = false,
  settings: propSettings,
  onDismiss,
  onActionComplete,
}: ReminderModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [activeSettings, setActiveSettings] = useState<AppSettings | null>(propSettings || null);
  const [selectedSnoozeMin, setSelectedSnoozeMin] = useState<number>(propSettings?.snoozeMinutes || 5);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (propSettings) {
      setActiveSettings(propSettings);
      setSelectedSnoozeMin(propSettings.snoozeMinutes || 5);
    } else {
      getSettings().then((s) => {
        setActiveSettings(s);
        setSelectedSnoozeMin(s.snoozeMinutes || 5);
      });
    }
  }, [propSettings]);

  if (!medicine) return null;

  const todayIso = getLocalTodayIso();

  const handleTaken = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Cancel any active notification for this medicine
      await cancelMedicineNotification(medicine.id);

      // 2. Log adherence as TAKEN (this automatically decrements stock exactly once in medicineStorage)
      await logAdherence(
        medicine.id,
        medicine.name,
        medicine.dosage,
        medicine.reminderTime,
        todayIso,
        'TAKEN'
      );

      // 3. Voice confirmation if enabled
      const s = activeSettings || (await getSettings());
      if (s?.voiceRemindersEnabled !== false) {
        speakTakenConfirmation(medicine.name, s?.voiceLanguage || 'en-US');
      }

      setActionFeedback('Recorded as Taken! Stock updated.');
      setTimeout(() => {
        setActionFeedback(null);
        setIsProcessing(false);
        onDismiss();
        onActionComplete?.();
      }, 1000);
    } catch (e) {
      console.warn('handleTaken error:', e);
      setIsProcessing(false);
    }
  };

  const handleSnooze = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Reschedule same dose for selected snooze duration (cancels old notification, zero stock reduction)
      const { snoozeUntil } = await scheduleSnooze(medicine, selectedSnoozeMin, todayIso);

      const timeStr = snoozeUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setActionFeedback(`Snoozed for ${selectedSnoozeMin} min (next at ${timeStr}). Stock unchanged.`);
      setTimeout(() => {
        setActionFeedback(null);
        setIsProcessing(false);
        onDismiss();
        onActionComplete?.();
      }, 1200);
    } catch (e) {
      console.warn('handleSnooze error:', e);
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Cancel notification
      await cancelMedicineNotification(medicine.id);

      // 2. Log as SKIPPED (zero stock reduction)
      await logAdherence(
        medicine.id,
        medicine.name,
        medicine.dosage,
        medicine.reminderTime,
        todayIso,
        'SKIPPED'
      );

      setActionFeedback('Dose marked as Skipped. Stock unchanged.');
      setTimeout(() => {
        setActionFeedback(null);
        setIsProcessing(false);
        onDismiss();
        onActionComplete?.();
      }, 1000);
    } catch (e) {
      console.warn('handleSkip error:', e);
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.bellIconCircle, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons
                  name={isSnoozed ? 'alarm' : 'notifications'}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.headerCategory, { color: colors.primary }]}>
                  {isSnoozed ? '⏰ SNOOZED REMINDER' : '💊 MEDICATION ALERT'}
                </Text>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                  Scheduled: {medicine.reminderTime}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Medicine Card Content */}
          <View style={[styles.detailsBox, { backgroundColor: colors.surfaceWarm }]}>
            <Text style={[styles.medName, { color: colors.textPrimary }]}>{medicine.name}</Text>
            <Text style={[styles.medDose, { color: colors.primary }]}>
              {medicine.dosage} • {medicine.frequency}
            </Text>
            {medicine.instructions ? (
              <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                📝 {medicine.instructions}
              </Text>
            ) : null}
          </View>

          {/* Action Feedback Banner */}
          {actionFeedback ? (
            <View style={[styles.feedbackBanner, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={[styles.feedbackText, { color: colors.primary }]}>{actionFeedback}</Text>
            </View>
          ) : null}

          {/* Snooze Duration Selector */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Snooze Duration:
          </Text>
          <View style={styles.chipRow}>
            {TEST_SNOOZE_DURATIONS.map((mins) => {
              const isSelected = selectedSnoozeMin === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceWarm,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSnoozeMin(mins)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {mins}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={[styles.btnTake, { backgroundColor: colors.takenGreen }]}
              onPress={handleTaken}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.btnTakeText}>Take Now (Update Stock)</Text>
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={[
                  styles.btnSecondary,
                  { backgroundColor: colors.surfaceWarm, borderColor: colors.primary },
                ]}
                onPress={handleSnooze}
                activeOpacity={0.85}
              >
                <Ionicons name="alarm-outline" size={18} color={colors.primary} />
                <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>
                  Snooze ({selectedSnoozeMin}m)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnSecondary,
                  { backgroundColor: colors.surfaceWarm, borderColor: colors.border },
                ]}
                onPress={handleSkip}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
                <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>
                  Skip Dose
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: Dimensions.get('window').width - 40,
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bellIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCategory: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  detailsBox: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
  },
  medName: {
    fontSize: 20,
    fontWeight: '700',
  },
  medDose: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  instructionsText: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonsCol: {
    gap: 10,
  },
  btnTake: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnTakeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
