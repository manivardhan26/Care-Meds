import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getMedicines, saveMedicine } from '../storage/medicineStorage';
import { getMedicineStockInfo } from '../utils/stockUtils';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly'];

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00 AM' },
  { label: 'Noon', time: '12:00 PM' },
  { label: 'Evening', time: '06:00 PM' },
  { label: 'Night', time: '09:00 PM' },
];

export default function AddEditMedicineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const existingMedicineId = route.params?.medicineId;
  const initialValues = route.params?.prefill;

  const [name, setName] = useState(initialValues?.name || '');
  const [dosage, setDosage] = useState(initialValues?.dosage || '');
  const [frequency, setFrequency] = useState('Once daily');
  const [reminderTime, setReminderTime] = useState('08:00 AM');
  const [timeOfDay, setTimeOfDay] = useState('Morning');
  const [expiryDate, setExpiryDate] = useState(initialValues?.expiryDate || '');
  const [instructions, setInstructions] = useState(initialValues?.instructions || '');

  // Stock tracking state (Optional)
  const [stockTrackingEnabled, setStockTrackingEnabled] = useState(
    initialValues?.stockTrackingEnabled !== undefined ? Boolean(initialValues.stockTrackingEnabled) : true
  );
  const [currentQuantityStr, setCurrentQuantityStr] = useState(
    initialValues?.currentQuantity?.toString() || initialValues?.supplyCount?.toString() || '30'
  );
  const [unitType, setUnitType] = useState(initialValues?.unitType || 'tablets');
  const [quantityPerDoseStr, setQuantityPerDoseStr] = useState(
    initialValues?.quantityPerDose?.toString() || '1'
  );
  const [lowStockThresholdStr, setLowStockThresholdStr] = useState(
    initialValues?.lowStockThreshold?.toString() || '3'
  );

  useEffect(() => {
    if (existingMedicineId) {
      (async () => {
        const meds = await getMedicines();
        const found = meds.find((m) => m.id === existingMedicineId);
        if (found) {
          setName(found.name);
          setDosage(found.dosage);
          setFrequency(found.frequency);
          setReminderTime(found.reminderTime);
          setTimeOfDay(found.timeOfDay);
          setExpiryDate(found.expiryDate);
          setInstructions(found.instructions || found.notes);
          const stock = getMedicineStockInfo(found);
          setStockTrackingEnabled(stock.enabled);
          setCurrentQuantityStr(stock.currentQuantity.toString());
          setUnitType(stock.unitType);
          setQuantityPerDoseStr(stock.quantityPerDose.toString());
          setLowStockThresholdStr(stock.lowStockThreshold.toString());
        }
      })();
    }
  }, [existingMedicineId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter a medicine name.');
      return;
    }

    const parsedQty = parseInt(currentQuantityStr, 10);
    const quantity = isNaN(parsedQty) ? 0 : Math.max(0, parsedQty);
    const parsedThreshold = parseInt(lowStockThresholdStr, 10);
    const threshold = isNaN(parsedThreshold) ? 3 : Math.max(0, parsedThreshold);
    const parsedDose = parseInt(quantityPerDoseStr, 10);
    const dose = isNaN(parsedDose) ? 1 : Math.max(1, parsedDose);

    await saveMedicine(
      {
        name: name.trim(),
        dosage: dosage.trim() || '1 dose',
        frequency,
        reminderTime,
        timeOfDay,
        expiryDate: expiryDate.trim() || '2027-12-31',
        instructions: instructions.trim(),
        notes: instructions.trim(),
        supplyCount: quantity,
        stockTrackingEnabled,
        currentQuantity: quantity,
        unitType: unitType.trim() || 'tablets',
        quantityPerDose: dose,
        lowStockThreshold: threshold,
      },
      existingMedicineId
    );

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingMedicineId ? 'Edit Medicine' : 'Add Medicine'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Shortcut to Scan Medicine Box */}
        {!existingMedicineId && (
          <TouchableOpacity
            style={styles.scanShortcutButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.scanShortcutText}>Scan Medicine Box with Camera</Text>
          </TouchableOpacity>
        )}

        {/* Medicine Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={[styles.input, styles.inputBold]}
            placeholder="e.g. Aspirin, Lisinopril"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Dosage */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosage / Strength *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500mg, 1 tablet"
            placeholderTextColor={Colors.textMuted}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        {/* Reminder Time Presets */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Scheduled Reminder Time</Text>
          <View style={styles.presetRow}>
            {TIME_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.presetChip,
                  reminderTime === preset.time && styles.presetChipActive,
                ]}
                onPress={() => {
                  setReminderTime(preset.time);
                  setTimeOfDay(preset.label);
                }}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    reminderTime === preset.time && styles.presetChipTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text
                  style={[
                    styles.presetChipSubText,
                    reminderTime === preset.time && styles.presetChipTextActive,
                  ]}
                >
                  {preset.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Time (hh:mm AM/PM)</Text>
          <TextInput
            style={styles.input}
            placeholder="08:00 AM"
            placeholderTextColor={Colors.textMuted}
            value={reminderTime}
            onChangeText={setReminderTime}
          />
        </View>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>How often do you take this?</Text>
          <View style={styles.freqRow}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[styles.freqChip, frequency === freq && styles.freqChipActive]}
                onPress={() => setFrequency(freq)}
              >
                <Text style={[styles.freqChipText, frequency === freq && styles.freqChipTextActive]}>
                  {freq}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Expiry Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Expiry Date (YYYY-MM-DD or MM/YYYY)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2027-12-31"
            placeholderTextColor={Colors.textMuted}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
        </View>

        {/* Notes / Instructions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Special Notes / Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Take with plenty of water after meals"
            placeholderTextColor={Colors.textMuted}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Medicine Stock (Optional) */}
        <View style={styles.stockCard}>
          <View style={styles.stockCardHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="cube-outline" size={24} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stockCardTitle}>Medicine Stock (Optional)</Text>
                <Text style={styles.stockCardSubtitle}>
                  Track remaining supply and get low stock warnings
                </Text>
              </View>
            </View>
            <Switch
              value={stockTrackingEnabled}
              onValueChange={setStockTrackingEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryContainer }}
              thumbColor={stockTrackingEnabled ? Colors.primary : '#FFF'}
            />
          </View>

          {stockTrackingEnabled && (
            <View style={styles.stockFields}>
              {/* Current Quantity */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Quantity Remaining</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      const cur = parseInt(currentQuantityStr, 10) || 0;
                      setCurrentQuantityStr(Math.max(0, cur - 1).toString());
                    }}
                  >
                    <Ionicons name="remove" size={24} color={Colors.primary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.stepperInput}
                    value={currentQuantityStr}
                    onChangeText={setCurrentQuantityStr}
                    keyboardType="numeric"
                    textAlign="center"
                    placeholder="30"
                    placeholderTextColor={Colors.textMuted}
                  />

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      const cur = parseInt(currentQuantityStr, 10) || 0;
                      setCurrentQuantityStr((cur + 1).toString());
                    }}
                  >
                    <Ionicons name="add" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Quick Add Buttons */}
                <View style={styles.quickAddRow}>
                  {[10, 30, 60].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={styles.quickAddChip}
                      onPress={() => {
                        const cur = parseInt(currentQuantityStr, 10) || 0;
                        setCurrentQuantityStr((cur + num).toString());
                      }}
                    >
                      <Ionicons name="add" size={16} color={Colors.primary} />
                      <Text style={styles.quickAddChipText}>+{num} {unitType}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Unit Type Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Unit Type</Text>
                <View style={styles.unitChipContainer}>
                  {['tablets', 'capsules', 'doses', 'pills'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.unitChip,
                        unitType.toLowerCase() === u && styles.unitChipActive,
                      ]}
                      onPress={() => setUnitType(u)}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          unitType.toLowerCase() === u && styles.unitChipTextActive,
                        ]}
                      >
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Quantity Per Dose */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity Used Per Dose</Text>
                <TextInput
                  style={styles.input}
                  value={quantityPerDoseStr}
                  onChangeText={setQuantityPerDoseStr}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Low Stock Warning Threshold */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Low Stock Warning At (Threshold)</Text>
                <TextInput
                  style={styles.input}
                  value={lowStockThresholdStr}
                  onChangeText={setLowStockThresholdStr}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.hintText}>
                  A calm notice will appear when remaining quantity reaches this number.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="save-outline" size={24} color="#FFF" />
          <Text style={styles.saveButtonText}>
            {existingMedicineId ? 'Update Medicine' : 'Save Medicine Reminder'}
          </Text>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  scanShortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 16,
    height: 54,
    marginBottom: 20,
  },
  scanShortcutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  inputBold: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  textArea: {
    height: 90,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  presetChipSubText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  presetChipTextActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  freqChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  freqChipText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  freqChipTextActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  stockCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  stockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  stockCardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stockFields: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 6,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperInput: {
    width: 90,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
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
  hintText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: 'bold',
  },
});
