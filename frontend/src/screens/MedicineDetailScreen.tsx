import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Medicine, AppSettings } from '../types';
import { getMedicines, deleteMedicine, updateSupply, saveMedicine, getSettings } from '../storage/medicineStorage';
import { evaluateExpiry } from '../utils/expirySafety';
import { speakReminder, speakExpiryWarning, stopSpeech } from '../utils/voiceReminder';
import { getMedicineStockInfo, COMMON_UNITS } from '../utils/stockUtils';

export default function MedicineDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { medicineId } = route.params;

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  if (!medicine) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading medicine...</Text>
      </View>
    );
  }

  const expiry = evaluateExpiry(medicine.expiryDate);
  const isExpired = expiry.state === 'EXPIRED';
  const stockInfo = getMedicineStockInfo(medicine);

  const handlePlayVoiceGuide = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    if (isExpired) {
      speakExpiryWarning(medicine.name, 'en-US');
    } else {
      speakReminder(medicine.name, medicine.dosage, 'en-US', medicine.instructions);
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
    const stockInfo = getMedicineStockInfo(medicine);
    const newCount = Math.max(0, stockInfo.currentQuantity + delta);
    await updateSupply(medicine.id, newCount);
    setMedicine({ ...medicine, currentQuantity: newCount, supplyCount: newCount });
  };

  const handleOpenUpdateModal = () => {
    const stockInfo = getMedicineStockInfo(medicine);
    setEditQuantityStr(stockInfo.currentQuantity.toString());
    setEditUnitType(stockInfo.unitType);
    setEditThresholdStr(stockInfo.lowStockThreshold.toString());
    setEditQtyPerDoseStr(stockInfo.quantityPerDose.toString());
    setIsUpdateModalVisible(true);
  };

  const handleModalAdjust = (delta: number) => {
    const current = parseInt(editQuantityStr, 10);
    const safeCurrent = isNaN(current) ? 0 : current;
    const next = Math.max(0, safeCurrent + delta);
    setEditQuantityStr(next.toString());
  };

  const handleSaveStock = async () => {
    const qty = parseInt(editQuantityStr, 10);
    const safeQty = isNaN(qty) ? 0 : Math.max(0, qty);
    const threshold = parseInt(editThresholdStr, 10);
    const safeThreshold = isNaN(threshold) ? 3 : Math.max(0, threshold);
    const perDose = parseInt(editQtyPerDoseStr, 10);
    const safePerDose = isNaN(perDose) ? 1 : Math.max(1, perDose);

    const updated: Medicine = {
      ...medicine,
      stockTrackingEnabled: true,
      currentQuantity: safeQty,
      supplyCount: safeQty,
      unitType: editUnitType.trim() || 'tablets',
      lowStockThreshold: safeThreshold,
      quantityPerDose: safePerDose,
    };

    await saveMedicine(updated, medicine.id);
    setMedicine(updated);
    setIsUpdateModalVisible(false);
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

        {/* Voice Audio Guide Card */}
        <TouchableOpacity
          style={[styles.voiceGuideCard, isSpeaking && styles.voiceGuideCardActive]}
          activeOpacity={0.8}
          onPress={handlePlayVoiceGuide}
        >
          <View style={[styles.voiceGuideIcon, isSpeaking && styles.voiceGuideIconActive]}>
            <Ionicons name={isSpeaking ? 'volume-high' : 'volume-medium'} size={24} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.voiceGuideTitle}>Voice Medication Guide</Text>
            <Text style={styles.voiceGuideSubtitle}>
              {isSpeaking
                ? 'Playing audio instructions...'
                : 'Listen to dose, timing and instructions aloud'}
            </Text>
          </View>
          <Ionicons
            name={isSpeaking ? 'stop-circle' : 'play-circle'}
            size={32}
            color={isSpeaking ? Colors.alertRed : Colors.primary}
          />
        </TouchableOpacity>

        {/* Medicine Stock Section */}
        <View style={styles.stockCard}>
          <View style={styles.stockHeaderRow}>
            <View style={styles.stockIconContainer}>
              <Ionicons name="cube" size={26} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stockSectionTitle}>Medicine Stock</Text>
              <Text
                style={[
                  styles.stockCountText,
                  stockInfo.isLowStock && styles.stockCountTextLow,
                  stockInfo.isOutOfStock && styles.stockCountTextOut,
                ]}
              >
                {stockInfo.enabled ? stockInfo.statusText : 'Stock tracking not configured'}
              </Text>
            </View>
          </View>

          {/* Calm Low Stock Warning Banner */}
          {stockInfo.enabled && stockInfo.isLowStock && (
            <View style={styles.lowStockWarningBanner}>
              <Ionicons name="warning-outline" size={22} color={Colors.warningAmber} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.lowStockWarningTitle}>Stock Notice</Text>
                <Text style={styles.lowStockWarningText}>
                  {stockInfo.warningText}
                </Text>
              </View>
            </View>
          )}

          {/* Calm Zero Stock Notice Banner */}
          {stockInfo.enabled && stockInfo.isOutOfStock && (
            <View style={styles.outOfStockWarningBanner}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.alertRed} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.outOfStockWarningTitle}>Stock Notice</Text>
                <Text style={styles.outOfStockWarningText}>
                  No medicine remaining.
                </Text>
              </View>
            </View>
          )}

          {/* Stock Metadata / Config summary */}
          {stockInfo.enabled && (
            <View style={styles.stockMetaRow}>
              <Text style={styles.stockMetaItem}>
                Dose: {stockInfo.quantityPerDose} {stockInfo.unitType}
              </Text>
              <Text style={styles.stockMetaDivider}>•</Text>
              <Text style={styles.stockMetaItem}>
                Alert at: {stockInfo.lowStockThreshold} {stockInfo.unitType}
              </Text>
            </View>
          )}

          {/* Update Stock Button */}
          <TouchableOpacity
            style={styles.updateStockButton}
            activeOpacity={0.8}
            onPress={handleOpenUpdateModal}
          >
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.updateStockButtonText}>Update Stock</Text>
          </TouchableOpacity>
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

      {/* Update Stock Modal */}
      <Modal
        visible={isUpdateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cube" size={24} color={Colors.primary} />
                <Text style={styles.modalTitle}>Update Medicine Stock</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsUpdateModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={26} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Current Quantity Field with Stepper */}
              <Text style={styles.modalFieldLabel}>Current Quantity Remaining</Text>
              <View style={styles.modalStepperRow}>
                <TouchableOpacity
                  style={styles.modalStepBtn}
                  onPress={() => handleModalAdjust(-1)}
                >
                  <Ionicons name="remove" size={26} color={Colors.primary} />
                </TouchableOpacity>

                <TextInput
                  style={styles.modalQtyInput}
                  value={editQuantityStr}
                  onChangeText={setEditQuantityStr}
                  keyboardType="numeric"
                  textAlign="center"
                />

                <TouchableOpacity
                  style={styles.modalStepBtn}
                  onPress={() => handleModalAdjust(1)}
                >
                  <Ionicons name="add" size={26} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Quick Add Chips */}
              <View style={styles.quickAddRow}>
                {[5, 10, 30].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.quickAddChip}
                    onPress={() => handleModalAdjust(num)}
                  >
                    <Ionicons name="add" size={16} color={Colors.primary} />
                    <Text style={styles.quickAddChipText}>{num} {editUnitType}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Unit Type Selection */}
              <Text style={styles.modalFieldLabel}>Unit Type</Text>
              <View style={styles.unitChipContainer}>
                {['tablets', 'capsules', 'doses', 'pills'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unitChip,
                      editUnitType.toLowerCase() === u && styles.unitChipActive,
                    ]}
                    onPress={() => setEditUnitType(u)}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        editUnitType.toLowerCase() === u && styles.unitChipTextActive,
                      ]}
                    >
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quantity Per Dose */}
              <Text style={styles.modalFieldLabel}>Quantity Used Per Dose</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={editQtyPerDoseStr}
                onChangeText={setEditQtyPerDoseStr}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Low Stock Warning Threshold */}
              <Text style={styles.modalFieldLabel}>Low Stock Warning Threshold</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={editThresholdStr}
                onChangeText={setEditThresholdStr}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Modal Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsUpdateModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveStock}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.modalSaveBtnText}>Save Stock</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  stockCard: {
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
  stockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stockIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  stockCountText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },
  stockCountTextLow: {
    color: Colors.warningAmber,
  },
  stockCountTextOut: {
    color: Colors.alertRed,
  },
  lowStockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningAmberContainer,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  lowStockWarningTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.warningAmber,
  },
  lowStockWarningText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  outOfStockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.alertRedContainer,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  outOfStockWarningTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.alertRed,
  },
  outOfStockWarningText: {
    fontSize: 14,
    color: Colors.onAlertRedContainer,
    marginTop: 2,
  },
  stockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stockMetaItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  stockMetaDivider: {
    fontSize: 14,
    color: Colors.textMuted,
    marginHorizontal: 8,
  },
  updateStockButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  updateStockButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    maxHeight: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalScroll: {
    paddingBottom: 10,
  },
  modalFieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },
  modalStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 6,
  },
  modalStepBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalQtyInput: {
    width: 100,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickAddChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  unitChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  unitChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  unitChipTextActive: {
    color: '#FFF',
  },
  modalSimpleInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
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
