import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Medicine, AdherenceLog, AdherenceStatus, AppSettings } from '../types';
import { getMedicines, getAdherenceLogs, logAdherence, getSettings } from '../storage/medicineStorage';
import { evaluateExpiry } from '../utils/expirySafety';
import { speakReminder, speakTakenConfirmation, speakExpiryWarning } from '../utils/voiceReminder';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const logsForTodayMap = new Map<string, AdherenceStatus>();
  logs.forEach((log) => {
    if (log.dateString === todayIso) {
      logsForTodayMap.set(log.medicineId, log.status);
    }
  });

  const expiredMedicines = medicines.filter((m) => evaluateExpiry(m.expiryDate).state === 'EXPIRED');

  const takenCount = medicines.filter((m) => logsForTodayMap.get(m.id) === 'TAKEN').length;
  const totalCount = medicines.length;

  const handleAction = async (med: Medicine, status: AdherenceStatus) => {
    await logAdherence(med.id, med.name, med.dosage, med.reminderTime, todayIso, status);
    
    // If setting enabled, speak voice confirmation in selected language (default Telugu)
    const currentSettings = settings || (await getSettings());
    if (currentSettings.voiceRemindersEnabled && status === 'TAKEN') {
      speakTakenConfirmation(med.name, currentSettings.voiceLanguage || 'te-IN');
    }
    await loadData();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{todayFormatted}</Text>
        </View>

        {/* Critical Safety Alert for Expired Medicines */}
        {expiredMedicines.length > 0 && (
          <View style={styles.expiredCard}>
            <View style={styles.expiredHeaderRow}>
              <Ionicons name="warning" size={28} color={Colors.alertRed} />
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
                  settings?.voiceLanguage || 'te-IN'
                )
              }
            >
              <Ionicons name="volume-high" size={20} color={Colors.alertRed} />
              <Text style={styles.voiceWarningBtnText}>
                {settings?.voiceLanguage === 'en-US'
                  ? 'Listen to voice alert'
                  : 'తెలుగులో హెచ్చరిక వినండి (Listen Alert)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Schedule Overview Card */}
        {totalCount > 0 && (
          <View style={styles.overviewCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overviewTitle}>Today's Schedule</Text>
              <Text style={styles.overviewSubtitle}>
                {takenCount} of {totalCount} doses taken
              </Text>
            </View>
            <View style={[styles.progressBadge, takenCount === totalCount && totalCount > 0 && styles.progressBadgeFull]}>
              <Text style={styles.progressBadgeText}>
                {takenCount}/{totalCount}
              </Text>
            </View>
          </View>
        )}

        {/* Medicines Section */}
        <Text style={styles.sectionTitle}>Medicines for Today</Text>

        {medicines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medkit-outline" size={64} color={Colors.primary} />
            <Text style={styles.emptyTitle}>No Medicines Added Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Add Medicine" button below to create your first medication reminder.
            </Text>
          </View>
        ) : (
          medicines.map((med) => {
            const status = logsForTodayMap.get(med.id) || 'UPCOMING';
            const expiry = evaluateExpiry(med.expiryDate);
            const isTaken = status === 'TAKEN';
            const isExpired = expiry.state === 'EXPIRED';

            return (
              <TouchableOpacity
                key={med.id}
                style={[
                  styles.card,
                  isExpired && styles.cardExpired,
                  isTaken && styles.cardTaken,
                ]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('MedicineDetail', { medicineId: med.id })}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDosageTime}>
                      {med.dosage} • {med.reminderTime}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.speakerBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isExpired) {
                        speakExpiryWarning(med.name, settings?.voiceLanguage || 'te-IN');
                      } else {
                        speakReminder(med.name, med.dosage, med.instructions, settings?.voiceLanguage || 'te-IN');
                      }
                    }}
                  >
                    <Ionicons name="volume-medium" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.statusBadge,
                      status === 'TAKEN' && { backgroundColor: Colors.takenGreen },
                      status === 'MISSED' && { backgroundColor: Colors.missedRed },
                      status === 'SNOOZED' && { backgroundColor: Colors.snoozeOrange },
                      status === 'SKIPPED' && { backgroundColor: Colors.skippedGray },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{status}</Text>
                  </View>
                </View>

                {/* Expiry Warning within Card */}
                {isExpired && (
                  <View style={styles.cardExpiryWarning}>
                    <Ionicons name="alert-circle" size={20} color={Colors.alertRed} />
                    <Text style={styles.cardExpiryWarningText}>
                      This medicine has expired. Please do not consume it.
                    </Text>
                  </View>
                )}

                {med.instructions ? (
                  <Text style={styles.medNote}>Note: {med.instructions}</Text>
                ) : null}

                {/* Action Buttons: Taken, Snooze, Skip */}
                {!isTaken && !isExpired && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.takenButton}
                      onPress={() => handleAction(med, 'TAKEN')}
                    >
                      <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                      <Text style={styles.takenButtonText}>Taken</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleAction(med, 'SNOOZED')}
                    >
                      <Ionicons name="alarm-outline" size={18} color={Colors.primary} />
                      <Text style={styles.secondaryButtonText}>Snooze</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleAction(med, 'SKIPPED')}
                    >
                      <Text style={styles.secondaryButtonText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isTaken && (
                  <View style={styles.completedRow}>
                    <Ionicons name="checkmark-done" size={20} color={Colors.takenGreen} />
                    <Text style={styles.completedText}>Completed for today</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Medicine Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddMedicine')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Medicine</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expiredCard: {
    backgroundColor: Colors.alertRedContainer,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.alertRed,
  },
  expiredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.onAlertRedContainer,
  },
  expiredWarningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.onAlertRedContainer,
    marginBottom: 4,
  },
  expiredNamesText: {
    fontSize: 14,
    color: Colors.onAlertRedContainer,
  },
  overviewCard: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  overviewSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  progressBadgeFull: {
    backgroundColor: Colors.takenGreen,
  },
  progressBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardExpired: {
    backgroundColor: Colors.alertRedContainer,
    borderColor: Colors.alertRed,
    borderWidth: 1,
  },
  cardTaken: {
    backgroundColor: Colors.takenGreenContainer + '66',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  medDosageTime: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardExpiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  cardExpiryWarningText: {
    color: Colors.alertRed,
    fontWeight: 'bold',
    fontSize: 13,
    flex: 1,
  },
  medNote: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  takenButton: {
    flex: 1.5,
    backgroundColor: Colors.takenGreen,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  takenButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#FFF',
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  completedText: {
    color: Colors.takenGreen,
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 58,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  fabText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  voiceWarningBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.alertRed,
  },
  voiceWarningBtnText: {
    color: Colors.alertRed,
    fontWeight: 'bold',
    fontSize: 13,
  },
  speakerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});
