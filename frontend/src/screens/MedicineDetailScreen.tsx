import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Medicine, AppSettings } from '../types';
import { getMedicines, deleteMedicine, updateSupply, saveMedicine, getSettings } from '../storage/medicineStorage';
import { evaluateExpiry } from '../utils/expirySafety';
import { speakReminder, speakExpiryWarning, stopSpeech } from '../utils/voiceReminder';
import { getMedicineStockInfo } from '../utils/stockUtils';
import { cancelMedicineNotification } from '../services/notificationService';

const UNIT_OPTIONS = ['tablets', 'capsules', 'ml', 'drops', 'puffs', 'units'];

export default function MedicineDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { medicineId } = route.params;

  const { colors, isDarkMode } = useTheme();

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Stock update modal state
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [editQuantityStr, setEditQuantityStr] = useState('0');
  const [editUnitType, setEditUnitType] = useState('tablets');
  const [editThresholdStr, setEditThresholdStr] = useState('3');
  const [editQtyPerDoseStr, setEditQtyPerDoseStr] = useState('1');

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

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  if (!medicine) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading medicine...</Text>
      </View>
    );
  }

  const expiry = evaluateExpiry(medicine.expiryDate);
  const isExpired = expiry.state === 'EXPIRED';
  const isExpiringSoon = expiry.state === 'EXPIRING_SOON';
  const stockInfo = getMedicineStockInfo(medicine);

  const handlePlayVoiceGuide = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    const lang = settings?.voiceLanguage || 'en-US';
    if (isExpired) {
      speakExpiryWarning(medicine.name, lang);
    } else {
      speakReminder(medicine.name, medicine.dosage, lang, medicine.instructions);
    }
    setTimeout(() => setIsSpeaking(false), 6000);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to remove ${medicine.name}? This will also remove its reminder schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelMedicineNotification(medicine.id);
            await deleteMedicine(medicine.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleOpenUpdateModal = () => {
    setEditQuantityStr(stockInfo.currentQuantity.toString());
    setEditUnitType(stockInfo.unitType);
    setEditThresholdStr(stockInfo.lowStockThreshold.toString());
    setEditQtyPerDoseStr(stockInfo.quantityPerDose.toString());
    setIsUpdateModalVisible(true);
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseInt(editQuantityStr, 10) || 0;
    setEditQuantityStr((current + amount).toString());
  };

  const handleSaveStockUpdate = async () => {
    const parsedQty = parseInt(editQuantityStr, 10);
    const quantity = isNaN(parsedQty) ? 0 : Math.max(0, parsedQty);
    const parsedThreshold = parseInt(editThresholdStr, 10);
    const threshold = isNaN(parsedThreshold) ? 3 : Math.max(0, parsedThreshold);
    const parsedDose = parseInt(editQtyPerDoseStr, 10);
    const dose = isNaN(parsedDose) ? 1 : Math.max(1, parsedDose);

    await saveMedicine(
      {
        ...medicine,
        supplyCount: quantity,
        currentQuantity: quantity,
        stockTrackingEnabled: true,
        unitType: editUnitType.trim() || 'tablets',
        lowStockThreshold: threshold,
        quantityPerDose: dose,
      },
      medicine.id
    );

    setIsUpdateModalVisible(false);
    await load();
  };

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

        <Text style={styles.topBarTitle}>Medicine Details</Text>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditMedicine', { medicineId: medicine.id })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Centered Medicine Photo (Reference Style) */}
        <View style={styles.photoContainer}>
          {medicine.imageUri && !imageLoadFailed ? (
            <Image
              source={{ uri: medicine.imageUri }}
              style={styles.medicinePhoto}
              resizeMode="contain"
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <View style={[styles.photoFallback, { backgroundColor: isDarkMode ? colors.surfaceWarm : '#EDF4F5' }]}>
              <Ionicons name="medkit" size={64} color={isDarkMode ? colors.accentTeal : colors.primary} />
            </View>
          )}
        </View>

        {/* Medicine Name & Status Row */}
        <View style={styles.nameHeaderRow}>
          <Text style={styles.medicineName}>{medicine.name}</Text>
          <View
            style={[
              styles.statusBadge,
              isExpired
                ? styles.statusBadgeExpired
                : isExpiringSoon
                ? styles.statusBadgeWarning
                : styles.statusBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isExpired
                  ? styles.statusTextExpired
                  : isExpiringSoon
                  ? styles.statusTextWarning
                  : styles.statusTextActive,
              ]}
            >
              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Instructions / Description */}
        <Text style={styles.instructionsText}>
          {medicine.instructions || medicine.notes || 'Take as prescribed by your physician.'}
        </Text>

        {/* Structured Specifications Card (White Rounded Card with Icon Rows) */}
        <View style={styles.specsCard}>
          {/* Row 1: How to Use */}
          <View style={styles.specRow}>
            <View style={styles.specIconBox}>
              <Ionicons name="bandage-outline" size={20} color={isDarkMode ? colors.accentTeal : colors.primary} />
            </View>
            <View style={styles.specTextCol}>
              <Text style={styles.specLabel}>How to Use</Text>
              <Text style={styles.specValue}>Oral ({medicine.frequency})</Text>
            </View>
          </View>

          <View style={styles.specDivider} />

          {/* Row 2: Dosage */}
          <View style={styles.specRow}>
            <View style={styles.specIconBox}>
              <Ionicons name="flask-outline" size={20} color={isDarkMode ? colors.accentTeal : colors.primary} />
            </View>
            <View style={styles.specTextCol}>
              <Text style={styles.specLabel}>Dosage</Text>
              <Text style={styles.specValue}>{medicine.dosage}</Text>
            </View>
          </View>

          <View style={styles.specDivider} />

          {/* Row 3: Scheduled Time */}
          <View style={styles.specRow}>
            <View style={styles.specIconBox}>
              <Ionicons name="time-outline" size={20} color={isDarkMode ? colors.accentTeal : colors.primary} />
            </View>
            <View style={styles.specTextCol}>
              <Text style={styles.specLabel}>Time</Text>
              <Text style={styles.specValue}>{medicine.reminderTime}</Text>
            </View>
          </View>

          <View style={styles.specDivider} />

          {/* Row 4: Frequency */}
          <View style={styles.specRow}>
            <View style={styles.specIconBox}>
              <Ionicons name="repeat-outline" size={20} color={isDarkMode ? colors.accentTeal : colors.primary} />
            </View>
            <View style={styles.specTextCol}>
              <Text style={styles.specLabel}>Frequency</Text>
              <Text style={styles.specValue}>{medicine.frequency}</Text>
            </View>
          </View>

          <View style={styles.specDivider} />

          {/* Row 5: Expiry Information */}
          <View style={styles.specRow}>
            <View style={styles.specIconBox}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isExpired ? colors.alertRed : isDarkMode ? colors.accentTeal : colors.primary}
              />
            </View>
            <View style={styles.specTextCol}>
              <Text style={styles.specLabel}>Expiry Date</Text>
              <Text style={[styles.specValue, isExpired && { color: colors.alertRed }]}>
                {medicine.expiryDate || 'Not specified'}{' '}
                {isExpired
                  ? '(Expired)'
                  : isExpiringSoon
                  ? `(${expiry.daysRemaining} days left)`
                  : ''}
              </Text>
            </View>
          </View>

          {/* Row 6: Stock Tracking Information */}
          {stockInfo.enabled && (
            <>
              <View style={styles.specDivider} />
              <View style={styles.specRow}>
                <View style={styles.specIconBox}>
                  <Ionicons
                    name={stockInfo.isOutOfStock ? 'alert-circle-outline' : 'cube-outline'}
                    size={20}
                    color={
                      stockInfo.isOutOfStock
                        ? colors.alertRed
                        : stockInfo.isLowStock
                        ? colors.warningAmber
                        : isDarkMode
                        ? colors.accentTeal
                        : colors.primary
                    }
                  />
                </View>
                <View style={styles.specTextCol}>
                  <Text style={styles.specLabel}>Stock Remaining</Text>
                  <Text
                    style={[
                      styles.specValue,
                      stockInfo.isOutOfStock && { color: colors.alertRed, fontWeight: '700' },
                      stockInfo.isLowStock && { color: colors.warningAmber, fontWeight: '700' },
                    ]}
                  >
                    {stockInfo.currentQuantity} {stockInfo.unitType}{' '}
                    {stockInfo.isOutOfStock
                      ? '(Out of Stock!)'
                      : stockInfo.isLowStock
                      ? '(Low Supply!)'
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.updateStockLink} onPress={handleOpenUpdateModal}>
                  <Text style={styles.updateStockLinkText}>Update</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Keep Out of Reach of Children Warning Notice */}
        <View style={styles.warningNotice}>
          <Ionicons name="warning-outline" size={18} color={colors.warningAmber} />
          <Text style={styles.warningNoticeText}>Keep out of reach of children.</Text>
        </View>

        {/* Bottom Dual Action Buttons (Reference Style) */}
        <View style={styles.actionButtonsRow}>
          {/* Action 1: Expired Warning / Safety Status */}
          {isExpired ? (
            <TouchableOpacity
              style={styles.actionBtnExpired}
              onPress={() => speakExpiryWarning(medicine.name, settings?.voiceLanguage || 'en-US')}
              activeOpacity={0.85}
            >
              <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionBtnExpiredText}>Expired Medication Warning</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtnSafe}
              onPress={() => Alert.alert('Clinical Safety Notice', 'This medication is safely within its verified shelf-life date.')}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.actionBtnSafeText}>Verified Safe</Text>
            </TouchableOpacity>
          )}

          {/* Action 2: Audio Medication Guide */}
          <TouchableOpacity
            style={[styles.actionBtnAudio, isSpeaking && styles.actionBtnAudioActive]}
            onPress={handlePlayVoiceGuide}
            activeOpacity={0.85}
          >
            <Ionicons name={isSpeaking ? 'stop-circle' : 'volume-high'} size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnAudioText}>
              {isSpeaking ? 'Stop Guide' : 'Listen Guide'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Medicine (Safely Protected behind Confirmation Alert) */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={18} color={colors.alertRed} />
          <Text style={styles.deleteButtonText}>Remove Medicine</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Stock Update Modal */}
      <Modal visible={isUpdateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Medication Stock</Text>
            <Text style={styles.modalSubtitle}>
              Adjust your remaining pills or tap quick-add for refills.
            </Text>

            <View style={styles.quickAddRow}>
              {[5, 10, 30].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAddChip}
                  onPress={() => handleQuickAdd(amt)}
                >
                  <Text style={styles.quickAddChipText}>+{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalFieldLabel}>Unit Type</Text>
            <View style={styles.unitChipRow}>
              {UNIT_OPTIONS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, editUnitType.toLowerCase() === u && styles.unitChipActive]}
                  onPress={() => setEditUnitType(u)}
                >
                  <Text style={[styles.unitChipText, editUnitType.toLowerCase() === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalFieldLabel}>Current Quantity Remaining</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editQuantityStr}
              onChangeText={setEditQuantityStr}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFieldLabel}>Dose Qty</Text>
                <TextInput
                  style={[styles.modalInput, { marginBottom: 0 }]}
                  keyboardType="numeric"
                  value={editQtyPerDoseStr}
                  onChangeText={setEditQtyPerDoseStr}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFieldLabel}>Low Alert At</Text>
                <TextInput
                  style={[styles.modalInput, { marginBottom: 0 }]}
                  keyboardType="numeric"
                  value={editThresholdStr}
                  onChangeText={setEditThresholdStr}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsUpdateModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveStockUpdate}>
                <Text style={styles.modalSaveBtnText}>Save Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDarkMode: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
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
    editButton: {
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
    photoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 14,
    },
    medicinePhoto: {
      width: 170,
      height: 140,
      borderRadius: 16,
    },
    photoFallback: {
      width: 140,
      height: 120,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    medicineName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 10,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusBadgeActive: {
      backgroundColor: colors.badgeUpcomingBg,
    },
    statusBadgeWarning: {
      backgroundColor: colors.warningAmberContainer,
    },
    statusBadgeExpired: {
      backgroundColor: colors.alertRedContainer,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusTextActive: {
      color: colors.badgeUpcomingText,
    },
    statusTextWarning: {
      color: colors.warningAmber,
    },
    statusTextExpired: {
      color: colors.alertRed,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 18,
    },
    specsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    specRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    specIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EDF6F7',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    specTextCol: {
      flex: 1,
    },
    specLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 2,
    },
    specValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    specDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    updateStockLink: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#E0F2F1',
    },
    updateStockLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDarkMode ? colors.accentTeal : colors.primary,
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
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    actionBtnExpired: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.alertRed,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 6,
    },
    actionBtnExpiredText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    actionBtnSafe: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.takenGreen,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 6,
    },
    actionBtnSafeText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    actionBtnAudio: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.snoozeOrange,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 6,
    },
    actionBtnAudioActive: {
      backgroundColor: colors.alertRed,
    },
    actionBtnAudioText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
      marginTop: 8,
    },
    deleteButtonText: {
      color: colors.alertRed,
      fontSize: 14,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 16,
    },
    quickAddRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    quickAddChip: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#E0F2F1',
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickAddChipText: {
      fontSize: 15,
      fontWeight: '700',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    unitChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    unitChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    unitChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    unitChipTextActive: {
      color: '#FFFFFF',
    },
    modalFieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    modalInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 20,
    },
    modalBtnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F0F4F4',
    },
    modalCancelBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modalSaveBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    modalSaveBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
