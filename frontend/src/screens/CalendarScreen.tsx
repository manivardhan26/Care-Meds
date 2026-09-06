import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { AdherenceLog } from '../types';
import { getAdherenceLogs } from '../storage/medicineStorage';

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateIso, setSelectedDateIso] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [logs, setLogs] = useState<AdherenceLog[]>([]);

  const loadLogs = useCallback(async () => {
    const list = await getAdherenceLogs();
    setLogs(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
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

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Medication Calendar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Month Navigation Card */}
        <View style={styles.calendarCard}>
          <View style={styles.monthNavRow}>
            <TouchableOpacity style={styles.navButton} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>{monthName}</Text>

            <TouchableOpacity style={styles.navButton} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={26} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Row */}
          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={styles.weekDayText}>
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
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              const dayLogs = logsByDate.get(dateStr) || [];
              const hasLogs = dayLogs.length > 0;
              const allTaken = hasLogs && dayLogs.every((l) => l.status === 'TAKEN');
              const hasMissed = dayLogs.some((l) => l.status === 'MISSED' || l.status === 'SKIPPED');

              return (
                <TouchableOpacity
                  key={`day_${dayNum}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDateIso(dateStr)}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      isSelected && styles.dayNumberTextSelected,
                      isToday && !isSelected && styles.dayNumberTextToday,
                    ]}
                  >
                    {dayNum}
                  </Text>

                  {hasLogs && (
                    <View
                      style={[
                        styles.dot,
                        isSelected && { backgroundColor: '#FFF' },
                        !isSelected && allTaken && { backgroundColor: Colors.takenGreen },
                        !isSelected && hasMissed && { backgroundColor: Colors.alertRed },
                        !isSelected && !allTaken && !hasMissed && { backgroundColor: Colors.snoozeOrange },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.takenGreen }]} />
              <Text style={styles.legendText}>All Taken</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.alertRed }]} />
              <Text style={styles.legendText}>Missed / Skipped</Text>
            </View>
          </View>
        </View>

        {/* Selected Date Summary */}
        <Text style={styles.sectionTitle}>Doses for {selectedDateIso}</Text>

        {selectedLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No medication records logged for this date.</Text>
          </View>
        ) : (
          selectedLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logMedName}>{log.medicineName}</Text>
                <Text style={styles.logSubText}>
                  {log.dosage} • Scheduled: {log.scheduledTime}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  log.status === 'TAKEN' && { backgroundColor: Colors.takenGreen },
                  log.status === 'MISSED' && { backgroundColor: Colors.alertRed },
                  log.status === 'SNOOZED' && { backgroundColor: Colors.snoozeOrange },
                  log.status === 'SKIPPED' && { backgroundColor: Colors.skippedGray },
                ]}
              >
                <Text style={styles.statusBadgeText}>{log.status}</Text>
              </View>
            </View>
          ))
        )}
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
  },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    marginBottom: 20,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekDayText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayCell: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayNumberText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dayNumberTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  dayNumberTextToday: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 1,
  },
  logMedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  logSubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
