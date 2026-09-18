import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AdherenceLog, AdherenceStatus } from '../types';
import { getAdherenceLogs } from '../storage/medicineStorage';

type FilterType = 'ALL' | AdherenceStatus;

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const loadLogs = useCallback(async () => {
    const list = await getAdherenceLogs();
    setLogs(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
  );

  const filteredLogs = filter === 'ALL' ? logs : logs.filter((l) => l.status === filter);

  // Compute this week date range (Monday 00:00:00 to Sunday 23:59:59)
  const { weekStart, weekEnd, dateRangeStr } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    start.setDate(now.getDate() + distanceToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const rangeStr = `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    return { weekStart: start, weekEnd: end, dateRangeStr: rangeStr };
  }, []);

  // Filter logs for this week
  const thisWeekLogs = useMemo(() => {
    const startMs = weekStart.getTime();
    const endMs = weekEnd.getTime();
    return logs.filter((log) => {
      const ts = log.actionTimestamp ? new Date(log.actionTimestamp).getTime() : 0;
      return ts >= startMs && ts <= endMs;
    });
  }, [logs, weekStart, weekEnd]);

  // Compute actual weekly statistics from real adherence logs of this week
  const totalCount = thisWeekLogs.length;
  const takenCount = thisWeekLogs.filter((l) => l.status === 'TAKEN').length;
  const missedCount = thisWeekLogs.filter((l) => l.status === 'MISSED' || l.status === 'SKIPPED').length;
  const adherenceRate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 100;

  // Compute 7-day distribution for this week (Mon-Sun)
  const dayBuckets = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0]; // Mon to Sun
    thisWeekLogs.forEach((log) => {
      const date = new Date(log.actionTimestamp);
      const jsDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const index = jsDay === 0 ? 6 : jsDay - 1; // Map Sun to 6, Mon to 0
      if (log.status === 'TAKEN') {
        buckets[index] += 1;
      }
    });
    return buckets;
  }, [thisWeekLogs]);

  const maxDoseDay = Math.max(1, ...dayBuckets);

  // Counts for adherence history filter chips
  const totalAllTime = logs.length;
  const takenAllTime = logs.filter((l) => l.status === 'TAKEN').length;
  const notSureAllTime = logs.filter((l) => l.status === 'NOT_SURE').length;
  const missedAllTime = logs.filter((l) => l.status === 'MISSED').length;
  const skippedAllTime = logs.filter((l) => l.status === 'SKIPPED').length;
  const snoozedAllTime = logs.filter((l) => l.status === 'SNOOZED').length;

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Text style={styles.topBarTitle}>Insights</Text>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Reminders')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* This Week Overview Card (Reference Style) */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewHeaderTitle}>This Week Overview</Text>
          <Text style={styles.overviewDateRange}>{dateRangeStr}</Text>

          <View style={styles.metricColumnsRow}>
            {/* Stat 1: Taken on time */}
            <View style={styles.metricCol}>
              <Text style={styles.metricValue}>{adherenceRate}%</Text>
              <Text style={styles.metricLabel}>Taken on time</Text>
            </View>

            <View style={styles.metricDivider} />

            {/* Stat 2: Missed */}
            <View style={styles.metricCol}>
              <Text style={[styles.metricValue, { color: colors.alertRed }]}>{missedCount}</Text>
              <Text style={styles.metricLabel}>Missed</Text>
            </View>

            <View style={styles.metricDivider} />

            {/* Stat 3: Total Doses */}
            <View style={styles.metricCol}>
              <Text style={styles.metricValue}>{totalCount}</Text>
              <Text style={styles.metricLabel}>Total Doses</Text>
            </View>
          </View>
        </View>

        {/* Medicine Adherence Progress Ring Card (Reference Style) */}
        <View style={styles.adherenceCard}>
          <View style={styles.adherenceHeaderRow}>
            <Text style={styles.adherenceTitle}>Medicine Adherence</Text>
            <Text style={styles.adherenceSubtitleBadge}>This Week</Text>
          </View>

          <View style={styles.adherenceContentRow}>
            {/* Adherence Percentage Circle */}
            <View style={styles.progressRingWrapper}>
              <View style={styles.progressRingOuter}>
                <View style={styles.progressRingInner}>
                  <Text style={styles.progressPercentageText}>{adherenceRate}%</Text>
                </View>
              </View>
            </View>

            {/* Encouraging Feedback & Graphic */}
            <View style={styles.feedbackCol}>
              <Text style={styles.feedbackTitle}>
                {adherenceRate >= 80 ? 'Excellent adherence' : adherenceRate >= 50 ? 'Moderate adherence' : 'Needs attention'}
              </Text>
              <Text style={styles.feedbackSubtitle}>
                {adherenceRate >= 80
                  ? "You're taking your medicines consistently on time."
                  : 'Try to take medicines closer to scheduled reminder times.'}
              </Text>
            </View>

            <View style={styles.bottleGraphic}>
              <Ionicons name="fitness-outline" size={32} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Weekly Adherence Daily Bar Chart (Reference Style) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Adherence</Text>

          <View style={styles.barChartRow}>
            {DAYS_OF_WEEK.map((day, idx) => {
              const count = dayBuckets[idx];
              const heightPercent = maxDoseDay > 0 ? (count / maxDoseDay) * 100 : 0;
              const barHeight = Math.max(10, Math.round((heightPercent / 100) * 70));
              const isFilled = count > 0;

              return (
                <View key={day} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: barHeight,
                          backgroundColor: isFilled ? colors.takenGreen : isDarkMode ? colors.surfaceWarm : '#DAE4E5',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Detailed Adherence History Section */}
        <View style={styles.historySectionHeader}>
          <Text style={styles.historySectionTitle}>Adherence History Log</Text>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: 'ALL', label: `All (${totalAllTime})` },
            { key: 'TAKEN', label: `Taken (${takenAllTime})` },
            { key: 'SKIPPED', label: `Not Taken (${skippedAllTime})` },
            { key: 'NOT_SURE', label: `Not Sure (${notSureAllTime})` },
            { key: 'MISSED', label: `Missed (${missedAllTime})` },
            { key: 'SNOOZED', label: `Snoozed (${snoozedAllTime})` },
          ].map((item) => {
            const isActive = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(item.key as FilterType)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filtered History Log Cards */}
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="time-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyCardTitle}>No Records Found</Text>
            <Text style={styles.emptyCardSubtitle}>
              Compliance records will appear here as you respond to daily dose schedules.
            </Text>
          </View>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.actionTimestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const getStatusLabel = (status: AdherenceStatus) => {
              switch (status) {
                case 'TAKEN':
                  return 'Taken';
                case 'NOT_SURE':
                  return 'Not Sure';
                case 'SKIPPED':
                  return 'Not Taken';
                case 'MISSED':
                  return 'Missed';
                case 'SNOOZED':
                  return 'Snoozed';
                default:
                  return status;
              }
            };

            return (
              <View key={log.id} style={styles.logCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logMedName}>{log.medicineName}</Text>
                  <Text style={styles.logDetails}>
                    {log.dosage} • Scheduled: {log.scheduledTime}
                  </Text>
                  <Text style={styles.logTimestamp}>
                    {log.dateString} at {timeStr}
                  </Text>
                  {log.status === 'NOT_SURE' && (
                    <View style={styles.notSureSafetyNote}>
                      <Ionicons name="help-circle" size={13} color={colors.notSureAmber || '#D97706'} />
                      <Text style={[styles.notSureSafetyNoteText, { color: colors.notSureText || '#92400E' }]}>
                        Unverified dose • Consult pharmacist if unsure
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.logBadge,
                    log.status === 'TAKEN' && styles.logBadgeTaken,
                    log.status === 'NOT_SURE' && styles.logBadgeNotSure,
                    log.status === 'MISSED' && styles.logBadgeMissed,
                    log.status === 'SKIPPED' && styles.logBadgeSkipped,
                    log.status === 'SNOOZED' && styles.logBadgeSnoozed,
                  ]}
                >
                  <Text
                    style={[
                      styles.logBadgeText,
                      log.status === 'TAKEN' && { color: colors.takenGreen },
                      log.status === 'NOT_SURE' && { color: colors.notSureText || '#92400E' },
                      log.status === 'MISSED' && { color: colors.alertRed },
                      log.status === 'SKIPPED' && { color: isDarkMode ? '#CBD5E1' : colors.skippedGray },
                      log.status === 'SNOOZED' && { color: colors.snoozeOrange },
                    ]}
                  >
                    {getStatusLabel(log.status)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    overviewCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    overviewHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    overviewDateRange: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 16,
    },
    metricColumnsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    metricCol: {
      alignItems: 'center',
      flex: 1,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    metricDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },
    adherenceCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    adherenceHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    adherenceTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    adherenceSubtitleBadge: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    adherenceContentRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressRingWrapper: {
      marginRight: 16,
    },
    progressRingOuter: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.badgeUpcomingBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: colors.takenGreen,
    },
    progressRingInner: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressPercentageText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    feedbackCol: {
      flex: 1,
      paddingRight: 6,
    },
    feedbackTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    feedbackSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    bottleGraphic: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EEF6F8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    barChartRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 100,
      paddingHorizontal: 6,
    },
    barCol: {
      alignItems: 'center',
      flex: 1,
    },
    barTrack: {
      width: 14,
      height: 76,
      borderRadius: 7,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EEF2F2',
      justifyContent: 'flex-end',
      overflow: 'hidden',
      marginBottom: 8,
    },
    barFill: {
      width: '100%',
      borderRadius: 7,
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    historySectionHeader: {
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    historySectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    filterRow: {
      gap: 8,
      paddingBottom: 14,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.onPrimary,
    },
    logCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    logMedName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    logDetails: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    logTimestamp: {
      fontSize: 11,
      color: colors.textMuted,
    },
    logBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    logBadgeTaken: {
      backgroundColor: colors.takenGreenContainer,
    },
    logBadgeNotSure: {
      backgroundColor: colors.notSureContainer || '#FEF3C7',
    },
    logBadgeMissed: {
      backgroundColor: colors.alertRedContainer,
    },
    logBadgeSkipped: {
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#E5E7EB',
    },
    logBadgeSnoozed: {
      backgroundColor: colors.warningAmberContainer,
    },
    logBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    notSureSafetyNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    notSureSafetyNoteText: {
      fontSize: 11,
      fontWeight: '600',
    },
    emptyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 8,
      marginBottom: 4,
    },
    emptyCardSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
