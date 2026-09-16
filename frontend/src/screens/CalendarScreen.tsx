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
import { AdherenceLog, Medicine } from '../types';
import { getAdherenceLogs, getMedicines } from '../storage/medicineStorage';
import { getLocalTodayIso } from '../utils/dateUtils';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateIso, setSelectedDateIso] = useState(getLocalTodayIso());
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const loadData = useCallback(async () => {
    const [logList, medList] = await Promise.all([getAdherenceLogs(), getMedicines()]);
    setLogs(logList);
    setMedicines(medList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Group logs by date
  const logsByDate = new Map<string, AdherenceLog[]>();
  logs.forEach((log) => {
    const existing = logsByDate.get(log.dateString) || [];
    existing.push(log);
    logsByDate.set(log.dateString, existing);
  });

  const selectedLogs = logsByDate.get(selectedDateIso) || [];

  // Selected date formatted title
  const selectedDateParts = selectedDateIso.split('-');
  const selectedDateObj = new Date(
    parseInt(selectedDateParts[0], 10),
    parseInt(selectedDateParts[1], 10) - 1,
    parseInt(selectedDateParts[2], 10)
  );
  const isSelectedToday = selectedDateIso === getLocalTodayIso();
  const formattedSelectedHeader = `${selectedDateObj.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}${isSelectedToday ? ' (Today)' : ''}`;

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Text style={styles.topBarTitle}>Calendar</Text>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Reminders')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Month Navigation Row (Reference Style) */}
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => changeMonth(-1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.monthTitle}>{monthName}</Text>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => changeMonth(1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Day of Week Row */}
          <View style={styles.weekRow}>
            {DAY_LABELS.map((day) => (
              <Text key={day} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty_${i}`} style={styles.dayCell} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDateIso;
              const isToday = dateStr === getLocalTodayIso();

              const dayLogs = logsByDate.get(dateStr) || [];
              const hasTaken = dayLogs.some((l) => l.status === 'TAKEN');
              const hasNotSure = dayLogs.some((l) => l.status === 'NOT_SURE');
              const hasMissedOrSkipped = dayLogs.some((l) => l.status === 'MISSED' || l.status === 'SKIPPED');
              const hasSnoozed = dayLogs.some((l) => l.status === 'SNOOZED');

              let dotColor = null;
              if (hasMissedOrSkipped) {
                dotColor = colors.alertRed;
              } else if (hasNotSure) {
                dotColor = colors.notSureAmber || '#D97706';
              } else if (hasTaken) {
                dotColor = colors.takenGreen;
              } else if (hasSnoozed) {
                dotColor = colors.snoozeOrange;
              }

              return (
                <TouchableOpacity
                  key={`day_${dayNum}`}
                  style={styles.dayCell}
                  onPress={() => setSelectedDateIso(dateStr)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                      isToday && !isSelected && styles.dayCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </View>

                  {/* Adherence Dot */}
                  <View style={styles.dotContainer}>
                    {dotColor && <View style={[styles.statusDot, { backgroundColor: dotColor }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeaderRow}>
          <Text style={styles.selectedDateTitle}>{formattedSelectedHeader}</Text>
        </View>

        {/* Schedule List for Selected Date */}
        {isSelectedToday ? (
          medicines.length === 0 && selectedLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Doses Scheduled</Text>
              <Text style={styles.emptySubtitle}>You have no medicines scheduled for today.</Text>
            </View>
          ) : (
            // Merge medicines with logs for today
            medicines
              .map((med) => {
                const log = selectedLogs.find((l) => l.medicineId === med.id);
                return {
                  key: `med_${med.id}`,
                  name: med.name,
                  dosage: med.dosage,
                  time: log ? log.scheduledTime : med.reminderTime,
                  status: log ? log.status : 'UPCOMING',
                };
              })
              .concat(
                selectedLogs
                  .filter((l) => !medicines.some((m) => m.id === l.medicineId))
                  .map((l) => ({
                    key: `log_${l.id}`,
                    name: l.medicineName,
                    dosage: l.dosage,
                    time: l.scheduledTime,
                    status: l.status,
                  }))
              )
              .map((item) => {
                const isTaken = item.status === 'TAKEN';
                const isUpcoming = item.status === 'UPCOMING';
                const isNotSure = item.status === 'NOT_SURE';

                return (
                  <View key={item.key} style={styles.scheduleCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleTime}>{item.time}</Text>
                      <Text style={styles.scheduleMedName}>
                        {item.name} • {item.dosage}
                      </Text>
                    </View>

                    {isTaken ? (
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    ) : isUpcoming ? (
                      <View style={styles.pendingCircle}>
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                      </View>
                    ) : isNotSure ? (
                      <View
                        style={[
                          styles.statusTag,
                          { backgroundColor: colors.notSureContainer || '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            { color: colors.notSureText || '#92400E', fontWeight: '700' },
                          ]}
                        >
                          Not Sure
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.statusTag,
                          item.status === 'SNOOZED'
                            ? { backgroundColor: colors.snoozeOrange + '22' }
                            : item.status === 'SKIPPED'
                            ? { backgroundColor: isDarkMode ? colors.surfaceWarm : '#EDF2F4' }
                            : { backgroundColor: colors.alertRed + '22' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            item.status === 'SNOOZED'
                              ? { color: colors.snoozeOrange }
                              : item.status === 'SKIPPED'
                              ? { color: colors.textSecondary }
                              : { color: colors.alertRed },
                          ]}
                        >
                          {item.status === 'SKIPPED' ? 'Not Taken' : item.status}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
          )
        ) : selectedLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Doses Logged</Text>
            <Text style={styles.emptySubtitle}>No adherence records for this date.</Text>
          </View>
        ) : (
          selectedLogs.map((log) => {
            const isTaken = log.status === 'TAKEN';
            const isNotSure = log.status === 'NOT_SURE';

            return (
              <View key={log.id} style={styles.scheduleCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleTime}>{log.scheduledTime}</Text>
                  <Text style={styles.scheduleMedName}>
                    {log.medicineName} • {log.dosage}
                  </Text>
                </View>

                {isTaken ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                ) : isNotSure ? (
                  <View
                    style={[
                      styles.statusTag,
                      { backgroundColor: colors.notSureContainer || '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        { color: colors.notSureText || '#92400E', fontWeight: '700' },
                      ]}
                    >
                      Not Sure
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.statusTag,
                      log.status === 'SNOOZED'
                        ? { backgroundColor: colors.snoozeOrange + '22' }
                        : log.status === 'SKIPPED'
                        ? { backgroundColor: isDarkMode ? colors.surfaceWarm : '#EDF2F4' }
                        : { backgroundColor: colors.alertRed + '22' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        log.status === 'SNOOZED'
                          ? { color: colors.snoozeOrange }
                          : log.status === 'SKIPPED'
                          ? { color: colors.textSecondary }
                          : { color: colors.alertRed },
                      ]}
                    >
                      {log.status === 'SKIPPED' ? 'Not Taken' : log.status}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* + Add Medicine Link (Reference Style) */}
        <TouchableOpacity
          style={styles.addMedicineRow}
          onPress={() => navigation.navigate('AddMedicine')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={isDarkMode ? colors.accentTeal : colors.primary} />
          <Text style={styles.addMedicineText}>Add Medicine</Text>
        </TouchableOpacity>
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
    monthNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 10,
    },
    navButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    calendarCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
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
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 6,
    },
    weekDayText: {
      width: 38,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      alignItems: 'center',
      paddingVertical: 6,
    },
    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleSelected: {
      backgroundColor: colors.primary,
    },
    dayCircleToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    dayTextToday: {
      color: colors.primary,
      fontWeight: '800',
    },
    dotContainer: {
      height: 6,
      marginTop: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    dateHeaderRow: {
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    selectedDateTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    scheduleCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    scheduleTime: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    scheduleMedName: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    checkCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.takenGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    statusTag: {
      backgroundColor: colors.surfaceWarm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    emptyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 8,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    addMedicineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 6,
      marginTop: 6,
    },
    addMedicineText: {
      fontSize: 15,
      fontWeight: '700',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
  });
}
