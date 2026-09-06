import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Medicine, AppSettings } from '../types';
import { getMedicines, deleteMedicine, updateSupply, getSettings } from '../storage/medicineStorage';
import { evaluateExpiry } from '../utils/expirySafety';
import { speakReminder, speakExpiryWarning, stopSpeech } from '../utils/voiceReminder';

export default function MedicineDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { medicineId } = route.params;

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const load = useCallback(async () => {
    const [meds, appSettings] = await Promise.all([getMedicines(), getSettings()]);
    const found = meds.find((m) => m.id === medicineId);
    setMedicine(found || null);
    setSettings(appSettings);
  }, [medicineId]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        stopSpeech();
        setIsSpeaking(false);
      };
    }, [load])
  );

  if (!medicine) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading medicine...</Text>
      </View>
    );
  }

  const expiry = evaluateExpiry(medicine.expiryDate);
  const isExpired = expiry.state === 'EXPIRED';

  const handlePlayVoiceGuide = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    const lang = settings?.voiceLanguage || 'te-IN';
    setIsSpeaking(true);
    if (isExpired) {
      speakExpiryWarning(medicine.name, lang);
    } else {
      speakReminder(medicine.name, medicine.dosage, medicine.instructions, lang);
    }
    setTimeout(() => setIsSpeaking(false), 6000);
  };
  const isExpiringSoon = expiry.state === 'EXPIRING_SOON';

  const handleDelete = () => {
    Alert.alert(
      `Delete ${medicine.name}?`,
      'Are you sure you want to delete this medicine and remove its reminder history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMedicine(medicine.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleAdjustSupply = async (delta: number) => {
    const newCount = Math.max(0, medicine.supplyCount + delta);
    await updateSupply(medicine.id, newCount);
    setMedicine({ ...medicine, supplyCount: newCount });
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medicine Details</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditMedicine', { medicineId: medicine.id })}
        >
          <Ionicons name="create-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Critical Expiry Warning */}
        {isExpired && (
          <View style={styles.expiredCard}>
            <View style={styles.expiredRow}>
              <Ionicons name="alert-circle" size={32} color={Colors.alertRed} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiredTitle}>SAFETY ALERT</Text>
                <Text style={styles.expiredText}>
                  This medicine has expired. Please do not consume it.
                </Text>
              </View>
            </View>
            <Text style={styles.expiredSubText}>
              Recorded Expiry Date: {medicine.expiryDate}. Please dispose of this medicine safely.
            </Text>
          </View>
        )}

        {/* Expiring Soon Notice */}
        {isExpiringSoon && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={26} color={Colors.warningAmber} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Expiring Soon</Text>
              <Text style={styles.warningText}>{expiry.message}</Text>
            </View>
          </View>
        )}

        {/* Main Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.medName}>{medicine.name}</Text>
          <Text style={styles.medDosage}>Dosage: {medicine.dosage}</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Schedule & Frequency</Text>
            <Text style={styles.detailValue}>
              {medicine.reminderTime} ({medicine.frequency})
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry Date</Text>
            <Text style={styles.detailValue}>{medicine.expiryDate}</Text>
          </View>

          {medicine.instructions ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Instructions / Notes</Text>
              <Text style={styles.detailValue}>{medicine.instructions}</Text>
            </View>
          ) : null}
        </View>

        {/* Telugu Voice Audio Guide Card */}
        <TouchableOpacity
          style={[styles.voiceGuideCard, isSpeaking && styles.voiceGuideCardActive]}
          activeOpacity={0.8}
          onPress={handlePlayVoiceGuide}
        >
          <View style={[styles.voiceGuideIcon, isSpeaking && styles.voiceGuideIconActive]}>
            <Ionicons name={isSpeaking ? 'volume-high' : 'volume-medium'} size={24} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.voiceGuideTitle}>
              {settings?.voiceLanguage === 'en-US'
                ? 'Voice Medication Guide'
                : 'తెలుగు వాయిస్ సూచనలు (Voice Guide)'}
            </Text>
            <Text style={styles.voiceGuideSubtitle}>
              {isSpeaking
                ? 'వాయిస్ సూచనలు ప్లే అవుతున్నాయి... (Speaking)'
                : settings?.voiceLanguage === 'en-US'
                ? 'Listen to dose, timing and instructions aloud'
                : 'మోతాదు, సమయం మరియు సూచనలను తెలుగులో వినండి'}
            </Text>
          </View>
          <Ionicons
            name={isSpeaking ? 'stop-circle' : 'play-circle'}
            size={32}
            color={isSpeaking ? Colors.alertRed : Colors.primary}
          />
        </TouchableOpacity>

        {/* Cabinet Supply Counter */}
        <View style={styles.supplyCard}>
          <View>
            <Text style={styles.supplyTitle}>Cabinet Supply</Text>
            <Text style={styles.supplyCountText}>
              {medicine.supplyCount} doses remaining
            </Text>
          </View>

          <View style={styles.supplyControlRow}>
            <TouchableOpacity
              style={styles.supplyButton}
              onPress={() => handleAdjustSupply(-1)}
            >
              <Ionicons name="remove" size={24} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.supplyButton, styles.supplyButtonRefill]}
              onPress={() => handleAdjustSupply(10)}
            >
              <Ionicons name="add" size={24} color="#FFF" />
              <Text style={styles.refillText}>+10</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditMedicine', { medicineId: medicine.id })}
        >
          <Ionicons name="create-outline" size={20} color="#FFF" />
          <Text style={styles.actionButtonText}>Edit Medicine Information</Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.alertRed} />
          <Text style={styles.deleteButtonText}>Delete Medicine</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  editButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  expiredCard: {
    backgroundColor: Colors.alertRedContainer,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.alertRed,
  },
  expiredRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.onAlertRedContainer,
  },
  expiredText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.onAlertRedContainer,
    marginTop: 2,
  },
  expiredSubText: {
    fontSize: 14,
    color: Colors.onAlertRedContainer,
    marginTop: 8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.warningAmberContainer,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.warningAmber,
  },
  warningText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  medName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  medDosage: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  detailRow: {
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 3,
  },
  supplyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  supplyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  supplyCountText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  supplyControlRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  supplyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplyButtonRefill: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    paddingHorizontal: 12,
    width: 'auto',
  },
  refillText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: Colors.alertRed,
  },
  deleteButtonText: {
    color: Colors.alertRed,
    fontSize: 17,
    fontWeight: 'bold',
  },
  voiceGuideCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  voiceGuideCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryContainer,
  },
  voiceGuideIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceGuideIconActive: {
    backgroundColor: Colors.accentTeal,
  },
  voiceGuideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  voiceGuideSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
