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
import { AdherenceLog, AdherenceStatus } from '../types';
import { getAdherenceLogs } from '../storage/medicineStorage';

type FilterType = 'ALL' | AdherenceStatus;

export default function HistoryScreen() {
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

  const takenCount = logs.filter((l) => l.status === 'TAKEN').length;
  const missedCount = logs.filter((l) => l.status === 'MISSED').length;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Medication History</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: 'ALL', label: `All (${logs.length})` },
            { key: 'TAKEN', label: `Taken (${takenCount})` },
            { key: 'MISSED', label: `Missed (${missedCount})` },
            { key: 'SKIPPED', label: 'Skipped' },
            { key: 'SNOOZED', label: 'Snoozed' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key as FilterType)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Logs Feed */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={60} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No History Records</Text>
            <Text style={styles.emptySubtitle}>
              When you respond to daily medicine reminders, compliance history is logged here.
            </Text>
          </View>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.actionTimestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View key={log.id} style={styles.logCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{log.medicineName}</Text>
                  <Text style={styles.medDetails}>
                    {log.dosage} • Scheduled: {log.scheduledTime}
                  </Text>
                  <Text style={styles.timestamp}>
                    Date: {log.dateString} (Logged at {timeStr})
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
            );
          })
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
  filterContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
  },
  medName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  medDetails: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
