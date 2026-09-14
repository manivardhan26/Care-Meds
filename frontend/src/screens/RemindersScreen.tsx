import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Medicine, AdherenceLog, AdherenceStatus, AppSettings, SnoozeRecord } from '../types';
import {
  getMedicines,
  getAdherenceLogs,
  logAdherence,
  getSettings,
  saveSettings,
  getActiveSnoozes,
} from '../storage/medicineStorage';
import {
  scheduleSnooze,
  scheduleQuickTestReminder,
  getActiveScheduledReminders,
  cancelMedicineNotification,
  cancelAllScheduledReminders,
  ScheduledReminderItem,
} from '../services/notificationService';
import { speakTakenConfirmation, speakText, speakTestPreview } from '../utils/voiceReminder';
import { evaluateExpiry } from '../utils/expirySafety';
import { getLocalTodayIso } from '../utils/dateUtils';
import ReminderModal from '../components/ReminderModal';

const SNOOZE_OPTIONS = [1, 2, 5, 10, 15, 30];
const TEST_MINUTES = [1, 2, 5, 10];

export default function RemindersScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [activeSnoozes, setActiveSnoozes] = useState<SnoozeRecord[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledReminderItem[]>([]);
  const [selectedTestMedId, setSelectedTestMedId] = useState<string>('');
  const [testScheduleFeedback, setTestScheduleFeedback] = useState<string | null>(null);

  // Modal interaction state
  const [modalMed, setModalMed] = useState<Medicine | null>(null);
  const [modalIsSnooze, setModalIsSnooze] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [settings, setSettings] = useState<AppSettings>({
    voiceRemindersEnabled: true,
    soundAlertsEnabled: true,
    snoozeMinutes: 5,
    isDarkMode: isDarkMode,
    voiceLanguage: 'en-US',
  });

  const todayIso = getLocalTodayIso();

  const loadData = useCallback(async () => {
    const [medList, logList, appSettings, snoozes, activeScheduled] = await Promise.all([
      getMedicines(),
      getAdherenceLogs(),
      getSettings(),
      getActiveSnoozes(),
      getActiveScheduledReminders(),
    ]);

    setMedicines(medList);
    setLogs(logList);
    setSettings(appSettings);
    setActiveSnoozes(snoozes);
    setScheduledNotifications(activeScheduled);

    if (medList.length > 0 && !selectedTestMedId) {
      setSelectedTestMedId(medList[0].id);
    }
  }, [selectedTestMedId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const updated = await saveSettings(patch);
    setSettings(updated);
  };

  const logsForTodayMap = new Map<string, AdherenceStatus>();
  logs.forEach((log) => {
    if (log.dateString === todayIso) {
      logsForTodayMap.set(log.medicineId, log.status);
    }
  });

  const activeSnoozeMap = new Map<string, SnoozeRecord>();
  activeSnoozes.forEach((s) => {
    activeSnoozeMap.set(s.medicineId, s);
  });

  // Action on an individual medicine
  const handleAction = async (med: Medicine, status: AdherenceStatus) => {
    if (status === 'SNOOZED') {
      // Reschedule via notification service with zero stock deduction
      const { snoozeUntil } = await scheduleSnooze(med, settings.snoozeMinutes, todayIso);
      const timeStr = snoozeUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      Alert.alert(
        'Reminder Snoozed',
        `Rescheduled ${med.name} for ${settings.snoozeMinutes} min (rings at ${timeStr}). Stock is unchanged.`
      );
    } else if (status === 'TAKEN') {
      await cancelMedicineNotification(med.id);
      await logAdherence(med.id, med.name, med.dosage, med.reminderTime, todayIso, 'TAKEN');
      if (settings.voiceRemindersEnabled) {
        speakTakenConfirmation(med.name, settings.voiceLanguage || 'en-US');
      }
    } else if (status === 'SKIPPED') {
      await cancelMedicineNotification(med.id);
      await logAdherence(med.id, med.name, med.dosage, med.reminderTime, todayIso, 'SKIPPED');
    }

    await loadData();
  };

  // Schedule Real-Time Test Reminder
  const handleScheduleTest = async (minutes: number) => {
    const targetMed = medicines.find((m) => m.id === selectedTestMedId) || medicines[0];
    if (!targetMed) {
      Alert.alert('No Medicine', 'Please add a medicine before scheduling a test reminder.');
      return;
    }

    const { triggerDate } = await scheduleQuickTestReminder(targetMed, minutes);
    const timeFormatted = triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setTestScheduleFeedback(`✅ Reminder scheduled for ${targetMed.name} at ${timeFormatted} (in ${minutes}m).`);
    setTimeout(() => setTestScheduleFeedback(null), 5000);

    await loadData();

    Alert.alert(
      'Test Reminder Scheduled!',
      `Reminder for "${targetMed.name}" will ring at ${timeFormatted} (in ${minutes} minute${minutes > 1 ? 's' : ''}) with voice chime & modal dialog.`
    );
  };

  const handleClearAllScheduled = async () => {
    await cancelAllScheduledReminders();
    await loadData();
    Alert.alert('Cleared', 'All scheduled test reminders have been canceled.');
  };

  const handleTestChime = () => {
    speakTestPreview(settings.voiceLanguage || 'en-US');
  };

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reminders & Snooze</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={loadData}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View
          style={[
            styles.permissionBanner,
            {
              backgroundColor: colors.takenGreenContainer,
              borderColor: colors.takenGreen,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={22} color={colors.takenGreen} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.permissionBannerTitle, { color: colors.takenGreen }]}>
              Reminders & Audio Chime Active
            </Text>
            <Text style={[styles.permissionBannerSub, { color: colors.textSecondary }]}>
              Scheduled alarms trigger interactive prompts, voice guidance, and duplicate-free snooze.
            </Text>
          </View>
        </View>

        {/* ⚡ Real-Time Test Mode Section */}
        <View style={styles.testCard}>
          <View style={styles.testHeaderRow}>
            <View style={[styles.testIconBadge, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="flash" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.testCardTitle, { color: colors.textPrimary }]}>
                ⚡ Real-Time Test Mode
              </Text>
              <Text style={[styles.testCardSubtitle, { color: colors.textMuted }]}>
                Schedule a test reminder 1–10 minutes from now to verify chime & snooze
              </Text>
            </View>
          </View>

          {/* Test Medicine Selector */}
          <Text style={[styles.fieldSubLabel, { color: colors.textSecondary }]}>
            Select Medicine to Test:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medSelectorScroll}>
            {medicines.map((med) => {
              const isSelected = (selectedTestMedId || medicines[0]?.id) === med.id;
              return (
                <TouchableOpacity
                  key={med.id}
                  style={[
                    styles.medChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceWarm,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedTestMedId(med.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.medChipText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {med.name} ({med.dosage})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quick Schedule Buttons */}
          <Text style={[styles.fieldSubLabel, { color: colors.textSecondary, marginTop: 12 }]}>
            Trigger Reminder In:
          </Text>
          <View style={styles.quickScheduleRow}>
            {TEST_MINUTES.map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[styles.quickScheduleBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleScheduleTest(mins)}
                activeOpacity={0.85}
              >
                <Ionicons name="alarm" size={16} color="#FFFFFF" />
                <Text style={styles.quickScheduleBtnText}>+{mins} min</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Test Feedback Toast */}
          {testScheduleFeedback ? (
            <View style={[styles.feedbackRow, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={[styles.feedbackRowText, { color: colors.primary }]}>
                {testScheduleFeedback}
              </Text>
            </View>
          ) : null}

          {/* Active Scheduled Reminders Queue Display */}
          <View style={[styles.scheduledQueueBox, { backgroundColor: colors.surfaceWarm }]}>
            <View style={styles.queueHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time" size={16} color={colors.primary} />
                <Text style={[styles.queueTitle, { color: colors.textPrimary }]}>
                  Pending Scheduled Reminders ({scheduledNotifications.length})
                </Text>
              </View>
              {scheduledNotifications.length > 0 ? (
                <TouchableOpacity onPress={handleClearAllScheduled}>
                  <Text style={[styles.clearText, { color: colors.alertRed }]}>Clear All</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {scheduledNotifications.length === 0 ? (
              <Text style={[styles.queueEmptyText, { color: colors.textMuted }]}>
                No pending reminder triggers. Tap a +min button above to schedule.
              </Text>
            ) : (
              scheduledNotifications.map((req, idx) => {
                const d = new Date(req.triggerTimestamp);
                const triggerDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const title = req.isSnooze
                  ? `⏰ Snooze (${req.snoozeMinutes}m): ${req.medicineName}`
                  : `💊 Medication Reminder: ${req.medicineName}`;

                return (
                  <View key={req.identifier || idx} style={styles.queueItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.queueItemTitle, { color: colors.textPrimary }]}>
                        {title}
                      </Text>
                      <Text style={[styles.queueItemSub, { color: colors.textSecondary }]}>
                        ⏰ Rings: {triggerDisplay} • ID: {req.identifier.slice(0, 8)}...
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        await cancelMedicineNotification(req.medicineId);
                        await loadData();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.alertRed} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Master Reminder Alerts Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.clockIconCircle}>
              <Ionicons name="alarm" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.rowTitle}>Reminder Alerts</Text>
              <Text style={styles.rowSubtitle}>Deliver sound and heads-up notifications</Text>
            </View>
            <Switch
              value={settings.soundAlertsEnabled}
              onValueChange={(val) => updateSettings({ soundAlertsEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primaryContainer }}
              thumbColor={settings.soundAlertsEnabled ? colors.primary : '#FFF'}
            />
          </View>
        </View>

        {/* Upcoming Reminders Section */}
        <Text style={styles.sectionHeader}>Upcoming Reminders</Text>
        {medicines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No reminder schedules set yet.</Text>
          </View>
        ) : (
          medicines.map((med) => {
            const status = logsForTodayMap.get(med.id);
            const isTaken = status === 'TAKEN';
            const isSkipped = status === 'SKIPPED';
            const activeSnooze = activeSnoozeMap.get(med.id);
            const isSnoozed = !!activeSnooze;

            const expiry = evaluateExpiry(med.expiryDate);
            const isExpired = expiry.state === 'EXPIRED';

            let snoozeRemainingStr = '';
            if (activeSnooze) {
              const diffMs = activeSnooze.snoozeUntil - Date.now();
              const mins = Math.max(1, Math.round(diffMs / 60000));
              const timeStr = new Date(activeSnooze.snoozeUntil).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              snoozeRemainingStr = `Snoozed until ${timeStr} (~${mins}m left)`;
            }

            return (
              <View key={med.id} style={styles.reminderCard}>
                <View
                  style={[
                    styles.accentBar,
                    {
                      backgroundColor: isTaken
                        ? colors.takenGreen
                        : isSnoozed
                        ? colors.warningAmber
                        : colors.primary,
                    },
                  ]}
                />
                <View style={styles.reminderContent}>
                  <View style={styles.reminderTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.reminderTimeText}>{med.reminderTime}</Text>
                      <View style={styles.todayTag}>
                        <Text style={styles.todayTagText}>Today</Text>
                      </View>
                      {isSnoozed ? (
                        <View
                          style={[
                            styles.snoozeTag,
                            { backgroundColor: colors.warningAmberContainer },
                          ]}
                        >
                          <Ionicons name="alarm" size={12} color={colors.warningAmber} />
                          <Text style={[styles.snoozeTagText, { color: colors.warningAmber }]}>
                            SNOOZED
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setModalMed(med);
                        setModalIsSnooze(isSnoozed);
                        setModalVisible(true);
                      }}
                    >
                      <Ionicons
                        name="open-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.reminderMedName}>{med.name}</Text>
                  <Text style={styles.reminderDetails}>
                    {med.dosage} • {med.frequency} • Stock: {med.supplyCount ?? med.currentQuantity ?? 'N/A'}
                  </Text>

                  {/* Active Snooze Info Box */}
                  {isSnoozed ? (
                    <View style={[styles.snoozeInfoBox, { backgroundColor: colors.warningAmberContainer }]}>
                      <Ionicons name="time" size={14} color={colors.warningAmber} />
                      <Text style={[styles.snoozeInfoText, { color: colors.warningAmber }]}>
                        {snoozeRemainingStr}
                      </Text>
                    </View>
                  ) : null}

                  {isExpired ? (
                    <View style={styles.expiredNotice}>
                      <Ionicons name="warning" size={16} color={colors.alertRed} />
                      <Text style={styles.expiredNoticeText}>Medicine expired. Do not take.</Text>
                    </View>
                  ) : isTaken ? (
                    <View style={styles.takenBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.takenGreen} />
                      <Text style={styles.takenBadgeText}>Taken today</Text>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionBtnTaken}
                        onPress={() => handleAction(med, 'TAKEN')}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Taken</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionBtnSecondary,
                          isSnoozed && { backgroundColor: colors.warningAmberContainer },
                        ]}
                        onPress={() => handleAction(med, 'SNOOZED')}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name="alarm-outline"
                          size={16}
                          color={isSnoozed ? colors.warningAmber : colors.primary}
                        />
                        <Text
                          style={[
                            styles.actionBtnSecondaryText,
                            isSnoozed && { color: colors.warningAmber, fontWeight: '700' },
                          ]}
                        >
                          Snooze ({settings.snoozeMinutes}m)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtnSecondary, isSkipped && styles.actionBtnActive]}
                        onPress={() => handleAction(med, 'SKIPPED')}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close" size={16} color={colors.textSecondary} />
                        <Text style={styles.actionBtnSecondaryText}>Skip</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Reminder Sound Section */}
        <Text style={styles.sectionHeader}>Reminder Sound & Chime</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.cardRow} onPress={handleTestChime} activeOpacity={0.75}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Audio Chime / Voice</Text>
              <Text style={styles.rowSubtitle}>Tap to test reminder voice guidance</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.pillValueText}>Test 🔊</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Vibrate</Text>
              <Text style={styles.rowSubtitle}>Vibrate device on alert</Text>
            </View>
            <Switch
              value={settings.soundAlertsEnabled}
              onValueChange={(val) => updateSettings({ soundAlertsEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primaryContainer }}
              thumbColor={settings.soundAlertsEnabled ? colors.primary : '#FFF'}
            />
          </View>
        </View>

        {/* Snooze Duration Selector Section */}
        <Text style={styles.sectionHeader}>Default Snooze Duration</Text>
        <View style={styles.card}>
          <View style={styles.snoozeRow}>
            {SNOOZE_OPTIONS.map((mins) => {
              const isSelected = settings.snoozeMinutes === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={[styles.snoozeChip, isSelected && styles.snoozeChipSelected]}
                  onPress={() => updateSettings({ snoozeMinutes: mins })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.snoozeChipText, isSelected && styles.snoozeChipTextSelected]}>
                    {mins}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Reminder Action Modal */}
      <ReminderModal
        visible={modalVisible}
        medicine={modalMed}
        isSnoozed={modalIsSnooze}
        settings={settings}
        onDismiss={() => {
          setModalVisible(false);
          loadData();
        }}
        onActionComplete={() => {
          setModalVisible(false);
          loadData();
        }}
      />
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
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    permissionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 16,
      gap: 12,
    },
    permissionBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    permissionBannerSub: {
      fontSize: 12,
      marginTop: 2,
    },
    grantBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    grantBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    testCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    testHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    testIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    testCardTitle: {
      fontSize: 17,
      fontWeight: '800',
    },
    testCardSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    fieldSubLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    medSelectorScroll: {
      flexDirection: 'row',
      marginBottom: 10,
    },
    medChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      marginRight: 8,
    },
    medChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    quickScheduleRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    quickScheduleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      gap: 4,
    },
    quickScheduleBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    feedbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      gap: 6,
      marginBottom: 10,
    },
    feedbackRowText: {
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    scheduledQueueBox: {
      borderRadius: 12,
      padding: 12,
      marginTop: 4,
    },
    queueHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    queueTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    clearText: {
      fontSize: 12,
      fontWeight: '700',
    },
    queueEmptyText: {
      fontSize: 12,
      fontStyle: 'italic',
    },
    queueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    queueItemTitle: {
      fontSize: 13,
      fontWeight: '600',
    },
    queueItemSub: {
      fontSize: 11,
      marginTop: 2,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 18,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
      marginBottom: 12,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    clockIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#E0F2F1',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowTitle: {
      fontSize: 16,
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
      marginVertical: 12,
    },
    pillValueText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    reminderCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      overflow: 'hidden',
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    accentBar: {
      width: 6,
    },
    reminderContent: {
      flex: 1,
      padding: 14,
    },
    reminderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    reminderTimeText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    todayTag: {
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EEF6F8',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    todayTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    snoozeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      gap: 3,
    },
    snoozeTagText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    snoozeInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      gap: 6,
      marginBottom: 8,
    },
    snoozeInfoText: {
      fontSize: 12,
      fontWeight: '700',
    },
    reminderMedName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    reminderDetails: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    actionBtnTaken: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.takenGreen,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      gap: 4,
    },
    actionBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F0F4F4',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      gap: 4,
    },
    actionBtnActive: {
      backgroundColor: colors.warningAmberContainer,
    },
    actionBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    actionBtnSecondaryText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    takenBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.takenGreenContainer,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: 'flex-start',
      gap: 6,
    },
    takenBadgeText: {
      color: colors.takenGreen,
      fontSize: 13,
      fontWeight: '700',
    },
    expiredNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.alertRedContainer,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: 'flex-start',
      gap: 6,
    },
    expiredNoticeText: {
      color: colors.alertRed,
      fontSize: 12,
      fontWeight: '700',
    },
    emptyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: 8,
    },
    snoozeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    snoozeChip: {
      flexBasis: '30%',
      flexGrow: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F0F4F4',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    snoozeChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    snoozeChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    snoozeChipTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}
