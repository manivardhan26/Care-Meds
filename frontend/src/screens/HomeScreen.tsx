import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Medicine, AdherenceLog, AdherenceStatus, AppSettings } from '../types';
import { getMedicines, getAdherenceLogs, logAdherence, getSettings } from '../storage/medicineStorage';
import { evaluateExpiry } from '../utils/expirySafety';
import { speakTakenConfirmation, speakExpiryWarning } from '../utils/voiceReminder';
import { getMedicineStockInfo } from '../utils/stockUtils';
import { getLocalTodayIso } from '../utils/dateUtils';
import { scheduleSnooze, cancelMedicineNotification } from '../services/notificationService';

// Original CareMeds Companion Illustration
const COMPANION_IMAGE = require('../../assets/caremeds_companion.jpg');

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const todayIso = getLocalTodayIso();

  const loadData = useCallback(async () => {
    const [medList, logList, appSettings] = await Promise.all([
      getMedicines(),
      getAdherenceLogs(),
      getSettings(),
    ]);
    setMedicines(medList);
    setLogs(logList);
    setSettings(appSettings);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const logsForTodayMap = new Map<string, AdherenceStatus>();
  logs.forEach((log) => {
    if (log.dateString === todayIso) {
      logsForTodayMap.set(log.medicineId, log.status);
    }
  });

  const expiredMedicines = medicines.filter((m) => evaluateExpiry(m.expiryDate).state === 'EXPIRED');
  const totalCount = medicines.length;
  const takenCount = medicines.filter((m) => logsForTodayMap.get(m.id) === 'TAKEN').length;

  // Next upcoming pending dose
  const nextPendingMed = medicines.find(
    (m) => logsForTodayMap.get(m.id) !== 'TAKEN' && evaluateExpiry(m.expiryDate).state !== 'EXPIRED'
  );

  const handleAction = async (med: Medicine, status: AdherenceStatus) => {
    if (actionInProgressId === med.id) return;
    setActionInProgressId(med.id);

    try {
      const currentSettings = settings || (await getSettings());

      if (status === 'SNOOZED') {
        const snoozeMin = currentSettings.snoozeMinutes || 15;
        const { snoozeUntil } = await scheduleSnooze(med, snoozeMin, todayIso);
        const timeStr = snoozeUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        Alert.alert(
          'Dose Snoozed',
          `Rescheduled ${med.name} for ${snoozeMin} minutes (rings at ${timeStr}). Stock is unchanged.`
        );
      } else if (status === 'TAKEN') {
        await cancelMedicineNotification(med.id);
        await logAdherence(med.id, med.name, med.dosage, med.reminderTime, todayIso, 'TAKEN');
        if (currentSettings.voiceRemindersEnabled !== false) {
          speakTakenConfirmation(med.name, currentSettings.voiceLanguage || 'en-US');
        }
      } else if (status === 'SKIPPED') {
        await cancelMedicineNotification(med.id);
        await logAdherence(med.id, med.name, med.dosage, med.reminderTime, todayIso, 'SKIPPED');
      }

      await loadData();
    } catch (e) {
      console.warn('HomeScreen handleAction error:', e);
    } finally {
      setActionInProgressId(null);
    }
  };

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.appTitleRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="medkit" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>CareMeds</Text>
        </View>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Reminders')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          {expiredMedicines.length > 0 && <View style={styles.bellBadge} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Friendly Hero Banner with Original Character Illustration */}
        <View style={styles.heroCard}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroGreeting}>Hi there! 👋</Text>
            <Text style={styles.heroSubtitle}>Take your medicine on time for a better you.</Text>
            <View style={styles.heroSchedulePill}>
              <Ionicons name="calendar-outline" size={13} color={isDarkMode ? colors.accentTeal : colors.primary} />
              <Text style={styles.heroScheduleText}>
                {takenCount} of {totalCount} doses taken
              </Text>
            </View>
          </View>

          <View style={styles.heroImageCol}>
            <Image source={COMPANION_IMAGE} style={styles.companionImage} resizeMode="cover" />
          </View>
        </View>

        {/* Critical Safety Alert for Expired Medicines */}
        {expiredMedicines.length > 0 && (
          <View style={styles.expiredCard}>
            <View style={styles.expiredHeaderRow}>
              <Ionicons name="warning" size={24} color={colors.alertRed} />
              <Text style={styles.expiredTitle}>SAFETY ALERT: Expired Medicine</Text>
            </View>
            <Text style={styles.expiredWarningText}>
              This medicine has expired. Please do not consume it.
            </Text>
            <Text style={styles.expiredNamesText}>
              Affected: {expiredMedicines.map((m) => m.name).join(', ')}
            </Text>
            <TouchableOpacity
              style={styles.voiceWarningBtn}
              activeOpacity={0.8}
              onPress={() =>
                speakExpiryWarning(
                  expiredMedicines.map((m) => m.name).join(', '),
                  settings?.voiceLanguage || 'en-US'
                )
              }
            >
              <Ionicons name="volume-high" size={18} color={colors.alertRed} />
              <Text style={styles.voiceWarningBtnText}>Listen to voice alert</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Your Next Dose Card (Reference Style) */}
        {nextPendingMed ? (
          <View style={styles.nextDoseCard}>
            {/* Card Header: Clock Icon + Title + Upcoming Badge */}
            <View style={styles.nextDoseHeaderRow}>
              <View style={styles.nextDoseTitleGroup}>
                <View style={styles.clockCircle}>
                  <Ionicons name="time" size={18} color={colors.primary} />
                </View>
                <Text style={styles.nextDoseSectionTitle}>Your Next Dose</Text>
              </View>
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>Upcoming</Text>
              </View>
            </View>

            {/* Time & Day */}
            <View style={styles.nextDoseTimeRow}>
              <Text style={styles.nextDoseBigTime}>{nextPendingMed.reminderTime}</Text>
              <Text style={styles.nextDoseDayText}>Today</Text>
            </View>

            {/* Medicine Item Row */}
            <TouchableOpacity
              style={styles.nextMedRow}
              onPress={() => navigation.navigate('MedicineDetail', { medicineId: nextPendingMed.id })}
              activeOpacity={0.85}
            >
              <View style={styles.nextThumbnail}>
                {nextPendingMed.imageUri ? (
                  <Image source={{ uri: nextPendingMed.imageUri }} style={styles.nextThumbnailImg} />
                ) : (
                  <View style={[styles.nextThumbnailFallback, { backgroundColor: isDarkMode ? colors.surfaceWarm : colors.primaryContainer }]}>
                    <Ionicons name="medkit" size={22} color={isDarkMode ? colors.accentTeal : colors.primary} />
                  </View>
                )}
              </View>

              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.nextMedName} numberOfLines={1}>
                  {nextPendingMed.name}
                </Text>
                <Text style={styles.nextMedDosage}>{nextPendingMed.dosage}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Pill Tags Row */}
            <View style={styles.pillTagsRow}>
              <View style={styles.pillTag}>
                <Ionicons name="leaf-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.pillTagText}>{nextPendingMed.frequency}</Text>
              </View>
              <View style={styles.pillTag}>
                <Text style={styles.pillTagText}>Oral</Text>
              </View>
              <View style={styles.pillTag}>
                <Text style={styles.pillTagText}>{nextPendingMed.dosage}</Text>
              </View>
            </View>

            {/* Adherence Action Buttons */}
            <View style={styles.nextActionRow}>
              <TouchableOpacity
                style={styles.takeDoseBtn}
                onPress={() => handleAction(nextPendingMed, 'TAKEN')}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.takeDoseBtnText}>Mark as Taken</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.snoozeDoseBtn}
                onPress={() => handleAction(nextPendingMed, 'SNOOZED')}
                activeOpacity={0.85}
              >
                <Ionicons name="alarm-outline" size={18} color={isDarkMode ? colors.accentTeal : colors.primary} />
                <Text style={styles.snoozeDoseBtnText}>Snooze</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : totalCount > 0 && takenCount === totalCount ? (
          <View style={styles.allCompletedCard}>
            <Ionicons name="checkmark-circle" size={36} color={colors.takenGreen} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.allCompletedTitle}>All Doses Completed! 🎉</Text>
              <Text style={styles.allCompletedSubtitle}>Great job taking all your medications today.</Text>
            </View>
          </View>
        ) : null}

        {/* Keep Out of Reach of Children Warning Notice */}
        <View style={styles.warningNotice}>
          <Ionicons name="warning-outline" size={18} color={colors.warningAmber} />
          <Text style={styles.warningNoticeText}>Keep out of reach of children.</Text>
        </View>

        {/* 4 Quick Action Tiles (Reference Style) */}
        <View style={styles.quickActionsGrid}>
          {/* Tile 1: Set Reminder */}
          <TouchableOpacity
            style={[styles.quickActionTile, { backgroundColor: colors.quickActionPurpleBg }]}
            onPress={() => navigation.navigate('Reminders')}
            activeOpacity={0.85}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="notifications" size={22} color={colors.quickActionPurpleIcon} />
            </View>
            <Text style={styles.quickActionText}>Set Reminder</Text>
          </TouchableOpacity>

          {/* Tile 2: Medicine List */}
          <TouchableOpacity
            style={[styles.quickActionTile, { backgroundColor: colors.quickActionBlueBg }]}
            onPress={() => navigation.navigate('MedicineList')}
            activeOpacity={0.85}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="list" size={22} color={colors.quickActionBlueIcon} />
            </View>
            <Text style={styles.quickActionText}>Medicine List</Text>
          </TouchableOpacity>

          {/* Tile 3: Add Medicine */}
          <TouchableOpacity
            style={[styles.quickActionTile, { backgroundColor: colors.quickActionGreenBg }]}
            onPress={() => navigation.navigate('AddMedicine')}
            activeOpacity={0.85}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="add-circle" size={22} color={colors.quickActionGreenIcon} />
            </View>
            <Text style={styles.quickActionText}>Add Medicine</Text>
          </TouchableOpacity>

          {/* Tile 4: Insights */}
          <TouchableOpacity
            style={[styles.quickActionTile, { backgroundColor: colors.quickActionPinkBg }]}
            onPress={() => navigation.navigate('Insights')}
            activeOpacity={0.85}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="bar-chart" size={22} color={colors.quickActionPinkIcon} />
            </View>
            <Text style={styles.quickActionText}>Insights</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Today's Medications List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Medicines</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MedicineList')}>
            <Text style={styles.sectionLink}>View All ({medicines.length})</Text>
          </TouchableOpacity>
        </View>

        {medicines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="medical-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Medications Added</Text>
            <Text style={styles.emptySubtitle}>Tap the (+) button below or "Add Medicine" to get started.</Text>
          </View>
        ) : (
          medicines.map((med) => {
            const status = logsForTodayMap.get(med.id);
            const isTaken = status === 'TAKEN';
            const isSnoozed = status === 'SNOOZED';
            const isSkipped = status === 'SKIPPED';
            const expiry = evaluateExpiry(med.expiryDate);
            const isExpired = expiry.state === 'EXPIRED';
            const stock = getMedicineStockInfo(med);

            return (
              <TouchableOpacity
                key={med.id}
                style={[styles.medCard, isExpired && styles.medCardExpired]}
                onPress={() => navigation.navigate('MedicineDetail', { medicineId: med.id })}
                activeOpacity={0.88}
              >
                <View style={styles.medCardHeader}>
                  {/* Thumbnail */}
                  <View style={styles.medThumbnailBox}>
                    {med.imageUri ? (
                      <Image source={{ uri: med.imageUri }} style={styles.medThumbImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.medThumbFallback, { backgroundColor: isDarkMode ? colors.surfaceWarm : colors.primaryContainer }]}>
                        <Ionicons name="medkit" size={22} color={isDarkMode ? colors.accentTeal : colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.medTitleRow}>
                      <Text style={styles.medTitle} numberOfLines={1}>
                        {med.name}
                      </Text>
                      <View style={styles.medTimeBadge}>
                        <Ionicons name="time-outline" size={12} color={isDarkMode ? colors.accentTeal : colors.primary} />
                        <Text style={styles.medTimeBadgeText}>{med.reminderTime}</Text>
                      </View>
                    </View>

                    <Text style={styles.medSubtitle}>
                      {med.dosage} • {med.frequency}
                    </Text>

                    {stock.enabled && (
                      <Text
                        style={[
                          styles.medStockText,
                          stock.isOutOfStock ? styles.medStockOut : (stock.isLowStock && styles.medStockLow),
                        ]}
                      >
                        {stock.isOutOfStock
                          ? `⚠️ Out of stock (${stock.unitType})`
                          : `📦 ${stock.currentQuantity} ${stock.unitType} remaining`}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Status / Action Footer */}
                <View style={styles.medCardFooter}>
                  {isExpired ? (
                    <View style={styles.expiredBadge}>
                      <Ionicons name="warning" size={14} color={colors.alertRed} />
                      <Text style={styles.expiredBadgeText}>Expired - Do not take</Text>
                    </View>
                  ) : isTaken ? (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.takenGreen} />
                      <Text style={styles.completedBadgeText}>Completed for today</Text>
                    </View>
                  ) : (
                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity
                        style={styles.actionTakenBtn}
                        onPress={() => handleAction(med, 'TAKEN')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        <Text style={styles.actionTakenBtnText}>Taken</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionSecBtn, isSnoozed && styles.actionSecBtnActive]}
                        onPress={() => handleAction(med, 'SNOOZED')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="time-outline" size={15} color={isDarkMode ? colors.accentTeal : colors.primary} />
                        <Text style={styles.actionSecBtnText}>Snooze</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionSecBtn, isSkipped && styles.actionSecBtnActive]}
                        onPress={() => handleAction(med, 'SKIPPED')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={15} color={colors.textSecondary} />
                        <Text style={styles.actionSecBtnText}>Skip</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Prescription Camera OCR Button */}
      <TouchableOpacity
        style={styles.scanFab}
        onPress={() => navigation.navigate('Scan')}
        activeOpacity={0.88}
      >
        <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
        <Text style={styles.scanFabText}>Scan Rx</Text>
      </TouchableOpacity>
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
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    appTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.3,
    },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    bellBadge: {
      position: 'absolute',
      top: 6,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: colors.alertRed,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
    },
    heroCard: {
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    heroTextCol: {
      flex: 1,
      paddingRight: 12,
    },
    heroGreeting: {
      fontSize: 23,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    heroSchedulePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      alignSelf: 'flex-start',
      gap: 6,
    },
    heroScheduleText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    heroImageCol: {
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    companionImage: {
      width: 124,
      height: 124,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: isDarkMode ? colors.border : 'rgba(255, 255, 255, 0.8)',
    },
    expiredCard: {
      backgroundColor: colors.alertRedContainer,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.alertRed,
    },
    expiredHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    expiredTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.alertRed,
    },
    expiredWarningText: {
      fontSize: 13,
      color: colors.onAlertRedContainer,
      marginBottom: 4,
    },
    expiredNamesText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.alertRed,
      marginBottom: 10,
    },
    voiceWarningBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      alignSelf: 'flex-start',
      gap: 6,
    },
    voiceWarningBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.alertRed,
    },
    nextDoseCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    nextDoseHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    nextDoseTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    clockCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#E0F2F1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextDoseSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    upcomingBadge: {
      backgroundColor: colors.badgeUpcomingBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    upcomingBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.badgeUpcomingText,
    },
    nextDoseTimeRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 14,
    },
    nextDoseBigTime: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    nextDoseDayText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '600',
    },
    nextMedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F8FAF9',
      padding: 12,
      borderRadius: 14,
      marginBottom: 12,
    },
    nextThumbnail: {
      marginRight: 10,
    },
    nextThumbnailImg: {
      width: 44,
      height: 44,
      borderRadius: 10,
    },
    nextThumbnailFallback: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextMedName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    nextMedDosage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pillTagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    pillTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F0F4F4',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      gap: 4,
    },
    pillTagText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    nextActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    takeDoseBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.takenGreen,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    takeDoseBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    snoozeDoseBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EEF6F8',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    snoozeDoseBtnText: {
      color: isDarkMode ? colors.accentTeal : colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    allCompletedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.takenGreenContainer,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    allCompletedTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.onTakenGreenContainer,
    },
    allCompletedSubtitle: {
      fontSize: 13,
      color: colors.onTakenGreenContainer,
      marginTop: 2,
    },
    warningNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 18,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    warningNoticeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      gap: 8,
    },
    quickActionTile: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 88,
    },
    quickActionIconContainer: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255, 255, 255, 0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    quickActionText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 14,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    sectionLink: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    emptyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 10,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    medCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    medCardExpired: {
      borderColor: colors.alertRedContainer,
    },
    medCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    medThumbnailBox: {
      marginRight: 12,
    },
    medThumbImg: {
      width: 48,
      height: 48,
      borderRadius: 10,
    },
    medThumbFallback: {
      width: 48,
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    medTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    medTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 6,
    },
    medTimeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EEF6F8',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      gap: 4,
    },
    medTimeBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    medSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    medStockText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    medStockLow: {
      color: colors.warningAmber,
      fontWeight: '600',
    },
    medStockOut: {
      color: colors.alertRed,
      fontWeight: '700',
    },
    medCardFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    completedBadgeText: {
      color: colors.takenGreen,
      fontSize: 13,
      fontWeight: '700',
    },
    expiredBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    expiredBadgeText: {
      color: colors.alertRed,
      fontSize: 13,
      fontWeight: '700',
    },
    actionButtonGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    actionTakenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.takenGreen,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      gap: 4,
    },
    actionTakenBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    actionSecBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F0F4F4',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      gap: 4,
    },
    actionSecBtnActive: {
      backgroundColor: colors.warningAmberContainer,
    },
    actionSecBtnText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    scanFab: {
      position: 'absolute',
      right: 18,
      bottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 5,
    },
    scanFabText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
